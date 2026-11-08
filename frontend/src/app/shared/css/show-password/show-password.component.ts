import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-show-password',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './show-password.component.html',
  styleUrl: './show-password.component.css',
})
export class ShowPasswordComponent {
  showPassword = false;

  @Output() visibilityChange = new EventEmitter<boolean>();

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    this.visibilityChange.emit(this.showPassword);
  }
}
