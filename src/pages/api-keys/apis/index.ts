import { request } from '@umijs/max';
import { FormData, ListItem } from '../config/types';

export const APIS_KEYS_API = '/api-keys';

export async function queryApisKeysList(params: Global.SearchParams) {
  return request<Global.PageResponse<ListItem>>(`${APIS_KEYS_API}`, {
    method: 'GET',
    params
  });
}

export async function createApisKey(params: {
  data: FormData;
  organizationId?: number | null;
}) {
  return request<ListItem>(`${APIS_KEYS_API}`, {
    method: 'POST',
    data: params.data,
    // For platform admin in "Platform-wide" mode, the form picks an
    // explicit target org and we forward it as the per-request override.
    ...(params.organizationId != null
      ? {
          headers: { 'X-Organization-Id': String(params.organizationId) }
        }
      : {})
  });
}

export async function updateApisKey(id: number, params: { data: FormData }) {
  return request<ListItem>(`${APIS_KEYS_API}/${id}`, {
    method: 'PUT',
    data: params.data
  });
}

export async function deleteApisKey(id: number) {
  return request(`${APIS_KEYS_API}/${id}`, {
    method: 'DELETE'
  });
}
