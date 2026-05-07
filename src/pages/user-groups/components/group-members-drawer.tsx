import {
  addGroupMember,
  queryGroupMembers,
  queryOrganizationMembers,
  removeGroupMember,
  UserGroup
} from '@/services/organizations/apis';
import { DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { GSDrawer, IconFont } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import {
  Button,
  Form,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  open: boolean;
  organizationId: number | null;
  group: UserGroup | null;
  onClose: () => void;
};

// Mirrors `members-panel.tsx` UX: count tag + inline "Add member" form
// + table with delete. Sourcing the candidate list from
// `queryOrganizationMembers` matches the backend invariant that group
// members must already be org members, and avoids the admin-only
// `queryUsersList` endpoint.
const GroupMembersDrawer: React.FC<Props> = ({
  open,
  organizationId,
  group,
  onClose
}) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [form] = Form.useForm<{ user_id: number }>();

  const fetchMembers = useMemoizedFn(async () => {
    if (!organizationId || !group) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await queryGroupMembers({
        orgId: organizationId,
        groupId: group.id
      });
      const list = Array.isArray(res) ? res : (res as any)?.items || [];
      setMembers(list);
    } finally {
      setLoading(false);
    }
  });

  const fetchOrgMembers = useMemoizedFn(async () => {
    if (!organizationId) {
      setOrgMembers([]);
      return;
    }
    const res = await queryOrganizationMembers(organizationId);
    const list = Array.isArray(res) ? res : (res as any)?.items || [];
    setOrgMembers(list);
  });

  useEffect(() => {
    if (open && group && organizationId) {
      fetchMembers();
      fetchOrgMembers();
      setAdding(false);
      form.resetFields();
    }
  }, [open, group, organizationId, fetchMembers, fetchOrgMembers, form]);

  const memberIds = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members]
  );

  const orgMemberById = useMemo(() => {
    const map = new Map<number, any>();
    for (const m of orgMembers) map.set(m.user_id, m);
    return map;
  }, [orgMembers]);

  // The list endpoint enriches with username/full_name, but fall back to
  // the org-members map so newly added rows render correctly before the
  // server response is fully cached, and for older backends.
  const enrichedMembers = useMemo(
    () =>
      members.map((m) => {
        const orgM = orgMemberById.get(m.user_id);
        return {
          ...m,
          username: m.username || orgM?.username,
          full_name: m.full_name || orgM?.full_name
        };
      }),
    [members, orgMemberById]
  );

  const candidateOptions = useMemo(
    () =>
      orgMembers
        .filter((m) => !memberIds.has(m.user_id))
        .map((m) => ({
          value: m.user_id,
          label: m.username || `#${m.user_id}`,
          full_name: m.full_name
        })),
    [orgMembers, memberIds]
  );

  const handleAdd = async () => {
    if (!organizationId || !group) return;
    try {
      const values = await form.validateFields();
      await addGroupMember({
        orgId: organizationId,
        groupId: group.id,
        data: { user_id: values.user_id }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setAdding(false);
      form.resetFields();
      fetchMembers();
    } catch (_) {
      // antd handles validation surfaces
    }
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
      fetchMembers();
    } catch (_) {
      // ignore
    }
  };

  const renderUserOption = (oriOption: any) => {
    const data = oriOption.data || {};
    return (
      <Space>
        <UserOutlined />
        <span>{data.label}</span>
        {data.full_name && (
          <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
            ({data.full_name})
          </span>
        )}
      </Space>
    );
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'common.table.name' }),
      dataIndex: 'username',
      key: 'username',
      render: (_t: any, record: any) => (
        <Space>
          <UserOutlined />
          <span>{record.username || `#${record.user_id}`}</span>
          {record.full_name && (
            <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
              ({record.full_name})
            </span>
          )}
        </Space>
      )
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'op',
      width: 120,
      render: (_t: any, record: any) => (
        <Popconfirm
          title={intl.formatMessage({
            id: 'organizations.groups.member.remove.confirm'
          })}
          okText={intl.formatMessage({ id: 'common.button.confirm' })}
          cancelText={intl.formatMessage({ id: 'common.button.cancel' })}
          onConfirm={() => handleRemove(record)}
        >
          <Button danger type="text" size="small" icon={<DeleteOutlined />}>
            {intl.formatMessage({ id: 'common.button.delete' })}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}
        >
          <Tag color="blue">
            {intl.formatMessage(
              { id: 'organizations.members.count' },
              { count: members.length }
            )}
          </Tag>
          {!adding && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAdding(true)}
              disabled={!organizationId || !group}
            >
              {intl.formatMessage({ id: 'organizations.members.add' })}
            </Button>
          )}
        </div>
        {adding && (
          <Form
            form={form}
            layout="inline"
            style={{
              marginBottom: 16,
              padding: 12,
              background: 'var(--ant-color-fill-tertiary)',
              borderRadius: 6
            }}
          >
            <Form.Item
              name="user_id"
              rules={[{ required: true }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <Select
                showSearch
                placeholder={intl.formatMessage({
                  id: 'organizations.members.selectUser'
                })}
                style={{ width: 280 }}
                options={candidateOptions}
                optionRender={renderUserOption}
                filterOption={(input, option) =>
                  String((option as any)?.label || '')
                    .toLowerCase()
                    .includes(input.toLowerCase()) ||
                  String((option as any)?.full_name || '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  onClick={handleAdd}
                  icon={<IconFont type="icon-check" />}
                >
                  {intl.formatMessage({ id: 'common.button.add' })}
                </Button>
                <Button
                  onClick={() => {
                    setAdding(false);
                    form.resetFields();
                  }}
                >
                  {intl.formatMessage({ id: 'common.button.cancel' })}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
        <Table
          rowKey="user_id"
          dataSource={members}
          columns={columns as any}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>
    </GSDrawer>
  );
};

export default GroupMembersDrawer;
