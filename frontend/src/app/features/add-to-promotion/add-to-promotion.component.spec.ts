import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {AddToPromotionComponent} from './add-to-promotion.component';
import {CreatePromotionComponent} from '../create-promotion/create-promotion.component';

@Component({selector:'app-create-promotion',standalone:true,template:'<p>Gerenciar campanha e selecionar produtos</p>'})
class CampaignFormStubComponent {}
describe('Legacy promotion linking route',()=>{
 it('reuses the campaign form instead of requesting a manual product id',()=>{
  TestBed.overrideComponent(AddToPromotionComponent,{remove:{imports:[CreatePromotionComponent]},add:{imports:[CampaignFormStubComponent]}});
  const fixture=TestBed.createComponent(AddToPromotionComponent);fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-create-promotion')).not.toBeNull();
  expect(fixture.nativeElement.querySelector('input')).toBeNull();
 });
});
