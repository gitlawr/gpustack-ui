import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import FormDrawer from '@/pages/_components/form-drawer';
import { UserGroup, UserGroupFormData } from '@/services/organizations/apis';
import { Input as CInput, Select as SealSelect } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import { useEffect } from 'react';

type OrgOption = { id: number; name: string; is_platform?: boolean };

type Props = {
  open: boolean;
  action: PageActionType;
  title: string;
  data?: UserGroup | null;
  // Admin-in-"All" gets to pick which Org to drop the group into; for
  // any other context the page binds the create call to the current
  // Org switcher value implicitly.
  showOrgPicker?: boolean;
  orgOptions?: OrgOption[];
  defaultOrgId?: number | null;
  onOk: (values: UserGroupFormData & { organization_id?: number }) => void;
  onCancel: () => void;
};

const GroupModal: React.FC<Props> = ({
  open,
  action,
  title,
  data,
  showOrgPicker,
  orgOptions = [],
  defaultOrgId,
  onOk,
  onCancel
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<
    UserGroupFormData & { organization_id?: number }
  >();
  const showPicker = !!showOrgPicker && action === PageAction.CREATE;

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (action === PageAction.EDIT && data) {
      form.setFieldsValue({
        name: data.name,
        description: data.description
      });
    } else if (showPicker && defaultOrgId != null) {
      form.setFieldsValue({ organization_id: defaultOrgId });
    }
  }, [open, action, data, form, showPicker, defaultOrgId]);

  return (
    <FormDrawer
      title={title}
      open={open}
      onCancel={onCancel}
      onSubmit={() => form.submit()}
      width={520}
    >
      <Form form={form} onFinish={onOk} preserve={false} name="userGroupForm">
        <Form.Item<UserGroupFormData>
          name="name"
          rules={[
            {
              required: true,
              message: intl.formatMessage(
                { id: 'common.form.rule.input' },
                { name: intl.formatMessage({ id: 'common.table.name' }) }
              )
            }
          ]}
        >
          <CInput.Input
            label={intl.formatMessage({ id: 'common.table.name' })}
            required
          />
        </Form.Item>
        {/* Organization picker placed under Name to match cluster /
            credential forms — admin-in-"All" only. */}
        {showPicker && (
          <Form.Item name="organization_id" rules={[{ required: true }]}>
            <SealSelect
              label={intl.formatMessage({ id: 'clusters.form.organization' })}
              options={orgOptions.map((o) => ({
                value: o.id,
                label: o.name
              }))}
              required
            />
          </Form.Item>
        )}
        <Form.Item<UserGroupFormData>
          name="description"
          rules={[{ required: false }]}
        >
          <CInput.TextArea
            scaleSize
            label={intl.formatMessage({ id: 'common.table.description' })}
          />
        </Form.Item>
      </Form>
    </FormDrawer>
  );
};

export default GroupModal;
