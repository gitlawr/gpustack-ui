import { GSDrawer } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Tag } from 'antd';
import { OrganizationListItem } from '../config/types';
import MembersPanel from './members-panel';

type Props = {
  open: boolean;
  organization: OrganizationListItem | null;
  onClose: () => void;
};

const MembersDrawer: React.FC<Props> = ({ open, organization, onClose }) => {
  const intl = useIntl();

  return (
    <GSDrawer
      title={
        <span>
          {intl.formatMessage({ id: 'organizations.members.title' })}
          {organization && (
            <Tag style={{ marginLeft: 8 }}>{organization.name}</Tag>
          )}
        </span>
      }
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{ wrapper: { width: 720 } }}
    >
      <div style={{ padding: 24 }}>
        <MembersPanel organizationId={organization?.id ?? null} active={open} />
      </div>
    </GSDrawer>
  );
};

export default MembersDrawer;
