import { TestBed } from '@angular/core/testing';
import { TrustBarComponent } from './trust-bar.component';

describe('TrustBarComponent',()=>{
 it('presents four independent benefits without unconfigured commercial promises',()=>{
  const fixture=TestBed.createComponent(TrustBarComponent);fixture.detectChanges();
  const root=fixture.nativeElement as HTMLElement;
  expect([...root.querySelectorAll('h2')].map(e=>e.textContent)).toEqual(['Compra segura','Pagamento','Entrega','Atendimento']);
  const icons=[...root.querySelectorAll('mat-icon')];
  expect(icons.map(icon=>icon.textContent?.trim())).toEqual(['encrypted','barcode','location_on','support_agent']);
  expect(icons.every(icon=>icon.classList.contains('material-symbols-outlined'))).toBeTrue();
  expect(root.querySelector('.material-icons-outlined')).toBeNull();
  expect(root.textContent).not.toMatch(/frete grátis|parcelamento|sem juros/i);
 });
});
