import { TestBed } from '@angular/core/testing';
import { DashboardTrendComponent } from '../../dashboard-trend.component';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt,'pt-BR');
describe('DashboardTrendComponent',()=>{
 it('provides an accessible textual alternative to the plotted values',()=>{const f=TestBed.createComponent(DashboardTrendComponent);f.componentRef.setInput('title','Faturamento');f.componentRef.setInput('field','revenueCents');f.componentRef.setInput('series',[{bucket:'2026-01-01',orders:1,approved:1,cancelled:0,revenueCents:1250,customers:1}]);f.detectChanges();expect(f.nativeElement.querySelector('app-chart [role=img]')?.getAttribute('aria-label')).toContain('tabela');expect(f.nativeElement.querySelector('details table')?.textContent).toContain('12,50');expect(f.componentInstance.values()).toEqual([1250]);});
 it('handles an empty series without accessing missing points',()=>{const f=TestBed.createComponent(DashboardTrendComponent);f.componentRef.setInput('title','Clientes');f.componentRef.setInput('field','customers');f.componentRef.setInput('series',[]);f.detectChanges();expect(f.componentInstance.total()).toBe(0);expect(f.nativeElement.querySelector('app-chart')).toBeNull();});
});
