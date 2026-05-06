import PrincipalSelect from '@/components/principal-select';
import {
  addClusterAccess,
  ClusterAccess,
  PrincipalType,
  queryClusterAccess,
  removeClusterAccess
} from '@/services/organizations/apis';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { DeleteModal } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, message, Select, Space, Table, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const modalRef = useRef<any>(null);
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

  // PrincipalSelect handles fetching + searching internally; no need
  // to prefetch users / orgs / groups up front.

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

  const handleRemove = (record: ClusterAccess) => {
    // Use the shared DeleteModal so the confirmation looks like every
    // other delete in the app (avoids the inline Popconfirm bubble).
    const principalLabel =
      record.principal_name ||
      `${intl.formatMessage({ id: `organizations.principal.${record.principal_type}` })} #${record.principal_id}`;
    modalRef.current?.show({
      content: 'organizations.access.title',
      operation: 'common.delete.single.confirm',
      name: principalLabel,
      async onOk() {
        await removeClusterAccess({
          clusterId,
          principal_type: record.principal_type,
          principal_id: record.principal_id
        });
        message.success(intl.formatMessage({ id: 'common.message.success' }));
        fetchAccess();
      }
    });
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
          <Button
            danger
            size="small"
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(record)}
          >
            {intl.formatMessage({ id: 'common.button.delete' })}
          </Button>
        )
      }
    ],
    [intl]
  );

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
              <PrincipalSelect
                kind="org"
                placeholder={intl.formatMessage({
                  id: 'organizations.groups.selectOrg'
                })}
                style={{ width: 200 }}
              />
            </Form.Item>
          )}
          <Form.Item name="principal_id" rules={[{ required: true }]}>
            <PrincipalSelect
              kind={principalType as any}
              orgId={
                principalType === 'group' ? (orgIdForGroup ?? null) : undefined
              }
              placeholder={intl.formatMessage({
                id: 'organizations.access.principal'
              })}
              style={{ width: 240 }}
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
      <DeleteModal ref={modalRef}></DeleteModal>
    </div>
  );
};

export default ClusterAccessTab;
