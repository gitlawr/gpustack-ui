import {
  currentOrganizationIdAtom,
  organizationListAtom
} from '@/atoms/organization';
import { useModel } from '@@/plugin-model';
import {
  ApartmentOutlined,
  CheckOutlined,
  DownOutlined,
  GlobalOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import { Dropdown, Tag, Typography } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import { useMemo } from 'react';
import styled from 'styled-components';

const Trigger = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--ant-color-text-secondary);
  background-color: var(--ant-color-fill-tertiary);
  max-width: 220px;
  &:hover {
    background-color: var(--ant-color-fill-secondary);
    color: var(--ant-color-text);
  }
  .org-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 140px;
    font-weight: 500;
  }
  .anticon-down {
    font-size: 10px;
  }
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 200px;
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  }
  .role {
    color: var(--ant-color-text-tertiary);
    font-size: 12px;
  }
`;

const PLATFORM_WIDE_KEY = '__platform_wide__';

const OrgSwitcher: React.FC = () => {
  const intl = useIntl();
  const list = useAtomValue(organizationListAtom);
  const [currentId, setCurrentId] = useAtom(currentOrganizationIdAtom);
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;

  const current = useMemo(() => {
    if (currentId == null) return null;
    return list.find((item) => item.id === currentId) ?? null;
  }, [list, currentId]);

  // Hide entirely if there's nothing to switch to (empty for non-admin
  // before P1 backfill, e.g.) — admin always at least has Platform-wide.
  if (!list.length && !isAdmin) {
    return null;
  }

  const handleSelect = (id: number | null) => {
    if (id === currentId) {
      return;
    }
    setCurrentId(id);
    // Force a full refresh so all paginated lists / atoms reload
    // under the new organization context.
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleManage = () => {
    history.push('/access-control/organizations');
  };

  const orgItems = list.map((item) => ({
    key: String(item.id),
    label: (
      <ItemRow onClick={() => handleSelect(item.id)}>
        <span className="flex-center gap-8">
          {item.id === current?.id ? (
            <CheckOutlined style={{ color: 'var(--ant-color-primary)' }} />
          ) : (
            <ApartmentOutlined
              style={{ color: 'var(--ant-color-text-tertiary)' }}
            />
          )}
          <Typography.Text className="name">{item.name}</Typography.Text>
          {item.is_platform && (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              {intl.formatMessage({ id: 'organizations.tag.platform' })}
            </Tag>
          )}
        </span>
        {item.role && <span className="role">{item.role}</span>}
      </ItemRow>
    )
  }));

  const menuItems: any[] = [];

  // Admin gets a "Platform-wide" pseudo-entry that maps to no org context.
  // Switching to it clears X-Organization-Id and triggers cross-org views.
  if (isAdmin) {
    menuItems.push({
      key: PLATFORM_WIDE_KEY,
      label: (
        <ItemRow onClick={() => handleSelect(null)}>
          <span className="flex-center gap-8">
            {currentId == null ? (
              <CheckOutlined style={{ color: 'var(--ant-color-primary)' }} />
            ) : (
              <GlobalOutlined
                style={{ color: 'var(--ant-color-text-tertiary)' }}
              />
            )}
            <Typography.Text className="name">
              {intl.formatMessage({ id: 'organizations.platformWide' })}
            </Typography.Text>
          </span>
          <span className="role">
            {intl.formatMessage({ id: 'organizations.platformWide.hint' })}
          </span>
        </ItemRow>
      )
    });
    if (orgItems.length) {
      menuItems.push({ type: 'divider' as const });
    }
  }

  menuItems.push(...orgItems);

  menuItems.push({
    type: 'divider' as const
  });
  menuItems.push({
    key: 'manage',
    label: (
      <span className="flex-center gap-8" onClick={handleManage}>
        <SettingOutlined />
        <span style={{ marginLeft: 8 }}>
          {intl.formatMessage({ id: 'organizations.menu.manage' })}
        </span>
      </span>
    )
  });

  const triggerLabel =
    currentId == null && isAdmin
      ? intl.formatMessage({ id: 'organizations.platformWide' })
      : current?.name || '';

  const triggerIcon =
    currentId == null && isAdmin ? (
      <GlobalOutlined style={{ fontSize: 14 }} />
    ) : (
      <ApartmentOutlined style={{ fontSize: 14 }} />
    );

  return (
    <Dropdown
      menu={{
        items: menuItems,
        selectedKeys:
          currentId == null
            ? isAdmin
              ? [PLATFORM_WIDE_KEY]
              : []
            : [String(currentId)]
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Trigger>
        {triggerIcon}
        <span className="org-name">{triggerLabel}</span>
        <DownOutlined />
      </Trigger>
    </Dropdown>
  );
};

export default OrgSwitcher;
