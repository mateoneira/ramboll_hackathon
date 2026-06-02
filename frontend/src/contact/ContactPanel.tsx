import { useMemo } from 'react'
import { useLayers } from '../store/layers'
import { useContacts } from './useContacts'
import { resolveContact } from './contacts'
import type { ProductMode } from '../app/mode'
import type { DataKind } from '../types'

/**
 * Mode-aware contact panel. Picks the Ramboll department for the most recently
 * loaded data category and frames it as an internal specialist (internal mode)
 * or a sales CTA (external mode — the funnel).
 */
export default function ContactPanel({ mode }: { mode: ProductMode }) {
  const layers = useLayers((s) => s.layers)
  const contacts = useContacts()

  // Active category = the kind of the most recent ready layer (else vector).
  const kind: DataKind = useMemo(() => {
    const ready = [...layers].reverse().find((l) => l.status === 'ready')
    return ready?.meta.kind ?? 'vector'
  }, [layers])

  const contact = resolveContact(contacts, kind)
  if (!contact) return null

  return (
    <div className="contact">
      <div className="dept">{contact.department}</div>
      {mode === 'internal' ? (
        <>
          <div className="person">{contact.name}</div>
          <div className="role">{contact.role}</div>
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
        </>
      ) : (
        <>
          <div className="person">Get more from this data</div>
          <div className="role">
            Ramboll's {contact.department} team can help you analyse, convert and
            act on it.
          </div>
          <a className="cta" href={contact.url} target="_blank" rel="noreferrer">
            Contact Ramboll →
          </a>
        </>
      )}
    </div>
  )
}
