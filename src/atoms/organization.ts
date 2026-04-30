import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_platform?: boolean;
  is_personal?: boolean;
  billing_account_ref?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationMembership {
  user_id: number;
  organization_id: number;
  role: 'owner' | 'manager' | 'member';
  created_at?: string;
}

export interface OrganizationListItem extends Organization {
  role?: 'owner' | 'manager' | 'member';
}

export const currentOrganizationIdAtom = atomWithStorage<number | null>(
  'currentOrganizationId',
  null
);

// Persisted so the access plugin (which runs outside of React) can
// read membership roles from localStorage to gate menu visibility.
export const organizationListAtom = atomWithStorage<OrganizationListItem[]>(
  'organizationList',
  []
);

export const currentOrganizationAtom = atom<OrganizationListItem | null>(
  (get) => {
    const id = get(currentOrganizationIdAtom);
    const list = get(organizationListAtom);
    if (id == null) {
      return list[0] ?? null;
    }
    return list.find((item) => item.id === id) ?? list[0] ?? null;
  }
);
