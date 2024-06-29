import PageTools from '@/components/page-tools';
import SealTable from '@/components/seal-table';
import RowChildren from '@/components/seal-table/components/row-children';
import SealColumn from '@/components/seal-table/components/seal-column';
import StatusTag from '@/components/status-tag';
import { PageAction } from '@/config';
import type { PageActionType } from '@/config/types';
import useSetChunkRequest, {
  createAxiosToken
} from '@/hooks/use-chunk-request';
import useEventSource from '@/hooks/use-event-source';
import useTableRowSelection from '@/hooks/use-table-row-selection';
import useTableSort from '@/hooks/use-table-sort';
import useUpdateChunkedList from '@/hooks/use-update-chunk-list';
import { handleBatchRequest } from '@/utils';
import { fetchChunkedData, readStreamData } from '@/utils/fetch-chunk-data';
import {
  DeleteOutlined,
  EditOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  SyncOutlined,
  WechatWorkOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Access, useAccess, useIntl, useNavigate } from '@umijs/max';
import {
  Button,
  Col,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Tooltip,
  message
} from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MODELS_API,
  MODEL_INSTANCE_API,
  createModel,
  createModelInstance,
  deleteModel,
  deleteModelInstance,
  queryModelInstancesList,
  queryModelsList,
  updateModel
} from './apis';
import AddModal from './components/add-modal';
import ViewLogsModal from './components/view-logs-modal';
import { status } from './config';
import { FormData, ListItem, ModelInstanceListItem } from './config/types';

const Models: React.FC = () => {
  // const { modal } = App.useApp();
  const access = useAccess();
  const intl = useIntl();
  const navigate = useNavigate();
  const { setChunkRequest } = useSetChunkRequest();
  const rowSelection = useTableRowSelection();
  const { sortOrder, setSortOrder } = useTableSort({
    defaultSortOrder: 'descend'
  });
  const { createEventSourceConnection, eventSourceRef } = useEventSource();
  const [logContent, setLogContent] = useState('');
  const [openLogModal, setOpenLogModal] = useState(false);
  const [hoverChildIndex, setHoverChildIndex] = useState<string | number>(-1);
  const [total, setTotal] = useState(100);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<PageActionType>(PageAction.CREATE);
  const [title, setTitle] = useState<string>('');
  const [dataSource, setDataSource] = useState<ListItem[]>([]);
  const [currentData, setCurrentData] = useState<ListItem | undefined>(
    undefined
  );
  const [currentInstanceUrl, setCurrentInstanceUrl] = useState<string>('');

  const chunkRequedtRef = useRef<any>();
  const timer = useRef<any>();
  let axiosToken = createAxiosToken();
  const [queryParams, setQueryParams] = useState({
    page: 1,
    perPage: 10,
    query: ''
  });
  // request data

  const { updateChunkedList } = useUpdateChunkedList(dataSource, {
    setDataList: setDataSource
  });

  const fetchData = async (polling?: boolean) => {
    axiosToken?.cancel?.();
    axiosToken = createAxiosToken();
    setLoading(!polling);
    try {
      const params = {
        ..._.pickBy(queryParams, (val: any) => !!val)
      };
      const res = await queryModelsList(params, {
        cancelToken: axiosToken.token
      });
      console.log('res=======', res);
      setDataSource(res.items);
      setTotal(res.pagination.total);
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  };

  // update data by polling
  const fetchDataByPolling = () => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      fetchData(true);
    }, 5000);
  };

  const handleShowSizeChange = (page: number, size: number) => {
    console.log(page, size);
    setQueryParams({
      ...queryParams,
      perPage: size
    });
  };

  const handlePageChange = (page: number, pageSize: number | undefined) => {
    console.log(page, pageSize);
    setQueryParams({
      ...queryParams,
      page: page
    });
  };

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log('handleTableChange=======', pagination, filters, sorter);
    setSortOrder(sorter.order);
  };

  const handleFilter = () => {
    fetchData();
  };

  const updateHandler = (list: any) => {
    _.each(list, (data: any) => {
      updateChunkedList(data);
    });
    if (!dataSource.length) {
      handleFilter();
    }
  };

  const createModelsChunkRequest = () => {
    chunkRequedtRef.current?.current?.cancel?.();
    try {
      chunkRequedtRef.current = setChunkRequest({
        url: `${MODELS_API}`,
        params: {
          ..._.pickBy(queryParams, (val: any) => !!val)
        },
        handler: updateHandler
      });
    } catch (error) {
      // ignore
    }
  };

  const createModelsDataByFetch = async () => {
    const result = await fetchChunkedData({
      params: {
        ..._.pickBy(queryParams, (val: any) => !!val),
        watch: true
      },
      method: 'GET',
      url: `/v1${MODELS_API}`
    });
    if (!result) {
      return;
    }
    const { reader, decoder } = result;

    await readStreamData(reader, decoder, (data: any) => {
      console.log('streamData=========', data);
    });
  };

  const createModelEvent = () => {
    createEventSourceConnection({
      url: `v1${MODELS_API}`,
      params: {
        ..._.pickBy(queryParams, (val: any) => !!val),
        watch: true
      },
      onmessage: (data: any) => {
        console.log('event source message: ', data);
      }
    });
  };

  const handleSearch = (e: any) => {
    fetchData();
  };

  const handleNameChange = (e: any) => {
    setQueryParams({
      ...queryParams,
      query: e.target.value
    });
  };

  const handleAddModal = () => {
    setOpenAddModal(true);
    setAction(PageAction.CREATE);
    setTitle(intl.formatMessage({ id: 'models.button.deploy' }));
  };

  const handleModalOk = async (data: FormData) => {
    try {
      if (action === PageAction.CREATE) {
        await createModel({ data });
      }
      if (action === PageAction.EDIT) {
        await updateModel({ data, id: currentData?.id as number });
      }
      setOpenAddModal(false);
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } catch (error) {}
  };

  const handleModalCancel = () => {
    console.log('handleModalCancel');
    setOpenAddModal(false);
  };

  const handleLogModalCancel = () => {
    setOpenLogModal(false);
  };
  const handleDelete = async (row: any) => {
    Modal.confirm({
      title: '',
      content: intl.formatMessage(
        { id: 'common.delete.confirm' },
        { type: intl.formatMessage({ id: 'models.table.models' }) }
      ),
      async onOk() {
        await deleteModel(row.id);
        message.success(intl.formatMessage({ id: 'common.message.success' }));
        fetchData();
      },
      onCancel() {
        console.log('Cancel');
      }
    });
  };
  const handleDeleteBatch = () => {
    Modal.confirm({
      title: '',
      content: intl.formatMessage(
        { id: 'common.delete.confirm' },
        { type: intl.formatMessage({ id: 'models.table.models' }) }
      ),
      async onOk() {
        await handleBatchRequest(rowSelection.selectedRowKeys, deleteModel);
        message.success(intl.formatMessage({ id: 'common.message.success' }));
        fetchData();
      },
      onCancel() {
        console.log('Cancel');
      }
    });
  };

  const handleOpenPlayGround = (row: any) => {
    navigate(`/playground?model=${row.name}`);
  };

  const handleDeployInstance = async (row: any) => {
    try {
      const data = {
        model_id: row.id,
        model_name: row.name,
        huggingface_repo_id: row.huggingface_repo_id,
        huggingface_filename: row.huggingface_filename,
        source: row.source
      };
      await createModelInstance({ data });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } catch (error) {}
  };

  const handleStreamData = (data: any) => {
    setLogContent(data);
  };

  const handleViewLogs = async (row: any) => {
    try {
      // const result = await fetchChunkedData({
      //   url: `/v1${MODEL_INSTANCE_API}/${row.id}/logs`,
      //   params: {
      //     follow: false
      //   },
      //   method: 'GET'
      // });
      // if (!result) {
      //   setLogContent('');
      // } else {
      //   const { reader, decoder } = result;
      //   await readStreamData(reader, decoder, (chunk: any) => {
      //     handleStreamData(chunk);
      //   });
      // }

      setCurrentInstanceUrl(`${MODEL_INSTANCE_API}/${row.id}/logs`);

      setOpenLogModal(true);
    } catch (error) {
      console.log('error:', error);
    }
  };
  const handleDeleteInstace = (row: any) => {
    Modal.confirm({
      title: '',
      content: intl.formatMessage(
        { id: 'common.delete.confirm' },
        { type: intl.formatMessage({ id: 'models.instances' }) }
      ),
      async onOk() {
        await deleteModelInstance(row.id);
        message.success(intl.formatMessage({ id: 'common.message.success' }));
        fetchData();
      },
      onCancel() {
        console.log('Cancel');
      }
    });
  };

  const handleOnMouseEnter = (id: number, index: number) => {
    setHoverChildIndex(`${id}-${index}`);
  };

  const handleOnMouseLeave = () => {
    setHoverChildIndex(-1);
  };

  const getModelInstances = useCallback(async (row: any) => {
    const params = {
      id: row.id,
      page: 1,
      perPage: 100
    };
    const data = await queryModelInstancesList(params);
    return data.items || [];
  }, []);

  const generateChildrenRequestAPI = (params: any) => {
    return `${MODELS_API}/${params.id}/instances`;
  };

  const handleEdit = (row: ListItem) => {
    setCurrentData(row);
    setOpenAddModal(true);
    setAction(PageAction.EDIT);
    setTitle(intl.formatMessage({ id: 'models.title.edit' }));
  };

  useEffect(() => {
    fetchData();
    // createModelsDataByFetch();
    createModelEvent();
    createModelsChunkRequest();

    return () => {
      chunkRequedtRef.current?.current?.cancel?.();
    };
  }, [queryParams]);

  useEffect(() => {
    // watch models list
  }, [queryParams]);

  const renderChildren = (list: any) => {
    return (
      <Space size={16} direction="vertical" style={{ width: '100%' }}>
        {_.map(list, (item: ModelInstanceListItem, index: number) => {
          return (
            <div
              key={`${item.id}`}
              onMouseEnter={() => handleOnMouseEnter(item.id, index)}
              onMouseLeave={handleOnMouseLeave}
              style={{ borderRadius: 'var(--ant-table-header-border-radius)' }}
              className={
                item.download_progress !== 100 ? 'skeleton-loading' : ''
              }
            >
              <RowChildren key={`${item.id}_row`}>
                <Row style={{ width: '100%' }} align="middle">
                  <Col span={6}>
                    <Tag>{item.gpu_index}</Tag>
                    {item.worker_ip}:{item.port}
                  </Col>
                  <Col span={4}>
                    <span>{item.huggingface_filename}</span>
                  </Col>

                  <Col span={4}>
                    {item.state && (
                      <StatusTag
                        download={
                          item.state !== 'Running'
                            ? { percent: item.download_progress }
                            : undefined
                        }
                        statusValue={{
                          status: status[item.state] as any,
                          text: item.state
                        }}
                      ></StatusTag>
                    )}
                  </Col>
                  <Col span={5}>
                    <span style={{ paddingLeft: 36 }}>
                      {dayjs(item.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                    </span>
                  </Col>
                  <Col span={5}>
                    {hoverChildIndex === `${item.id}-${index}` && (
                      <Space size={20}>
                        <Tooltip
                          title={intl.formatMessage({
                            id: 'common.button.delete'
                          })}
                        >
                          <Button
                            size="small"
                            danger
                            onClick={() => handleDeleteInstace(item)}
                            icon={<DeleteOutlined></DeleteOutlined>}
                          ></Button>
                        </Tooltip>
                        <Tooltip
                          title={intl.formatMessage({
                            id: 'common.button.viewlog'
                          })}
                        >
                          <Button
                            size="small"
                            onClick={() => handleViewLogs(item)}
                            icon={<FieldTimeOutlined />}
                          ></Button>
                        </Tooltip>
                      </Space>
                    )}
                  </Col>
                </Row>
              </RowChildren>
            </div>
          );
        })}
      </Space>
    );
  };

  return (
    <>
      <PageContainer
        ghost
        header={{
          title: intl.formatMessage({ id: 'models.title' })
        }}
        extra={[]}
      >
        <PageTools
          marginBottom={22}
          left={
            <Space>
              <Input
                placeholder={intl.formatMessage({ id: 'common.filter.name' })}
                style={{ width: 300 }}
                size="large"
                allowClear
                onChange={handleNameChange}
              ></Input>
              <Button
                type="text"
                style={{ color: 'var(--ant-color-primary)' }}
                onClick={handleSearch}
                icon={<SyncOutlined></SyncOutlined>}
              ></Button>
            </Space>
          }
          right={
            <Space size={20}>
              <Button
                icon={<PlusOutlined></PlusOutlined>}
                type="primary"
                onClick={handleAddModal}
              >
                {intl?.formatMessage?.({ id: 'models.button.deploy' })}
              </Button>
              <Access accessible={access.canDelete}>
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={handleDeleteBatch}
                  disabled={!rowSelection.selectedRowKeys.length}
                >
                  {intl?.formatMessage?.({ id: 'common.button.delete' })}
                </Button>
              </Access>
            </Space>
          }
        ></PageTools>
        <SealTable
          dataSource={dataSource}
          rowSelection={rowSelection}
          loading={loading}
          rowKey="id"
          expandable={true}
          onChange={handleTableChange}
          pollingChildren={false}
          watchChildren={true}
          loadChildren={getModelInstances}
          loadChildrenAPI={generateChildrenRequestAPI}
          renderChildren={renderChildren}
          pagination={{
            showSizeChanger: true,
            pageSize: queryParams.perPage,
            current: queryParams.page,
            total: total,
            hideOnSinglePage: true,
            onShowSizeChange: handleShowSizeChange,
            onChange: handlePageChange
          }}
        >
          <SealColumn
            title={intl.formatMessage({ id: 'models.table.name' })}
            dataIndex="name"
            key="name"
            width={400}
            span={6}
          />
          <SealColumn
            title={intl.formatMessage({ id: 'models.form.source' })}
            dataIndex="source"
            key="source"
            span={4}
          />
          <SealColumn
            title={intl.formatMessage({ id: 'models.form.replicas' })}
            dataIndex="replicas"
            key="replicas"
            span={4}
          />
          <SealColumn
            span={5}
            title={intl.formatMessage({ id: 'common.table.createTime' })}
            dataIndex="created_at"
            key="createTime"
            defaultSortOrder="descend"
            sortOrder={sortOrder}
            showSorterTooltip={false}
            sorter={true}
            render={(val, row) => {
              return dayjs(val).format('YYYY-MM-DD HH:mm:ss');
            }}
          />
          <SealColumn
            span={5}
            title={intl.formatMessage({ id: 'common.table.operation' })}
            key="operation"
            render={(text, record) => {
              return !record.transition ? (
                <Space size={20}>
                  <Tooltip
                    title={intl.formatMessage({
                      id: 'common.button.edit'
                    })}
                  >
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleEdit(record)}
                      icon={<EditOutlined></EditOutlined>}
                    ></Button>
                  </Tooltip>
                  <Tooltip
                    title={intl.formatMessage({
                      id: 'models.openinplayground'
                    })}
                  >
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleOpenPlayGround(record)}
                      icon={<WechatWorkOutlined />}
                    ></Button>
                  </Tooltip>
                  <Tooltip
                    title={intl.formatMessage({ id: 'common.button.delete' })}
                  >
                    <Button
                      size="small"
                      type="primary"
                      danger
                      onClick={() => handleDelete(record)}
                      icon={<DeleteOutlined></DeleteOutlined>}
                    ></Button>
                  </Tooltip>
                </Space>
              ) : null;
            }}
          />
        </SealTable>
      </PageContainer>
      <AddModal
        open={openAddModal}
        action={action}
        title={title}
        data={currentData}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
      ></AddModal>
      <ViewLogsModal
        url={currentInstanceUrl}
        title={intl.formatMessage({ id: 'common.button.viewlog' })}
        open={openLogModal}
        content={logContent}
        onCancel={handleLogModalCancel}
      ></ViewLogsModal>
    </>
  );
};

export default Models;
