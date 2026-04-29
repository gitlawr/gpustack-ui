import {
  queryOrganizationQuotas,
  queryOrganizationsList,
  TenantQuota,
  updateOrganizationQuota
} from '@/services/organizations/apis';
import { EditOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, InputNumber, message, Modal, Table } from 'antd';
import { useEffect, useState } from 'react';

type Props = {
  clusterId: number;
};

interface QuotaRow extends TenantQuota {
  org_name?: string;
}

const GIB = 1024 * 1024 * 1024;

const ClusterQuotasTab: React.FC<Props> = ({ clusterId }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<QuotaRow[]>([]);
  const [editing, setEditing] = useState<QuotaRow | null>(null);
  const [form] = Form.useForm<{
    gpu?: number;
    cpu?: number;
    memory?: number;
    pod_count?: number;
  }>();

  const fetchData = useMemoizedFn(async () => {
    setLoading(true);
    try {
      const orgs = await queryOrganizationsList({ page: -1 });
      const orgList = (((orgs as any)?.items || orgs || []) as any[]) || [];

      const merged: QuotaRow[] = await Promise.all(
        orgList.map(async (org: any) => {
          try {
            const res: any = await queryOrganizationQuotas(org.id);
            const items = Array.isArray(res) ? res : res?.items || [];
            const match = items.find(
              (q: TenantQuota) => q.cluster_id === clusterId
            );
            return {
              cluster_id: clusterId,
              organization_id: org.id,
              org_name: org.name,
              ...(match || {})
            } as QuotaRow;
          } catch {
            return {
              cluster_id: clusterId,
              organization_id: org.id,
              org_name: org.name
            } as QuotaRow;
          }
        })
      );
      setRows(merged);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (record: QuotaRow) => {
    setEditing(record);
    form.setFieldsValue({
      gpu: record.gpu ?? undefined,
      cpu:
        record.cpu_milli != null
          ? Math.round(record.cpu_milli / 1000)
          : undefined,
      memory:
        record.memory_bytes != null
          ? Math.round(record.memory_bytes / GIB)
          : undefined,
      pod_count: record.pod_count ?? undefined
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const values = await form.validateFields();
      await updateOrganizationQuota({
        orgId: editing.organization_id,
        data: {
          cluster_id: clusterId,
          organization_id: editing.organization_id,
          gpu: values.gpu ?? null,
          cpu_milli: values.cpu != null ? values.cpu * 1000 : null,
          memory_bytes: values.memory != null ? values.memory * GIB : null,
          pod_count: values.pod_count ?? null
        }
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setEditing(null);
      fetchData();
    } catch (_) {}
  };

  const renderQuota = (val: number | null | undefined, suffix?: string) => {
    if (val == null) {
      return (
        <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
          {intl.formatMessage({ id: 'organizations.quotas.unlimited' })}
        </span>
      );
    }
    return suffix ? `${val} ${suffix}` : String(val);
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'organizations.title.org' }),
      dataIndex: 'org_name'
    },
    {
      title: intl.formatMessage({ id: 'organizations.quotas.gpu' }),
      dataIndex: 'gpu',
      width: 120,
      render: (v: number) => renderQuota(v)
    },
    {
      title: intl.formatMessage({ id: 'organizations.quotas.cpu' }),
      dataIndex: 'cpu_milli',
      width: 140,
      render: (v: number) =>
        renderQuota(v != null ? Math.round(v / 1000) : v, 'cores')
    },
    {
      title: intl.formatMessage({ id: 'organizations.quotas.memory' }),
      dataIndex: 'memory_bytes',
      width: 160,
      render: (v: number) =>
        renderQuota(v != null ? Math.round(v / GIB) : v, 'GiB')
    },
    {
      title: intl.formatMessage({ id: 'organizations.quotas.pods' }),
      dataIndex: 'pod_count',
      width: 120,
      render: (v: number) => renderQuota(v)
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      key: 'op',
      width: 100,
      render: (_t: any, record: QuotaRow) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'common.button.edit' })}
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Table
        rowKey="organization_id"
        loading={loading}
        dataSource={rows}
        columns={columns as any}
        pagination={false}
        size="middle"
      />
      <Modal
        title={
          editing
            ? intl.formatMessage(
                { id: 'common.button.edit.item' },
                { name: editing.org_name }
              )
            : intl.formatMessage({ id: 'organizations.quotas.title' })
        }
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSave}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="gpu"
            label={intl.formatMessage({ id: 'organizations.quotas.gpu' })}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({
                id: 'organizations.quotas.unlimited'
              })}
            />
          </Form.Item>
          <Form.Item
            name="cpu"
            label={intl.formatMessage({ id: 'organizations.quotas.cpu' })}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({
                id: 'organizations.quotas.unlimited'
              })}
            />
          </Form.Item>
          <Form.Item
            name="memory"
            label={intl.formatMessage({ id: 'organizations.quotas.memory' })}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({
                id: 'organizations.quotas.unlimited'
              })}
            />
          </Form.Item>
          <Form.Item
            name="pod_count"
            label={intl.formatMessage({ id: 'organizations.quotas.pods' })}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({
                id: 'organizations.quotas.unlimited'
              })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClusterQuotasTab;
