import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Escudo del equipo: por ahora un código de 3 letras (como en los mockups);
 *  cuando entre la API se reemplaza por el logo real. */
@Component({
  selector: 'app-team-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="circ" [title]="name()">{{ code() }}</span>
    <span class="tname">{{ name() }}</span>
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .circ {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--color-background-secondary);
      border: 0.5px solid var(--color-border-secondary);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display);
      font-size: 13px; font-weight: 600; color: var(--color-text-primary);
    }
    .tname { font-size: 12.5px; color: var(--color-text-primary); text-align: center; }
  `,
})
export class TeamBadge {
  readonly name = input.required<string>();
  readonly code = computed(() =>
    this.name()
      .normalize('NFD')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase(),
  );
}
