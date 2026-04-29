import { queryUsersList } from '@/pages/users/apis';
import {
  addClusterAccess,
  ClusterAccess,
  PrincipalType,
  queryClusterAccess,
  queryOrganizationsList,
  queryUserGroups,
  removeClusterAccess
} from '@/services/organizations/apis';
import { PlusOutlined } from '@ant-design/icons';
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
  clusterId: number;
};

const principalColor = (type: PrincipalType) => {
  if (type === 'org') return 'blue';
  if (type === 'group') return 'purple';
  return 'green';
};

const ClusterAccessTab: React.FC<Props> = ({ clusterId }) => {
  const intl = useIntl();
  const [list, setList] = useState<ClusterAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm<{
    principal_type: PrincipalType;
    principal_id: number;
    organization_id?: number;
  }>();

  const principalType = Form.useWatch('principal_type', form);
  const orgIdForGroup = Form.useWatch('organization_id', form);

  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);

  const fetchAccess = useMemoizedFn(async () => {
    setLoading(true);
    try {
      const res = await queryClusterAccess(clusterId);
      const arr = Array.isArray(res) ? res : (res as any)?.items || [];
      setList(arr);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  useEffect(() => {
    if (!adding) return;
    queryOrganizationsList({ page: -1 }).then((res: any) =>
      setOrgs((res?.items || res || []) as any)
    );
    queryUsersList({ page: -1 }).then((res: any) =>
      setUsers((res?.items || res || []) as any)
    );
  }, [adding]);

  useEffect(() => {
    if (principalType === 'group' && orgIdForGroup) {
      queryUserGroups(orgIdForGroup, { page: -1 }).then((res: any) =>
        setGroups((res?.items || res || []) as any)
      );
    } else {
      setGroups([]);
    }
  }, [principalType, orgIdForGroup]);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      await addClusterAccess({
        clusterId,
        data: {
          principal_type: values.principal_type,
          principal_id: values.principal_id
        }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setAdding(false);
      form.resetFields();
      fetchAccess();
    } catch (_) {}
  };

  const handleRemove = async (record: ClusterAccess) => {
    try {
      await removeClusterAccess({
        clusterId,
        principal_type: record.principal_type,
        principal_id: record.principal_id
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      fetchAccess();
    } catch (_) {}
  };

  const columns = useMemo(
    () => [
      {
        title: intl.formatMessage({
          id: 'organizations.access.principalType'
        }),
        dataIndex: 'principal_type',
        width: 160,
        render: (type: PrincipalType) => (
          <Tag color={principalColor(type)}>
            {intl.formatMessage({ id: `organizations.principal.${type}` })}
          </Tag>
        )
      },
      {
        title: intl.formatMessage({ id: 'organizations.access.principal' }),
        dataIndex: 'principal_name',
        render: (text: string, record: ClusterAccess) =>
          text || `#${record.principal_id}`
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        key: 'op',
        width: 120,
        render: (_t: any, record: ClusterAccess) => (
          <Popconfirm
            title={intl.formatMessage({ id: 'common.delete.tips' })}
            okText={intl.formatMessage({ id: 'common.button.confirm' })}
            cancelText={intl.formatMessage({ id: 'common.button.cancel' })}
            onConfirm={() => handleRemove(record)}
          >
            <Button danger size="small" type="text">
              {intl.formatMessage({ id: 'common.button.remove' })}
            </Button>
          </Popconfirm>
        )
      }
    ],
    [intl]
  );

  const principalOptions =
    principalType === 'org'
      ? orgs.map((o) => ({ value: o.id, label: o.name }))
      : principalType === 'user'
        ? users.map((u) => ({ value: u.id, label: u.username }))
        : groups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <div style={{ padding: '16px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16
        }}
      >
        {!adding && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAdding(true)}
          >
            {intl.formatMessage({ id: 'organizations.access.add' })}
          </Button>
        )}
      </div>
      {adding && (
        <Form
          form={form}
          layout="inline"
          initialValues={{ principal_type: 'org' }}
          style={{
            marginBottom: 16,
            padding: 16,
            background: 'var(--ant-color-fill-tertiary)',
            borderRadius: 6
          }}
          onValuesChange={(changed) => {
            if (changed.principal_type) {
              form.setFieldsValue({
                principal_id: undefined,
                organization_id: undefined
              });
            }
            if (changed.organization_id) {
              form.setFieldsValue({ principal_id: undefined });
            }
          }}
        >
          <Form.Item name="principal_type" rules={[{ required: true }]}>
            <Select
              style={{ width: 160 }}
              options={[
                {
                  value: 'org',
                  label: intl.formatMessage({
                    id: 'organizations.principal.org'
                  })
                },
                {
                  value: 'group',
                  label: intl.formatMessage({
                    id: 'organizations.principal.group'
                  })
                },
                {
                  value: 'user',
                  label: intl.formatMessage({
                    id: 'organizations.principal.user'
                  })
                }
              ]}
            />
          </Form.Item>
          {principalType === 'group' && (
            <Form.Item name="organization_id" rules={[{ required: true }]}>
              <Select
                placeholder={intl.formatMessage({
                  id: 'organizations.groups.selectOrg'
                })}
                style={{ width: 200 }}
                options={orgs.map((o) => ({ value: o.id, label: o.name }))}
              />
            </Form.Item>
          )}
          <Form.Item name="principal_id" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 240 }}
              placeholder={intl.formatMessage({
                id: 'organizations.access.principal'
              })}
              options={principalOptions}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleAdd}>
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
        rowKey={(record) => `${record.principal_type}:${record.principal_id}`}
        loading={loading}
        dataSource={list}
        columns={columns as any}
        pagination={false}
        size="middle"
        locale={{
          emptyText: intl.formatMessage({ id: 'organizations.access.empty' })
        }}
      />
    </div>
  );
};

export default ClusterAccessTab;
