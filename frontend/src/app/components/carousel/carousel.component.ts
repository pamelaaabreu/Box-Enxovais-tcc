import { Component, input, afterNextRender, DestroyRef, ElementRef, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

type CarouselInstance = { pause():void; cycle():void; dispose():void };

@Component({
 selector: 'app-carousel',
 imports: [RouterLink],
 templateUrl: './carousel.component.html',
 styleUrl: './carousel.component.scss'
})
export class CarouselComponent {
 readonly natalCampaignId = input<number|null>(null);
 private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
 private readonly destroy = inject(DestroyRef);
 private instance?: CarouselInstance;
 private reducedMotion = false;
 private disposed = false;
 readonly slides = [
  {key:'natal',label:'Natal',eyebrow:'Coleção Natal',titleStart:'Um Natal cheio',titleLead:'de ',titleEmphasis:'aconchego',title:'Um Natal cheio de aconchego',description:'Celebre os momentos especiais com enxovais que acolhem.',cta:'Explorar coleção',link:'/categoria/cama',image:'/home/banner-natal.webp',alt:'Cama com edredom floral, dobra vermelha lisa e árvore de Natal desfocada'},
  {key:'banho',label:'Banho',eyebrow:'Coleção Banho',titleStart:'Seu momento',titleLead:'de ',titleEmphasis:'bem-estar',title:'Seu momento de bem-estar',description:'Toalhas macias que transformam pequenos cuidados em momentos especiais.',cta:'Ver toalhas',link:'/categoria/toalhas',image:'/home/banner-banho-fotografico.webp',alt:'Toalhas creme e verde-oliva com textura em destaque'},
  {key:'almofadas',label:'Almofadas',eyebrow:'Coleção Almofadas',titleStart:'Detalhes que',titleLead:'',titleEmphasis:'transformam',title:'Detalhes que transformam',description:'Capas de almofadas e texturas que trazem personalidade ao seu lar.',cta:'Ver almofadas',link:'/categoria/almofadas',image:'/home/banner-almofadas-fotografico.webp',alt:'Almofadas creme e verde-oliva em sofá claro'},
 ];
 constructor() {
  afterNextRender(async () => {
   const view = this.host.nativeElement.ownerDocument.defaultView;
   const element = this.host.nativeElement.querySelector('.carousel');
   if (!view || !element) return;
   this.reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const {default: Carousel} = await import('bootstrap/js/src/carousel.js');
   if (this.disposed) return;
   this.instance = Carousel.getOrCreateInstance(element, {interval:8000,ride:this.reducedMotion ? false : 'carousel',pause:'hover',keyboard:true});
   if (this.reducedMotion) this.instance?.pause();
  });
  this.destroy.onDestroy(() => {this.disposed=true;this.instance?.dispose();});
 }
 @HostListener('focusin') pause():void { this.instance?.pause(); }
 @HostListener('slid.bs.carousel') pauseAfterSlide():void {
  if (this.reducedMotion || this.host.nativeElement.contains(this.host.nativeElement.ownerDocument.activeElement)) this.instance?.pause();
 }
 @HostListener('focusout', ['$event']) resume(event:FocusEvent):void {
  if (!this.reducedMotion && !(event.relatedTarget instanceof Node && this.host.nativeElement.contains(event.relatedTarget))) this.instance?.cycle();
 }
}
