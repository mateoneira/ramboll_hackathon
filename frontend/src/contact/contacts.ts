import type { DataKind } from '../types'

export interface Contact {
  department: string
  /** Internal specialist name (shown in internal mode). */
  name: string
  role: string
  email: string
  phone?: string
  /** Public department landing page (shown in external mode CTA). */
  url: string
}

export interface ContactsFile {
  /** Map a data category to the Ramboll department that owns it. */
  categoryToDepartment: Record<DataKind, string>
  contacts: Record<string, Contact>
}

/**
 * Curated fallback so the contact panel always works even if the backend
 * scraper at /api/contacts is unavailable or returns nothing. The backend
 * refreshes these from https://www.ramboll.com/da-dk when it can.
 */
export const FALLBACK_CONTACTS: ContactsFile = {
  categoryToDepartment: {
    vector: 'Geospatial & GIS',
    mesh: 'Surveying & Digital Engineering',
    bim: 'Buildings & BIM',
  },
  contacts: {
    'Geospatial & GIS': {
      department: 'Geospatial & GIS',
      name: 'Ramboll GIS Team',
      role: 'Geospatial data specialists',
      email: 'gis@ramboll.com',
      url: 'https://www.ramboll.com/services/data-and-digital-solutions',
    },
    'Surveying & Digital Engineering': {
      department: 'Surveying & Digital Engineering',
      name: 'Ramboll Survey Team',
      role: 'CAD & reality-capture specialists',
      email: 'survey@ramboll.com',
      url: 'https://www.ramboll.com/services/data-and-digital-solutions',
    },
    'Buildings & BIM': {
      department: 'Buildings & BIM',
      name: 'Ramboll BIM Team',
      role: 'Building information modelling specialists',
      email: 'bim@ramboll.com',
      url: 'https://www.ramboll.com/buildings',
    },
  },
}

export function resolveContact(
  data: ContactsFile,
  kind: DataKind,
): Contact | null {
  const dept = data.categoryToDepartment[kind]
  return (dept && data.contacts[dept]) || null
}
