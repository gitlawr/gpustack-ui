import {
  currentOrganizationAtom,
  organizationListAtom
} from '@/atoms/organization';
import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import { json2Yaml, yaml2Json } from '@/pages/backends/config';
import { queryOrganizationsList } from '@/services/organizations/apis';
import { useModel } from '@@/plugin-model';
import {
  Input as CInput,
  CollapsePanel,
  Select as SealSelect,
  Textarea as SealTextArea
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import { useAtomValue } from 'jotai';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';
import { ProviderType, ProviderValueMap } from '../config';
import {
  ClusterFormData as FormData,
  ClusterListItem as ListItem
} from '../config/types';
import AdvanceConfig from '../step-forms/advance-config';
import CloudProvider from './cloud-provider-form';

type AddModalProps = {
  action: PageActionType;
  currentData?: ListItem; // Used when action is EDIT
  provider: ProviderType;
  credentialList: Global.BaseOption<number>[];
  onFinish: (values: FormData) => void;
  ref?: any;
};
const ClusterForm: React.FC<AddModalProps> = forwardRef(
  ({ action, provider, currentData, credentialList, onFinish }, ref) => {
    const [form] = Form.useForm();
    const intl = useIntl();
    const [activeKey, setActiveKey] = React.useState<string[]>([]);
    const advanceConfigRef = React.useRef<any>(null);
    const currentOrg = useAtomValue(currentOrganizationAtom);
    const memberOrgList = useAtomValue(organizationListAtom);
    const { initialState } = useModel('@@initialState') || {};
    const isAdmin = !!initialState?.currentUser?.is_admin;
    const [adminOrgList, setAdminOrgList] = useState<
      { id: number; name: string }[]
    >([]);
    useEffect(() => {
      if (!isAdmin || action !== PageAction.CREATE) return;
      queryOrganizationsList({ page: -1 }).then((res: any) => {
        const items = res?.items || res || [];
        setAdminOrgList(items.map((o: any) => ({ id: o.id, name: o.name })));
      });
    }, [isAdmin, action]);
    // Admin: full dropdown (Global + every Org). Non-admin: pick from
    // the team Orgs where the caller holds owner/manager — Personal
    // Orgs and member-only Orgs are excluded since they can't own
    // shared infra. With one matching Org the dropdown collapses to a
    // single (still selectable) option.
    const orgOptions = isAdmin
      ? [
          {
            value: null as number | null,
            label: intl.formatMessage({ id: 'clusters.form.owner.platform' })
          },
          ...adminOrgList.map((o) => ({ value: o.id, label: o.name }))
        ]
      : memberOrgList
          .filter(
            (o) =>
              !o.is_personal && (o.role === 'owner' || o.role === 'manager')
          )
          .map((o) => ({ value: o.id, label: o.name }));

    const handleOnCollapseChange = async (keys: string | string[]) => {
      setActiveKey(Array.isArray(keys) ? keys : [keys]);
    };

    useEffect(() => {
      if (
        activeKey?.includes?.('advanceConfig') &&
        action === PageAction.EDIT
      ) {
        const el = document.querySelector('.scroller-to-holder');
        if (!el) return;
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    }, [activeKey, action]);

    const handleOnFinish = (values: FormData) => {
      const workerConfig = yaml2Json(advanceConfigRef.current?.getYamlValue());

      onFinish({
        ...values,
        worker_config: {
          ...workerConfig
        }
      });
    };

    useEffect(() => {
      if (currentData) {
        const volumeMounts = currentData?.k8s_volume_mounts || [];
        const realVolumeList = (volumeMounts || []).map(
          (item: any, index: number) => ({
            ...item,
            sourceType: Object.keys(item.volumeSource || {})[0] || 'hostPath'
          })
        );
        form.setFieldsValue({
          ...currentData,
          k8s_volume_mounts: realVolumeList
        });
      } else {
        form.setFieldsValue({
          k8s_volume_mounts: [
            {
              name: 'gpustack-data-dir',
              mountPath: '/var/lib/gpustack',
              readOnly: false,
              sourceType: 'hostPath',
              volumeSource: {
                hostPath: {
                  path: '/var/lib/gpustack',
                  type: 'DirectoryOrCreate'
                }
              }
            }
          ]
        });
      }
    }, [currentData]);

    useEffect(() => {
      if (currentData) {
        if (advanceConfigRef.current) {
          const workerConfigYaml = json2Yaml(currentData.worker_config || {});
          advanceConfigRef.current?.setYamlValue(workerConfigYaml);
        }
      }
    }, [currentData, advanceConfigRef.current]);

    useImperativeHandle(ref, () => ({
      resetFields: () => {
        form.resetFields();
      },
      submit: () => {
        form.submit();
      },
      setFieldsValue: (values: any) => {
        form.setFieldsValue({
          ...values,
          worker_config: undefined
        });
        const workerConfigYaml = json2Yaml(values.worker_config || {});
        advanceConfigRef.current?.setYamlValue(workerConfigYaml);
      },
      getFieldsValue: () => {
        const workerConfig = yaml2Json(
          advanceConfigRef.current?.getYamlValue()
        );
        return {
          ...form.getFieldsValue(),
          worker_config: {
            ...workerConfig
          }
        };
      },
      validateFields: async () => {
        const values = await form.validateFields();
        const workerConfig = yaml2Json(
          advanceConfigRef.current?.getYamlValue()
        );

        return {
          ...values,
          worker_config: {
            ...workerConfig
          }
        };
      }
    }));

    return (
      <Form
        name="clusterForm"
        form={form}
        onFinish={handleOnFinish}
        preserve={false}
        scrollToFirstError={true}
        initialValues={currentData}
      >
        <Form.Item<FormData>
          name="name"
          rules={[
            {
              required: true,
              message: intl.formatMessage(
                { id: 'common.form.rule.input' },
                {
                  name: intl.formatMessage({ id: 'common.table.name' })
                }
              )
            }
          ]}
        >
          <CInput.Input
            label={intl.formatMessage({ id: 'common.table.name' })}
            required
            trim={false}
          ></CInput.Input>
        </Form.Item>
        {action === PageAction.CREATE && (
          // When the caller has no real choice (≤1 option), hide the
          // dropdown — `initialValue` still flows through the form
          // submission. Typical "hidden" cases:
          //  - non-admin who's only in one team Org
          //  - admin on a deployment without a Global option
          // Admin with at least 2 options (Global + ≥1 Org) always sees
          // the picker since the choice is meaningful.
          <Form.Item<FormData>
            name="organization_id"
            initialValue={
              // Admin: follow current context — "All" mode → Global,
              // Org context → that Org. Non-admin: their current Org id
              // (which `access.ts` already guarantees is non-personal
              // when they reach this form).
              isAdmin ? (currentOrg?.id ?? null) : currentOrg?.id
            }
            rules={[{ required: false }]}
            hidden={orgOptions.length <= 1}
          >
            <SealSelect
              label={intl.formatMessage({ id: 'clusters.form.owner' })}
              options={orgOptions as any}
            ></SealSelect>
          </Form.Item>
        )}
        {provider === ProviderValueMap.DigitalOcean && (
          <CloudProvider
            provider={provider}
            action={action}
            credentialID={currentData?.credential_id}
            credentialList={credentialList}
          ></CloudProvider>
        )}

        <Form.Item<FormData>
          name="description"
          rules={[{ required: false }]}
          style={{ marginBottom: 8 }}
        >
          <SealTextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            label={intl.formatMessage({ id: 'common.table.description' })}
          ></SealTextArea>
        </Form.Item>

        <CollapsePanel
          accordion={false}
          activeKey={activeKey}
          onChange={handleOnCollapseChange}
          items={[
            {
              key: 'advanceConfig',
              label: intl.formatMessage({ id: 'resources.form.advanced' }),
              forceRender: true,
              children: (
                <AdvanceConfig
                  action={action}
                  provider={provider}
                  ref={advanceConfigRef}
                ></AdvanceConfig>
              )
            }
          ]}
        ></CollapsePanel>
      </Form>
    );
  }
);

export default ClusterForm;
