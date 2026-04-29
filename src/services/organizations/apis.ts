import { Organization, OrganizationMembership } from '@/atoms/organization';
import { request } from '@umijs/max';

export const ORGANIZATIONS_API = '/organizations';
export const ME_ORGANIZATIONS_API = '/users/me/organizations';

export interface MyOrganization {
  organization: Organization;
  role: 'owner' | 'admin' | 'member';
}

export interface OrganizationFormData {
  name: string;
  slug: string;
  description?: string;
}

export interface OrganizationMember {
  user_id: number;
  organization_id: number;
  role: 'owner' | 'admin' | 'member';
  username?: string;
  full_name?: string;
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

export async function queryMyOrganizations(opts?: Record<string, any>) {
  return request<MyOrganization[]>(ME_ORGANIZATIONS_API, {
    method: 'GET',
    ...opts
  });
}

export async function queryMyOrganizationClusters(
  orgId: number,
  opts?: Record<string, any>
) {
  return request<any[]>(`${ME_ORGANIZATIONS_API}/${orgId}/clusters`, {
    method: 'GET',
    ...opts
  });
}

export async function queryOrganizationsList(params: Global.SearchParams) {
  return request<Global.PageResponse<Organization>>(ORGANIZATIONS_API, {
    method: 'GET',
    params
  });
}

export async function queryOrganization(id: number) {
  return request<Organization>(`${ORGANIZATIONS_API}/${id}`, {
    method: 'GET'
  });
}

export async function createOrganization(params: {
  data: OrganizationFormData;
}) {
  return request<Organization>(ORGANIZATIONS_API, {
    method: 'POST',
    data: params.data
  });
}

export async function updateOrganization(params: {
  id: number;
  data: OrganizationFormData;
}) {
  return request<Organization>(`${ORGANIZATIONS_API}/${params.id}`, {
    method: 'PUT',
    data: params.data
  });
}

export async function deleteOrganization(id: number) {
  return request(`${ORGANIZATIONS_API}/${id}`, {
    method: 'DELETE'
  });
}

// ====== Members ======
export async function queryOrganizationMembers(
  orgId: number,
  params?: Global.SearchParams
) {
  return request<OrganizationMember[]>(
    `${ORGANIZATIONS_API}/${orgId}/members`,
    {
      method: 'GET',
      params
    }
  );
}

export async function addOrganizationMember(params: {
  orgId: number;
  data: { user_id: number; role: OrganizationMembership['role'] };
}) {
  return request(`${ORGANIZATIONS_API}/${params.orgId}/members`, {
    method: 'POST',
    data: params.data
  });
}

export async function updateOrganizationMember(params: {
  orgId: number;
  userId: number;
  data: { role: OrganizationMembership['role'] };
}) {
  return request(
    `${ORGANIZATIONS_API}/${params.orgId}/members/${params.userId}`,
    {
      method: 'PUT',
      data: params.data
    }
  );
}

export async function removeOrganizationMember(params: {
  orgId: number;
  userId: number;
}) {
  return request(
    `${ORGANIZATIONS_API}/${params.orgId}/members/${params.userId}`,
    {
      method: 'DELETE'
    }
  );
}

// ====== Groups ======
export interface UserGroup {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
}

export interface UserGroupFormData {
  name: string;
  description?: string;
}

export async function queryUserGroups(
  orgId: number,
  params?: Global.SearchParams
) {
  return request<Global.PageResponse<UserGroup>>(
    `${ORGANIZATIONS_API}/${orgId}/groups`,
    {
      method: 'GET',
      params
    }
  );
}

export async function createUserGroup(params: {
  orgId: number;
  data: UserGroupFormData;
}) {
  return request<UserGroup>(`${ORGANIZATIONS_API}/${params.orgId}/groups`, {
    method: 'POST',
    data: params.data
  });
}

export async function updateUserGroup(params: {
  orgId: number;
  groupId: number;
  data: UserGroupFormData;
}) {
  return request<UserGroup>(
    `${ORGANIZATIONS_API}/${params.orgId}/groups/${params.groupId}`,
    {
      method: 'PUT',
      data: params.data
    }
  );
}

export async function deleteUserGroup(params: {
  orgId: number;
  groupId: number;
}) {
  return request(
    `${ORGANIZATIONS_API}/${params.orgId}/groups/${params.groupId}`,
    {
      method: 'DELETE'
    }
  );
}

export interface UserGroupMembership {
  user_id: number;
  group_id: number;
  created_at: string;
}

export async function queryGroupMembers(params: {
  orgId: number;
  groupId: number;
  query?: Global.SearchParams;
}) {
  return request<UserGroupMembership[]>(
    `${ORGANIZATIONS_API}/${params.orgId}/groups/${params.groupId}/members`,
    {
      method: 'GET',
      params: params.query
    }
  );
}

export async function addGroupMember(params: {
  orgId: number;
  groupId: number;
  data: { user_id: number };
}) {
  return request<UserGroupMembership>(
    `${ORGANIZATIONS_API}/${params.orgId}/groups/${params.groupId}/members`,
    {
      method: 'POST',
      data: params.data
    }
  );
}

// Bulk-set helper: server only supports per-user POST/DELETE, so we diff
// the desired set against current and issue parallel calls.
export async function setGroupMembers(params: {
  orgId: number;
  groupId: number;
  data: { user_ids: number[] };
}) {
  const current = await queryGroupMembers({
    orgId: params.orgId,
    groupId: params.groupId
  });
  const currentIds = new Set((current || []).map((m) => m.user_id));
  const desiredIds = new Set(params.data.user_ids);

  const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

  await Promise.all([
    ...toAdd.map((user_id) =>
      addGroupMember({
        orgId: params.orgId,
        groupId: params.groupId,
        data: { user_id }
      })
    ),
    ...toRemove.map((user_id) =>
      removeGroupMember({
        orgId: params.orgId,
        groupId: params.groupId,
        userId: user_id
      })
    )
  ]);
}

export async function removeGroupMember(params: {
  orgId: number;
  groupId: number;
  userId: number;
}) {
  return request(
    `${ORGANIZATIONS_API}/${params.orgId}/groups/${params.groupId}/members/${params.userId}`,
    {
      method: 'DELETE'
    }
  );
}

// ====== Quotas ======
export interface TenantQuota {
  id?: number;
  cluster_id: number;
  organization_id: number;
  cluster_name?: string;
  gpu?: number | null;
  cpu_milli?: number | null;
  memory_bytes?: number | null;
  pod_count?: number | null;
}

export async function queryOrganizationQuotas(
  orgId: number,
  params?: Global.SearchParams
) {
  return request<TenantQuota[]>(`${ORGANIZATIONS_API}/${orgId}/quotas`, {
    method: 'GET',
    params,
    skipErrorHandler: true
  } as any);
}

export async function updateOrganizationQuota(params: {
  orgId: number;
  data: TenantQuota;
}) {
  return request<TenantQuota>(`${ORGANIZATIONS_API}/${params.orgId}/quotas`, {
    method: 'PUT',
    data: params.data
  });
}

// ====== Cluster access ======
export type PrincipalType = 'org' | 'group' | 'user';

export interface ClusterAccess {
  cluster_id: number;
  principal_type: PrincipalType;
  principal_id: number;
  principal_name?: string;
  granted_by?: number;
  created_at?: string;
}

export async function queryClusterAccess(clusterId: number) {
  return request<ClusterAccess[]>(`/clusters/${clusterId}/access`, {
    method: 'GET'
  });
}

export async function addClusterAccess(params: {
  clusterId: number;
  data: { principal_type: PrincipalType; principal_id: number };
}) {
  return request(`/clusters/${params.clusterId}/access`, {
    method: 'POST',
    data: params.data
  });
}

export async function removeClusterAccess(params: {
  clusterId: number;
  principal_type: PrincipalType;
  principal_id: number;
}) {
  return request(
    `/clusters/${params.clusterId}/access/${params.principal_type}/${params.principal_id}`,
    {
      method: 'DELETE'
    }
  );
}
