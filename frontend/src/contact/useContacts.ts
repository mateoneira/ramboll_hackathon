import { useEffect, useState } from 'react'
import { FALLBACK_CONTACTS, type ContactsFile } from './contacts'

/**
 * Load contacts from the backend (/api/contacts), which serves scraped +
 * curated Ramboll department data. Falls back to the bundled curated set so
 * the panel renders even with no backend running.
 */
export function useContacts(): ContactsFile {
  const [data, setData] = useState<ContactsFile>(FALLBACK_CONTACTS)

  useEffect(() => {
    let cancelled = false
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: ContactsFile) => {
        if (!cancelled && json?.contacts && json?.categoryToDepartment) {
          setData(json)
        }
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return data
}
