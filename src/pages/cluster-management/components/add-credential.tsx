import {
  currentOrganizationAtom,
  organizationListAtom
} from '@/atoms/organization';
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
  const currentOrg = useAtomValue(currentOrganizationAtom);
  const memberOrgList = useAtomValue(organizationListAtom);
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;
  const [adminOrgList, setAdminOrgList] = useState<
    { id: number; name: string }[]
  >([]);
  useEffect(() => {
    if (!isAdmin || action !== PageAction.CREATE || !open) return;
    queryOrganizationsList({ page: -1 }).then((res: any) => {
      const items = res?.items || res || [];
      setAdminOrgList(items.map((o: any) => ({ id: o.id, name: o.name })));
    });
  }, [isAdmin, action, open]);
  const orgOptions = isAdmin
    ? [
        {
          value: null as number | null,
          label: intl.formatMessage({ id: 'clusters.form.owner.platform' })
        },
        ...adminOrgList.map((o) => ({ value: o.id, label: o.name }))
      ]
    : memberOrgList.map((o) => ({ value: o.id, label: o.name }));

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
        {action === PageAction.CREATE && (
          <Form.Item<FormData>
            name="organization_id"
            initialValue={isAdmin ? null : currentOrg?.id}
            rules={[{ required: false }]}
          >
            <SealSelect
              label={intl.formatMessage({ id: 'clusters.form.owner' })}
              options={orgOptions as any}
              disabled={!isAdmin && memberOrgList.length <= 1}
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
