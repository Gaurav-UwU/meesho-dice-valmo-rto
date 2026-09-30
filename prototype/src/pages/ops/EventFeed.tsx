import { useMemo } from 'react'
import type { FeedEvent, FeedKind } from '../../domain/types.ts'
import { clock } from '../../ui/format.ts'

const FEED_SHOWN = 60

const KIND_LABEL: Readonly<Record<FeedKind, string>> = {
  day: 'Day',
  flag: 'Flag',
  reply: 'Reply',
  deliver: 'Delivered',
  bonus: 'Bonus',
  attempt: 'Attempt',
  suspect: 'Suspect',
  refuse: 'Refused',
  desk: 'Desk',
  info: 'Info',
}

interface Props {
  readonly feed: readonly FeedEvent[]
  readonly onSelect: (id: string) => void
}

function Row({ event, onSelect }: { readonly event: FeedEvent; readonly onSelect: (id: string) => void }) {
  const body = (
    <>
      <time className="ops-feed-time" dateTime={new Date(event.at).toISOString()}>
        {clock(event.at)}
      </time>
      <span className={`ops-feed-dot is-${event.kind}`} aria-hidden="true" />
      <span className={`ops-feed-kind is-${event.kind}`}>{KIND_LABEL[event.kind]}</span>
      <span className={`ops-feed-text is-${event.kind}`}>{event.text}</span>
    </>
  )
  const { orderId } = event
  return (
    <li>
      {orderId ? (
        <button type="button" className="ops-feed-row" onClick={() => onSelect(orderId)}>
          {body}
        </button>
      ) : (
        <div className="ops-feed-row">{body}</div>
      )}
    </li>
  )
}

export function EventFeed({ feed, onSelect }: Props) {
  const newestFirst = useMemo(() => [...feed].reverse().slice(0, FEED_SHOWN), [feed])
  return (
    <section className="ops-card" aria-label="Live event feed">
      <div className="ops-card-head">
        <h2>Live event feed</h2>
        <span className="ops-muted">newest first · last {FEED_SHOWN}</span>
      </div>
      {newestFirst.length === 0 ? (
        <p className="ops-empty">Events appear here as the day runs.</p>
      ) : (
        <ol className="ops-feed">
          {newestFirst.map((e) => (
            <Row key={e.id} event={e} onSelect={onSelect} />
          ))}
        </ol>
      )}
    </section>
  )
}
