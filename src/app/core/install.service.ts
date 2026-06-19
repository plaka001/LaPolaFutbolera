import { Injectable, signal } from '@angular/core';

/** Evento no estándar de Chrome/Edge para instalar la PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Maneja la instalación de la PWA: captura el prompt nativo (Chrome/Android),
 *  detecta iOS (instalación manual) y si ya corre instalada. */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: BeforeInstallPromptEvent | null = null;
  private readonly DISMISS_KEY = 'lapola.installDismissed';

  readonly canInstall = signal(false); // hay prompt nativo disponible
  readonly isIOS = signal(false); // iOS: se instala desde Compartir → Agregar a inicio
  readonly isStandalone = signal(false); // ya corre instalada
  readonly dismissed = signal(false); // el usuario cerró el banner

  constructor() {
    if (typeof window === 'undefined') return;
    const nav = navigator as Navigator & { standalone?: boolean };
    this.isStandalone.set(
      window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
    );
    this.isIOS.set(/iphone|ipad|ipod/i.test(nav.userAgent || ''));
    try {
      this.dismissed.set(localStorage.getItem(this.DISMISS_KEY) === '1');
    } catch {
      /* sin storage */
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
    });
  }

  /** ¿Ofrecer instalar? No si ya está instalada. */
  offer(): boolean {
    return !this.isStandalone() && (this.canInstall() || this.isIOS());
  }

  /** Dispara el prompt nativo. Devuelve true si el usuario aceptó. */
  async install(): Promise<boolean> {
    if (!this.deferred) return false;
    await this.deferred.prompt();
    const { outcome } = await this.deferred.userChoice;
    this.deferred = null;
    this.canInstall.set(false);
    return outcome === 'accepted';
  }

  dismiss() {
    this.dismissed.set(true);
    try {
      localStorage.setItem(this.DISMISS_KEY, '1');
    } catch {
      /* sin storage */
    }
  }
}
