import { Organization } from '@/atoms/organization';
import { request } from '@umijs/max';
import { FormData, ListItem } from '../config/types';

export const USERS_API = '/users';

export interface UserMembership {
  organization: Organization;
  role: 'admin' | 'user';
}

export async function queryUserMemberships(userId: number) {
  return request<UserMembership[]>(`${USERS_API}/${userId}/memberships`, {
    method: 'GET'
  });
}

export async function queryUsersList(params: Global.SearchParams) {
  return request<Global.PageResponse<ListItem>>(`${USERS_API}`, {
    method: 'GET',
    params
  });
}

// Slim user-search endpoint for member-add pickers. Accessible to org
// admins (any) and platform admins; full /users is admin-only.
export async function queryUserDirectory(params: Global.SearchParams) {
  return request<Global.PageResponse<ListItem>>(`/user-directory`, {
    method: 'GET',
    params
  });
}

export async function createUser(params: { data: FormData }) {
  return request(`${USERS_API}`, {
    method: 'POST',
    data: params.data
  });
}

export async function updateUser(params: { data: FormData }) {
  return request(`${USERS_API}/${params.data.id}`, {
    method: 'PUT',
    data: params.data
  });
}

export async function deleteUser(id: number) {
  return request(`${USERS_API}/${id}`, {
    method: 'DELETE'
  });
}

export async function updateUserStatus(params: {
  id: number;
  data: { is_active: boolean };
}) {
  return request(`${USERS_API}/${params.id}/activation`, {
    method: 'PATCH',
    data: params.data
  });
}
