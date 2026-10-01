import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DayState } from '../../src/domain/types.ts'
import type { HubId } from '../../src/engine/types.ts'
import type { Binding, Db } from './core.ts'

/**
 * Supabase-backed storage (see supabase/schema.sql). Uses the service key, which never leaves the server.
 * `day_state` is publicly readable (already sanitised) so browsers can subscribe to it; `wa_binding` is not.
 * Thin adapter, exercised end to end in the live test rather than unit tests.
 */
export function createSupabaseDb(url: string, serviceKey: string): Db {
  // A slow or briefly failing database must not hang a function for 30 s: cap each call and retry once.
  const client: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  })
  const retry = async <T,>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work()
    } catch {
      await new Promise((r) => setTimeout(r, 400))
      return work()
    }
  }

  return {
    loadDay: (hubId: HubId) =>
      retry(async () => {
        const { data, error } = await client.from('day_state').select('state').eq('hub_id', hubId).maybeSingle()
        if (error) throw new Error(`Could not load the day: ${error.message}`)
        return (data?.state as DayState | undefined) ?? null
      }),

    async saveDay(hubId: HubId, state: DayState, expectedVersion: number | null) {
      if (expectedVersion === null) {
        const { error } = await client.from('day_state').insert({ hub_id: hubId, version: state.version, state })
        if (!error) return true
        if (error.code === '23505') return false // someone created it first
        throw new Error(`Could not save the day: ${error.message}`)
      }
      const { data, error } = await client
        .from('day_state')
        .update({ version: state.version, state, updated_at: new Date().toISOString() })
        .eq('hub_id', hubId)
        .eq('version', expectedVersion)
        .select('hub_id')
      if (error) throw new Error(`Could not save the day: ${error.message}`)
      return (data?.length ?? 0) === 1
    },

    async findBinding(phone: string) {
      const { data, error } = await client.from('wa_binding').select('phone, hub_id, order_id').eq('phone', phone).maybeSingle()
      if (error) throw new Error(`Could not read the phone link: ${error.message}`)
      return data ? { phone: data.phone as string, hubId: data.hub_id as HubId, orderId: data.order_id as string } : null
    },

    bindingsFor: (hubId: HubId) =>
      retry(async () => {
        const { data, error } = await client.from('wa_binding').select('phone, hub_id, order_id').eq('hub_id', hubId)
        if (error) throw new Error(`Could not read the phone links: ${error.message}`)
        return (data ?? []).map((r): Binding => ({ phone: r.phone as string, hubId: r.hub_id as HubId, orderId: r.order_id as string }))
      }),

    async wasSeen(messageSid: string) {
      const { data, error } = await client.from('wa_seen').select('message_sid').eq('message_sid', messageSid).maybeSingle()
      if (error) throw new Error(`Could not read the message record: ${error.message}`)
      return data !== null
    },

    async markSeen(messageSid: string) {
      const { error } = await client.from('wa_seen').insert({ message_sid: messageSid })
      if (!error) return true
      if (error.code === '23505') return false // already processed
      throw new Error(`Could not record the message: ${error.message}`)
    },

    async saveBinding(b: Binding) {
      const { error } = await client.from('wa_binding').upsert({ phone: b.phone, hub_id: b.hubId, order_id: b.orderId })
      if (error) throw new Error(`Could not save the phone link: ${error.message}`)
    },
  }
}
