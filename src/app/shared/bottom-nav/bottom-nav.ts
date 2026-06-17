import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Navegación inferior global y persistente. */
@Component({
  selector: 'app-bottom-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      <a class="nav-i" routerLink="/pollas" routerLinkActive="on">
        <i class="ti ti-trophy"></i><span>Pollas</span>
      </a>
      <a class="nav-i" routerLink="/partidos" routerLinkActive="on">
        <i class="ti ti-ball-football"></i><span>Partidos</span>
      </a>
      <a class="nav-i" routerLink="/tabla" routerLinkActive="on">
        <i class="ti ti-list-numbers"></i><span>Tabla</span>
      </a>
      <a class="nav-i" routerLink="/pozo" routerLinkActive="on">
        <i class="ti ti-coin"></i><span>Pozo</span>
      </a>
      <a class="nav-i" routerLink="/perfil" routerLinkActive="on">
        <i class="ti ti-user"></i><span>Perfil</span>
      </a>
    </nav>
  `,
  styles: `
    .nav {
      display: flex;
      justify-content: space-around;
      gap: 2px;
      margin: 0 10px calc(10px + env(safe-area-inset-bottom));
      padding: 7px 6px;
      background: var(--color-background-primary);
      border: 1px solid var(--color-border-tertiary);
      border-radius: 24px;
      box-shadow: 0 12px 30px -12px rgba(0, 0, 0, 0.55);
    }
    .nav-i {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--color-text-tertiary);
      text-decoration: none;
      flex: 1;
      min-height: 46px;
      justify-content: center;
      border-radius: 16px;
      padding: 5px 2px;
      transition: color 150ms cubic-bezier(0, 0, 0.2, 1), background-color 150ms cubic-bezier(0, 0, 0.2, 1);
    }
    .nav-i i { font-size: 20px; }
    .nav-i.on { color: var(--color-text-success); background: var(--color-background-success); }
  `,
})
export class BottomNav {}
