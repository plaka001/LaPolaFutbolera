import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNav } from '../shared/bottom-nav/bottom-nav';

/** Shell global de la zona autenticada: contenido scrolleable + nav inferior fijo. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, BottomNav],
  template: `
    <div class="shell">
      <main class="content"><router-outlet /></main>
      <app-bottom-nav />
    </div>
  `,
  styles: `
    .shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-width: 480px;
      margin: 0 auto;
      background: transparent;
    }
    .content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding-top: env(safe-area-inset-top);
    }
  `,
})
export class AppShell {}
