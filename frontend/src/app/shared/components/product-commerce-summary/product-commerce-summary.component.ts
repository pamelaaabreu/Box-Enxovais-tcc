import { Component, Input } from '@angular/core';
import { FormArray } from '@angular/forms';
import { VariantForm } from '../product-variants/product-variants.component';
import { money, parsePrice } from '../../forms/price-input';
@Component({
 selector:'app-product-commerce-summary',standalone:true,
 templateUrl: './product-commerce-summary.component.html',
 styleUrl: './product-commerce-summary.component.scss',
})
export class ProductCommerceSummaryComponent {
 @Input() framed = true;
 @Input() cards = false;
 @Input({required:true}) variants!:FormArray<VariantForm>;
 get totalStock():number{return this.variants.controls.reduce((sum,row)=>sum+(row.controls.stock.valid?row.controls.stock.value??0:0),0);}
 get startingPrice():string {const prices=this.variants.controls.map(row=>parsePrice(row.controls.price.value)).filter((v):v is number=>v!==null);return prices.length?'R$ '+money.format(Math.min(...prices)):'—';}
}
