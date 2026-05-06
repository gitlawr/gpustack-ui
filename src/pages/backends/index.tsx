import { currentOrganizationIdAtom } from '@/atoms/organization';
import { PageAction } from '@/config';
import useTableFetch from '@/hooks/use-table-fetch';
import {
  DeleteModal,
  FilterBar,
  IconFont,
  InfiniteScrollerProvider,
  NoResult
} from '@gpustack/core-ui';
import { useIntl, useModel } from '@umijs/max';
import useMemoizedFn from 'ahooks/lib/useMemoizedFn';
import { useAtomValue } from 'jotai';
import _ from 'lodash';
import { useState } from 'react';
import PageBox from '../_components/page-box';
import {
  createBackend,
  createBackendFromYAML,
  deleteBackend,
  INFERENCE_BACKEND_API,
  queryBackendsList,
  updateBackend,
  updateBackendFromYAML
} from './apis';
import AddCommunityModal from './community/add-community-modal';
import AddModal from './components/add-modal';
import BackendCardList from './components/backend-list';
import VersionInfoModal from './components/version-info-modal';
import {
  backendSourceOptions,
  BackendSourceValueMap,
  json2Yaml,
  yaml2Json
} from './config';
import { FormData, ListItem } from './config/types';
import useCreateBackend from './hooks/use-create-backend';
import useExportYAML from './hooks/use-export-yaml';
import useEnableBackend from './services/use-enable-backend';

// Compare two version_config entries by the fields that actually
// influence runtime behaviour. Anything else (UI flags, derived data)
// gets ignored.
const sameVersionConfig = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  const norm = (v: any) =>
    JSON.stringify({
      image_name: v.image_name ?? null,
      run_command: v.run_command ?? null,
      entrypoint: v.entrypoint ?? null,
      custom_framework: v.custom_framework ?? null,
      env: v.env ?? null
    });
  return norm(a) === norm(b);
};

// When a non-admin Org caller edits a Global row, the server transparently
// upserts their Org's row. To avoid bloating the Org row with duplicates
// of every Platform version, drop entries that match Platform's identical
// configuration — only the new / overridden ones are sent through.
const trimVersionConfigsToDiff = (
  submitted: any,
  original: ListItem | null | undefined
): any => {
  if (!Array.isArray(submitted) || !original) return submitted;
  const originalByKey: Record<string, any> = {};
  if (Array.isArray(original.version_configs)) {
    for (const v of original.version_configs as any[]) {
      const key = (v as any).version_no;
      if (key) originalByKey[key] = v;
    }
  }
  if (original.built_in_version_configs) {
    for (const [key, v] of Object.entries(original.built_in_version_configs)) {
      originalByKey[key] = v;
    }
  }
  return submitted.filter((vc: any) => {
    const key = vc.version_no;
    if (!key) return true;
    const orig = originalByKey[key];
    if (!orig) return true;
    return !sameVersionConfig(vc, orig);
  });
};

const BackendList = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState') || {};
  const isAdmin = !!initialState?.currentUser?.is_admin;
  // Hybrid scope: rows created from this page inherit the caller's
  // current Org context. Admin in "All" mode (currentOrgId === null)
  // creates a Global row; everyone else creates an Org-scoped row.
  const currentOrgId = useAtomValue(currentOrganizationIdAtom);

  const {
    dataSource,
    rowSelection,
    queryParams,
    modalRef,
    handleQueryChange,
    fetchData,
    handleDelete,
    handleSearch,
    handleNameChange
  } = useTableFetch<ListItem>({
    fetchAPI: queryBackendsList,
    deleteAPI: deleteBackend,
    API: INFERENCE_BACKEND_API,
    watch: false,
    isInfiniteScroll: true,
    contentForDelete: 'backends.title',
    defaultQueryParams: {
      perPage: 24
    }
  });
  const { exportYAML } = useExportYAML();
  const [openVersionInfoModal, setOpenVersionInfoModal] = useState<{
    open: boolean;
    currentData?: ListItem;
  }>({ open: false });
  const { handleEnableBackend } = useEnableBackend();
  const {
    addBackend,
    editBackend,
    closeBackendModal,
    openCommunityModalStatus,
    openBackendModalStatus,
    addActions
  } = useCreateBackend();

  // built_in_version_configs is read-only, but needs to be included when updating
  const handleOnSubmit = async (values: FormData) => {
    try {
      if (openBackendModalStatus.action === 'create') {
        // Picker only renders for admin in "All" mode (currentOrgId
        // null). When present, unwrap the "__platform__" sentinel to
        // NULL or pass through an Org id. Otherwise fall back to the
        // caller's current Org context — same as cluster / credential.
        const pickerValue = (values as any).organization_id_picker;
        const resolvedOrgId =
          pickerValue !== undefined
            ? pickerValue === '__platform__'
              ? null
              : pickerValue
            : currentOrgId;
        const { organization_id_picker: _omit, ...rest } = values as any;
        await createBackend({
          data: { ...rest, organization_id: resolvedOrgId }
        });
      } else {
        const omitFields =
          openBackendModalStatus.currentData?.backend_source ===
          BackendSourceValueMap.BUILTIN
            ? ['built_in_version_configs', 'default_version']
            : ['built_in_version_configs'];

        // Hybrid: when a non-admin Org caller submits edits to a Global
        // row, the server upserts an Org row. Trim version_configs to
        // just the new / overridden entries so Platform updates can keep
        // flowing through to the Org rather than getting frozen by stale
        // duplicates.
        const isOrgOverridingGlobal =
          !isAdmin &&
          openBackendModalStatus.currentData?.organization_id == null &&
          currentOrgId != null;
        const trimmedValues = isOrgOverridingGlobal
          ? {
              ...values,
              version_configs: trimVersionConfigsToDiff(
                values.version_configs,
                openBackendModalStatus.currentData
              )
            }
          : values;

        await updateBackend(openBackendModalStatus.currentData!.id!, {
          data: {
            built_in_version_configs:
              openBackendModalStatus.currentData?.built_in_version_configs,
            ..._.omit(trimmedValues, omitFields),
            health_check_path: trimmedValues.health_check_path || null
          }
        });
      }
      closeBackendModal('custom');
      handleSearch();
    } catch (error) {}
  };

  // built_in_version_configs needs to be included when updating from YAML, but not allowed to be changed
  const handleOnSubmitYaml = async (values: { content: string }) => {
    try {
      if (openBackendModalStatus.action === 'create') {
        // Inject organization_id into the YAML payload so the server can
        // tag the created row with the right tenant scope.
        const baseJson = yaml2Json(values.content) || {};
        const yamlContent = json2Yaml({
          ...baseJson,
          organization_id: currentOrgId
        });
        await createBackendFromYAML({ data: { content: yamlContent } });
      } else {
        const jsonData = yaml2Json(values.content);
        const yamlContent = json2Yaml({
          backend_name: openBackendModalStatus.currentData?.backend_name,
          default_version: openBackendModalStatus.currentData?.default_version,
          built_in_version_configs:
            openBackendModalStatus.currentData?.built_in_version_configs,
          ...jsonData
        });
        await updateBackendFromYAML(openBackendModalStatus.currentData!.id!, {
          data: {
            content: yamlContent
          }
        });
      }
      closeBackendModal('custom');
      handleSearch();
    } catch (error) {}
  };

  const handleFilterBySource = (value: string) => {
    handleQueryChange({
      backend_source: value,
      page: 1
    });
  };

  const handleAddBackend = (item: { key: 'community' | 'custom' }) => {
    addBackend(item.key);
  };

  const handleDisableCommunityBackend = async (item: any) => {
    // use disable for community backend deletion
    handleEnableBackend({
      id: item.data.id,
      data: {
        ...item.data,
        enabled: item.action === 'enable'
      },
      showMessage: false
    });
    // delay 200ms to refresh list
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    handleSearch();
  };

  const handleOnSelect = async (item: any) => {
    // ================ Edit ================
    if (item.action === 'edit') {
      editBackend(PageAction.EDIT, '', item.data);
      return;
    }
    // ================ Delete ================
    if (item.action === 'delete') {
      // Platform community rows can't actually be deleted (admin-curated
      // catalog) — "delete" action there is a soft-disable. Org rows of
      // any source (including Org's extension of a community backend)
      // are real, owner-mutable data and get a true DELETE.
      const isPlatformCommunity =
        item.data.backend_source === BackendSourceValueMap.COMMUNITY &&
        item.data.organization_id == null;
      if (isPlatformCommunity) {
        modalRef.current?.show({
          content: 'backends.title',
          operation: 'common.delete.single.confirm',
          name: item.data.backend_name,
          async onOk() {
            handleDisableCommunityBackend(item);
          }
        });
      } else {
        handleDelete(item.data, {
          name: item.data.backend_name
        });
      }
      return;
    }

    // ================ Export YAML ================
    if (item.action === 'export') {
      const currentData = structuredClone(item.data);

      currentData.version_configs = _.mapValues(
        currentData.version_configs,
        (v: any) => {
          return _.omit(v, ['built_in_frameworks']);
        }
      );

      exportYAML(_.omit(currentData, ['id', 'created_at', 'updated_at']));
      return;
    }

    // ================ View Versions ================
    if (item.action === 'view_versions') {
      setOpenVersionInfoModal({
        open: true,
        currentData: item.data
      });
    }
  };

  const handleAddVersion = () => {
    setOpenVersionInfoModal({
      open: false,
      currentData: undefined
    });
    editBackend(
      PageAction.EDIT,
      '',
      openVersionInfoModal.currentData as ListItem
    );
  };

  const loadMore = useMemoizedFn((nextPage: number) => {
    fetchData({
      query: {
        ...queryParams,
        page: nextPage
      },
      loadmore: true
    });
  });

  return (
    <PageBox>
      <FilterBar
        marginBottom={22}
        marginTop={30}
        widths={{
          input: 230
        }}
        actionItems={addActions}
        actionType="dropdown"
        inputHolder={intl.formatMessage({ id: 'common.filter.name' })}
        selectHolder={intl.formatMessage({ id: 'backend.filter.source' })}
        buttonText={intl.formatMessage({ id: 'backend.button.add' })}
        handleClickPrimary={handleAddBackend}
        handleSearch={handleSearch}
        handleSelectChange={handleFilterBySource}
        handleInputChange={handleNameChange}
        rowSelection={rowSelection}
        showSelect={true}
        selectOptions={backendSourceOptions.map((item) => ({
          label: intl.formatMessage({ id: item.label }),
          value: item.value
        }))}
      ></FilterBar>
      <InfiniteScrollerProvider
        value={{
          total: dataSource.totalPage,
          current: queryParams.page!,
          loading: dataSource.loading,
          refresh: loadMore,
          throttleDelay: 300
        }}
      >
        <BackendCardList
          dataList={dataSource.dataList}
          loading={dataSource.loading}
          activeId={false}
          isFirst={!dataSource.loadend}
          onSelect={handleOnSelect}
        ></BackendCardList>
        <NoResult
          loading={dataSource.loading}
          loadend={dataSource.loadend}
          dataSource={dataSource.dataList}
          image={<IconFont type="icon-models" />}
          filters={_.omit(queryParams, ['sort_by'])}
          noFoundText={intl.formatMessage({
            id: 'noresult.backend.nofound'
          })}
          title={intl.formatMessage({ id: 'noresult.backend.title' })}
          subTitle={intl.formatMessage({ id: 'noresult.backend.subTitle' })}
          onClick={() => handleAddBackend({ key: 'community' })}
          buttonText={intl.formatMessage({ id: 'noresult.button.add' })}
        ></NoResult>
      </InfiniteScrollerProvider>
      <AddModal
        action={openBackendModalStatus.action}
        onClose={() => closeBackendModal('custom')}
        onSubmit={handleOnSubmit}
        onSubmitYaml={handleOnSubmitYaml}
        currentData={openBackendModalStatus.currentData as ListItem}
        open={openBackendModalStatus.open}
        title={
          openBackendModalStatus.action === PageAction.CREATE
            ? intl.formatMessage({ id: 'backend.button.add' })
            : intl.formatMessage({ id: 'backend.button.edit' })
        }
      ></AddModal>
      <AddCommunityModal
        open={openCommunityModalStatus.open}
        onRefresh={handleSearch}
        onClose={() => closeBackendModal('community')}
      ></AddCommunityModal>
      <VersionInfoModal
        addVersion={handleAddVersion}
        open={openVersionInfoModal.open}
        currentData={openVersionInfoModal.currentData as ListItem}
        onClose={() =>
          setOpenVersionInfoModal({
            open: false,
            currentData: undefined
          })
        }
      ></VersionInfoModal>
      <DeleteModal ref={modalRef}></DeleteModal>
    </PageBox>
  );
};

export default BackendList;
