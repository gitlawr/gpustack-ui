import PrincipalSelect from '@/components/principal-select';
import {
  addOrganizationMember,
  OrganizationMember,
  queryOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMember
} from '@/services/organizations/apis';
import { DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { IconFont } from '@gpustack/core-ui';
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
  Tag,
  Tooltip
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { OrganizationRoleOptions } from '../config/types';

// Shared body for organization-member management. Used by:
//   - `members-drawer.tsx`: opens from the platform-admin Organizations
//     page, takes a single Org and renders inside a drawer.
//   - `pages/org-members/index.tsx`: standalone page for Org admins
//     who manage their own Org via the global Org switcher.
// Both modes share the same fetch / add / role-change / remove flow,
// so the table + add form live here once.

type Props = {
  organizationId: number | null;
  // When false, fetches are deferred (used by the drawer to avoid
  // hitting the API while the drawer is closed).
  active?: boolean;
};

const MembersPanel: React.FC<Props> = ({ organizationId, active = true }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [form] = Form.useForm<{ user_id: number; role: string }>();

  const roleOptions = OrganizationRoleOptions.map((opt) => ({
    value: opt.value,
    label: intl.formatMessage({ id: opt.label }),
    helpKey: `organizations.role.${opt.value}.help`
  }));
  const renderRoleOption = (oriOption: any) => {
    const labelText = oriOption.data?.label ?? oriOption.label;
    const help = oriOption?.data?.helpKey
      ? intl.formatMessage({ id: oriOption.data.helpKey })
      : null;
    if (!help) return <span>{labelText}</span>;
    return (
      <Tooltip title={help} placement="right" mouseEnterDelay={0.2}>
        <span style={{ display: 'block', width: '100%' }}>{labelText}</span>
      </Tooltip>
    );
  };

  const fetchMembers = useMemoizedFn(async () => {
    if (organizationId == null) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await queryOrganizationMembers(organizationId);
      const list = Array.isArray(res) ? res : (res as any)?.items || [];
      setMembers(list);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (active && organizationId != null) {
      fetchMembers();
      setAdding(false);
      form.resetFields();
    }
  }, [active, organizationId, fetchMembers, form]);

  const handleAdd = async () => {
    if (organizationId == null) return;
    try {
      const values = await form.validateFields();
      await addOrganizationMember({
        orgId: organizationId,
        data: { user_id: values.user_id, role: values.role as any }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setAdding(false);
      form.resetFields();
      fetchMembers();
    } catch (_) {
      // antd handles validation surfaces
    }
  };

  const handleRoleChange = async (record: OrganizationMember, role: string) => {
    if (organizationId == null) return;
    try {
      await updateOrganizationMember({
        orgId: organizationId,
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
    if (organizationId == null) return;
    try {
      await removeOrganizationMember({
        orgId: organizationId,
        userId: record.user_id
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchMembers();
    } catch (_) {
      // ignore
    }
  };

  const memberUserIds = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members]
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
          options={roleOptions}
          optionRender={renderRoleOption}
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
          <Button type="text" danger icon={<DeleteOutlined />} size="small">
            {intl.formatMessage({ id: 'common.button.delete' })}
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
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
            disabled={organizationId == null}
          >
            {intl.formatMessage({ id: 'organizations.members.add' })}
          </Button>
        )}
      </div>
      {adding && (
        <Form
          form={form}
          layout="inline"
          initialValues={{ role: 'user' }}
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
            <PrincipalSelect
              kind="user"
              placeholder={intl.formatMessage({
                id: 'organizations.members.selectUser'
              })}
              style={{ width: 240 }}
              filter={(opt) => !memberUserIds.has(opt.value)}
            />
          </Form.Item>
          <Form.Item name="role" rules={[{ required: true }]}>
            <Select
              style={{ width: 140 }}
              options={roleOptions}
              optionRender={renderRoleOption}
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
  );
};

export default MembersPanel;
