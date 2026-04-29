import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import FormDrawer from '@/pages/_components/form-drawer';
import { UserGroup, UserGroupFormData } from '@/services/organizations/apis';
import { Input as CInput } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  action: PageActionType;
  title: string;
  data?: UserGroup | null;
  onOk: (values: UserGroupFormData) => void;
  onCancel: () => void;
};

const GroupModal: React.FC<Props> = ({
  open,
  action,
  title,
  data,
  onOk,
  onCancel
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<UserGroupFormData>();

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
    }
  }, [open, action, data, form]);

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
