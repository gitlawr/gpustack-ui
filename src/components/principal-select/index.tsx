import { queryUserDirectory } from '@/pages/users/apis';
import {
  queryOrganizationsList,
  queryUserGroups
} from '@/services/organizations/apis';
import { Select } from 'antd';
import _ from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

// Server-side searchable principal picker. Replaces the previous pattern
// of pulling every user / org / group with `page: -1` and filtering
// client-side, which doesn't scale past ~50 entries. We page through
// the list APIs with a search keyword and keep a label cache so
// already-selected items remain rendered even when they're outside the
// current page.

type PrincipalKind = 'user' | 'group' | 'org';
type Option = { value: number; label: string };

interface Props {
  kind: PrincipalKind;
  // Required when kind='group' — groups are scoped to a single Org.
  orgId?: number | null;
  // Single-select by default. Pass `mode="multiple"` to allow batch
  // selection (e.g. PrincipalsField uses this so admins can pick a
  // bunch of users in one go instead of clicking Add per row).
  mode?: 'multiple';
  value?: number | number[];
  // Mirrors antd Select's onChange signature: caller gets the value
  // plus the resolved option(s) so labels can be persisted alongside
  // ids without an extra lookup.
  onChange?: (
    value: number | number[] | undefined,
    option?: Option | Option[]
  ) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  // Filter the result client-side after fetch — e.g. exclude users
  // who are already members of the Org being edited.
  filter?: (option: Option) => boolean;
}

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 250;

async function fetchOptions(
  kind: PrincipalKind,
  search: string,
  orgId?: number | null
): Promise<Option[]> {
  const params: any = { page: 1, perPage: PAGE_SIZE };
  if (search) params.search = search;
  if (kind === 'user') {
    const res: any = await queryUserDirectory(params);
    const items: any[] = res?.items || res || [];
    return items.map((u) => ({ value: u.id, label: u.username }));
  }
  if (kind === 'org') {
    const res: any = await queryOrganizationsList(params);
    const items: any[] = res?.items || res || [];
    return items.map((o) => ({ value: o.id, label: o.name }));
  }
  if (!orgId) return [];
  const res: any = await queryUserGroups(orgId, params);
  const items: any[] = Array.isArray(res) ? res : res?.items || [];
  return items.map((g) => ({ value: g.id, label: g.name }));
}

const PrincipalSelect: React.FC<Props> = ({
  kind,
  orgId,
  mode,
  value,
  onChange,
  placeholder,
  style,
  disabled,
  filter
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [searching, setSearching] = useState(false);
  // Caches labels for items the user has already selected so the
  // closed-state Select can render a label even after the search
  // narrows the option list.
  const labelCacheRef = useRef<Map<number, string>>(new Map());

  const refresh = useCallback(
    async (keyword: string) => {
      setSearching(true);
      try {
        const opts = await fetchOptions(kind, keyword, orgId);
        const filtered = filter ? opts.filter(filter) : opts;
        setOptions(filtered);
        for (const o of filtered) labelCacheRef.current.set(o.value, o.label);
      } finally {
        setSearching(false);
      }
    },
    [kind, orgId, filter]
  );

  // Keep refresh as a stable callable for the debounced wrapper while
  // letting it close over the latest deps.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const debouncedSearch = useMemo(
    () =>
      _.debounce((kw: string) => {
        refreshRef.current(kw);
      }, SEARCH_DEBOUNCE_MS),
    []
  );

  useEffect(() => {
    // Initial / context-change load: clear the keyword and reload from
    // the top. Skip when `kind=group` lacks an orgId — there's nothing
    // meaningful to fetch yet.
    if (kind === 'group' && !orgId) {
      setOptions([]);
      return;
    }
    refresh('');
  }, [kind, orgId, refresh]);

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  // Surface already-selected items even when filtered out of the
  // current page (works for both single and multi-select).
  const displayOptions = useMemo(() => {
    const selectedIds: number[] =
      value == null ? [] : Array.isArray(value) ? value : [value];
    if (selectedIds.length === 0) return options;
    const present = new Set(options.map((o) => o.value));
    const extras: Option[] = [];
    for (const id of selectedIds) {
      if (present.has(id)) continue;
      const cached = labelCacheRef.current.get(id);
      if (cached) extras.push({ value: id, label: cached });
    }
    return extras.length === 0 ? options : [...extras, ...options];
  }, [options, value]);

  return (
    <Select
      mode={mode}
      value={value as any}
      onChange={onChange as any}
      onSearch={debouncedSearch}
      filterOption={false}
      showSearch
      allowClear
      loading={searching}
      options={displayOptions}
      placeholder={placeholder}
      style={style}
      disabled={disabled}
      notFoundContent={searching ? null : undefined}
    />
  );
};

export default PrincipalSelect;
