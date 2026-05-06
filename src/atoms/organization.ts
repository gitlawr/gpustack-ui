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
  role: 'admin' | 'user';
  created_at?: string;
}

export type OrgRole = 'admin' | 'user';

export interface OrganizationListItem extends Organization {
  role?: OrgRole;
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

// Platform-wide org cache (admin-only). Populated by app.tsx after
// login when the user is admin so list pages can resolve any
// organization_id → name without an extra fetch per page. Empty for
// non-admin (they can rely on `organizationListAtom` for their member
// orgs which is all they ever need to display).
export const allOrganizationsAtom = atom<Organization[]>([]);
