import type { DataKind } from '../types'

export interface Contact {
  department: string
  /** Internal specialist name (shown in internal mode). */
  name: string
  role: string
  email?: string
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
    mesh: 'GIS & 3D',
    bim: 'Buildings & BIM',
  },
  contacts: {
    'Geospatial & GIS': {
      department: 'Geospatial DK',
      name: 'Frederik Marthedal Christiansen',
      role: 'Head of Geospatial DK',
      email: 'frmc@ramboll.dk',
      phone: '+45 51 61 45 54',
      url: 'https://www.ramboll.com/contact-us',
    },
    'Buildings & BIM': {
      department: 'Underground Structures',
      name: 'Jeppe Bæklund',
      role: 'Chief BIM Manager',
      email: 'jepb@ramboll.dk',
      phone: '+45 51 61 18 60',
      url: 'https://www.ramboll.com/services-and-sectors/buildings/project-services/digital-design-and-bim',
    },
    'GIS & 3D': {
      department: 'Geospatial DK',
      name: 'Giota Zachariadou',
      role: 'GIS and 3D Specialist',
      email: 'pza@ramboll.dk',
      url: 'https://www.ramboll.com/contact-us',
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
