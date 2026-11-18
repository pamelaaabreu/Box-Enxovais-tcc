import {Component,Input,inject} from '@angular/core';
import {DatePipe} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError,of} from 'rxjs';
import {Product} from '../../shared/models';
import {CatalogService} from '../catalog/services/catalog.service';
import {ProductCardComponent} from '../catalog/components/product-card/product-card.component';
@Component({selector:'app-promo-grid',standalone:true,imports:[DatePipe,ProductCardComponent],templateUrl:'./promo-grid.component.html',styleUrl:'./promo-grid.component.css'})
export class PromoGridComponent{
 @Input() promoName?:string;readonly catalog=inject(CatalogService);
 readonly campaign=toSignal(inject(HttpClient).get<{name:string;description:string;imagePath:string;startDate:string;endDate:string;products:Product[]}|null>('http://localhost:8080/home/campaign').pipe(catchError(()=>of(null))),{initialValue:null});
}
