import {TestBed} from '@angular/core/testing';
import {NgForm} from '@angular/forms';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {NewsletterComponent} from './newsletter.component';
import {CustomAlertService} from '../../core/services/custom-alert.service';
describe('NewsletterComponent',()=>{it('confirms registration without promising a coupon and avoids duplicate requests',()=>{const alerts={success:jasmine.createSpy(),error:jasmine.createSpy()};TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:CustomAlertService,useValue:alerts}]});const f=TestBed.createComponent(NewsletterComponent);const http=TestBed.inject(HttpTestingController);const reset=jasmine.createSpy();const form={valid:true,value:{email:'newsletter@example.invalid'},reset} as unknown as NgForm;f.componentInstance.onSubmit(form);f.componentInstance.onSubmit(form);const req=http.expectOne('http://localhost:8080/api/newsletter/subscribe');expect(req.request.body.email).toBe('newsletter@example.invalid');req.flush({});expect(alerts.success).toHaveBeenCalled();expect(JSON.stringify(alerts.success.calls.allArgs())).not.toContain('cupom');expect(reset).toHaveBeenCalled();http.verify()})});
