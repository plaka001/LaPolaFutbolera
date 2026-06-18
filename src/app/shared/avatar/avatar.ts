import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Avatar del jugador: foto (avatar_url) con fallback a iniciales.
 *  El tamaño lo da el padre (width/height sobre `app-avatar`); el color de las
 *  iniciales se puede ajustar con las vars --av-bg / --av-fg. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url() && !broken()) {
      <img class="img" [src]="url()!" [alt]="name()" loading="lazy" (error)="broken.set(true)" />
    } @else {
      <span class="ini">{{ initials() }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; width: 34px; height: 34px; flex-shrink: 0; }
    .img, .ini { width: 100%; height: 100%; border-radius: 50%; }
    .img { object-fit: cover; background: var(--color-background-secondary); }
    .ini {
      display: flex; align-items: center; justify-content: center;
      background: var(--av-bg, var(--color-background-secondary));
      color: var(--av-fg, var(--color-text-primary));
      border: 0.5px solid var(--color-border-secondary);
      font-family: var(--font-display); font-weight: 600; font-size: var(--av-fs, 12px);
    }
  `,
})
export class Avatar {
  readonly url = input<string | null>(null);
  readonly name = input<string>('');
  readonly broken = signal(false);
  readonly initials = computed(() => {
    const p = this.name().trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : (p[0]?.[1] ?? ''))).toUpperCase() || 'JU';
  });
}
