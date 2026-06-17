import { Injectable, signal } from '@angular/core';

/** Polla "activa": la que el usuario abrió. La usan Partidos/Tabla/Pozo
 *  (el nav inferior es global, así que necesitamos saber sobre qué polla operar). */
@Injectable({ providedIn: 'root' })
export class PollaContextService {
  private readonly KEY = 'lapola.activePolla';
  readonly activePollaId = signal<string | null>(this.read());

  private read(): string | null {
    try {
      return localStorage.getItem(this.KEY);
    } catch {
      return null;
    }
  }

  setActive(id: string) {
    this.activePollaId.set(id);
    try {
      localStorage.setItem(this.KEY, id);
    } catch {
      /* sin storage */
    }
  }
}
