import {
  allOrganizationsAtom,
  organizationListAtom
} from '@/atoms/organization';
import { effectiveRouteName } from '@/utils';
import { useNavigate } from '@umijs/max';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { modelCategoriesMap } from '../../llmodels/config';
import { categoryToPathMap } from '../../llmodels/config/button-actions';

const useOpenPlayground = () => {
  const navigate = useNavigate();
  const memberOrgs = useAtomValue(organizationListAtom);
  const allOrgs = useAtomValue(allOrganizationsAtom);
  // Build an org-id → org lookup so we can resolve the route's owning
  // Org and emit the slug-prefixed effective model name in the URL —
  // playground reads `?model=` verbatim and a raw name wouldn't match
  // the names returned by `/v1/models`.
  const orgById = useMemo(() => {
    const map = new Map<number, any>();
    for (const o of allOrgs as any[]) map.set(o.id, o);
    for (const o of memberOrgs as any[]) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return map;
  }, [allOrgs, memberOrgs]);

  const handleOpenPlayGround = (row: any) => {
    const owner =
      row?.organization_id != null ? orgById.get(row.organization_id) : null;
    const modelName = encodeURIComponent(effectiveRouteName(row.name, owner));
    for (const [category, path] of Object.entries(categoryToPathMap)) {
      if (
        row.categories?.includes(category) &&
        [
          modelCategoriesMap.text_to_speech,
          modelCategoriesMap.speech_to_text
        ].includes(category)
      ) {
        navigate(`${path}&model=${modelName}`);
        return;
      }
      if (row.categories?.includes(category)) {
        navigate(`${path}?model=${modelName}`);
        return;
      }
    }
    navigate(`/playground/chat?model=${modelName}`);
  };
  return {
    handleOpenPlayGround
  };
};

export default useOpenPlayground;
