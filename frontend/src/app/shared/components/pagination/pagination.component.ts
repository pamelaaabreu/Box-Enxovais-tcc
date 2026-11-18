import {Component,computed,input,output} from '@angular/core';
@Component({selector:'app-pagination',standalone:true,template:`
<nav [attr.aria-label]="label()" class="pager">
 <span class="summary" role="status">Página {{ current() }} de {{ pages() }} · {{ total() }} {{ total() === 1 ? 'registro' : 'registros' }}</span>
 <div class="controls"><button type="button" aria-label="Página anterior" [disabled]="disabled() || current()<=1" (click)="select(current()-1)">Anterior</button>
 @for(item of items();track $index){@if(item==='…'){<span aria-hidden="true">…</span>}@else{<button type="button" [attr.aria-label]="'Página '+item" [attr.aria-current]="current()===item?'page':null" [disabled]="disabled()" (click)="select(+item)">{{item}}</button>}}
 <button type="button" aria-label="Próxima página" [disabled]="disabled() || current()>=pages()" (click)="select(current()+1)">Próxima</button></div>
</nav>`,styles:[`:host{display:block;min-width:0}.pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;margin-top:24px;font-family:Montserrat,sans-serif;color:#3d4836}.summary{font-size:12px}.controls{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;align-items:center}button{min-width:40px;min-height:44px;padding:8px 12px;border:1px solid #89927c;border-radius:10px;background:transparent;color:inherit;font:500 13px Montserrat,sans-serif;cursor:pointer}button[aria-current=page]{background:#3d4836;color:white}button:hover:not(:disabled){background:#e8ecdf}button[aria-current=page]:hover{background:#526047}button:disabled{opacity:.45;cursor:default}button:focus-visible{outline:2px solid #657550;outline-offset:3px}@media(max-width:420px){button{padding:8px;min-width:36px}.pager{gap:8px}}`]})
export class PaginationComponent{
 readonly page=input(1);readonly total=input(0);readonly pageSize=input(12);readonly disabled=input(false);readonly label=input('Paginação');readonly pageChange=output<number>();
 readonly pages=computed(()=>Math.max(1,Math.ceil(Math.max(0,this.total())/Math.max(1,this.pageSize()))));
 readonly current=computed(()=>Math.max(1,Math.min(this.pages(),this.page())));
 readonly items=computed<(number|string)[]>(()=>{const n=this.pages(),p=this.current();if(n<=7)return Array.from({length:n},(_,i)=>i+1);const values=[1,...[p-1,p,p+1].filter(x=>x>1&&x<n),n];const out:(number|string)[]=[];for(const v of [...new Set(values)]){const prev=out.at(-1);if(typeof prev==='number'&&v-prev>1)out.push('…');out.push(v)}return out});
 select(page:number){if(!this.disabled()&&Number.isSafeInteger(page)&&page>=1&&page<=this.pages()&&page!==this.current())this.pageChange.emit(page)}
}
