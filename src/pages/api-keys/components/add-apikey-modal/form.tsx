import {
  currentOrganizationAtom,
  organizationListAtom
} from '@/atoms/organization';
import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import { useModel } from '@@/plugin-model';
import {
  Input as CInput,
  Password,
  Select as SealSelect
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Tag } from 'antd';
import { useAtomValue } from 'jotai';
import React from 'react';
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
  // Admin in Platform-wide mode has no current org context — they need to
  // pick which org the key gets bound to. For everyone else the org is
  // implicit (the active switcher value).
  const needsOrgPicker = action === PageAction.CREATE && isAdmin && !currentOrg;

  return (
    <>
      {action === PageAction.CREATE && currentOrg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '8px 12px',
            background: 'var(--ant-color-fill-tertiary)',
            borderRadius: 6
          }}
        >
          <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
            {intl.formatMessage({ id: 'apikeys.form.organization' })}:
          </span>
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {currentOrg.name}
          </Tag>
        </div>
      )}
      {needsOrgPicker && (
        <Form.Item<FormData>
          name="target_organization_id"
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
            options={orgList.map((o) => ({ value: o.id, label: o.name }))}
          />
        </Form.Item>
      )}
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
