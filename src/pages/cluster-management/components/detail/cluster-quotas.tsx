import { queryClusterItem } from '@/pages/cluster-management/apis';
import {
  queryClusterAccess,
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
      // Quota rows reflect Orgs that can actually deploy on this
      // cluster: the cluster's owner Org (implicit USER access) plus
      // any Org granted access via cluster_access. Listing every Org
      // would imply quotas exist for tenants that can't even see the
      // cluster.
      const emptyAccess: any[] = [];
      const [cluster, accessList, orgsResp] = await Promise.all([
        queryClusterItem({ id: clusterId }).catch(() => null),
        queryClusterAccess(clusterId).catch(() => emptyAccess),
        queryOrganizationsList({ page: -1 })
      ]);

      const allOrgs: any[] =
        (orgsResp as any)?.items || (orgsResp as any) || [];
      const orgById = new Map<number, any>();
      for (const o of allOrgs) orgById.set(o.id, o);

      const accessibleOrgIds = new Set<number>();
      const ownerOrgId = (cluster as any)?.organization_id;
      if (ownerOrgId != null) accessibleOrgIds.add(ownerOrgId);
      const accessEntries: any[] = accessList || [];
      for (const entry of accessEntries) {
        // Use the server-resolved principal_organization_id: ORG grants
        // expose their own Org; GROUP grants expose the group's owning
        // Org; USER grants leave it NULL because a user can deploy under
        // any of their Orgs and quota attribution is per (user, Org)
        // context at deploy time.
        if (entry.principal_organization_id != null) {
          accessibleOrgIds.add(entry.principal_organization_id);
        }
      }

      const orgList = Array.from(accessibleOrgIds)
        .map((id) => orgById.get(id))
        .filter(Boolean);

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
