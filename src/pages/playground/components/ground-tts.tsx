import SpeechContent from '@/components/speech-content';
import useOverlayScroller from '@/hooks/use-overlay-scroller';
import { fetchChunkedData, readStreamData } from '@/utils/fetch-chunk-data';
import { useIntl, useSearchParams } from '@umijs/max';
import { Spin } from 'antd';
import classNames from 'classnames';
import _ from 'lodash';
import 'overlayscrollbars/overlayscrollbars.css';
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { CHAT_API } from '../apis';
import { Roles, generateMessages } from '../config';
import { TTSParamsConfig as paramsConfig } from '../config/params-config';
import { MessageItem } from '../config/types';
import '../style/ground-left.less';
import '../style/system-message-wrap.less';
import MessageInput from './message-input';
import ReferenceParams from './reference-params';
import RerankerParams from './reranker-params';
import ViewCodeModal from './view-code-modal';

interface MessageProps {
  modelList: Global.BaseOption<string>[];
  loaded?: boolean;
  ref?: any;
}

const initialValues = {
  voice: 'Alloy',
  response_format: 'mp3',
  speed: 1
};

const GroundLeft: React.FC<MessageProps> = forwardRef((props, ref) => {
  const { modelList } = props;
  const messageId = useRef<number>(0);
  const [messageList, setMessageList] = useState<MessageItem[]>([]);

  const intl = useIntl();
  const [searchParams] = useSearchParams();
  const selectModel = searchParams.get('model') || '';
  const [parameters, setParams] = useState<any>({});
  const [systemMessage, setSystemMessage] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [collapse, setCollapse] = useState(false);
  const contentRef = useRef<any>('');
  const controllerRef = useRef<any>(null);
  const scroller = useRef<any>(null);
  const currentMessageRef = useRef<any>(null);
  const paramsRef = useRef<any>(null);
  const messageListLengthCache = useRef<number>(0);
  const checkvalueRef = useRef<any>(true);

  const { initialize, updateScrollerPosition } = useOverlayScroller();
  const { initialize: innitializeParams } = useOverlayScroller();

  useImperativeHandle(ref, () => {
    return {
      viewCode() {
        setShow(true);
      },
      setCollapse() {
        setCollapse(!collapse);
      },
      collapse: collapse
    };
  });

  const viewCodeMessage = useMemo(() => {
    return generateMessages([
      { role: Roles.System, content: systemMessage },
      ...messageList
    ]);
  }, [messageList, systemMessage]);

  const setMessageId = () => {
    messageId.current = messageId.current + 1;
  };

  const handleNewMessage = (message?: { role: string; content: string }) => {
    const newMessage = message || {
      role:
        _.last(messageList)?.role === Roles.User ? Roles.Assistant : Roles.User,
      content: ''
    };
    messageList.push({
      ...newMessage,
      uid: messageId.current + 1
    });
    setMessageId();
    setMessageList([...messageList]);
  };

  const joinMessage = (chunk: any) => {
    setTokenResult({
      ...(chunk?.usage ?? {})
    });

    if (!chunk || !_.get(chunk, 'choices', []).length) {
      return;
    }
    contentRef.current =
      contentRef.current + _.get(chunk, 'choices.0.delta.content', '');
    setMessageList([
      ...messageList,
      ...currentMessageRef.current,
      {
        role: Roles.Assistant,
        content: contentRef.current,
        uid: messageId.current
      }
    ]);
  };
  const handleStopConversation = () => {
    controllerRef.current?.abort?.();
    setLoading(false);
  };

  const submitMessage = async (current?: { role: string; content: string }) => {
    if (!parameters.model) return;
    try {
      setLoading(true);
      setMessageId();
      setTokenResult(null);

      controllerRef.current?.abort?.();
      controllerRef.current = new AbortController();
      const signal = controllerRef.current.signal;
      currentMessageRef.current = current
        ? [
            {
              ...current,
              uid: messageId.current
            }
          ]
        : [];

      contentRef.current = '';
      setMessageList((pre) => {
        return [...pre, ...currentMessageRef.current];
      });

      const messageParams = [
        { role: Roles.System, content: systemMessage },
        ...messageList,
        ...currentMessageRef.current
      ];

      const messages = generateMessages(messageParams);

      const chatParams = {
        messages: messages,
        ...parameters,
        stream: true,
        stream_options: {
          include_usage: true
        }
      };
      const result: any = await fetchChunkedData({
        data: chatParams,
        url: CHAT_API,
        signal
      });

      if (result?.error) {
        setTokenResult({
          error: true,
          errorMessage:
            result?.data?.error?.message || result?.data?.message || ''
        });
        return;
      }
      setMessageId();
      const { reader, decoder } = result;
      await readStreamData(reader, decoder, (chunk: any) => {
        if (chunk?.error) {
          setTokenResult({
            error: true,
            errorMessage: chunk?.error?.message || chunk?.message || ''
          });
          return;
        }
        joinMessage(chunk);
      });
    } catch (error) {
      // console.log('error:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleClear = () => {
    if (!messageList.length) {
      return;
    }
    setMessageId();
    setMessageList([]);
    setTokenResult(null);
  };

  const handleSendMessage = (message: Omit<MessageItem, 'uid'>) => {
    // submitMessage(currentMessage);
    setMessageId();
    setLoading(true);

    setTimeout(() => {
      setMessageList([
        {
          prompt: message.content,
          voice: parameters.voice,
          format: parameters.response_format,
          speed: parameters.speed,
          uid: messageId.current,
          autoplay: checkvalueRef.current
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const handleCloseViewCode = () => {
    setShow(false);
  };

  const handleSelectModel = () => {};

  const handlePresetPrompt = (list: { role: string; content: string }[]) => {
    const sysMsg = list.filter((item) => item.role === 'system');
    const userMsg = list
      .filter((item) => item.role === 'user')
      .map((item) => {
        setMessageId();
        return {
          ...item,
          uid: messageId.current
        };
      });
    setSystemMessage(sysMsg[0]?.content || '');
    setMessageList(userMsg);
  };
  const handleOnCheckChange = (e: any) => {
    console.log('handleOnCheckChange', e);
    checkvalueRef.current = e.target.checked;
  };
  useEffect(() => {
    if (scroller.current) {
      initialize(scroller.current);
    }
  }, [scroller.current, initialize]);

  useEffect(() => {
    if (paramsRef.current) {
      innitializeParams(paramsRef.current);
    }
  }, [paramsRef.current, innitializeParams]);

  useEffect(() => {
    if (loading) {
      updateScrollerPosition();
    }
  }, [messageList, loading]);

  useEffect(() => {
    if (messageList.length > messageListLengthCache.current) {
      updateScrollerPosition();
    }
    messageListLengthCache.current = messageList.length;
  }, [messageList.length]);

  return (
    <div className="ground-left-wrapper">
      <div className="ground-left">
        <div className="message-list-wrap" ref={scroller}>
          <>
            <div className="content">
              <SpeechContent dataList={messageList} loading={loading} />
              {loading && (
                <Spin size="small">
                  <div style={{ height: '46px' }}></div>
                </Spin>
              )}
            </div>
          </>
        </div>
        {tokenResult && (
          <div style={{ height: 40 }}>
            <ReferenceParams usage={tokenResult}></ReferenceParams>
          </div>
        )}
        <div className="ground-left-footer">
          <MessageInput
            scope="chat"
            actions={['clear', 'check']}
            checkLabel={intl.formatMessage({
              id: 'playground.toolbar.autoplay'
            })}
            onCheck={handleOnCheckChange}
            loading={loading}
            disabled={!parameters.model}
            isEmpty={true}
            handleSubmit={handleSendMessage}
            addMessage={handleNewMessage}
            handleAbortFetch={handleStopConversation}
            clearAll={handleClear}
            setModelSelections={handleSelectModel}
            presetPrompt={handlePresetPrompt}
            modelList={modelList}
          />
        </div>
      </div>
      <div
        className={classNames('params-wrapper', {
          collapsed: collapse
        })}
        ref={paramsRef}
      >
        <div className="box">
          <RerankerParams
            setParams={setParams}
            paramsConfig={paramsConfig}
            initialValues={initialValues}
            params={parameters}
            selectedModel={selectModel}
            modelList={modelList}
          />
        </div>
      </div>

      <ViewCodeModal
        open={show}
        payLoad={{
          messages: viewCodeMessage
        }}
        parameters={parameters}
        onCancel={handleCloseViewCode}
        title={intl.formatMessage({ id: 'playground.viewcode' })}
      ></ViewCodeModal>
    </div>
  );
});

export default memo(GroundLeft);
