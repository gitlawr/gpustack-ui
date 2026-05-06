import { history, useIntl } from '@umijs/max';
import { Button, Result } from 'antd';
import React, { useEffect } from 'react';
import { PageContainerInner } from '../pages/_components/page-box';

// Always-accessible fallback for users whose current route became
// unaccessible (e.g. after an Org switch flipped their access flags).
// Playground has no access guard so it's safe for every role.
const FALLBACK_PATH = '/playground/chat';

const Exception: React.FC<{
  children: React.ReactNode;
  route?: any;
  notFound?: React.ReactNode;
  noAccessible?: React.ReactNode;
  unAccessible?: React.ReactNode;
  noFound?: React.ReactNode;
}> = (props) => {
  const intl = useIntl();
  const unaccessible = !!props.route?.unaccessible;
  const willRedirect =
    unaccessible && history.location.pathname !== FALLBACK_PATH;

  useEffect(() => {
    if (willRedirect) {
      history.replace(FALLBACK_PATH);
    }
  }, [willRedirect]);

  // Suppress the 403 panel for one frame while the effect navigates
  // away — otherwise users see a 403 flash on org switch before the
  // redirect resolves.
  if (willRedirect) {
    return null;
  }

  return (
    (!props.route && (props.noFound || props.notFound)) ||
    // render custom 403
    (props.route?.unaccessible && (props.unAccessible || props.noAccessible)) ||
    // render default exception
    ((!props.route || props.route?.unaccessible) && (
      <PageContainerInner>
        <Result
          status={props.route ? '403' : '404'}
          title={props.route ? '403' : '404'}
          subTitle={
            props.route
              ? intl.formatMessage({ id: 'common.permission.403' })
              : intl.formatMessage({ id: 'common.permission.404' })
          }
          extra={
            <Button type="primary" onClick={() => history.push('/')}>
              {intl.formatMessage({ id: 'common.button.back' })}
            </Button>
          }
        />
      </PageContainerInner>
    )) ||
    // normal render
    props.children
  );
};

export default Exception;
