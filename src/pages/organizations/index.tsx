import { PageAction } from '@/config';
import { PaginationKey, TABLE_SORT_DIRECTIONS } from '@/config/settings';
import type { PageActionType } from '@/config/types';
import useTableFetch from '@/hooks/use-table-fetch';
import {
  createOrganization,
  deleteOrganization,
  queryOrganizationsList,
  updateOrganization
} from '@/services/organizations/apis';
import { ApartmentOutlined, TeamOutlined } from '@ant-design/icons';
import {
  AutoTooltip,
  DeleteModal,
  DropdownButtons,
  FilterBar,
  IconFont,
  icons,
  NoResult
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { ConfigProvider, message, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { useMemo, useState } from 'react';
import PageBox from '../_components/page-box';
import AddOrganizationModal from './components/add-organization-modal';
import MembersDrawer from './components/members-drawer';
import { OrganizationFormData, OrganizationListItem } from './config/types';

const actionList: Global.ActionItem<OrganizationListItem>[] = [
  // First item is rendered as the primary icon button by DropdownButtons;
  // the rest live in the "..." menu. Keep Edit first to stay consistent
  // with the Users / API Keys pages.
  {
    label: 'common.button.edit',
    key: 'edit',
    icon: icons.EditOutlined
  },
  {
    label: 'organizations.menu.members',
    key: 'members',
    icon: <TeamOutlined />
  },
  {
    label: 'common.button.delete',
    key: 'delete',
    icon: icons.DeleteOutlined,
    props: { danger: true }
  }
];

const Organizations: React.FC = () => {
  const intl = useIntl();
  const {
    dataSource,
    rowSelection,
    queryParams,
    sortOrder,
    modalRef,
    handleDelete,
    handleDeleteBatch,
    fetchData,
    handlePageChange,
    handleTableChange,
    handleSearch,
    handleNameChange
  } = useTableFetch<OrganizationListItem>({
    key: PaginationKey.Organizations,
    fetchAPI: queryOrganizationsList,
    deleteAPI: deleteOrganization,
    contentForDelete: 'organizations.title.org'
  });

  const [modalState, setModalState] = useState<{
    action: PageActionType;
    open: boolean;
    title: string;
    currentData?: OrganizationListItem | null;
  }>({
    action: PageAction.CREATE,
    open: false,
    title: '',
    currentData: null
  });

  const [memberDrawer, setMemberDrawer] = useState<{
    open: boolean;
    org: OrganizationListItem | null;
  }>({ open: false, org: null });

  const handleAdd = () => {
    setModalState({
      action: PageAction.CREATE,
      open: true,
      title: intl.formatMessage({ id: 'organizations.button.create' }),
      currentData: null
    });
  };

  const handleModalOk = async (values: OrganizationFormData) => {
    try {
      if (modalState.action === PageAction.EDIT && modalState.currentData) {
        await updateOrganization({
          id: modalState.currentData.id,
          data: values
        });
      } else {
        await createOrganization({ data: values });
      }
      setModalState({ ...modalState, open: false });
      fetchData();
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } catch (_) {
      // server error already surfaced
    }
  };

  const handleEdit = (row: OrganizationListItem) => {
    setModalState({
      action: PageAction.EDIT,
      open: true,
      title: intl.formatMessage(
        { id: 'common.button.edit.item' },
        { name: row.name }
      ),
      currentData: row
    });
  };

  const handleSelect = useMemoizedFn((val: any, row: OrganizationListItem) => {
    if (val === 'edit') {
      handleEdit(row);
    } else if (val === 'delete') {
      handleDelete({ ...row });
    } else if (val === 'members') {
      setMemberDrawer({ open: true, org: row });
    }
  });

  const setActions = useMemoizedFn((record: OrganizationListItem) => {
    return actionList.filter((action) => {
      if (action.key === 'delete') {
        return !record.is_platform;
      }
      return true;
    });
  });

  const columns = useMemo(() => {
    return [
      {
        title: intl.formatMessage({ id: 'common.table.name' }),
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: OrganizationListItem) => (
          <AutoTooltip ghost style={{ maxWidth: 320 }}>
            <ApartmentOutlined style={{ marginRight: 6 }} />
            <span className="text-primary">{text}</span>
            {record.is_platform && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {intl.formatMessage({ id: 'organizations.tag.platform' })}
              </Tag>
            )}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'organizations.form.slug' }),
        dataIndex: 'slug',
        key: 'slug',
        render: (text: string) => (
          <AutoTooltip ghost minWidth={20}>
            {text}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.description' }),
        dataIndex: 'description',
        key: 'description',
        render: (text: string) => (
          <AutoTooltip ghost minWidth={20}>
            {text || '-'}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.createTime' }),
        dataIndex: 'created_at',
        key: 'created_at',
        render: (text: string) =>
          text ? (
            <AutoTooltip ghost>
              {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
            </AutoTooltip>
          ) : (
            '-'
          )
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        key: 'operation',
        dataIndex: 'operation',
        span: 3,
        render: (_t: any, record: OrganizationListItem) => (
          <DropdownButtons
            items={setActions(record)}
            onSelect={(val) => handleSelect(val, record)}
          />
        )
      }
    ];
  }, [intl, sortOrder, setActions, handleSelect]);

  const renderEmpty = (type?: string) => {
    if (type !== 'Table') return;
    return (
      <NoResult
        loading={dataSource.loading}
        loadend={dataSource.loadend}
        dataSource={dataSource.dataList}
        image={<IconFont type="icon-cluster2-outline" />}
        filters={_.omit(queryParams, ['sort_by'])}
        noFoundText={intl.formatMessage({
          id: 'organizations.noresult.nofound'
        })}
        title={intl.formatMessage({ id: 'organizations.noresult.title' })}
        subTitle={intl.formatMessage({ id: 'organizations.noresult.subTitle' })}
        onClick={handleAdd}
        buttonText={intl.formatMessage({ id: 'noresult.button.add' })}
      />
    );
  };

  return (
    <>
      <PageBox>
        <FilterBar
          marginBottom={22}
          marginTop={30}
          buttonText={intl.formatMessage({ id: 'organizations.button.create' })}
          handleSearch={handleSearch}
          handleDeleteByBatch={handleDeleteBatch}
          handleClickPrimary={handleAdd}
          handleInputChange={handleNameChange}
          rowSelection={rowSelection}
          widths={{ input: 300 }}
        />
        <ConfigProvider renderEmpty={renderEmpty}>
          <Table
            columns={columns as any}
            dataSource={dataSource.dataList}
            rowSelection={rowSelection}
            loading={{ spinning: dataSource.loading }}
            size="middle"
            sortDirections={TABLE_SORT_DIRECTIONS}
            showSorterTooltip={false}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              size: 'middle',
              showSizeChanger: true,
              pageSize: queryParams.perPage,
              current: queryParams.page,
              total: dataSource.total,
              hideOnSinglePage: queryParams.perPage === 10,
              onChange: handlePageChange
            }}
          />
        </ConfigProvider>
      </PageBox>
      <AddOrganizationModal
        open={modalState.open}
        action={modalState.action}
        title={modalState.title}
        data={modalState.currentData}
        onCancel={() => setModalState({ ...modalState, open: false })}
        onOk={handleModalOk}
      />
      <MembersDrawer
        open={memberDrawer.open}
        organization={memberDrawer.org}
        onClose={() => setMemberDrawer({ open: false, org: null })}
      />
      <DeleteModal ref={modalRef} />
    </>
  );
};

export default Organizations;
