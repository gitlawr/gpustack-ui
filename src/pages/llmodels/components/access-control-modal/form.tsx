import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import { RouteItem } from '@/pages/model-routes/config/types';
import { queryUsersList } from '@/pages/users/apis';
import {
  queryOrganizationsList,
  queryUserGroups
} from '@/services/organizations/apis';
import {
  CloseOutlined,
  DownOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import {
  AlertBlockInfo,
  TooltipList,
  Transfer as TransferInner
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import {
  Button,
  Checkbox,
  Dropdown,
  DropdownProps,
  Empty,
  Form,
  Radio,
  RadioChangeEvent,
  Select,
  Space,
  Table,
  Tag,
  Tooltip
} from 'antd';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import styled from 'styled-components';
import { queryModelAccessUserList } from '../../apis';
import {
  AccessControlFormData,
  AccessPrincipal,
  AccessPrincipalType
} from '../../config/types';

type TransferKey = string | number | bigint;

const accessScopeTips = [
  {
    title: {
      text: 'models.accessSettings.authed',
      locale: true
    },
    tips: 'models.accessSettings.authed.tips'
  },
  {
    title: {
      text: 'models.accessSettings.allowedUsers',
      locale: true
    },
    tips: 'models.accessSettings.allowedUsers.tips'
  },
  {
    title: {
      text: 'models.accessSettings.allowedPrincipals',
      locale: true
    },
    tips: 'models.accessSettings.allowedPrincipals.tips'
  },
  {
    title: {
      text: 'models.accessSettings.public',
      locale: true
    },
    tips: 'models.accessSettings.public.desc'
  }
];

const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  margin-block: 8px 12px;
  font-size: 14px;
  color: var(--ant-color-text-tertiary);
`;

const principalTagColor = (type: AccessPrincipalType) => {
  if (type === 'org') return 'blue';
  if (type === 'group') return 'purple';
  return 'green';
};

const PrincipalsField: React.FC<{
  form: any;
  onChange?: (next: AccessPrincipal[]) => void;
}> = ({ form, onChange }) => {
  const intl = useIntl();
  const value: AccessPrincipal[] = Form.useWatch('principals', form) || [];

  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [groups, setGroups] = useState<
    { id: number; name: string; organization_id: number }[]
  >([]);
  const [type, setType] = useState<AccessPrincipalType>('user');
  const [orgForGroup, setOrgForGroup] = useState<number | undefined>();
  const [pendingId, setPendingId] = useState<number | undefined>();

  useEffect(() => {
    queryOrganizationsList({ page: -1 }).then((res: any) =>
      setOrgs((res?.items || res || []) as any)
    );
    queryUsersList({ page: -1 }).then((res: any) =>
      setUsers((res?.items || res || []) as any)
    );
  }, []);

  useEffect(() => {
    if (type === 'group' && orgForGroup) {
      queryUserGroups(orgForGroup, { page: -1 }).then((res: any) => {
        const items: any[] = Array.isArray(res) ? res : res?.items || [];
        setGroups(
          items.map((g: any) => ({
            id: g.id,
            name: g.name,
            organization_id: g.organization_id
          }))
        );
      });
    } else {
      setGroups([]);
    }
  }, [type, orgForGroup]);

  const updateValue = (next: AccessPrincipal[]) => {
    form.setFieldsValue({ principals: next });
    onChange?.(next);
  };

  const lookupName = (p: AccessPrincipal): string | undefined => {
    if (p.principal_name) return p.principal_name;
    if (p.principal_type === 'org') {
      return orgs.find((o) => o.id === p.principal_id)?.name;
    }
    if (p.principal_type === 'user') {
      return users.find((u) => u.id === p.principal_id)?.username;
    }
    if (p.principal_type === 'group') {
      return groups.find((g) => g.id === p.principal_id)?.name;
    }
    return undefined;
  };

  const handleAdd = () => {
    if (pendingId == null) return;
    if (
      value.some(
        (p) => p.principal_type === type && p.principal_id === pendingId
      )
    ) {
      return;
    }
    const principal_name =
      type === 'org'
        ? orgs.find((o) => o.id === pendingId)?.name
        : type === 'user'
          ? users.find((u) => u.id === pendingId)?.username
          : groups.find((g) => g.id === pendingId)?.name;
    updateValue([
      ...value,
      {
        principal_type: type,
        principal_id: pendingId,
        principal_name,
        organization_id: type === 'group' ? orgForGroup : undefined
      }
    ]);
    setPendingId(undefined);
  };

  const handleRemove = (p: AccessPrincipal) => {
    updateValue(
      value.filter(
        (item) =>
          !(
            item.principal_type === p.principal_type &&
            item.principal_id === p.principal_id
          )
      )
    );
  };

  const idOptions =
    type === 'org'
      ? orgs.map((o) => ({ value: o.id, label: o.name }))
      : type === 'user'
        ? users.map((u) => ({ value: u.id, label: u.username }))
        : groups.map((g) => ({ value: g.id, label: g.name }));

  const columns = [
    {
      title: intl.formatMessage({ id: 'organizations.access.principalType' }),
      dataIndex: 'principal_type',
      width: 140,
      render: (t: AccessPrincipalType) => (
        <Tag color={principalTagColor(t)}>
          {intl.formatMessage({ id: `organizations.principal.${t}` })}
        </Tag>
      )
    },
    {
      title: intl.formatMessage({ id: 'organizations.access.principal' }),
      dataIndex: 'principal_id',
      render: (_t: any, record: AccessPrincipal) =>
        lookupName(record) || `#${record.principal_id}`
    },
    {
      title: '',
      key: 'op',
      width: 60,
      render: (_t: any, record: AccessPrincipal) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<CloseOutlined />}
          onClick={() => handleRemove(record)}
        />
      )
    }
  ];

  return (
    <>
      <Label>
        {intl.formatMessage({ id: 'models.accessSettings.principals' })}
      </Label>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Select
          value={type}
          style={{ width: 140 }}
          onChange={(v) => {
            setType(v);
            setPendingId(undefined);
            setOrgForGroup(undefined);
          }}
          options={[
            {
              value: 'org',
              label: intl.formatMessage({ id: 'organizations.principal.org' })
            },
            {
              value: 'group',
              label: intl.formatMessage({
                id: 'organizations.principal.group'
              })
            },
            {
              value: 'user',
              label: intl.formatMessage({
                id: 'organizations.principal.user'
              })
            }
          ]}
        />
        {type === 'group' && (
          <Select
            placeholder={intl.formatMessage({
              id: 'organizations.groups.selectOrg'
            })}
            value={orgForGroup}
            onChange={(v) => {
              setOrgForGroup(v);
              setPendingId(undefined);
            }}
            style={{ width: 200 }}
            options={orgs.map((o) => ({ value: o.id, label: o.name }))}
          />
        )}
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={intl.formatMessage({
            id: 'organizations.access.principal'
          })}
          value={pendingId}
          onChange={setPendingId}
          options={idOptions}
          style={{ flex: 1 }}
        />
        <Button type="primary" onClick={handleAdd} disabled={pendingId == null}>
          {intl.formatMessage({ id: 'common.button.add' })}
        </Button>
      </Space.Compact>
      <Form.Item name="principals" hidden noStyle>
        <span />
      </Form.Item>
      <Table
        rowKey={(record) => `${record.principal_type}:${record.principal_id}`}
        dataSource={value}
        columns={columns as any}
        pagination={false}
        size="small"
        locale={{
          emptyText: intl.formatMessage({
            id: 'organizations.access.empty'
          })
        }}
      />
    </>
  );
};

interface AccessControlFormProps {
  action: PageActionType;
  currentData?: RouteItem | null;
  onFinish: (values: AccessControlFormData) => void;
  onValuesChange?: (changedValues: any, allValues: any) => void;
}

const AccessControlForm = forwardRef((props: AccessControlFormProps, ref) => {
  const { action, currentData, onFinish, onValuesChange } = props;
  const intl = useIntl();
  const [form] = Form.useForm();
  const accessPolicy = Form.useWatch('access_policy', form);
  const [targetKeys, setTargetKeys] = useState<TransferKey[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [userList, setUserList] = useState<
    { title: string; key: number; is_admin: boolean; is_active: boolean }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [filterInUsers, setFilterInUsers] = useState<Set<string>>(new Set());
  const [queryParams, setQueryParams] = useState<Global.SearchParams>({
    page: -1
  });
  const formDataCacheRef = useRef<AccessControlFormData | null>(null);

  const dataList = useMemo(() => {
    if (filterInUsers.size === 0) {
      return userList.filter((user) => {
        return !user.is_admin && user.is_active;
      });
    }
    return userList.filter((user) => {
      const isAdmin = user.is_admin;
      const isActive = user.is_active;
      if (!filterInUsers.has('admin') && isAdmin) {
        return false;
      }
      if (!filterInUsers.has('inactive') && !isActive) {
        return false;
      }
      return true;
    });
  }, [userList, filterInUsers]);

  const getUserList = async (query: Global.SearchParams) => {
    try {
      const res = await queryUsersList(query);
      const options = res.items.map((item) => ({
        title: item.username,
        key: item.id,
        is_admin: item.is_admin as boolean,
        is_active: item.is_active as boolean
      }));
      setTotalPages(res.pagination.totalPage);
      setUserList(options);
      return options;
    } catch (error) {
      setUserList([]);
      return [];
    }
  };

  const handleOnChange = async (
    nextTargetKeys: TransferKey[],
    direction: string,
    removeKeys: TransferKey[]
  ) => {
    setTargetKeys(nextTargetKeys);
    const users = nextTargetKeys.map((key) => ({ id: key }));
    form.setFieldsValue({ users });
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    onValuesChange?.({ users }, form.getFieldsValue());
  };

  const onSearch = (dir: 'left' | 'right', value: string) => {
    console.log('search:', dir, value);
  };

  const handleCheck = (e: any, type: string) => {
    const newSet = new Set(filterInUsers);
    if (e.target.checked) {
      newSet.add(type);
    } else {
      newSet.delete(type);
    }
    setFilterInUsers(newSet);
  };

  const handleOpenChange: DropdownProps['onOpenChange'] = (nextOpen, info) => {
    if (info.source === 'trigger' || nextOpen) {
      setOpen(nextOpen);
    }
  };

  const handleOnPolicyChange = async (e: RadioChangeEvent) => {
    console.log('policy changed:', e.target.value);
    const policy = e.target.value;
    if (policy === 'allowed_users') {
      form.setFieldsValue({ users: formDataCacheRef.current?.users || [] });
    } else if (policy === 'allowed_principals') {
      form.setFieldsValue({
        principals: formDataCacheRef.current?.principals || []
      });
    } else {
      formDataCacheRef.current = {
        access_policy: policy,
        users: form.getFieldValue('users') || [],
        principals: form.getFieldValue('principals') || []
      };
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    onValuesChange?.({ access_policy: policy }, form.getFieldsValue());
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.submit();
    },
    setFieldsValue: (values: Partial<AccessControlFormData>) => {
      form.setFieldsValue(values);
    },
    getFieldsValue: () => {
      return form.getFieldsValue();
    },
    resetFields: () => {
      form.resetFields();
    }
  }));

  useEffect(() => {
    const init = async () => {
      const allusers = await getUserList(queryParams);
      const userMap = new Map(allusers.map((u) => [u.key, u]));

      if (currentData?.id) {
        form.setFieldsValue({
          access_policy: currentData?.access_policy
        });
        queryModelAccessUserList(currentData.id).then((res) => {
          const keys = res.items.map((item) => item.id);
          setTargetKeys(keys);

          let hasAdmin = false;
          let hasInactive = false;

          for (const key of keys) {
            const user = userMap.get(key);
            if (!user) continue;
            if (user.is_admin) hasAdmin = true;
            if (!user.is_active) hasInactive = true;
            if (hasAdmin && hasInactive) break;
          }

          const filterSet = new Set<string>();
          if (hasAdmin) filterSet.add('admin');
          if (hasInactive) filterSet.add('inactive');

          setFilterInUsers(filterSet);

          form.setFieldsValue({
            access_policy: currentData.access_policy,
            users: res.items.map((item) => ({ id: item.id }))
          });
        });
      } else {
        setTargetKeys([]);
        form.setFieldsValue({ users: [] });
      }
    };
    init();
  }, [currentData?.id]);

  const renderFilterDropdown = () => {
    return (
      <Dropdown
        open={open}
        onOpenChange={handleOpenChange}
        key="filter-dropdown"
        menu={{
          items: [
            {
              label: (
                <Checkbox
                  checked={filterInUsers.has('admin')}
                  onChange={(e: any) => handleCheck(e, 'admin')}
                >
                  {intl.formatMessage({ id: 'models.table.admin' })}
                </Checkbox>
              ),
              key: '0'
            },
            {
              label: (
                <Checkbox
                  checked={filterInUsers.has('inactive')}
                  onChange={(e: any) => handleCheck(e, 'inactive')}
                >
                  {intl.formatMessage({ id: 'users.status.inactiveAccount' })}
                </Checkbox>
              ),
              key: '1'
            }
          ]
        }}
      >
        <span>
          <span className="m-r-8" style={{ cursor: 'default' }}>
            {intl.formatMessage({
              id: 'models.accessControlModal.includeusers'
            })}
          </span>
          <DownOutlined style={{ fontSize: 12 }} />
        </span>
      </Dropdown>
    );
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      preserve={true}
      clearOnDestroy={true}
      scrollToFirstError={true}
      initialValues={{
        users: [],
        principals: [],
        access_policy: action === PageAction.CREATE ? 'authed' : undefined
      }}
    >
      <Label>
        {intl.formatMessage({ id: 'models.table.accessScope' })}
        <Tooltip title={<TooltipList list={accessScopeTips}></TooltipList>}>
          <QuestionCircleOutlined />
        </Tooltip>
      </Label>

      <Form.Item<AccessControlFormData> name="access_policy" noStyle>
        <Radio.Group
          onChange={handleOnPolicyChange}
          style={{ marginBottom: 12 }}
          options={[
            {
              label: intl.formatMessage({ id: 'models.accessSettings.authed' }),
              value: 'authed'
            },
            {
              label: intl.formatMessage({
                id: 'models.accessSettings.allowedUsers'
              }),
              value: 'allowed_users'
            },
            {
              label: intl.formatMessage({
                id: 'models.accessSettings.allowedPrincipals'
              }),
              value: 'allowed_principals'
            },
            {
              label: intl.formatMessage({
                id: 'models.accessSettings.public'
              }),
              value: 'public'
            }
          ]}
        ></Radio.Group>
      </Form.Item>
      {accessPolicy === 'allowed_principals' && (
        <PrincipalsField
          form={form}
          onChange={(principals) => {
            onValuesChange?.({ principals }, form.getFieldsValue());
          }}
        />
      )}
      {accessPolicy === 'public' && (
        <div style={{ marginBlock: '16px 12px' }}>
          <AlertBlockInfo
            type="danger"
            message={intl.formatMessage({
              id: 'models.accessSettings.public.tips'
            })}
          ></AlertBlockInfo>
        </div>
      )}
      {accessPolicy === 'allowed_users' && (
        <>
          <Label>
            {intl.formatMessage({ id: 'models.table.userSelection' })}
            <Tooltip
              title={intl.formatMessage({
                id: 'models.table.userSelection.tips'
              })}
            >
              <QuestionCircleOutlined />
            </Tooltip>
          </Label>
          <Form.Item<AccessControlFormData> name="users">
            <TransferInner
              dataSource={dataList}
              targetKeys={targetKeys}
              pagination={false}
              titles={[
                renderFilterDropdown(),
                intl.formatMessage({
                  id: 'models.table.users.selected'
                })
              ]}
              locale={{
                notFoundContent: [
                  <Empty
                    key="all"
                    description={intl.formatMessage({
                      id: 'models.table.nouserFound'
                    })}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />,
                  <Empty
                    key="selected"
                    description={intl.formatMessage({
                      id: 'models.table.noselected'
                    })}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ]
              }}
              showSearch={{
                placeholder: intl.formatMessage({
                  id: 'common.filter.name'
                })
              }}
              filterOption={(inputValue, item) =>
                item.title.toLowerCase().includes(inputValue.toLowerCase())
              }
              render={(item) => (
                <span className="flex-center gap-4">
                  <span>{item.title}</span>
                  <span className="text-tertiary">
                    {!item.is_active
                      ? `[${intl.formatMessage({ id: 'users.status.inactive' })}]`
                      : item.is_admin
                        ? `[${intl.formatMessage({ id: 'models.table.admin' })}]`
                        : ''}
                  </span>
                </span>
              )}
              onSearch={onSearch}
              onChange={handleOnChange}
            />
          </Form.Item>
        </>
      )}
    </Form>
  );
});

export default AccessControlForm;
