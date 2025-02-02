import CopyButton from '@/components/copy-button';
import HotKeys from '@/config/hotkeys';
import { MinusCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Input, Space, Tooltip } from 'antd';
import _ from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Roles } from '../config';
import '../style/message-item.less';
import ThumbImg from './thumb-img';
interface MessageItemProps {
  role: string;
  content: string;
  uid: number;
}

const MessageItem: React.FC<{
  message: MessageItemProps;
  loading?: boolean;
  islast?: boolean;
  onSubmit: () => void;
  updateMessage: (message: MessageItemProps) => void;
  isFocus: boolean;
  onDelete: () => void;
}> = ({ message, isFocus, onDelete, updateMessage, onSubmit, loading }) => {
  const intl = useIntl();
  const [isTyping, setIsTyping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentIsFocus, setCurrentIsFocus] = useState(isFocus);
  const [imgList, setImgList] = useState<{ uid: number; dataUrl: string }[]>(
    []
  );
  const imgCountRef = useRef(0);

  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (inputRef.current && isFocus) {
      inputRef.current.focus();
    }
  }, [isFocus]);

  // useEffect(() => {
  //   if (isTyping) return;
  //   let index = 0;
  //   const text = message.content;
  //   if (!text.length) {
  //     return;
  //   }
  //   setMessageContent('');
  //   setIsAnimating(true);
  //   const intervalId = setInterval(() => {
  //     setMessageContent((prev) => prev + text[index]);
  //     index += 1;
  //     if (index === text.length) {
  //       setIsAnimating(false);
  //       clearInterval(intervalId);
  //     }
  //   }, 20);
  //   return () => clearInterval(intervalId);
  // }, [message.content, isTyping]);

  const handleUpdateMessage = (params: { role: string; message: string }) => {
    updateMessage({
      role: params.role,
      content: params.message,
      uid: message.uid
    });
  };

  const getPasteContent = useCallback(async (event: any) => {
    const clipboardData = event.clipboardData || window.clipboardData;
    const items = clipboardData.items;
    const imgPromises: Promise<string>[] = [];

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      console.log('item===========', item);

      if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const imgPromise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = function (event) {
            const base64String = event.target?.result as string;
            if (base64String) {
              resolve(base64String);
            } else {
              reject('Failed to convert image to base64');
            }
          };
          reader.readAsDataURL(file);
        });
        imgPromises.push(imgPromise);
      } else if (item.kind === 'string') {
        // string
      }
    }

    try {
      const imgs = await Promise.all(imgPromises);
      if (imgs.length) {
        const list = _.map(imgs, (img: string) => {
          imgCountRef.current += 1;
          return {
            uid: imgCountRef.current,
            dataUrl: img
          };
        });
        setImgList((pre) => {
          return [...pre, ...list];
        });
      }
    } catch (error) {
      console.error('Error processing images:', error);
    }
  }, []);

  const handleDeleteImg = useCallback(
    (uid: number) => {
      const list = imgList.filter((item) => item.uid !== uid);
      setImgList(list);
    },
    [imgList]
  );

  const handleMessageChange = (e: any) => {
    // setIsTyping(true);
    handleUpdateMessage({ role: message.role, message: e.target.value });
  };

  const handleBlur = () => {
    // setIsTyping(true);
    setCurrentIsFocus(false);
  };

  const handleFocus = () => {
    setCurrentIsFocus(true);
  };

  const handleRoleChange = () => {
    const newRoleType =
      message.role === Roles.User ? Roles.Assistant : Roles.User;

    handleUpdateMessage({ role: newRoleType, message: message.content });
  };

  const handleDelete = () => {
    onDelete();
  };

  const handleOnPaste = (e: any) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (text) {
      handleUpdateMessage({ role: message.role, message: text });
    } else {
      getPasteContent(e);
    }
  };

  useHotkeys(
    HotKeys.SUBMIT,
    () => {
      inputRef.current.blur();
      onSubmit();
    },
    {
      enabled: currentIsFocus,
      enableOnFormTags: currentIsFocus,
      preventDefault: true
    }
  );

  return (
    <div className="message-item">
      <div className="role-type">
        <Button onClick={handleRoleChange} type="text">
          {intl.formatMessage({ id: `playground.${message.role}` })}
        </Button>
      </div>
      <div className="message-content-input">
        <ThumbImg dataList={imgList} onDelete={handleDeleteImg}></ThumbImg>
        <Input.TextArea
          ref={inputRef}
          style={{ paddingBlock: '12px' }}
          value={message.content}
          autoSize={true}
          variant="filled"
          readOnly={loading}
          onChange={handleMessageChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        ></Input.TextArea>
      </div>
      <div className="delete-btn">
        <Space size={5}>
          {message.content && (
            <CopyButton
              text={message.content}
              size="small"
              shape="default"
              type="default"
              fontSize="12px"
            ></CopyButton>
          )}
          <Tooltip title={intl.formatMessage({ id: 'common.button.delete' })}>
            <Button
              size="small"
              onClick={handleDelete}
              icon={<MinusCircleOutlined />}
            ></Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default MessageItem;
