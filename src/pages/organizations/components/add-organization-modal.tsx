import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import FormDrawer from '@/pages/_components/form-drawer';
import { Input as CInput } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import { useEffect, useRef } from 'react';
import { OrganizationFormData, OrganizationListItem } from '../config/types';

const slugReg = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

// Best-effort name → slug derivation matching the backend rule
// (^[a-z](?:[a-z0-9\-]*[a-z0-9])?$): lowercase, non-alnum → '-',
// collapse, trim, drop leading non-letters so the slug starts with a-z.
const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '');

type AddOrgModalProps = {
  open: boolean;
  action: PageActionType;
  title: string;
  data?: OrganizationListItem | null;
  onOk: (values: OrganizationFormData) => void;
  onCancel: () => void;
};

const AddOrganizationModal: React.FC<AddOrgModalProps> = ({
  open,
  action,
  title,
  data,
  onOk,
  onCancel
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<OrganizationFormData>();
  // Once the user types in the slug field manually we stop deriving it
  // from name — they're in control. Edit mode starts as "touched" so
  // auto-fill never overwrites an existing slug.
  const slugTouchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (action === PageAction.EDIT && data) {
      form.setFieldsValue({
        name: data.name,
        slug: data.slug,
        description: data.description
      });
      slugTouchedRef.current = true;
    } else {
      slugTouchedRef.current = false;
    }
  }, [open, action, data, form]);

  const handleValuesChange = (changed: Partial<OrganizationFormData>) => {
    if ('slug' in changed) {
      slugTouchedRef.current = true;
      return;
    }
    if (
      'name' in changed &&
      action === PageAction.CREATE &&
      !slugTouchedRef.current
    ) {
      form.setFieldValue('slug', slugify(changed.name || ''));
    }
  };

  const handleSubmit = () => {
    form.submit();
  };

  return (
    <FormDrawer
      title={title}
      open={open}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      width={520}
    >
      <Form
        name="addOrganizationForm"
        form={form}
        onFinish={onOk}
        onValuesChange={handleValuesChange}
        preserve={false}
      >
        <Form.Item<OrganizationFormData>
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
        <Form.Item<OrganizationFormData>
          name="slug"
          rules={[
            {
              required: true,
              message: intl.formatMessage(
                { id: 'common.form.rule.input' },
                { name: intl.formatMessage({ id: 'organizations.form.slug' }) }
              )
            },
            {
              pattern: slugReg,
              message: intl.formatMessage({
                id: 'organizations.form.slug.rule'
              })
            }
          ]}
        >
          <CInput.Input
            disabled={action === PageAction.EDIT && data?.is_platform}
            label={intl.formatMessage({ id: 'organizations.form.slug' })}
            required
          />
        </Form.Item>
        <Form.Item<OrganizationFormData>
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

export default AddOrganizationModal;
