import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { AlertType } from '../../shared/models';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-custom-alert',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './custom-alert.component.html',
  styleUrls: ['./custom-alert.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
   encapsulation: ViewEncapsulation.None,
})
export class CustomAlertComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() type: AlertType = 'info';
  @Input() duration: number = 2000;
  @Input() showClose: boolean = true;
  @Input() showProgress: boolean = true;
  
  @Input() recoverySuccess = false;
  @Output() elapsed = new EventEmitter<void>();

  @Output() closed = new EventEmitter<void>();

  visible: boolean = false;
  private timeoutId: any;
  private exitTimeoutId?: ReturnType<typeof setTimeout>;
  private closing = false;

  ngOnInit() {
    this.visible = true;
    
    if (this.duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.elapsed.emit();
        this.close();
      }, this.duration);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.exitTimeoutId);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  onClose() {
    this.close();
  }

  private close() {
    if (this.closing) return;
    this.closing = true;
    clearTimeout(this.timeoutId);
    this.visible = false;
    this.exitTimeoutId = setTimeout(() => {
      this.closed.emit();
    }, 90);
  }
}