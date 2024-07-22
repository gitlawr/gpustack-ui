import EditorWrap from '@/components/editor-wrap';
import { BulbOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useIntl } from '@umijs/max';
import { Button, Modal } from 'antd';
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

  const intl = useIntl();
  const editorRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [lang, setLang] = useState('shell');

  const BaseURL = `${window.location.origin}/v1-openai`;

  const langOptions = [
    { label: 'Curl', value: 'shell' },
    { label: 'Python', value: 'python' },
    { label: 'Nodejs', value: 'javascript' }
  ];

  const formatCode = () => {
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
  };
  const generateCode = () => {
    if (lang === 'shell') {
      const systemList = systemMessage
        ? [{ role: 'system', content: systemMessage }]
        : [];
      const code = `curl ${window.location.origin}/v1-openai/chat/completions \\\n-H "Content-Type: application/json" \\\n-H "Authorization: Bearer $\{YOUR_GPUSTACK_API_KEY}" \\\n-d '${JSON.stringify(
        {
          ...parameters,
          messages: [
            ...systemList,
            ..._.map(messageList, (item: any) => {
              return { role: item.role, content: item.content };
            })
          ]
        },
        null,
        2
      )}'`;
      setCodeValue(code);
    } else if (lang === 'javascript') {
      const systemList = systemMessage
        ? [{ role: 'system', content: systemMessage }]
        : [];
      const code = `const OpenAI = require("openai");\n\nconst openai = new OpenAI({\n  "apiKey": "YOUR_GPUSTACK_API_KEY",\n  "baseURL": "${BaseURL}"\n});\n\n\nasync function main(){\n  const params = ${JSON.stringify(
        {
          ...parameters,
          messages: [
            ...systemList,
            ..._.map(messageList, (item: any) => {
              return { role: item.role, content: item.content };
            })
          ]
        },
        null,
        4
      )};\nconst chatCompletion = await openai.chat.completions.create(params);\n  console.log(chatCompletion.choices[0].message.content);\n}\nmain();`;
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
      const code = `from openai import OpenAI\n\nclient = OpenAI(\n  base_url="${BaseURL}", \n  api_key="YOUR_GPUSTACK_API_KEY"\n)\n\ncompletion = client.chat.completions.create(\n${formattedParams}  messages=${JSON.stringify(
        [
          ...systemList,
          ..._.map(messageList, (item: any) => {
            return { role: item.role, content: item.content };
          })
        ],
        null,
        2
      )})\nprint(completion.choices[0].message.content)`;
      setCodeValue(code);
    }
    formatCode();
  };
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setLoaded(true);
    console.log('loaded====', editor, monaco);
  };

  const handleBeforeMount = (monaco: any) => {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [80001]
    });
  };

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
    hover: {
      enabled: false
    },
    readOnly: true,
    formatOnType: true,
    formatOnPaste: true,
    fontWeight: 'bold',
    scrollbar: {
      verticalSliderSize: 8
    }
  };

  useEffect(() => {
    generateCode();
  }, [lang, systemMessage, messageList, parameters]);

  return (
    <>
      <Modal
        title={title}
        open={open}
        centered={true}
        onCancel={handleClose}
        destroyOnClose={true}
        closeIcon={true}
        maskClosable={false}
        keyboard={false}
        width={600}
        footer={null}
      >
        <div style={{ marginBottom: '10px' }}>
          {intl.formatMessage({ id: 'playground.viewcode.info' })}
        </div>
        <div>
          <EditorWrap
            copyText={codeValue}
            langOptions={langOptions}
            defaultValue="shell"
            showHeader={loaded}
            onChangeLang={handleOnChangeLang}
          >
            <Editor
              height={380}
              theme="vs-dark"
              className="monaco-editor"
              defaultLanguage="shell"
              language={lang}
              value={codeValue}
              options={editorConfig}
              overrideServices={{
                quickSuggestions: {
                  other: false,
                  comments: false,
                  strings: false
                },
                disableLayerHinting: true,
                languages: {
                  typescript: {
                    moduleKind: '2',
                    diagnosticsOptions: {
                      noSemanticValidation: false,
                      noSyntaxValidation: false,
                      diagnosticCodesToIgnore: [80001]
                    }
                  }
                }
              }}
              beforeMount={handleBeforeMount}
              onMount={handleEditorDidMount}
            />
          </EditorWrap>
          <div
            style={{ marginTop: 10, display: 'flex', alignItems: 'baseline' }}
          >
            <BulbOutlined className="m-r-8" />
            <span>
              {intl.formatMessage(
                { id: 'playground.viewcode.tips' },
                {
                  here: (
                    <Button
                      type="link"
                      size="small"
                      href="#/api-keys"
                      target="_blank"
                      style={{ paddingInline: 2 }}
                    >
                      <span>
                        {' '}
                        {intl.formatMessage({
                          id: 'playground.viewcode.here'
                        })}
                      </span>
                    </Button>
                  )
                }
              )}
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ViewCodeModal;
