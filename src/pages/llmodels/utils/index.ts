import _ from 'lodash';
import { FormData } from '../config/types';
import { backendOptionsMap } from '../constants/backend-parameters';

// generate the gpu_selector field for form initial values, when eidting a model
export const generateGPUSelector = (data: any, gpuOptions: any[]) => {
  const gpu_ids = _.get(data, 'gpu_selector.gpu_ids', []);
  if (gpu_ids.length === 0) {
    return {
      gpu_selector: null
    };
  }

  const valueMap = new Map<string, string>();
  gpuOptions?.forEach((item) => {
    item.children?.forEach((child: any) => {
      valueMap.set(child.value, item.value);
    });
  });

  const gpuids: string[][] = gpu_ids
    .map((id: string) => {
      const parent = valueMap.get(id);
      return parent ? [parent, id] : null;
    })
    .filter(Boolean) as string[][];

  const result = data.backend === backendOptionsMap.voxBox ? gpuids[0] : gpuids;

  return {
    gpu_selector: {
      gpu_ids: result
    }
  };
};

/**
 * before submit the form, generate the gpu_selector field, and clear worker_selector if needed
 * @param data
 * @returns
 */
export const generateGPUIds = (data: FormData) => {
  const gpu_ids = _.get(data, 'gpu_selector.gpu_ids', []);

  if (!gpu_ids.length) {
    return {
      gpu_selector: null
    };
  }

  const result = _.reduce(
    gpu_ids,
    (acc: string[], item: string | string[], index: number) => {
      if (Array.isArray(item)) {
        acc.push(item[1]);
      } else if (index === 1) {
        acc.push(item);
      }
      return acc;
    },
    []
  );

  return {
    gpu_selector: {
      gpu_ids: result || [],
      gpus_per_replica: data.gpu_selector?.gpus_per_replica || null
    },
    worker_selector: null
  };
};

export const calcTotalVram = (record: any) => {
  const vramInMain = _.sum(
    _.values(record.computed_resource_claim?.vram || {})
  );
  const vramInDistributed = _.sum(
    _.values(record.distributed_servers?.subordinate_workers || []).map(
      (item: any) => _.sum(_.values(item.computed_resource_claim?.vram || {}))
    )
  );
  return vramInMain + vramInDistributed;
};

// Pick the deploy form's initial cluster from the user's accessible
// list. Each Org has at most one cluster with `is_default=true`, so the
// fallback chain is: current Org's default → platform Org's default →
// list[0]. Admin in "All" mode (no `currentOrgId`) skips straight to
// the platform Org default — admin's home is Default.
export const pickDefaultClusterId = <
  T extends {
    value: number | string;
    is_default?: boolean;
    organization_id?: number | null;
  }
>(
  list: T[],
  currentOrgId: number | null | undefined,
  platformOrgId: number | null | undefined
): T['value'] | undefined => {
  if (!list?.length) return undefined;
  const inOrg =
    currentOrgId != null
      ? list.find((c) => c.is_default && c.organization_id === currentOrgId)
      : undefined;
  if (inOrg) return inOrg.value;
  const platform =
    platformOrgId != null
      ? list.find((c) => c.is_default && c.organization_id === platformOrgId)
      : undefined;
  if (platform) return platform.value;
  return list[0]?.value;
};
