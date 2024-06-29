import CardWrapper from '@/components/card-wrapper';
import ColumnBar from '@/components/charts/column-bar';
import HBar from '@/components/charts/h-bar';
import PageTools from '@/components/page-tools';
import breakpoints from '@/config/breakpoints';
import useWindowResize from '@/hooks/use-window-resize';
import { generateRandomArray } from '@/utils';
import { Col, DatePicker, Row } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { useContext, useEffect, useState } from 'react';
import { DashboardContext } from '../config/dashboard-context';

const { RangePicker } = DatePicker;
const times = [
  'june 1',
  'june 2',
  'june 3',
  'june 4',
  'june 5',
  'june 6',
  'june 7'
];

const users = ['Jim', 'Lucy', 'Lily', 'Tom', 'Jack', 'Rose', 'Jerry'];
const projects = [
  'copilot-dev',
  'rag-wiki',
  'smart-auto-agent',
  'office-auto-docs',
  'smart-customer-service'
];

const APIRequestData = generateRandomArray({
  length: times.length,
  max: 100,
  min: 0,
  offset: 10
});

const TokensData = generateRandomArray({
  length: times.length,
  max: 2000,
  min: 200,
  offset: 200
});

const usersData = generateRandomArray({
  length: users.length,
  max: 100,
  min: 0,
  offset: 10
});

const projectsData = generateRandomArray({
  length: projects.length,
  max: 100,
  min: 0,
  offset: 10
});

const userDataList = usersData
  .map((val, i) => {
    return {
      time: users[i],
      value: val
    };
  })
  .sort((a, b) => b.value - a.value);

const projectDataList = projectsData
  .map((val, i) => {
    return {
      time: projects[i],
      value: val
    };
  })
  .sort((a, b) => b.value - a.value);

const dataList = APIRequestData.map((val, i) => {
  console.log('val', val);
  return {
    time: times[i],
    value: val
  };
});
const tokenUsage = TokensData.map((val, i) => {
  console.log('val', val);
  return {
    time: times[i],
    value: val
  };
});

const Usage = () => {
  const { size } = useWindowResize();
  const [paddingRight, setPaddingRight] = useState<string>('20px');
  const [requestData, setRequestData] = useState<
    { time: string; value: number }[]
  >([]);
  const [tokenData, setTokenData] = useState<{ time: string; value: number }[]>(
    []
  );
  const [userData, setUserData] = useState<{ name: string; value: number }[]>(
    []
  );
  const data = useContext(DashboardContext)?.model_usage || {};

  const handleSelectDate = (dateString: string) => {};

  const generateData = () => {
    const requestList: { time: string; value: number }[] = [];
    const tokenList: {
      time: string;
      value: number;
      name: string;
      color: string;
    }[] = [];
    const userList: {
      name: string;
      value: number;
      type: string;
      color: string;
    }[] = [];

    _.each(data.api_request_history, (item: any) => {
      requestList.push({
        time: dayjs(item.timestamp * 1000).format('YYYY-MM-DD'),
        value: item.value
      });
    });

    _.each(data.completion_token_history, (item: any) => {
      tokenList.push({
        time: dayjs(item.timestamp * 1000).format('YYYY-MM-DD'),
        name: 'completion_token',
        color: 'rgba(84, 204, 152,0.8)',
        value: item.value
      });
    });
    _.each(data.prompt_token_history, (item: any) => {
      tokenList.push({
        time: dayjs(item.timestamp * 1000).format('YYYY-MM-DD'),
        name: 'prompt_token',
        color: 'rgba(0, 170, 173, 0.8)',
        value: item.value
      });
    });

    _.each(data.top_users, (item: any) => {
      userList.push({
        name: item.username,
        type: 'completion_token',
        color: 'rgba(84, 204, 152,0.8)',
        value: item.completion_token_count
      });
      userList.push({
        name: item.username,
        type: 'prompt_token',
        color: 'rgba(0, 170, 173, 0.8)',
        value: item.prompt_token_count
      });
    });

    setRequestData(requestList);
    setTokenData(tokenList);
    setUserData(userList);
  };

  useEffect(() => {
    if (size.width < breakpoints.xl) {
      setPaddingRight('0');
    } else {
      setPaddingRight('20px');
    }
  }, [size.width]);

  useEffect(() => {
    generateData();
  }, [data]);

  return (
    <>
      <PageTools
        style={{ margin: '32px 8px' }}
        left={<span style={{ fontSize: 'var(--font-size-large)' }}>Usage</span>}
        right={
          <RangePicker onChange={handleSelectDate} style={{ width: 300 }} />
        }
      />
      <Row style={{ width: '100%' }} gutter={[0, 20]}>
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={24}
          xl={16}
          style={{ paddingRight: paddingRight }}
        >
          <CardWrapper style={{ width: '100%' }}>
            <Row style={{ width: '100%' }}>
              <Col span={12}>
                <ColumnBar
                  title="API Request"
                  data={requestData}
                  xField="time"
                  yField="value"
                  height={360}
                ></ColumnBar>
              </Col>
              <Col span={12}>
                <ColumnBar
                  title="Tokens"
                  data={tokenData}
                  group={false}
                  colorField="name"
                  stack={true}
                  xField="time"
                  legend={false}
                  yField="value"
                  height={360}
                ></ColumnBar>
              </Col>
            </Row>
          </CardWrapper>
        </Col>
        <Col xs={24} sm={24} md={24} lg={24} xl={8}>
          <CardWrapper>
            <HBar
              title="Top Users"
              data={userData}
              colorField="type"
              stack={true}
              legend={false}
              xField="name"
              yField="value"
              height={360}
            ></HBar>
          </CardWrapper>
        </Col>
      </Row>
    </>
  );
};

export default Usage;
