import { queryUsersList } from '@/pages/users/apis';
import { ListItem as UserItem } from '@/pages/users/config/types';
import {
  addOrganizationMember,
  OrganizationMember,
  queryOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMember
} from '@/services/organizations/apis';
import { CloseOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
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
import { useEffect, useState } from 'react';
import { OrganizationListItem, OrganizationRoleOptions } from '../config/types';

type Props = {
  open: boolean;
  organization: OrganizationListItem | null;
  onClose: () => void;
};

const roleColor = (role: string) => {
  if (role === 'owner') return 'gold';
  if (role === 'admin') return 'geekblue';
  return 'default';
};

const MembersDrawer: React.FC<Props> = ({ open, organization, onClose }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [form] = Form.useForm<{ user_id: number; role: string }>();

  const fetchMembers = useMemoizedFn(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const res = await queryOrganizationMembers(organization.id);
      const list = Array.isArray(res) ? res : (res as any)?.items || [];
      setMembers(list);
    } finally {
      setLoading(false);
    }
  });

  const fetchUsers = useMemoizedFn(async () => {
    try {
      const res = await queryUsersList({ page: -1 });
      setUsers((res as any)?.items || (res as any) || []);
    } catch (_) {
      setUsers([]);
    }
  });

  // Enrich members with username/full_name resolved from the user list.
  const enrichedMembers: OrganizationMember[] = members.map((m) => {
    const user = users.find((u) => u.id === m.user_id);
    return {
      ...m,
      username: m.username ?? user?.username,
      full_name: m.full_name ?? user?.full_name
    } as OrganizationMember;
  });

  useEffect(() => {
    if (open && organization) {
      fetchMembers();
      fetchUsers();
      setAdding(false);
      form.resetFields();
    }
  }, [open, organization, fetchMembers, fetchUsers, form]);

  const handleAdd = async () => {
    if (!organization) return;
    try {
      const values = await form.validateFields();
      await addOrganizationMember({
        orgId: organization.id,
        data: { user_id: values.user_id, role: values.role as any }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setAdding(false);
      form.resetFields();
      fetchMembers();
    } catch (_) {
      // validation handled by antd
    }
  };

  const handleRoleChange = async (record: OrganizationMember, role: string) => {
    if (!organization) return;
    try {
      await updateOrganizationMember({
        orgId: organization.id,
        userId: record.user_id,
        data: { role: role as any }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchMembers();
    } catch (_) {
      // ignore
    }
  };

  const handleRemove = async (record: OrganizationMember) => {
    if (!organization) return;
    try {
      await removeOrganizationMember({
        orgId: organization.id,
        userId: record.user_id
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchMembers();
    } catch (_) {
      // ignore
    }
  };

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const candidateUsers = users.filter(
    (u) => !memberUserIds.has(u.id) && u.is_active
  );

  const columns = [
    {
      title: intl.formatMessage({ id: 'common.table.name' }),
      dataIndex: 'username',
      key: 'username',
      render: (_: any, record: OrganizationMember) => (
        <Space>
          <UserOutlined />
          <span>{record.username || record.user_id}</span>
          {record.full_name && (
            <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
              ({record.full_name})
            </span>
          )}
        </Space>
      )
    },
    {
      title: intl.formatMessage({ id: 'organizations.member.role' }),
      dataIndex: 'role',
      key: 'role',
      width: 200,
      render: (_: any, record: OrganizationMember) => (
        <Select
          value={record.role}
          style={{ width: 140 }}
          options={OrganizationRoleOptions.map((opt) => ({
            value: opt.value,
            label: intl.formatMessage({ id: opt.label })
          }))}
          onChange={(val) => handleRoleChange(record, val)}
          variant="borderless"
        />
      )
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'op',
      width: 100,
      render: (_: any, record: OrganizationMember) => (
        <Popconfirm
          title={intl.formatMessage({
            id: 'organizations.member.remove.confirm'
          })}
          okText={intl.formatMessage({ id: 'common.button.confirm' })}
          cancelText={intl.formatMessage({ id: 'common.button.cancel' })}
          onConfirm={() => handleRemove(record)}
        >
          <Button type="text" danger icon={<CloseOutlined />} size="small">
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
              disabled={candidateUsers.length === 0}
            >
              {intl.formatMessage({ id: 'organizations.members.add' })}
            </Button>
          )}
        </div>
        {adding && (
          <Form
            form={form}
            layout="inline"
            initialValues={{ role: 'member' }}
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
                style={{ width: 240 }}
                optionFilterProp="label"
                options={candidateUsers.map((u) => ({
                  value: u.id,
                  label: `${u.username}${u.full_name ? ' / ' + u.full_name : ''}`
                }))}
              />
            </Form.Item>
            <Form.Item name="role" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={OrganizationRoleOptions.map((opt) => ({
                  value: opt.value,
                  label: intl.formatMessage({ id: opt.label })
                }))}
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
          dataSource={enrichedMembers}
          columns={columns as any}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>
    </GSDrawer>
  );
};

export default MembersDrawer;
