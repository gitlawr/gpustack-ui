import ModalFooter from '@/components/modal-footer';
import SealAutoComplete from '@/components/seal-form/auto-complete';
import SealInput from '@/components/seal-form/seal-input';
import SealSelect from '@/components/seal-form/seal-select';
import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import { Form, Modal } from 'antd';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { callHuggingfaceQuickSearch } from '../apis';
import { FormData } from '../config/types';

type AddModalProps = {
  title: string;
  action: PageActionType;
  open: boolean;
  onOk: (values: FormData) => void;
  onCancel: () => void;
};

const sourceOptions = [
  { label: 'Huggingface', value: 'huggingface', key: 'huggingface' },
  { label: 'Ollama', value: 'ollama_library', key: 'ollama_library' },
  { label: 'S3', value: 's3', key: 's3' }
];

const AddModal: React.FC<AddModalProps> = (props) => {
  const { title, action, open, onOk, onCancel } = props || {};
  const [form] = Form.useForm();
  const modelSource = Form.useWatch('source', form);
  const [repoOptions, setRepoOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [fileOptions, setFileOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const initFormValue = () => {
    if (action === PageAction.CREATE && open) {
      form.setFieldsValue({
        source: 'huggingface'
      });
    }
  };

  useEffect(() => {
    initFormValue();
  }, [open]);

  const handleInputRepoChange = (value: string) => {
    console.log('repo change', value);
  };

  const debounceSearch = _.debounce((text: string) => {
    handleOnSearchRepo(text);
  }, 300);

  const handleOnSearchRepo = async (text: string) => {
    try {
      const params = {
        q: text,
        type: 'model'
      };
      const res = await callHuggingfaceQuickSearch(params);
      const list = _.map(res.models || [], (item: any) => {
        return {
          value: item.id,
          label: item.id
        };
      });
      setRepoOptions(list);
    } catch (error) {
      setRepoOptions([]);
    }
  };

  const renderHuggingfaceFields = () => {
    return (
      <>
        <Form.Item<FormData>
          name="huggingface_repo_id"
          rules={[{ required: true }]}
        >
          <SealAutoComplete
            label="Repo ID"
            required
            showSearch
            onChange={handleInputRepoChange}
            onSearch={debounceSearch}
            options={repoOptions}
          ></SealAutoComplete>
        </Form.Item>
        <Form.Item<FormData>
          name="huggingface_filename"
          rules={[{ required: true }]}
        >
          <SealInput.Input label="File Name" required></SealInput.Input>
        </Form.Item>
      </>
    );
  };

  const renderS3Fields = () => {
    return (
      <>
        <Form.Item<FormData> name="s3_address" rules={[{ required: true }]}>
          <SealInput.Input label="S3 Address" required></SealInput.Input>
        </Form.Item>
      </>
    );
  };

  const renderOllamaModelFields = () => {
    return (
      <>
        <Form.Item<FormData>
          name="ollama_library_model_name"
          rules={[{ required: true }]}
        >
          <SealInput.Input label="Model Name" required></SealInput.Input>
        </Form.Item>
      </>
    );
  };

  const renderFieldsBySource = () => {
    switch (modelSource) {
      case 'huggingface':
        return renderHuggingfaceFields();
      case 'ollama_library':
        return renderOllamaModelFields();
      case 's3':
        return renderS3Fields();
      default:
        return null;
    }
  };

  const handleSourceChange = (value: string) => {
    console.log('source change', value);
  };
  const handleSumit = () => {
    form.submit();
  };
  const handleOnFinish = (values: FormData) => {
    console.log('onFinish', values);
    onOk(values);
  };
  return (
    <Modal
      title={title}
      open={open}
      onOk={handleSumit}
      onCancel={onCancel}
      destroyOnClose={true}
      closeIcon={false}
      maskClosable={false}
      keyboard={false}
      width={600}
      styles={{}}
      footer={
        <ModalFooter onCancel={onCancel} onOk={handleSumit}></ModalFooter>
      }
    >
      <Form name="addModalForm" form={form} onFinish={onOk} preserve={false}>
        <Form.Item<FormData> name="name" rules={[{ required: true }]}>
          <SealInput.Input
            label="Name"
            required
            description="description info"
          ></SealInput.Input>
        </Form.Item>
        <Form.Item<FormData> name="source" rules={[{ required: true }]}>
          <SealSelect
            label="Source"
            options={sourceOptions}
            required
            onChange={handleSourceChange}
          ></SealSelect>
        </Form.Item>
        {renderFieldsBySource()}
        <Form.Item<FormData> name="replicas" rules={[{ required: true }]}>
          <SealInput.Number
            style={{ width: '100%' }}
            label="Replicas"
            required
            min={1}
          ></SealInput.Number>
        </Form.Item>
        <Form.Item<FormData> name="description">
          <SealInput.TextArea label="Description"></SealInput.TextArea>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddModal;
