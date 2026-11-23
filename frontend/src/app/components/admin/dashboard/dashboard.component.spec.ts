import type { BarSeriesOption, PieSeriesOption, XAXisComponentOption } from 'echarts';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController,provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,Router,convertToParamMap,provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { Dashboard } from './models/dashboard.models';
type CategoryAxis = XAXisComponentOption & { data: string[] };
describe('DashboardComponent',()=>{
 const url='http://localhost:8080/admin/dashboard';let query:BehaviorSubject<ReturnType<typeof convertToParamMap>>;
 const summary=(changes:Partial<Dashboard>={}):Dashboard=>({orders:0,approvedOrders:0,cancelledOrders:0,revenueCents:0,averageTicketCents:0,products:0,activeProducts:0,lowStock:0,outOfStock:0,customers:0,newCustomers:0,customersWithOrders:0,period:{preset:'30d',from:'2026-01-01T03:00:00Z',until:'2026-02-01T03:00:00Z',group:'day',timezone:'America/Sao_Paulo'},series:[{bucket:'2026-01-01',orders:0,approved:0,cancelled:0,revenueCents:0,customers:0}],months:[],categories:[],topProducts:[],stock:[],recentOrders:[],...changes});
 beforeEach(()=>{query=new BehaviorSubject(convertToParamMap({}));TestBed.configureTestingModule({imports:[DashboardComponent],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),{provide:ActivatedRoute,useValue:{queryParamMap:query}}]});});
 afterEach(()=>TestBed.inject(HttpTestingController).verify());
 const request=()=>TestBed.inject(HttpTestingController).expectOne(r=>r.url===url);
 it('shows six skeletons, retry and honest empty states',()=>{const f=TestBed.createComponent(DashboardComponent);f.detectChanges();expect(f.nativeElement.querySelectorAll('.skeleton').length).toBe(6);request().flush({},{status:503,statusText:'Unavailable'});f.detectChanges();const retry=[...f.nativeElement.querySelectorAll('button')].find((b:HTMLButtonElement)=>b.textContent?.includes('Tentar novamente')) as HTMLButtonElement;retry.click();request().flush(summary());f.detectChanges();expect(f.nativeElement.querySelectorAll('.metric').length).toBe(6);expect(f.nativeElement.textContent).toContain('Nenhum pedido registrado');expect(f.nativeElement.querySelector('a[href="/admin/products/manage"]')).not.toBeNull();});
 it('renders real amounts, current metrics, status and historical rankings',()=>{const f=TestBed.createComponent(DashboardComponent);request().flush(summary({orders:2,approvedOrders:1,cancelledOrders:1,revenueCents:12345,averageTicketCents:12345,products:3,activeProducts:2,lowStock:1,customers:2,newCustomers:1,series:[{bucket:'2026-01-01',orders:2,approved:1,cancelled:1,revenueCents:12345,customers:1}],categories:[{name:'Cama',units:4}],topProducts:[{productId:7,name:'Nome histórico',units:4,revenueCents:12345,archived:true}]}));f.detectChanges();expect(f.nativeElement.textContent).toContain('123,45');expect(f.nativeElement.querySelectorAll('app-echart').length).toBe(6);const bars=f.componentInstance.productsOption().series as BarSeriesOption[];expect(bars[0].data).toEqual([4]);const axis=f.componentInstance.productsOption().yAxis as CategoryAxis;expect(axis.data).toEqual(['Nome histórico (arquivado)']);});
 it('restores custom dates and grouping from URL',()=>{query.next(convertToParamMap({period:'custom',dateFrom:'2026-01-01',dateTo:'2026-03-01',group:'month'}));const f=TestBed.createComponent(DashboardComponent);const req=request();expect(req.request.params.get('dateTo')).toBe('2026-03-01');expect(req.request.params.get('group')).toBe('month');expect(f.componentInstance.filter.controls.period.value).toBe('custom');req.flush(summary());});
 it('cancels obsolete requests and does not accept late results',()=>{const f=TestBed.createComponent(DashboardComponent);const previous=request();query.next(convertToParamMap({period:'7d'}));expect(previous.cancelled).toBeTrue();const next=request();expect(next.request.params.get('period')).toBe('7d');next.flush(summary({orders:3}));expect(f.componentInstance.data()?.orders).toBe(3);});
 it('applies shared controls through URL without including irrelevant custom dates',()=>{const f=TestBed.createComponent(DashboardComponent);request().flush(summary());const nav=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);f.componentInstance.filter.controls.period.setValue('7d');f.componentInstance.apply();const params=nav.calls.mostRecent().args[1]?.queryParams;expect(params?.['period']).toBe('7d');expect(params?.['dateFrom']).toBeUndefined();});
 it('shows validation errors from the API without losing filters',()=>{query.next(convertToParamMap({period:'custom',dateFrom:'2026-02-01',dateTo:'2026-01-01'}));const f=TestBed.createComponent(DashboardComponent);request().flush({message:'Informe uma data final válida.'},{status:400,statusText:'Bad Request'});f.detectChanges();expect(f.nativeElement.textContent).toContain('Informe uma data final válida.');expect(f.componentInstance.filter.controls.dateFrom.value).toBe('2026-02-01');});
 it('preserves recent order navigation',()=>{const f=TestBed.createComponent(DashboardComponent);request().flush(summary({recentOrders:[{id:8,customer:'Cliente',createdAt:'2026-01-01T12:00:00Z',status:'cancelled',totalCents:1000}]}));f.detectChanges();for(const path of ['/admin/orders/8'])expect(f.nativeElement.querySelector(`a[href="${path}"]`)).not.toBeNull();});
 it('uses bucket labels and converts revenue cents only once',()=>{
  const f=TestBed.createComponent(DashboardComponent);
  request().flush(summary({series:[{bucket:'2026-01-03',orders:3,approved:2,cancelled:1,revenueCents:12345,customers:2}]}));
  expect((f.componentInstance.revenueOption().series as BarSeriesOption[])[0].data).toEqual([123.45]);
  expect((f.componentInstance.ordersOption().series as BarSeriesOption[])[0].data).toEqual([3]);
  expect((f.componentInstance.customersOption().series as BarSeriesOption[])[0].data).toEqual([2]);
  expect((f.componentInstance.revenueOption().xAxis as CategoryAxis).data).toEqual(['03/01']);
  f.componentInstance.data.update(d=>d ? {...d,period:{...d.period,group:'month'}} : d);
  expect((f.componentInstance.revenueOption().xAxis as CategoryAxis).data).toEqual(['01/2026']);
 });
 it('omits empty donut segments and keeps full ranking names',()=>{
  const f=TestBed.createComponent(DashboardComponent);
  request().flush(summary({orders:3,approvedOrders:3,topProducts:[{productId:1,name:'Jogo de cama com nome longo',units:8,revenueCents:1,archived:false}],categories:[{name:'Cama',units:8}]}));
  const series=f.componentInstance.statusOption().series as PieSeriesOption[];
  expect(series[0].type).toBe('pie');
  expect(series[0].data?.length).toBe(1);
  expect((f.componentInstance.categoriesOption().yAxis as CategoryAxis).data).toEqual(['Cama']);
  for(const option of [f.componentInstance.revenueOption(),f.componentInstance.customersOption(),f.componentInstance.ordersOption()]){
   expect((option.xAxis as CategoryAxis).type).toBe('category');
   expect((option.series as BarSeriesOption[])[0].type).toBe('bar');
  }
 });

 it('uses horizontal rankings and groups stock without changing totals',()=>{
  const f=TestBed.createComponent(DashboardComponent);
  request().flush(summary({stock:[
   {productId:1,variantId:2,name:'Produto',size:'Casal',quantity:1,totalQuantity:4},
   {productId:1,variantId:3,name:'Produto',size:'Queen',quantity:3,totalQuantity:4},
  ]}));
  for(const option of [f.componentInstance.productsOption(),f.componentInstance.categoriesOption()]){
   expect((option.xAxis as XAXisComponentOption).type).toBe('value');
   expect((option.yAxis as XAXisComponentOption).type).toBe('category');
  }
  expect(f.componentInstance.stockGroups().length).toBe(1);
  expect(f.componentInstance.stockGroups()[0].totalQuantity).toBe(4);
  f.detectChanges();
  expect(f.nativeElement.querySelectorAll('.stock-table tbody tr').length).toBe(2);
  expect(f.nativeElement.querySelector('td[rowspan="2"]')).not.toBeNull();
  expect(f.nativeElement.querySelectorAll('.stock-card').length).toBe(1);
  expect(f.nativeElement.querySelectorAll('.stock-card__variant').length).toBe(2);
 });
 it('keeps every daily bucket with horizontal readable labels and no visual zoom',()=>{
  const f=TestBed.createComponent(DashboardComponent);
  request().flush(summary({series:Array.from({length:30},(_,index)=>({bucket:`2026-11-${String(index+1).padStart(2,'0')}`,orders:1,approved:1,cancelled:0,revenueCents:100,customers:1}))}));
  const option=f.componentInstance.revenueOption();
  expect((option.xAxis as CategoryAxis).data.length).toBe(30);
  expect((option.series as BarSeriesOption[])[0].data?.length).toBe(30);
  expect(option.dataZoom).toBeUndefined();
  expect((option.xAxis as CategoryAxis).axisLabel?.rotate).toBe(0);
  expect(f.componentInstance.displayedPeriod()).toEqual({from:'01/01/2026',until:'31/01/2026'});
 });

 it('keeps all bar values in tooltips with labels hidden and distinct visual palettes',()=>{
  const f=TestBed.createComponent(DashboardComponent);request().flush(summary());
  const options=[f.componentInstance.revenueOption(),f.componentInstance.customersOption(),f.componentInstance.ordersOption(),f.componentInstance.productsOption(),f.componentInstance.categoriesOption()];
  for(const option of options){expect((option.series as BarSeriesOption[])[0].label?.show).toBeFalse();expect(option.tooltip).toBeDefined();}
  const legend=f.componentInstance.statusOption().legend as {top?:number;bottom:number;orient:string};
  expect(legend.bottom).toBe(0);expect(legend.top).toBeUndefined();expect(legend.orient).toBe('horizontal');
 });
 it('separates customer and timestamp and preserves the full stock product name',()=>{
  const f=TestBed.createComponent(DashboardComponent);request().flush(summary({recentOrders:[{id:40,customer:'Cliente demonstrativo 20',createdAt:'2026-11-22T18:35:00Z',status:'simulated_approved',totalCents:28980}],stock:[{productId:1,variantId:2,name:'Produto com nome completo',size:'Queen',quantity:2,totalQuantity:2}]}));f.detectChanges();
  expect(f.nativeElement.querySelector('.recent-orders__customer').textContent).toContain('Cliente demonstrativo 20');
  expect(f.nativeElement.querySelector('time').textContent).toContain('22/11/2026 às 15:35');
  expect(f.nativeElement.querySelector('.stock-table__name').textContent).toContain('Produto com nome completo');
 });
});
