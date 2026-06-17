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
      border-top: 0.5px solid var(--color-border-tertiary);
      background: var(--color-background-primary);
      padding: 10px 0 calc(12px + env(safe-area-inset-bottom));
    }
    .nav-i {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: var(--color-text-tertiary);
      text-decoration: none;
      flex: 1;
      min-height: 44px;
      justify-content: center;
      transition: color 150ms cubic-bezier(0, 0, 0.2, 1);
    }
    .nav-i i { font-size: 21px; }
    .nav-i.on { color: var(--color-text-success); }
  `,
})
export class BottomNav {}
