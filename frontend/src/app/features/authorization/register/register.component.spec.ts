import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { AuthComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { CustomAlertService } from '../../../core/services/custom-alert.service';

describe('Authentication presentation', () => {
  const pending = new Subject<any>();
  beforeEach(() => TestBed.configureTestingModule({
    imports: [AuthComponent],
    providers: [provideRouter([]), provideNoopAnimations(),
      {provide: ActivatedRoute, useValue: {data: of({selectedTab: 0}), snapshot: {data: {selectedTab: 0}, queryParamMap: {get: () => null}}}},
      {provide: AuthService, useValue: {login: () => pending}},
      {provide: CustomAlertService, useValue: {error: () => {}}}],
  }));
  async function render() {
    const fixture = TestBed.createComponent(AuthComponent);
    fixture.nativeElement.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:99999';
    fixture.detectChanges();
    await fixture.whenStable();
    await document.fonts.ready;
    fixture.detectChanges();
    return fixture;
  }
  it('keeps card height and tab position stable across login, skeleton and registration', async () => {
    const fixture = await render();
    const host: HTMLElement = fixture.nativeElement;
    const measure = () => {
      const card = host.querySelector('.auth-card')!.getBoundingClientRect();
      const tabs = host.querySelector('.auth-tabs')!.getBoundingClientRect();
      const form = host.querySelector('.auth-form')!.getBoundingClientRect();
      return {height: card.height, top: tabs.top, width: tabs.width, form: form.width};
    };
    const login = measure();
    fixture.componentInstance.isInitialLoading.set(true);
    fixture.detectChanges();
    expect(host.querySelector('.auth-form-shell')!.hasAttribute('inert')).toBeTrue();
    expect(measure()).toEqual(login);
    fixture.componentInstance.isInitialLoading.set(false);
    fixture.componentInstance.selectedTab = 1;
    fixture.detectChanges();
    await fixture.whenStable();
    const register = measure();
    expect(host.querySelector('.auth-form-shell')!.hasAttribute('inert')).toBeFalse();
    expect(Math.abs(register.width - register.form)).toBeLessThan(1);
    if (innerWidth > 1000) {
      expect(Math.abs(register.height - login.height)).toBeLessThan(1);
      expect(Math.abs(register.top - login.top)).toBeLessThan(1);
    }
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    console.log('AUTH_LAYOUT', JSON.stringify({viewport: [innerWidth, innerHeight], login, register}));
    fixture.destroy();
  });
  it('reuses the video element when navigating between the real auth routes', async () => {
    TestBed.configureTestingModule({providers: [provideRouter(routes.filter(route => !!route.matcher))]});
    const harness = await RouterTestingHarness.create();
    const login = await harness.navigateByUrl('/login', AuthComponent);
    const video = harness.routeNativeElement!.querySelector('video');
    expect(video).not.toBeNull();
    const registration = await harness.navigateByUrl('/register', AuthComponent);
    expect(registration).toBe(login);
    expect(registration.selectedTab).toBe(1);
    expect(harness.routeNativeElement!.querySelector('video')).toBe(video);
    await harness.navigateByUrl('/login', AuthComponent);
    expect(login.selectedTab).toBe(0);
    expect(harness.routeNativeElement!.querySelector('video')).toBe(video);
  });
  it('keeps the static fallback and avoids loading video for reduced motion', async () => {
    const original = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake(query => query.includes('prefers-reduced-motion')
      ? {matches: true, addEventListener: () => {}, removeEventListener: () => {}} as unknown as MediaQueryList
      : original(query));
    const fixture = await render();
    const video: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    expect(video.getAttribute('src')).toBeNull();
    expect(video.poster).toContain('/login-form.png');
    expect(video.muted).toBeTrue();
    expect(video.loop).toBeTrue();
    expect(video.hasAttribute('playsinline')).toBeTrue();
    expect(video.style.visibility).toBe('hidden');
    expect(fixture.nativeElement.querySelector('.welcome-illustration img').getAttribute('src')).toBe('/login-form.png');
    fixture.destroy();
  });
  it('shows loading inside the disabled button without changing its size', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    expect(component.isInitialLoading()).toBeFalse();
    component.loginForm.setValue({email: 'test@example.com', password: 'password'});
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-button');
    const before = button.getBoundingClientRect();
    component.submitLogin();
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    expect(button.querySelector('.auth-spin')).not.toBeNull();
    expect(button.textContent).toContain('Entrando...');
    expect(button.getBoundingClientRect().height).toBe(before.height);
    expect(button.getBoundingClientRect().width).toBe(before.width);
    expect(component.isInitialLoading()).toBeFalse();
    pending.error({error: {success: false, message: 'Falha de teste'}});
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    expect(button.querySelector('.auth-spin')).toBeNull();
    fixture.destroy();
  });
});


describe('Registration validation', () => {
 let auth: jasmine.SpyObj<AuthService>;
 let alerts: jasmine.SpyObj<CustomAlertService>;
 beforeEach(() => {
  auth=jasmine.createSpyObj('AuthService',['register']);
  alerts=jasmine.createSpyObj('CustomAlertService',['warning','error','success','loading','hideLoading','showEmailDuplicate']);
  TestBed.configureTestingModule({imports:[AuthComponent],providers:[provideRouter([]),provideNoopAnimations(),
   {provide:ActivatedRoute,useValue:{data:of({selectedTab:1}),snapshot:{data:{selectedTab:1}}}},
   {provide:AuthService,useValue:auth},{provide:CustomAlertService,useValue:alerts}]});
 });
 function setup() {
  const fixture=TestBed.createComponent(AuthComponent); const c=fixture.componentInstance;
  c.isInitialLoading.set(false);
  c.registerForm.setValue({name:'Maria Silva',email:'maria@example.com',password:'Senha1@x',confirmPassword:'Senha1@x',terms:true});
  fixture.detectChanges(); return {fixture,c};
 }
 for(const [field,value] of [['name','Maria'],['email','invalid'],['password','weak'],['confirmPassword','different'],['terms',false],['password','Senha1@'+'é'.repeat(34)]] as const) {
  it(`blocks invalid ${field} without redundant toast`,()=>{
   const {fixture,c}=setup();c.registerForm.get(field)!.setValue(value);fixture.detectChanges();
   expect(fixture.nativeElement.querySelector('.submit-button').disabled).toBeTrue();
   c.submitRegister();expect(auth.register).not.toHaveBeenCalled();expect(alerts.warning).not.toHaveBeenCalled();
   expect(c.registerForm.touched).toBeTrue();fixture.destroy();
  });
 }
 it('enables valid registration and blocks duplicate requests while pending',()=>{
  const {fixture,c}=setup();const request=new Subject<any>();auth.register.and.returnValue(request);
  expect(fixture.nativeElement.querySelector('.submit-button').disabled).toBeFalse();
  c.submitRegister();c.submitRegister();fixture.detectChanges();
  expect(auth.register).toHaveBeenCalledTimes(1);expect(fixture.nativeElement.querySelector('.submit-button').disabled).toBeTrue();
  request.error({status:500});expect(alerts.error).toHaveBeenCalled();expect(c.isLoading).toBeFalse();fixture.destroy();
 });
 it('shows duplicate email inline and clears it when the email changes',()=>{
  const {fixture,c}=setup();auth.register.and.returnValue(throwError(()=>({status:409,error:{success:false,message:'email_duplicado'}})));
  c.submitRegister();fixture.detectChanges();expect(c.registerForm.controls.email.hasError('emailDuplicate')).toBeTrue();
  expect(fixture.nativeElement.textContent).toContain('Este e-mail já está cadastrado.');
  expect(alerts.showEmailDuplicate).not.toHaveBeenCalled();expect(alerts.error).not.toHaveBeenCalled();
  c.registerForm.controls.email.setValue('other@example.com');expect(c.registerForm.valid).toBeTrue();fixture.destroy();
 });
});
