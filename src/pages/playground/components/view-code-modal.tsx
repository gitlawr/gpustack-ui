import EditorWrap from '@/components/editor-wrap';
import Editor from '@monaco-editor/react';
import { Modal, Spin } from 'antd';
import _ from 'lodash';
import React, { useEffect, useRef, useState } from 'react';

type ViewModalProps = {
  systemMessage?: string;
  messageList: any[];
  parameters: any;
  title: string;
  open: boolean;
  onCancel: () => void;
};

const ViewCodeModal: React.FC<ViewModalProps> = (props) => {
  const {
    title,
    open,
    onCancel,
    systemMessage,
    messageList,
    parameters = {}
  } = props || {};

  const editorRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [lang, setLang] = useState('shell');

  const langOptions = [
    { label: 'Curl', value: 'shell' },
    { label: 'Python', value: 'python' },
    { label: 'Nodejs', value: 'javascript' }
  ];

  useEffect(() => {
    generateCode();
  }, [lang, systemMessage, messageList, parameters]);

  const generateCode = () => {
    if (lang === 'shell') {
      const systemList = systemMessage
        ? [{ role: 'system', content: systemMessage }]
        : [];
      const code = `curl ${window.location.origin}/v1/chat/completions \n-H "Content-Type: application/json" \n-H "Authorization: Bearer $\{GPUSTACK_API_KEY}\" \n-d '${JSON.stringify(
        {
          ...parameters,
          messages: [...systemList, ...messageList]
        },
        null,
        2
      )}'`;
      setCodeValue(code);
    } else if (lang === 'javascript') {
      const systemList = systemMessage
        ? [{ role: 'system', content: systemMessage }]
        : [];
      const code = `import OpenAI from "openai";\nconst openai = new OpenAI();\n\nasync function main(){\nconst params = ${JSON.stringify(
        {
          ...parameters,
          messages: [...systemList, ...messageList]
        },
        null,
        2
      )};\nconst chatCompletion = await openai.chat.completions.create(params);\nfor await (const chunk of chatCompletion) {\n  process.stdout.write(chunk.choices[0]?.delta?.content || '');\n}\n}\nmain();`;
      setCodeValue(code);
    } else if (lang === 'python') {
      const formattedParams = _.keys(parameters).reduce(
        (acc: string, key: string) => {
          if (parameters[key] === null) {
            return acc;
          }
          const value =
            typeof parameters[key] === 'string'
              ? `"${parameters[key]}"`
              : parameters[key];
          return acc + `  ${key}=${value},\n`;
        },
        ''
      );
      const systemList = systemMessage
        ? [{ role: 'system', content: systemMessage }]
        : [];
      const code = `from openai import OpenAI\nclient = OpenAI()\n\ncompletion = client.chat.completions.create(\n${formattedParams}  messages=${JSON.stringify([...systemList, ...messageList], null, 2)})\nprint(completion.choices[0].message)`;
      setCodeValue(code);
    }
    formatCode();
  };
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setLoaded(true);
  };

  function formatCode() {
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current
          ?.getAction?.('editor.action.formatDocument')
          ?.run()
          .then(() => {
            console.log('format success');
          });
      }, 100);
    }
  }

  const handleOnChangeLang = (value: string) => {
    setLang(value);
  };

  const handleClose = () => {
    setLang('shell');
    onCancel();
  };
  const editorConfig = {
    minimap: {
      enabled: false
    },
    formatOnType: true,
    formatOnPaste: true,
    scrollbar: {
      verticalSliderSize: 8
    }
  };

  return (
    <>
      <Modal
        title={title}
        open={open}
        onCancel={handleClose}
        destroyOnClose={true}
        closeIcon={true}
        maskClosable={false}
        keyboard={false}
        width={600}
        style={{ top: '80px' }}
        footer={null}
      >
        <div style={{ marginBottom: '10px' }}>
          You can use the following code to start integrating your current
          prompt and settings into your application.
        </div>
        <Spin spinning={!loaded}>
          <EditorWrap
            copyText={codeValue}
            langOptions={langOptions}
            defaultValue="shell"
            showHeader={loaded}
            onChangeLang={handleOnChangeLang}
          >
            <Editor
              height="400px"
              theme="vs-dark"
              className="monaco-editor"
              defaultLanguage="shell"
              language={lang}
              value={codeValue}
              options={editorConfig}
              onMount={handleEditorDidMount}
            />
          </EditorWrap>
        </Spin>
        <div style={{ marginTop: '10px' }}>
          our API Key can be foundhere You should use environment variables or a
          secret management tool to expose your key to your applications.
        </div>
      </Modal>
    </>
  );
};

export default ViewCodeModal;
