import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatSelectModule } from '@angular/material/select';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { forkJoin, map, tap, finalize, from, concatMap, catchError, of } from 'rxjs';
import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { Component, OnInit, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UploadService } from '../../../../core/services/upload.service';
import { Product } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { ProductService, ProductImageRecord } from '../../../../core/services/product.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';

@Component({
  selector: 'app-product-image-upload',
  imports: [RouterLink, DragDropModule, MatSelectModule,MatIconModule,AdminStateComponent],
  templateUrl: './product-image-upload.component.html',
  styleUrl: './product-image-upload.component.scss',
})
export class ProductImageUploadComponent implements OnInit {
  @Input() productId = Number(inject(ActivatedRoute, { optional: true })?.snapshot.paramMap.get('id'));
  @Input() showComplete = false;
  @Input() editing = false;
  variantId:number|null=null;
  variants:NonNullable<Product['variants']>=[];
  records:ProductImageRecord[]=[];
  get visibleImages(){return this.records.filter(image=>image.variant_id===this.variantId);}
  private applyImages(images:ProductImageRecord[]):void {
    this.records=images;this.images=this.visibleImages.map(image=>image.path);
    const cover=images.find(image=>image.variant_id===null);
    this.coverChanged.emit(cover?this.imageUrl(cover.path):'');
  }
  selectVariant(value:number|Event):void {
    if (this.loading) return;
    this.variantId=(typeof value === 'number' ? value : Number((value.target as HTMLSelectElement).value))||null;
    this.images=this.visibleImages.map(image=>image.path);
  }
  loadGallery():void {
    this.loading=true;this.error='';this.galleryFailed=false;
    this.products.getProductImages(this.productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:images=>{this.applyImages(images);this.loading=false;},error:()=>{this.loading=false;this.galleryFailed=true;this.error='Não foi possível carregar a galeria. Tente novamente.';}});
  }
  moveImage(index:number,direction:number):void {
    const images=this.visibleImages;
    if(this.loading||index+direction<0||index+direction>=images.length)return;
    const ids=images.map(image=>image.id);[ids[index],ids[index+direction]]=[ids[index+direction],ids[index]];
    this.saveOrder(ids);
  }
  setCover(image:ProductImageRecord):void {
    this.saveOrder([image.id,...this.visibleImages.filter(item=>item.id!==image.id).map(item=>item.id)]);
  }
  private saveOrder(ids:number[]):void {
    if(this.loading||!ids.length)return;
    this.loading=true;this.error='';
    this.products.orderProductImages(this.productId,this.variantId,ids,this.visibleImages.map(image=>image.id),ids[0]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:images=>{this.applyImages(images);this.loading=false;this.alerts.success('Galeria atualizada.');},error:error=>{this.loading=false;this.error=error.error?.message||'Não foi possível atualizar a galeria. Tente novamente.';}});
  }
  removeImage(image:ProductImageRecord):void {
    if(this.loading)return;
    this.confirm.open({title:'Remover imagem?',message:'A imagem será retirada desta galeria. As outras imagens e os arquivos físicos serão preservados.',variant:'danger',primary:'Remover imagem',secondary:'Cancelar',execute:()=>{
      this.loading=true;
      return this.products.removeProductImage(this.productId,image.id).pipe(tap(images=>this.applyImages(images)),finalize(()=>this.loading=false));
    },errorMessage:error=>(error as {error?:{message?:string}}).error?.message||'Não foi possível remover a imagem. Tente novamente.'}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(removed=>{if(removed)this.alerts.success('Imagem removida da galeria.');});
  }
  @Output() readonly completed = new EventEmitter<void>();
  private readonly confirm = inject(ConfirmDialogService);
  @Output() readonly coverChanged = new EventEmitter<string>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly uploadService = inject(UploadService);
  private readonly products = inject(ProductService);
  private readonly alerts = inject(CustomAlertService);
  selectedFile: File | null = null;
  preview = '';
  images: string[] = [];
  loading = false;
  error = '';
  galleryFailed = false;
  uploading = false;
  draggingFiles = false;
  uploadItems: Array<{file: File; status: 'pending' | 'uploading' | 'done' | 'error'; message: string}> = [];
  private readonly uploaded = new Set<string>();
  private disposed = false;

  constructor() { this.destroyRef.onDestroy(() => { this.disposed = true; this.clearSelection(); }); }

  retryGallery(): void { if (!this.loading) this.ngOnInit(); }

  ngOnInit(): void {
    if (!this.productId) return;
    this.galleryFailed = false;
    this.loading=true;
    forkJoin([this.products.getProduct(this.productId),this.products.getProductImages(this.productId)]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:([product,images])=>{this.variants=product.variants||[];this.applyImages(images);this.loading=false;},
      error:()=>{this.loading=false;this.galleryFailed=true;this.error='Não foi possível consultar as imagens cadastradas.';},
    });
  }

  selectFiles(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.enqueueFiles(files);
  }
  allowFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingFiles = !this.loading && Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
  dropFiles(event: DragEvent): void {
    event.preventDefault();
    this.draggingFiles = false;
    this.enqueueFiles(Array.from(event.dataTransfer?.files ?? []));
  }
  enqueueFiles(files: File[]): void {
    if (this.loading || !this.productId || !files.length) return;
    this.error = '';
    const seen = new Set<string>();
    this.uploadItems = files.map(file => {
      const key = this.fileKey(file);
      const message = !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        ? 'Selecione uma imagem JPEG, PNG ou WebP.'
        : (!file.size || file.size > 10 * 1024 * 1024)
          ? 'A imagem precisa ter entre 1 byte e 10 MB.'
          : this.uploaded.has(key) || seen.has(key) ? 'Essa imagem já foi selecionada ou enviada nesta sessão.' : '';
      seen.add(key);
      return {file, status: message ? 'error' as const : 'pending' as const, message};
    });
    const pending = this.uploadItems.filter(item => item.status === 'pending');
    if (!pending.length) return;
    this.uploading = this.loading = true;
    from(pending).pipe(concatMap(item => {
      item.status = 'uploading';
      const data = new FormData();
      data.append('image', item.file);
      data.append('productId', String(this.productId));
      if (this.variantId) data.append('variantId', String(this.variantId));
      return this.uploadService.uploadImage(data).pipe(
        tap(() => { item.status = 'done'; this.uploaded.add(this.fileKey(item.file)); }),
        catchError(() => { item.status = 'error'; item.message = 'Não foi possível enviar a imagem. Selecione-a novamente para tentar.'; return of(null); }),
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe({complete: () => {
      if (this.disposed) return;
      this.uploading = false;
      this.loadGallery();
      if (this.uploadItems.every(item => item.status === 'done')) this.alerts.success('Imagens enviadas com sucesso.');
    }});
  }
  dropImage(event: CdkDragDrop<ProductImageRecord[]>): void {
    if (this.loading || event.previousIndex === event.currentIndex) return;
    const ids = this.visibleImages.map(image => image.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.saveOrder(ids);
  }
  fileSize(file: File): string { return (file.size / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; }

  onFileSelected(input: HTMLInputElement): void {
    this.clearSelection();
    this.error = '';
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error = 'Selecione uma imagem JPEG, PNG ou WebP.';
      return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      this.error = 'A imagem precisa ter entre 1 byte e 10 MB.';
      return;
    }
    if (this.uploaded.has(this.fileKey(file))) {
      this.error = 'Essa imagem já foi enviada nesta sessão.';
      return;
    }
    this.selectedFile = file;
    this.preview = URL.createObjectURL(file);
  }

  clearSelection(): void {
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.preview = '';
    this.selectedFile = null;
  }

  onUpload(): void {
    const file = this.selectedFile;
    if (!file || !this.productId || this.loading) return;
    const data = new FormData();
    data.append('image', file);
    data.append('productId', String(this.productId));
    if(this.variantId)data.append('variantId',String(this.variantId));
    this.loading = true;
    this.error = '';
    this.uploadService.uploadImage(data).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.images = [...new Set([...this.images, response.filePath.replace(/\\/g, '/')])];
        if (this.images[0]) this.coverChanged.emit(this.imageUrl(this.images[0]));
        this.uploaded.add(this.fileKey(file));
        this.clearSelection();
        this.loadGallery();
        this.alerts.success('Imagem enviada com sucesso.');
      },
      error: () => {
        this.loading = false;
        this.error = 'Não foi possível enviar a imagem. Tente novamente.';
        this.alerts.error(this.error);
      },
    });
  }

  complete(): void {
    if (!this.showComplete || this.loading || this.galleryFailed || this.selectedFile || (!this.editing && !this.images.length)) return;
    this.completed.emit();
  }

  canLeave() {
    if (this.loading) return false;
    if (!this.selectedFile) return true;
    return this.confirm.open({
      title: 'Descartar alterações?',
      message: 'A imagem selecionada ainda não foi enviada.',
      variant: 'warning', primary: 'Continuar editando', secondary: 'Descartar', confirmAction: 'secondary',
    }).afterClosed().pipe(map(result => result === true));
  }

  imageUrl(path: string): string {
    return /^https?:\/\//.test(path) ? path : 'http://localhost:8080/' + path.replace(/^\/+/, '');
  }

  private fileKey(file: File): string { return [this.variantId||0,file.name, file.size, file.lastModified, file.type].join(':'); }
}