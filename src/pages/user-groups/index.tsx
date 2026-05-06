import {
  allOrganizationsAtom,
  currentOrganizationIdAtom,
  organizationListAtom
} from '@/atoms/organization';
import { PageAction } from '@/config';
import { TABLE_SORT_DIRECTIONS } from '@/config/settings';
import type { PageActionType } from '@/config/types';
import {
  createUserGroup,
  deleteUserGroup,
  queryUserGroups,
  updateUserGroup,
  UserGroup,
  UserGroupFormData
} from '@/services/organizations/apis';
import { AutoTooltip } from '@gpustack/core-ui';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Empty, message, Popconfirm, Space, Table } from 'antd';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import PageBox from '../_components/page-box';
import GroupMembersDrawer from './components/group-members-drawer';
import GroupModal from './components/group-modal';

const UserGroups: React.FC = () => {
  const intl = useIntl();
  const orgList = useAtomValue(organizationListAtom);
  const allOrgs = useAtomValue(allOrganizationsAtom);
  const currentOrgId = useAtomValue(currentOrganizationIdAtom);
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;

  // Scope to the top-right Org switcher's current selection — the same
  // signal the rest of the app uses for "what Org am I managing right
  // now". Admin in "All" mode (currentOrgId == null) keeps a fallback
  // so list queries still have an Org id, but the create modal exposes
  // an Org picker so admin can drop the new group into any Org without
  // switching context.
  const fallbackOrgId =
    (isAdmin ? allOrgs.find((o: any) => o.is_platform)?.id : undefined) ??
    orgList.find((o) => !o.is_personal)?.id ??
    orgList[0]?.id ??
    null;
  const activeOrgId = currentOrgId ?? fallbackOrgId;
  const showOrgPicker = isAdmin && currentOrgId == null;
  const orgPickerOptions = isAdmin
    ? allOrgs.map((o: any) => ({
        id: o.id,
        name: o.name,
        is_platform: o.is_platform
      }))
    : [];
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    action: PageActionType;
    title: string;
    data?: UserGroup | null;
  }>({ open: false, action: PageAction.CREATE, title: '', data: null });
  const [memberDrawer, setMemberDrawer] = useState<{
    open: boolean;
    group: UserGroup | null;
  }>({ open: false, group: null });

  const fetchGroups = useMemoizedFn(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const res: any = await queryUserGroups(activeOrgId, { page: -1 });
      const list = Array.isArray(res) ? res : res?.items || [];
      setGroups(list);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchGroups();
  }, [activeOrgId, fetchGroups]);

  const handleAdd = () => {
    setModalState({
      open: true,
      action: PageAction.CREATE,
      title: intl.formatMessage({ id: 'organizations.groups.create' }),
      data: null
    });
  };

  const handleEdit = (row: UserGroup) => {
    setModalState({
      open: true,
      action: PageAction.EDIT,
      title: intl.formatMessage(
        { id: 'common.button.edit.item' },
        { name: row.name }
      ),
      data: row
    });
  };

  const handleSubmit = async (
    values: UserGroupFormData & { organization_id?: number }
  ) => {
    // For Create, prefer the modal's Org picker (admin in "All"); for
    // Edit and the implicit-context cases, fall through to activeOrgId.
    const targetOrgId = values.organization_id ?? activeOrgId;
    if (!targetOrgId) return;
    const { organization_id: _omit, ...payload } = values;
    try {
      if (modalState.action === PageAction.EDIT && modalState.data) {
        await updateUserGroup({
          orgId: targetOrgId,
          groupId: modalState.data.id,
          data: payload
        });
      } else {
        await createUserGroup({ orgId: targetOrgId, data: payload });
      }
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setModalState({ ...modalState, open: false });
      fetchGroups();
    } catch (_) {}
  };

  const handleDelete = async (row: UserGroup) => {
    if (!activeOrgId) return;
    try {
      await deleteUserGroup({ orgId: activeOrgId, groupId: row.id });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchGroups();
    } catch (_) {}
  };

  const columns = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'common.table.name' }),
        dataIndex: 'name',
        render: (text: string) => (
          <AutoTooltip ghost style={{ maxWidth: 320 }}>
            <span className="text-primary">{text}</span>
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.description' }),
        dataIndex: 'description',
        render: (text: string) => (
          <AutoTooltip ghost minWidth={20}>
            {text || '-'}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        key: 'op',
        width: 220,
        render: (_t: any, record: UserGroup) => (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => setMemberDrawer({ open: true, group: record })}
            >
              {intl.formatMessage({ id: 'organizations.menu.members' })}
            </Button>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {intl.formatMessage({ id: 'common.button.edit' })}
            </Button>
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.tips' })}
              okText={intl.formatMessage({ id: 'common.button.confirm' })}
              cancelText={intl.formatMessage({ id: 'common.button.cancel' })}
              onConfirm={() => handleDelete(record)}
            >
              <Button danger type="link" size="small">
                {intl.formatMessage({ id: 'common.button.delete' })}
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [intl]
  );

  if (!orgList.length) {
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
    <>
      <PageBox>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginBlock: '24px 16px'
          }}
        >
          <Button type="primary" onClick={handleAdd} disabled={!activeOrgId}>
            {intl.formatMessage({ id: 'organizations.groups.create' })}
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={{ spinning: loading }}
          size="middle"
          dataSource={groups}
          columns={columns as any}
          pagination={false}
          sortDirections={TABLE_SORT_DIRECTIONS}
          locale={{
            emptyText: (
              <Empty
                description={intl.formatMessage({
                  id: 'organizations.groups.empty'
                })}
              />
            )
          }}
        />
      </PageBox>
      <GroupModal
        open={modalState.open}
        action={modalState.action}
        title={modalState.title}
        data={modalState.data}
        showOrgPicker={showOrgPicker}
        orgOptions={orgPickerOptions}
        defaultOrgId={fallbackOrgId}
        onCancel={() => setModalState({ ...modalState, open: false })}
        onOk={handleSubmit}
      />
      <GroupMembersDrawer
        open={memberDrawer.open}
        organizationId={activeOrgId}
        group={memberDrawer.group}
        onClose={() => setMemberDrawer({ open: false, group: null })}
      />
    </>
  );
};

export default UserGroups;
