import { fakeAsync, tick, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../core/services/auth.service';

import { Router, NavigationStart } from '@angular/router';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { CustomAlertComponent } from '../custom-alert/custom-alert.component';

describe('ResetPasswordComponent recovery', () => {
 let component: ResetPasswordComponent;
 let auth: jasmine.SpyObj<AuthService>;
 let router: { events: Subject<any>; navigate: jasmine.Spy };
 let alerts: jasmine.SpyObj<CustomAlertService>;
 let toast: CustomAlertComponent;

 beforeEach(() => {
  auth=jasmine.createSpyObj('AuthService',['getPasswordResetToken','validateResetToken','resetPassword','clearPasswordResetToken']);
  router = { events: new Subject(), navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };
  toast = new CustomAlertComponent();
  alerts = jasmine.createSpyObj('CustomAlertService', ['success']);
  alerts.success.and.callFake((_title, _message, options) => {
   toast.duration = options!.duration!;
   return { instance: toast, hostView: { destroyed: false }, setInput: () => {},
    changeDetectorRef: { detectChanges: () => toast.ngOnInit() } } as any;
  });
  TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:auth}, {provide:Router,useValue:router}, {provide:CustomAlertService,useValue:alerts}]});
  component=TestBed.runInInjectionContext(()=>new ResetPasswordComponent());
 });
 it('refuses missing verification credentials',()=>{
  auth.getPasswordResetToken.and.returnValue(null); component.ngOnInit(); component.onSubmit();
  expect(component.isInvalid).toBeTrue(); expect(auth.resetPassword).not.toHaveBeenCalled();
 });
 afterEach(() => toast.ngOnDestroy());
 it('updates once and redirects only when the toast expires',fakeAsync(()=>{
  auth.getPasswordResetToken.and.returnValue('secret'); auth.validateResetToken.and.returnValue(of({}));
  const response=new Subject<any>(); auth.resetPassword.and.returnValue(response);
  component.ngOnInit(); component.resetForm.setValue({newPassword:'Password1@',confirmPassword:'Password1@'});
  component.onSubmit(); component.onSubmit();
  expect(auth.resetPassword).toHaveBeenCalledOnceWith('secret','Password1@');
  tick(4000); expect(alerts.success).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled();
  response.next({success:true}); response.complete();
  expect(component.resetForm.disabled).toBeTrue(); expect(component.isLoading).toBeFalse();
  component.onSubmit(); expect(auth.resetPassword).toHaveBeenCalledTimes(1);
  tick(2999); expect(router.navigate).not.toHaveBeenCalled();
  tick(1); expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  tick(100);
  expect(component.isSuccess).toBeTrue(); expect(auth.clearPasswordResetToken).toHaveBeenCalled();
 }));
 it('does not discard the token for a transient API error',()=>{
  auth.getPasswordResetToken.and.returnValue('secret');
  auth.validateResetToken.and.returnValue(throwError(()=>new HttpErrorResponse({status:0})));
  component.ngOnInit(); expect(component.isInvalid).toBeFalse(); expect(component.submitError).toBeTruthy();
  expect(auth.clearPasswordResetToken).not.toHaveBeenCalled();
 });
 for (const reason of ['navigation', 'destroy']) {
  it(`cancels redirect on ${reason}`, fakeAsync(() => {
   auth.getPasswordResetToken.and.returnValue('secret'); auth.validateResetToken.and.returnValue(of({}));
   auth.resetPassword.and.returnValue(of({} as any));
   component.ngOnInit(); component.resetForm.setValue({newPassword:'Password1@',confirmPassword:'Password1@'});
   component.onSubmit(); tick(1000);
   if(reason === 'navigation') router.events.next(new NavigationStart(1, '/home'));
   else TestBed.resetTestingModule();
   tick(4000); expect(router.navigate).not.toHaveBeenCalled();
  }));
 }
 it('keeps entered values and does not show success after a reset error', () => {
  auth.getPasswordResetToken.and.returnValue('secret'); auth.validateResetToken.and.returnValue(of({}));
  auth.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({status:500})));
  component.ngOnInit(); component.resetForm.setValue({newPassword:'Password1@',confirmPassword:'Password1@'});
  component.onSubmit(); expect(component.resetForm.enabled).toBeTrue();
  expect(component.resetForm.controls.newPassword.value).toBe('Password1@');
  expect(component.submitError).toBeTruthy(); expect(alerts.success).not.toHaveBeenCalled();
 });

});
