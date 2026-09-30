import { createClient } from '@supabase/supabase-js'
import type { DayState } from '../domain/types.ts'
import type { HubId } from '../engine/types.ts'
import type { DayFeed } from './live.ts'

/**
 * Browser-side reads from Supabase with the public anon key. The table is read-only under row-level security
 * (see supabase/schema.sql), so this key can look but never change anything.
 */
export function createSupabaseFeed(url: string, anonKey: string): DayFeed {
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  return {
    async fetchDay(hubId: HubId) {
      const { data, error } = await client.from('day_state').select('state').eq('hub_id', hubId).maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.state as DayState | undefined) ?? null
    },
    watch(hubId, onState) {
      const channel = client
        .channel(`day-${hubId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_state', filter: `hub_id=eq.${hubId}` }, (payload) => {
          const row = payload.new as { state?: DayState }
          if (row.state) onState(row.state)
        })
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
