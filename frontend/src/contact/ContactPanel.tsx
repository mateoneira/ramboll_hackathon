import { useMemo } from 'react'
import { useLayers } from '../store/layers'
import { useContacts } from './useContacts'
import { resolveContact } from './contacts'
import type { ProductMode } from '../app/mode'
import type { DataKind } from '../types'

export default function ContactPanel({ mode }: { mode: ProductMode }) {
  const layers = useLayers((s) => s.layers)
  const contacts = useContacts()

  // Collect one contact per unique data kind across all ready layers.
  const activeContacts = useMemo(() => {
    const readyKinds = layers
      .filter((l) => l.status === 'ready')
      .map((l) => l.meta.kind as DataKind)
    const uniqueKinds: DataKind[] = readyKinds.length > 0
      ? [...new Set(readyKinds)]
      : ['vector']
    return uniqueKinds
      .map((k) => resolveContact(contacts, k))
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
  }, [layers, contacts])

  if (activeContacts.length === 0) return null

  return (
    <>
      {activeContacts.map((contact) => (
        <div className="contact" key={contact.name}>
          <div className="dept">{contact.department}</div>
          <div className="person">{contact.name}</div>
          <div className="role">{contact.role}</div>
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
        </div>
      ))}
    </>
  )
}
