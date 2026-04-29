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
  Password,
  Select as SealSelect
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import { useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react';
import { expirationOptions } from '../../config';
import { FormData, ListItem } from '../../config/types';
import AllowModelsForm from './allow-models';

const APIKeyForm: React.FC<{
  action: PageActionType;
  currentData?: Partial<ListItem> | null;
  onValuesChange?: (changedValues: any, allValues: any) => void;
}> = ({ action, currentData, onValuesChange }) => {
  const intl = useIntl();
  const keyType = Form.useWatch('key_type') as FormData['key_type'];
  const currentOrg = useAtomValue(currentOrganizationAtom);
  const orgList = useAtomValue(organizationListAtom);
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;

  // Admin can bind a key to any Org on the platform (act-as semantics);
  // non-admin users can only pick from Orgs they're a member of. Fetch
  // the full list once when the form mounts as admin; otherwise use the
  // already-loaded membership list.
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

  const orgOptions = (isAdmin ? adminOrgList : orgList).map((o) => ({
    value: o.id,
    label: o.name
  }));

  return (
    <>
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
          trim
          disabled={action === PageAction.EDIT}
          label={intl.formatMessage({ id: 'common.table.name' })}
          required
        ></CInput.Input>
      </Form.Item>
      {action === PageAction.CREATE && (
        <Form.Item<FormData>
          name="target_organization_id"
          initialValue={currentOrg?.id}
          rules={[
            {
              required: true,
              message: intl.formatMessage(
                { id: 'common.form.rule.select' },
                {
                  name: intl.formatMessage({
                    id: 'apikeys.form.organization'
                  })
                }
              )
            }
          ]}
        >
          <SealSelect
            label={intl.formatMessage({ id: 'apikeys.form.organization' })}
            required
            options={orgOptions}
          />
        </Form.Item>
      )}

      <Form.Item<FormData>
        name="expires_in"
        rules={[
          {
            required: true,
            message: intl.formatMessage(
              { id: 'common.form.rule.select' },
              {
                name: intl.formatMessage({
                  id: 'apikeys.form.expiretime'
                })
              }
            )
          }
        ]}
      >
        <SealSelect
          disabled={action === PageAction.EDIT}
          options={expirationOptions}
          label={intl.formatMessage({ id: 'apikeys.form.expiretime' })}
          required
        ></SealSelect>
      </Form.Item>
      <Form.Item<FormData> name="description" rules={[{ required: false }]}>
        <CInput.TextArea
          scaleSize={true}
          label={intl.formatMessage({ id: 'common.table.description' })}
        ></CInput.TextArea>
      </Form.Item>
      {action === PageAction.CREATE && (
        <>
          <Form.Item<FormData> name="key_type" initialValue="auto">
            <SealSelect
              options={[
                {
                  label: intl.formatMessage({ id: 'apikeys.type.auto' }),
                  value: 'auto'
                },
                {
                  label: intl.formatMessage({ id: 'apikeys.type.custom' }),
                  value: 'custom'
                }
              ]}
              label={intl.formatMessage({ id: 'common.table.type' })}
            ></SealSelect>
          </Form.Item>
          {keyType === 'custom' && (
            <Form.Item<FormData>
              name="custom"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage(
                    { id: 'common.form.rule.input' },
                    {
                      name: intl.formatMessage({
                        id: 'apikeys.table.key'
                      })
                    }
                  )
                }
              ]}
            >
              <Password
                trim
                required
                autoComplete="new-password"
                label={intl.formatMessage({ id: 'apikeys.table.key' })}
              ></Password>
            </Form.Item>
          )}
        </>
      )}

      <AllowModelsForm
        currentData={currentData}
        action={action}
        onValuesChange={onValuesChange}
      ></AllowModelsForm>
    </>
  );
};

export default APIKeyForm;
