import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {CreatePromotionComponent} from './create-promotion.component';
import {PromoService} from '../../core/services/promo.service';
import {CustomAlertService} from '../../core/services/custom-alert.service';
describe('CreatePromotionComponent',()=>{
 it('sends configured metadata once and resets after server confirmation',()=>{const result=new Subject<unknown>();const create=jasmine.createSpy().and.returnValue(result);const success=jasmine.createSpy();TestBed.configureTestingModule({providers:[{provide:PromoService,useValue:{createPromotion:create}},{provide:CustomAlertService,useValue:{success,error:jasmine.createSpy()}}]});const f=TestBed.createComponent(CreatePromotionComponent);f.componentInstance.promotionData={name:'Natal',description:'Campanha',image_path:'uploads/natal.webp',home_featured:true,status:'active',start_date:'2026-11-01T00:00',end_date:'2026-12-31T23:59'};f.componentInstance.onSubmit();f.componentInstance.onSubmit();expect(create).toHaveBeenCalledTimes(1);expect(create.calls.mostRecent().args[0].home_featured).toBeTrue();expect(f.componentInstance.saving).toBeTrue();result.next({id:1});expect(f.componentInstance.saving).toBeFalse();expect(success).toHaveBeenCalled();expect(f.componentInstance.promotionData.name).toBe('')});
});
