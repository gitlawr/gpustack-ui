import {
  currentOrganizationIdAtom,
  organizationListAtom
} from '@/atoms/organization';
import PageBox from '@/pages/_components/page-box';
import MembersPanel from '@/pages/organizations/components/members-panel';
import { useIntl, useModel } from '@umijs/max';
import { Empty } from 'antd';
import { useAtomValue } from 'jotai';

const OrgMembers: React.FC = () => {
  const intl = useIntl();
  const orgList = useAtomValue(organizationListAtom);
  const currentOrgId = useAtomValue(currentOrganizationIdAtom);
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;

  // Scope to the current Org from the global top-right switcher. The
  // route-level access flag (`canManageOrgMembers`) keeps platform admin
  // in "All" mode out, so by the time we render here `currentOrgId` is
  // always set for valid callers.
  if (!orgList.length && !isAdmin) {
    return (
      <PageBox>
        <Empty
          description={intl.formatMessage({
            id: 'organizations.groups.noOrg'
          })}
          style={{ marginTop: 64 }}
        />
      </PageBox>
    );
  }

  return (
    <PageBox>
      <MembersPanel organizationId={currentOrgId ?? null} />
    </PageBox>
  );
};

export default OrgMembers;
