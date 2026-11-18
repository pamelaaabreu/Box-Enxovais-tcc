import { DOCUMENT } from '@angular/common';
import { revealKeyboardFocus } from './shared/accessibility/focus-visibility';
import { Component, ViewEncapsulation, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);

  @HostListener('document:focusin', ['$event.target'])
  onKeyboardFocus(target: EventTarget | null): void {
    revealKeyboardFocus(target, this.document);
  }

  title = 'frontend';
}
