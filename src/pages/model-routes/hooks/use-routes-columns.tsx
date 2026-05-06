// columns.ts
import {
  allOrganizationsAtom,
  organizationListAtom
} from '@/atoms/organization';
import { tableSorter } from '@/config/settings';
import ModelTag from '@/pages/_components/model-tag';
import { effectiveRouteName } from '@/utils';
import {
  AutoTooltip,
  DropdownButtons,
  type TableColumnProps
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { rowActionList } from '../config';
import { RouteItem } from '../config/types';
const useAccessColumns = (
  handleSelect: (val: string, record: RouteItem) => void,
  onCellClick?: (record: RouteItem, dataIndex: string) => void
): TableColumnProps[] => {
  const intl = useIntl();
  const memberOrgs = useAtomValue(organizationListAtom);
  const allOrgs = useAtomValue(allOrganizationsAtom);
  // Lookup table for resolving each route's owning Org so the displayed
  // name matches what the gateway routes on (Org slug-prefixed for
  // non-platform Orgs).
  const orgById = useMemo(() => {
    const map = new Map<number, any>();
    for (const o of allOrgs as any[]) map.set(o.id, o);
    for (const o of memberOrgs as any[]) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return map;
  }, [allOrgs, memberOrgs]);

  const filterActions = (record: RouteItem) => {
    return rowActionList.filter((action) => {
      if (action.key === 'chat' || action.key === 'api') {
        return record.ready_targets > 0;
      }
      return true;
    });
  };

  return useMemo(() => {
    return [
      {
        title: intl.formatMessage({ id: 'common.table.name' }),
        dataIndex: 'name',
        sorter: tableSorter(1),
        span: 5,
        render: (text: string, record: RouteItem) => {
          const owner =
            (record as any).organization_id != null
              ? orgById.get((record as any).organization_id)
              : null;
          const display = effectiveRouteName(text, owner);
          return (
            <span className="flex-center" style={{ maxWidth: '100%' }}>
              <AutoTooltip ghost title={display}>
                <span className="m-r-5 text-primary">{display}</span>
              </AutoTooltip>
              <ModelTag categoryKey={record.categories?.[0]}></ModelTag>
            </span>
          );
        }
      },
      {
        title: intl.formatMessage({ id: 'routes.table.routeTargets' }),
        dataIndex: 'targets',
        span: 10,
        render: (value: number, record: RouteItem) => (
          <span>
            {record.ready_targets} / {value}
          </span>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.createTime' }),
        dataIndex: 'created_at',
        sorter: tableSorter(6),
        span: 5,
        render: (value: string) => (
          <AutoTooltip ghost minWidth={20}>
            {dayjs(value).format('YYYY-MM-DD HH:mm:ss')}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        dataIndex: 'operations',
        span: 4,
        render: (value: string, record: RouteItem) => (
          <DropdownButtons
            items={filterActions(record)}
            onSelect={(val) => handleSelect(val, record)}
          ></DropdownButtons>
        )
      }
    ];
  }, [handleSelect, onCellClick, orgById]);
};

export default useAccessColumns;
