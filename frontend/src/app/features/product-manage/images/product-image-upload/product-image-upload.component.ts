import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { forkJoin, map, tap, finalize } from 'rxjs';
import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { Component, OnInit, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UploadService } from '../../../../core/services/upload.service';
import { Product } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { ProductService, ProductImageRecord } from '../../../../core/services/product.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';

@Component({
  selector: 'app-product-image-upload',
  imports: [MatIconModule,AdminStateComponent, MatButtonModule, MatProgressSpinnerModule],
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
  selectVariant(event:Event):void {
    this.variantId=Number((event.target as HTMLSelectElement).value)||null;
    this.images=this.visibleImages.map(image=>image.path);
  }
  loadGallery():void {
    this.loading=true;this.error='';
    this.products.getProductImages(this.productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:images=>{this.applyImages(images);this.loading=false;},error:()=>{this.loading=false;this.error='Não foi possível carregar a galeria. Tente novamente.';}});
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
  private readonly uploaded = new Set<string>();

  constructor() { this.destroyRef.onDestroy(() => this.clearSelection()); }

  ngOnInit(): void {
    if (!this.productId) return;
    this.loading=true;
    forkJoin([this.products.getProduct(this.productId),this.products.getProductImages(this.productId)]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:([product,images])=>{this.variants=product.variants||[];this.applyImages(images);this.loading=false;},
      error:()=>{this.loading=false;this.error='Não foi possível consultar as imagens cadastradas.';},
    });
  }

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
    if (!this.showComplete || this.loading || this.selectedFile || (!this.editing && !this.images.length)) return;
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