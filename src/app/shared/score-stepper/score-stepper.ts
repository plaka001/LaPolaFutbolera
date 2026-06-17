import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Selector de goles con flechas (▲/▼). Emite el nuevo valor (0–30). */
@Component({
  selector: 'app-score-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!locked()) {
      <button class="step" type="button" (click)="bump(1)" aria-label="Subir gol"><i class="ti ti-chevron-up"></i></button>
    }
    <div class="sbox" [class.empty]="value() === null" [class.open]="!locked()" [class.lock]="locked()">
      {{ display() }}
    </div>
    @if (!locked()) {
      <button class="step" type="button" (click)="bump(-1)" aria-label="Bajar gol"><i class="ti ti-chevron-down"></i></button>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .step {
      width: 30px; height: 22px; border: 0.5px solid var(--color-border-secondary);
      background: transparent; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--color-text-secondary); padding: 0;
      transition: transform 100ms cubic-bezier(0,0,0.2,1);
    }
    .step:active { transform: scale(0.92); }
    .step i { font-size: 15px; }
    .sbox {
      width: 44px; height: 44px; border-radius: var(--border-radius-md);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-size: 22px; font-weight: 600;
      border: 1.5px solid var(--color-border-tertiary); color: var(--color-text-primary);
    }
    .sbox.open { border-color: var(--color-border-success); }
    .sbox.empty { color: var(--color-text-tertiary); font-weight: 500; }
    .sbox.lock { background: var(--color-background-tertiary); border-color: var(--color-border-tertiary); color: var(--color-text-tertiary); }
  `,
})
export class ScoreStepper {
  readonly value = input<number | null>(null);
  readonly locked = input(false);
  readonly changed = output<number>();

  readonly display = computed(() => (this.value() === null ? '–' : String(this.value())));

  bump(delta: number) {
    const current = this.value() ?? 0;
    const next = Math.max(0, Math.min(30, current + delta));
    this.changed.emit(next);
  }
}
