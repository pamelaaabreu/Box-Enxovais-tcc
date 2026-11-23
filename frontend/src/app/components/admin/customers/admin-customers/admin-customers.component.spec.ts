import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,Router,provideRouter,convertToParamMap } from '@angular/router';
import { BehaviorSubject,Subject,of,throwError } from 'rxjs';
import { AdminCustomersComponent } from './admin-customers.component';
import { AdminCustomersService } from '../services/admin-customers.service';
import type { CustomerPage } from '../models/customer.models';
describe('AdminCustomersComponent',()=>{
 let query:BehaviorSubject<ReturnType<typeof convertToParamMap>>;let api:jasmine.SpyObj<AdminCustomersService>;
 beforeEach(()=>{query=new BehaviorSubject(convertToParamMap({}));api=jasmine.createSpyObj('customers',['list']);api.list.and.returnValue(of({customers:[],total:0,withOrders:0,withoutOrders:0}));TestBed.configureTestingModule({imports:[AdminCustomersComponent],providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{queryParamMap:query}},{provide:AdminCustomersService,useValue:api}]});});
 it('restores page and query from URL',()=>{query.next(convertToParamMap({page:'2',search:'Ana'}));const c=TestBed.createComponent(AdminCustomersComponent).componentInstance;expect(api.list).toHaveBeenCalledWith(2,'Ana');expect(c.search.value).toBe('Ana');});
 it('submits the native form and returns to page one',()=>{const fixture=TestBed.createComponent(AdminCustomersComponent);fixture.detectChanges();const navigate=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);fixture.componentInstance.search.setValue('Ana');fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));expect(navigate.calls.mostRecent().args[1]?.queryParams?.['page']).toBe(1);});
 it('discards stale search responses',()=>{const first=new Subject<CustomerPage>();api.list.and.returnValue(first);const c=TestBed.createComponent(AdminCustomersComponent).componentInstance;api.list.and.returnValue(of({customers:[],total:2,withOrders:1,withoutOrders:1}));query.next(convertToParamMap({search:'novo'}));first.next({customers:[],total:99,withOrders:0,withoutOrders:99});expect(c.data().total).toBe(2);});
 it('renders a shared empty state and single header',()=>{const f=TestBed.createComponent(AdminCustomersComponent);f.detectChanges();expect(f.nativeElement.textContent).toContain('Nenhum cliente encontrado');expect(f.nativeElement.querySelectorAll('app-admin-page-header').length).toBe(1);});
 it('recovers from API errors',()=>{api.list.and.returnValue(throwError(()=>({status:500})));const f=TestBed.createComponent(AdminCustomersComponent);f.detectChanges();expect(f.componentInstance.error()).toBeTruthy();api.list.and.returnValue(of({customers:[],total:0,withOrders:0,withoutOrders:0}));f.componentInstance.load();expect(f.componentInstance.error()).toBe('');});
});
