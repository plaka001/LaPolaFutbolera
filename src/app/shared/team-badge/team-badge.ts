import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Escudo/bandera del equipo. Si hay logo (crest de football-data.org) lo muestra;
 *  si no hay o la imagen falla, cae al código de 3 letras (como en los mockups). */
@Component({
  selector: 'app-team-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (logo() && !broken()) {
      <span class="circ img"><img [src]="logo()!" [alt]="name()" loading="lazy" (error)="broken.set(true)" /></span>
    } @else {
      <span class="circ" [title]="name()">{{ code() }}</span>
    }
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
      overflow: hidden;
    }
    .circ.img { background: transparent; border: 0; }
    .circ img { width: 100%; height: 100%; object-fit: contain; }
    .tname { font-size: 12.5px; color: var(--color-text-primary); text-align: center; }
  `,
})
export class TeamBadge {
  readonly name = input.required<string>();
  readonly logo = input<string | null>(null);
  readonly broken = signal(false);
  readonly code = computed(() =>
    this.name()
      .normalize('NFD')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase(),
  );
}
