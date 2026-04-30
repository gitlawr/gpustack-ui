export interface OrganizationFormData {
  name: string;
  slug: string;
  description?: string;
}

export interface OrganizationListItem extends OrganizationFormData {
  id: number;
  is_platform?: boolean;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export type OrganizationRole = 'owner' | 'manager' | 'member';

export const OrganizationRoleOptions: {
  label: string;
  value: OrganizationRole;
}[] = [
  { label: 'organizations.role.owner', value: 'owner' },
  { label: 'organizations.role.manager', value: 'manager' },
  { label: 'organizations.role.member', value: 'member' }
];
