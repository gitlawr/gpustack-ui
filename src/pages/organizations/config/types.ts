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

export type OrganizationRole = 'admin' | 'user';

export const OrganizationRoleOptions: {
  label: string;
  value: OrganizationRole;
}[] = [
  { label: 'organizations.role.admin', value: 'admin' },
  { label: 'organizations.role.user', value: 'user' }
];
