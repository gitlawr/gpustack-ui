import PrincipalSelect from '@/components/principal-select';
import {
  addOrganizationMember,
  OrganizationMember,
  queryOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMember
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
  Tag,
  Tooltip
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { OrganizationListItem, OrganizationRoleOptions } from '../config/types';

type Props = {
  open: boolean;
  organization: OrganizationListItem | null;
  onClose: () => void;
};

const roleColor = (role: string) => {
  if (role === 'admin') return 'geekblue';
  return 'default';
};

const MembersDrawer: React.FC<Props> = ({ open, organization, onClose }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [form] = Form.useForm<{ user_id: number; role: string }>();

  // Shared option list + dropdown renderer for both the inline column
  // editor and the add-member form. Hovering an option surfaces a
  // tooltip describing the role's scope so the difference between
  // Admin and User (Org-scoped, distinct from platform `is_admin`)
  // is discoverable without cluttering the dropdown.
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
    if (!help) {
      return <span>{labelText}</span>;
    }
    return (
      <Tooltip title={help} placement="right" mouseEnterDelay={0.2}>
        {/* span fills the option row so hover anywhere on the row
            triggers the tooltip, not just on the text. */}
        <span style={{ display: 'block', width: '100%' }}>{labelText}</span>
      </Tooltip>
    );
  };

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

  // Server enriches each member with username + full_name, so no
  // need to pull the full users list here.
  const enrichedMembers: OrganizationMember[] = members;

  useEffect(() => {
    if (open && organization) {
      fetchMembers();
      setAdding(false);
      form.resetFields();
    }
  }, [open, organization, fetchMembers, form]);

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
