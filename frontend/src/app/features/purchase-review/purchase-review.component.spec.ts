import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {PurchaseReviewComponent} from './purchase-review.component';
import {CustomAlertService} from '../../core/services/custom-alert.service';
describe('PurchaseReviewComponent',()=>{
 let http:HttpTestingController;let alerts:{success:jasmine.Spy;error:jasmine.Spy};
 beforeEach(()=>{alerts={success:jasmine.createSpy(),error:jasmine.createSpy()};TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:CustomAlertService,useValue:alerts}]});http=TestBed.inject(HttpTestingController)});afterEach(()=>http.verify());
 function setup(existing:{status:string}|null=null){const f=TestBed.createComponent(PurchaseReviewComponent);f.componentRef.setInput('orderId',1);f.detectChanges();http.expectOne('http://localhost:8080/orders/1/review').flush(existing);f.detectChanges();return f}
 it('does not show errors initially and requires all four ratings before sending',()=>{const f=setup();expect(f.nativeElement.querySelector('small')).toBeNull();f.componentInstance.submit();f.detectChanges();expect(f.nativeElement.querySelectorAll('small').length).toBe(4);http.expectNone(r=>r.method==='POST')});
 it('submits consent independently and keeps entered values after a failure',()=>{const f=setup();f.componentInstance.form.setValue({overall:5,navigation:4,service:3,experience:5,comment:'Boa compra',publicationConsent:false});f.componentInstance.submit();let req=http.expectOne(r=>r.method==='POST');expect(req.request.body.publicationConsent).toBeFalse();req.flush({message:'Tente novamente'},{status:500,statusText:'Error'});expect(f.componentInstance.form.controls.comment.value).toBe('Boa compra');expect(f.componentInstance.sending()).toBeFalse();f.componentInstance.submit();req=http.expectOne(r=>r.method==='POST');req.flush({});f.detectChanges();expect(f.nativeElement.querySelector('form')).toBeNull();expect(alerts.success).toHaveBeenCalled()});
 it('does not offer a second evaluation for an already reviewed order',()=>{const f=setup({status:'pending'});expect(f.nativeElement.querySelector('form')).toBeNull();expect(f.nativeElement.textContent).toContain('Você já avaliou')});
 it('shows a recoverable read failure and opens the form after retry',()=>{const f=TestBed.createComponent(PurchaseReviewComponent);f.componentRef.setInput('orderId',1);f.detectChanges();http.expectOne('http://localhost:8080/orders/1/review').flush({},{status:500,statusText:'Error'});f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();f.nativeElement.querySelector('[role=alert] button').click();http.expectOne('http://localhost:8080/orders/1/review').flush(null);f.detectChanges();expect(f.nativeElement.querySelector('form')).not.toBeNull()});

});
