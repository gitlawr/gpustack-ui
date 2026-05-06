import { currentOrganizationIdAtom } from '@/atoms/organization';
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
    // "All" mode = currentOrganizationIdAtom is null. The derived
    // currentOrganizationAtom falls back to list[0] for UI display, so
    // it can't be used as the "no context" probe — admin in "All"
    // would still see a non-null Org there and the picker would hide.
    const currentOrgId = useAtomValue(currentOrganizationIdAtom);
    const { initialState } = useModel('@@initialState') || {};
    const isAdmin = !!initialState?.currentUser?.is_admin;
    // Picker is shown only when no Org context is active — i.e. admin
    // in "All" mode. With a current Org (Org admin, or admin act-as)
    // the form binds to that Org implicitly.
    const showOrgPicker =
      action === PageAction.CREATE && isAdmin && currentOrgId == null;
    const [adminOrgList, setAdminOrgList] = useState<
      { id: number; name: string; is_platform?: boolean }[]
    >([]);
    useEffect(() => {
      if (!showOrgPicker) return;
      queryOrganizationsList({ page: -1 }).then((res: any) => {
        const items = res?.items || res || [];
        const list = items.map((o: any) => ({
          id: o.id,
          name: o.name,
          is_platform: o.is_platform
        }));
        setAdminOrgList(list);
        // Apply the default once the list arrives — Form.Item
        // initialValue captures at mount, but the list is fetched
        // async, so we have to seed the field after the fact (and
        // skip if the user already picked something).
        const defaultId =
          list.find((o: any) => o.is_platform)?.id ?? list[0]?.id;
        if (
          defaultId != null &&
          form.getFieldValue('organization_id') == null
        ) {
          form.setFieldValue('organization_id', defaultId);
        }
      });
    }, [showOrgPicker, form]);
    const orgOptions = adminOrgList.map((o) => ({
      value: o.id,
      label: o.name
    }));

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
        {showOrgPicker && (
          <Form.Item<FormData>
            name="organization_id"
            rules={[{ required: true }]}
          >
            <SealSelect
              label={intl.formatMessage({ id: 'clusters.form.organization' })}
              options={orgOptions as any}
              required
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
