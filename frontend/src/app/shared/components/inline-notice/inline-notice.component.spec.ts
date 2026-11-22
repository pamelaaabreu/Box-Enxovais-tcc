import { TestBed } from '@angular/core/testing';
import { InlineNoticeComponent } from './inline-notice.component';
describe('InlineNoticeComponent',()=>{
 it('announces errors without duplicating a live region',()=>{const f=TestBed.createComponent(InlineNoticeComponent);f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();expect(f.nativeElement.querySelector('[aria-live]')).toBeNull();});
 it('announces success as a nonurgent status',()=>{const f=TestBed.createComponent(InlineNoticeComponent);f.componentRef.setInput('kind','success');f.detectChanges();expect(f.nativeElement.querySelector('[role=status].success')).toBeTruthy();});
});
