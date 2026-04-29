import { queryUsersList } from '@/pages/users/apis';
import {
  queryGroupMembers,
  queryOrganizationMembers,
  removeGroupMember,
  setGroupMembers,
  UserGroup
} from '@/services/organizations/apis';
import { GSDrawer } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, message, Popconfirm, Space, Table, Tag, Transfer } from 'antd';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  open: boolean;
  organizationId: number | null;
  group: UserGroup | null;
  onClose: () => void;
};

const GroupMembersDrawer: React.FC<Props> = ({
  open,
  organizationId,
  group,
  onClose
}) => {
  const intl = useIntl();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgMembers, setOrgMembers] = useState<
    { key: number; title: string }[]
  >([]);
  const [groupMembers, setGroupMembersState] = useState<any[]>([]);
  const [targetKeys, setTargetKeys] = useState<number[]>([]);

  const fetchOrgMembers = useMemoizedFn(async () => {
    if (!organizationId) return;
    const res = await queryOrganizationMembers(organizationId);
    const list = Array.isArray(res) ? res : (res as any)?.items || [];
    // OrganizationMembershipPublic only carries user_id; join with user list
    // for human-readable labels.
    const usersRes = await queryUsersList({ page: -1 });
    const userArr =
      (usersRes as any)?.items || (Array.isArray(usersRes) ? usersRes : []);
    const idToName = new Map<number, string>(
      userArr.map((u: any) => [u.id, u.username])
    );
    setOrgMembers(
      list.map((m: any) => ({
        key: m.user_id,
        title: idToName.get(m.user_id) || `#${m.user_id}`
      }))
    );
  });

  const fetchGroupMembers = useMemoizedFn(async () => {
    if (!organizationId || !group) return;
    setLoading(true);
    try {
      const res = await queryGroupMembers({
        orgId: organizationId,
        groupId: group.id
      });
      const list = (
        Array.isArray(res) ? res : (res as any)?.items || []
      ) as any[];
      setGroupMembersState(list);
      setTargetKeys(list.map((m: any) => m.user_id));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (open && group) {
      fetchOrgMembers();
      fetchGroupMembers();
      setEditing(false);
    }
  }, [open, group, fetchOrgMembers, fetchGroupMembers]);

  const transferData = useMemo(
    () => orgMembers.map((m) => ({ ...m, key: String(m.key) })),
    [orgMembers]
  );

  const handleSave = async () => {
    if (!organizationId || !group) return;
    try {
      await setGroupMembers({
        orgId: organizationId,
        groupId: group.id,
        data: { user_ids: targetKeys.map((k) => Number(k)) }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setEditing(false);
      fetchGroupMembers();
    } catch (_) {}
  };

  const handleRemove = async (record: any) => {
    if (!organizationId || !group) return;
    try {
      await removeGroupMember({
        orgId: organizationId,
        groupId: group.id,
        userId: record.user_id
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchGroupMembers();
    } catch (_) {}
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'common.table.name' }),
      dataIndex: 'username',
      render: (_t: any, record: any) => record.username || `#${record.user_id}`
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'op',
      width: 120,
      render: (_t: any, record: any) => (
        <Popconfirm
          title={intl.formatMessage({
            id: 'organizations.member.remove.confirm'
          })}
          okText={intl.formatMessage({ id: 'common.button.confirm' })}
          cancelText={intl.formatMessage({ id: 'common.button.cancel' })}
          onConfirm={() => handleRemove(record)}
        >
          <Button danger type="text" size="small">
            {intl.formatMessage({ id: 'common.button.remove' })}
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <GSDrawer
      title={
        <span>
          {intl.formatMessage({ id: 'organizations.groups.members.title' })}
          {group && <Tag style={{ marginLeft: 8 }}>{group.name}</Tag>}
        </span>
      }
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{ wrapper: { width: 720 } }}
    >
      <div style={{ padding: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          {!editing ? (
            <Button type="primary" onClick={() => setEditing(true)}>
              {intl.formatMessage({ id: 'common.button.edit' })}
            </Button>
          ) : (
            <>
              <Button type="primary" onClick={handleSave}>
                {intl.formatMessage({ id: 'common.button.save' })}
              </Button>
              <Button onClick={() => setEditing(false)}>
                {intl.formatMessage({ id: 'common.button.cancel' })}
              </Button>
            </>
          )}
        </Space>
        {editing ? (
          <Transfer
            dataSource={transferData}
            targetKeys={targetKeys.map((k) => String(k))}
            onChange={(keys) => setTargetKeys(keys.map((k) => Number(k)))}
            render={(item) => item.title}
            showSearch
            listStyle={{ width: 300, height: 400 }}
            titles={[
              intl.formatMessage({ id: 'organizations.members.title' }),
              intl.formatMessage({ id: 'organizations.groups.members.title' })
            ]}
          />
        ) : (
          <Table
            rowKey="user_id"
            dataSource={groupMembers}
            columns={columns as any}
            loading={loading}
            pagination={false}
            size="middle"
          />
        )}
      </div>
    </GSDrawer>
  );
};

export default GroupMembersDrawer;
