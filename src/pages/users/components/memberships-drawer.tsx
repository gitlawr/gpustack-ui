import { Organization } from '@/atoms/organization';
import { OrganizationRoleOptions } from '@/pages/organizations/config/types';
import { queryUserMemberships, UserMembership } from '@/pages/users/apis';
import {
  addOrganizationMember,
  queryOrganizationsList,
  removeOrganizationMember,
  updateOrganizationMember
} from '@/services/organizations/apis';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
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
import { ListItem as UserItem } from '../config/types';

type Props = {
  open: boolean;
  user: UserItem | null;
  onClose: () => void;
};

const roleColor = (role: string) => {
  if (role === 'owner') return 'gold';
  if (role === 'manager') return 'geekblue';
  return 'default';
};

const MembershipsDrawer: React.FC<Props> = ({ open, user, onClose }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [form] = Form.useForm<{ org_ids: number[]; role: string }>();

  const fetchMemberships = useMemoizedFn(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await queryUserMemberships(user.id);
      setMemberships(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  });

  const fetchOrgs = useMemoizedFn(async () => {
    try {
      const res = await queryOrganizationsList({ page: -1 } as any);
      const list: Organization[] = (res as any)?.items || (res as any) || [];
      // Personal Orgs are intrinsic to a user — admins don't manage them.
      setOrgs(list.filter((o) => !o.is_personal));
    } catch (_) {
      setOrgs([]);
    }
  });

  useEffect(() => {
    if (open && user) {
      fetchMemberships();
      fetchOrgs();
      setAdding(false);
      form.resetFields();
    }
  }, [open, user, fetchMemberships, fetchOrgs, form]);

  const memberOrgIds = new Set(memberships.map((m) => m.organization.id));
  const candidateOrgs = orgs.filter((o) => !memberOrgIds.has(o.id));

  const handleAdd = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      // Bulk-add: fan out to per-org endpoints. Surface failures per row
      // rather than rolling back, since partial success is still useful.
      const results = await Promise.allSettled(
        values.org_ids.map((orgId) =>
          addOrganizationMember({
            orgId,
            data: { user_id: user.id, role: values.role as any }
          })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) {
        message.success(intl.formatMessage({ id: 'common.message.success' }));
      } else if (failed < results.length) {
        message.warning(
          intl.formatMessage(
            { id: 'users.memberships.add.partial' },
            { failed, total: results.length }
          )
        );
      } else {
        message.error(intl.formatMessage({ id: 'common.message.fail' }));
      }
      setAdding(false);
      form.resetFields();
      fetchMemberships();
    } catch (_) {
      // validation error handled by antd
    }
  };

  const handleRoleChange = async (record: UserMembership, role: string) => {
    if (!user) return;
    try {
      await updateOrganizationMember({
        orgId: record.organization.id,
        userId: user.id,
        data: { role: role as any }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchMemberships();
    } catch (_) {
      // ignore
    }
  };

  const handleRemove = async (record: UserMembership) => {
    if (!user) return;
    try {
      await removeOrganizationMember({
        orgId: record.organization.id,
        userId: user.id
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchMemberships();
    } catch (_) {
      // ignore
    }
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'organizations.title.org' }),
      dataIndex: ['organization', 'name'],
      key: 'name',
      render: (_: any, record: UserMembership) => (
        <Space>
          <span>{record.organization.name}</span>
          {record.organization.is_platform && (
            <Tag color="default">
              {intl.formatMessage({ id: 'organizations.tag.platform' })}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: intl.formatMessage({ id: 'organizations.member.role' }),
      dataIndex: 'role',
      key: 'role',
      width: 200,
      render: (_: any, record: UserMembership) => (
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
      render: (_: any, record: UserMembership) => (
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
          {intl.formatMessage({ id: 'users.memberships.title' })}
          {user && <Tag style={{ marginLeft: 8 }}>{user.username}</Tag>}
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
          <Tag color={roleColor('member')}>
            {intl.formatMessage(
              { id: 'users.memberships.count' },
              { count: memberships.length }
            )}
          </Tag>
          {!adding && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAdding(true)}
              disabled={candidateOrgs.length === 0}
            >
              {intl.formatMessage({ id: 'users.memberships.add' })}
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
              name="org_ids"
              rules={[{ required: true }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder={intl.formatMessage({
                  id: 'users.memberships.selectOrgs'
                })}
                style={{ minWidth: 280 }}
                optionFilterProp="label"
                options={candidateOrgs.map((o) => ({
                  value: o.id,
                  label: o.name
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
          rowKey={(record) => record.organization.id}
          dataSource={memberships}
          columns={columns as any}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>
    </GSDrawer>
  );
};

export default MembershipsDrawer;
