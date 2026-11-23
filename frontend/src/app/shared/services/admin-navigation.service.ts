import { Injectable, signal } from '@angular/core';

@Injectable()
export class AdminNavigationService {
  readonly compact = signal(false);
  readonly opened = signal(false);
}
