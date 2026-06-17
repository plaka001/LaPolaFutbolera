import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import {
  Competition,
  Polla,
  PollaMember,
  PrizeDistribution,
  PrizeType,
} from './models/models';

/** Miembro de una polla con su perfil embebido (para el Pozo). */
export interface PollaMemberRow extends PollaMember {
  profile: { display_name: string | null; nickname: string | null; avatar_url: string | null } | null;
}

/** Polla con datos embebidos para las tarjetas del home. */
export interface PollaCard extends Polla {
  competition: { name: string; logo_url: string | null } | null;
  members: { count: number }[];
}

export interface CreatePollaInput {
  name: string;
  competitionId: string | null;
  prizeType: PrizeType;
  entryFee: number;
  prizeDistribution: PrizeDistribution;
  fixedPrize: string | null;
  jokerEnabled: boolean;
}

/** Acceso a pollas: crear, listar las mías, previsualizar y unirse por código. */
@Injectable({ providedIn: 'root' })
export class PollaService {
  private readonly sb = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async listCompetitions(): Promise<Competition[]> {
    const { data, error } = await this.sb.from('competitions').select('*').order('name');
    if (error) throw error;
    return data ?? [];
  }

  /** Pollas donde soy miembro o creador (RLS ya filtra), con competición y #miembros. */
  async myPollas(): Promise<PollaCard[]> {
    const { data, error } = await this.sb
      .from('pollas')
      .select('*, competition:competitions(name, logo_url), members:polla_members(count)')
      .order('created_at', { ascending: false })
      .returns<PollaCard[]>();
    if (error) throw error;
    return data ?? [];
  }

  async getPolla(id: string): Promise<PollaCard> {
    const { data, error } = await this.sb
      .from('pollas')
      .select('*, competition:competitions(name, logo_url), members:polla_members(count)')
      .eq('id', id)
      .single()
      .returns<PollaCard>();
    if (error) throw error;
    return data;
  }

  /** Crea la polla e inscribe al creador como admin (habilitado para jugar). */
  async createPolla(input: CreatePollaInput): Promise<Polla> {
    const uid = this.auth.user()?.id;
    if (!uid) throw new Error('No hay sesión activa.');

    const { data: polla, error } = await this.sb
      .from('pollas')
      .insert({
        name: input.name,
        created_by: uid,
        competition_id: input.competitionId,
        prize_type: input.prizeType,
        entry_fee: input.prizeType === 'pozo' ? input.entryFee : 0,
        prize_distribution: input.prizeDistribution,
        fixed_prize: input.prizeType === 'fijo' ? input.fixedPrize : null,
        joker_enabled: input.jokerEnabled,
      })
      .select('*')
      .single();
    if (error) throw error;

    const { error: memberError } = await this.sb.from('polla_members').insert({
      polla_id: polla.id,
      user_id: uid,
      role: 'admin',
      paid: true,
      paid_at: new Date().toISOString(),
    });
    if (memberError) throw memberError;

    return polla;
  }

  /** Datos públicos mínimos de una polla por código, para la pantalla de unirse. */
  async preview(code: string) {
    const { data, error } = await this.sb.client.rpc('polla_preview', { p_code: code.trim() });
    if (error) throw error;
    return data?.[0] ?? null;
  }

  /** Une al usuario actual a la polla; devuelve el id de la polla. */
  async join(code: string): Promise<string> {
    const { data, error } = await this.sb.client.rpc('join_polla', { p_code: code.trim() });
    if (error) throw error;
    return data as string;
  }

  /** Tabla de posiciones de una polla. */
  async standings(pollaId: string) {
    const { data, error } = await this.sb.client.rpc('polla_standings', { p_polla: pollaId });
    if (error) throw error;
    return data ?? [];
  }

  /** Miembros de una polla (con perfil) para el Pozo. */
  async members(pollaId: string): Promise<PollaMemberRow[]> {
    const { data, error } = await this.sb
      .from('polla_members')
      .select('*, profile:profiles(display_name, nickname, avatar_url)')
      .eq('polla_id', pollaId)
      .order('joined_at')
      .returns<PollaMemberRow[]>();
    if (error) throw error;
    return data ?? [];
  }

  /** Admin marca/desmarca pago de un miembro. */
  async setPaid(memberId: string, paid: boolean, amount: number | null) {
    const { error } = await this.sb
      .from('polla_members')
      .update({
        paid,
        paid_at: paid ? new Date().toISOString() : null,
        paid_amount: paid ? amount : null,
      })
      .eq('id', memberId);
    if (error) throw error;
  }

  /** Sube el QR de pago al bucket `qr` y guarda la URL en la polla. */
  async uploadQr(pollaId: string, file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${pollaId}.${ext}`;
    const { error } = await this.sb.client.storage
      .from('qr')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const base = this.sb.client.storage.from('qr').getPublicUrl(path).data.publicUrl;
    const url = `${base}?v=${Date.now()}`; // cache-bust al reemplazar
    const { error: e2 } = await this.sb.from('pollas').update({ payment_qr_url: url }).eq('id', pollaId);
    if (e2) throw e2;
    return url;
  }

  /** Link de invitación compartible. */
  inviteUrl(code: string): string {
    return `${window.location.origin}/unirse/${code}`;
  }
}
