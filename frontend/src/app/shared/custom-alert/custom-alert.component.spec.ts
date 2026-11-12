import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CustomAlertComponent } from './custom-alert.component';

describe('CustomAlertComponent', () => {
  it('renders an optional action and closes once after running it', fakeAsync(() => {
    const fixture = TestBed.createComponent(CustomAlertComponent);
    const run = jasmine.createSpy('run');
    const closed = spyOn(fixture.componentInstance.closed, 'emit');
    fixture.componentRef.setInput('action', { label: 'Ver sacola', run });
    fixture.componentRef.setInput('message', 'Produto real');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Produto real');
    const action = fixture.nativeElement.querySelector('.alert-action');
    expect(action.textContent).toContain('Ver sacola');
    action.click();
    action.click();
    tick(90);
    expect(run).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
  }));

  it('uses the configured duration for automatic dismissal and progress', fakeAsync(() => {
    const fixture = TestBed.createComponent(CustomAlertComponent);
    const elapsed = spyOn(fixture.componentInstance.elapsed, 'emit');
    fixture.componentRef.setInput('duration', 800);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.progress-bar').style.animationDuration).toBe('800ms');
    tick(799);
    expect(elapsed).not.toHaveBeenCalled();
    tick(91);
    expect(elapsed).toHaveBeenCalledTimes(1);
  }));

  it('announces persistent errors and exposes a manual close button', fakeAsync(() => {
    const fixture = TestBed.createComponent(CustomAlertComponent);
    const closed = spyOn(fixture.componentInstance.closed, 'emit');
    fixture.componentRef.setInput('duration', 0);
    fixture.componentRef.setInput('type', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.alert-progress')).toBeNull();
    tick(8000);
    expect(closed).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('.alert-close').click();
    tick(90);
    expect(closed).toHaveBeenCalledTimes(1);
  }));
});
