import { currentOrganizationIdAtom } from '@/atoms/organization';
import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import { queryOrganizationsList } from '@/services/organizations/apis';
import { useModel } from '@@/plugin-model';
import {
  Input as CInput,
  FormDrawer,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import { useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ProviderType, ProviderValueMap } from '../config';
import {
  CredentialFormData as FormData,
  CredentialListItem as ListItem
} from '../config/types';

type AddModalProps = {
  title: string;
  action: PageActionType;
  open: boolean;
  onOk: (values: FormData) => void;
  currentData?: ListItem;
  onCancel: () => void;
  provider: ProviderType;
};
const AddModal: React.FC<AddModalProps> = ({
  title,
  action,
  open,
  onOk,
  currentData,
  provider,
  onCancel
}) => {
  const [form] = Form.useForm();
  const intl = useIntl();
  const { getRuleMessage } = useAppUtils();
  // Use the ID atom (not the derived currentOrganizationAtom which
  // falls back to list[0] for display) to probe "All" mode.
  const currentOrgId = useAtomValue(currentOrganizationIdAtom);
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;
  // Same picker rule as cluster: only admin in "All" mode picks; with
  // a current Org context (Org admin / admin act-as) the form binds to
  // that Org implicitly.
  const showOrgPicker =
    action === PageAction.CREATE && isAdmin && currentOrgId == null && open;
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
      // Seed the default after the async fetch completes — Form.Item
      // initialValue captures at mount, before the list arrives.
      const defaultId = list.find((o: any) => o.is_platform)?.id ?? list[0]?.id;
      if (defaultId != null && form.getFieldValue('organization_id') == null) {
        form.setFieldValue('organization_id', defaultId);
      }
    });
  }, [showOrgPicker, form]);
  const orgOptions = adminOrgList.map((o) => ({
    value: o.id,
    label: o.name
  }));

  const handleSumit = () => {
    form.submit();
  };

  const handleOk = async (data: FormData) => {
    onOk(data);
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };
  useEffect(() => {
    if (currentData) {
      form.setFieldsValue(currentData);
    }
  }, [currentData]);

  return (
    <FormDrawer
      title={title}
      open={open}
      onSubmit={handleSumit}
      onCancel={handleCancel}
    >
      <Form form={form} onFinish={handleOk} preserve={false}>
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
          <>
            <Form.Item<FormData>
              name="secret"
              rules={[
                {
                  required: action === PageAction.CREATE,
                  message: getRuleMessage('input', 'clusters.credential.token')
                }
              ]}
            >
              <CInput.Password
                label={intl.formatMessage({
                  id: 'clusters.credential.token'
                })}
                required={action === PageAction.CREATE}
                description={
                  <span
                    dangerouslySetInnerHTML={{
                      __html: intl.formatMessage(
                        {
                          id: 'clusters.button.genToken'
                        },
                        {
                          link: 'https://cloud.digitalocean.com/account/api/tokens'
                        }
                      )
                    }}
                  ></span>
                }
              ></CInput.Password>
            </Form.Item>
          </>
        )}
        <Form.Item<FormData> name="description" rules={[{ required: false }]}>
          <CInput.TextArea
            label={intl.formatMessage({ id: 'common.table.description' })}
          ></CInput.TextArea>
        </Form.Item>
      </Form>
    </FormDrawer>
  );
};

export default AddModal;
