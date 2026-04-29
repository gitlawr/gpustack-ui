import {
  currentOrganizationIdAtom,
  organizationListAtom
} from '@/atoms/organization';
import { userSettingsHelperAtom } from '@/atoms/settings';
import { GPUStackVersionAtom, UpdateCheckAtom } from '@/atoms/user';
import { setAtomStorage } from '@/atoms/utils';
import { DEFAULT_ENTER_PAGE, GPUSTACK_API_BASE_URL } from '@/config/settings';
import { COLOR_PRIMARY } from '@/config/theme/constants';
import { enterprisePluginReady } from '@/plugins/enterprise-ready';
import { GPUStackPluginManager } from '@/plugins/manager';
import { mergeEnterpriseRoutes } from '@/plugins/route-merger';
import { requestConfig } from '@/request-config';
import { queryMyOrganizations } from '@/services/organizations/apis';
import {
  queryCurrentUserState,
  queryVersionInfo,
  updateCheck
} from '@/services/profile/apis';
import { fetchSystemConfig } from '@/services/system/query-system-config';
import { isOnline } from '@/utils';
import {
  IS_FIRST_LOGIN,
  readState,
  writeState
} from '@/utils/localstore/index';
import '@gpustack/core-ui/style.css';
import { RequestConfig, history, request as umiRequest } from '@umijs/max';
import { message } from 'antd';

// only for the first login and access from http://localhost

const checkDefaultPage = async (userInfo: any) => {
  const isFirstLogin = await readState(IS_FIRST_LOGIN);
  if (isFirstLogin === null && isOnline()) {
    writeState(IS_FIRST_LOGIN, true);
    if (userInfo && userInfo?.is_admin) {
      history.push(DEFAULT_ENTER_PAGE.adminForFirst);
    }
  }
};

// runtime configuration
export async function getInitialState(): Promise<{
  fetchUserInfo: () => Promise<Global.UserInfo>;
  currentUser?: Global.UserInfo;
  pluginData?: Record<string, any>;
}> {
  const { location } = history;

  // In open-source builds the promise resolves immediately.
  await enterprisePluginReady;

  // initialize plugins and merge enterprise locales
  let pluginData = {};
  try {
    pluginData = await GPUStackPluginManager.initialize({
      request: umiRequest,
      setUserSettings: (value) => setAtomStorage(userSettingsHelperAtom, value),
      setStorageUserSettings: (value) =>
        setAtomStorage(userSettingsHelperAtom, value),
      defaultColorPrimary: COLOR_PRIMARY
    });
  } catch (error) {
    console.error('Failed to initialize plugins:', error);
  }

  const getUpdateCheck = async () => {
    try {
      const data = await updateCheck();

      setAtomStorage(UpdateCheckAtom, {
        ...data
      });
      return data;
    } catch (error) {
      console.error('updateCheck error', error);
    }
  };

  // Read the persisted currentOrganizationId straight from localStorage.
  // jotai's atomWithStorage is lazy — `store.get(atom)` before any
  // component has subscribed can return the default (null) instead of
  // the stored value, which would silently reset admin's selection on
  // every reload.
  const readPersistedOrgId = (): number | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('currentOrganizationId');
      if (!raw || raw === 'null') return null;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'number' ? parsed : null;
    } catch {
      return null;
    }
  };

  const fetchOrganizations = async (userInfo: Global.UserInfo) => {
    try {
      const res = await queryMyOrganizations({ skipErrorHandler: true });
      // Server returns [{ organization, role }, ...] — flatten for UI consumption.
      const raw = Array.isArray(res) ? res : (res as any)?.items || [];
      const list = raw.map((entry: any) => ({
        ...(entry.organization || entry),
        role: entry.role
      }));
      setAtomStorage(organizationListAtom, list);

      const currentId = readPersistedOrgId();
      const stillValid =
        currentId != null && list.some((item: any) => item.id === currentId);

      if (!stillValid) {
        // Platform admin defaults to "All" (no org context) so their list
        // endpoints return cross-org results. Non-admin users must always
        // operate inside an org, so we pick a sensible default.
        const fallback = userInfo?.is_admin
          ? null
          : (userInfo as any)?.default_organization_id ||
            list.find((item: any) => item.is_platform)?.id ||
            list[0]?.id ||
            null;
        setAtomStorage(currentOrganizationIdAtom, fallback);
      } else {
        // Make sure jotai's atom stays in sync with the persisted value
        // (covers the case where the atom hadn't been mounted yet).
        setAtomStorage(currentOrganizationIdAtom, currentId);
      }
    } catch (error) {
      console.error('queryMyOrganizations error', error);
    }
  };

  const fetchUserInfo = async (config?: {
    skipErrorHandler?: boolean;
  }): Promise<Global.UserInfo> => {
    try {
      const data = await queryCurrentUserState({
        skipErrorHandler: true
      });
      if (data.is_admin) {
        getUpdateCheck();
        fetchSystemConfig();
      }
      await fetchOrganizations(data);
      return data;
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.code === 401 && data?.message.includes('deactivate')) {
        message.error({
          content: (
            <div>
              <span>{data?.message}</span>
            </div>
          ),
          duration: 5
        });
      }
      history.push(DEFAULT_ENTER_PAGE.login);
    }
    return {} as Global.UserInfo;
  };

  const getAppVersionInfo = async () => {
    try {
      const data = await queryVersionInfo();

      const isDev = data.version?.indexOf('0.0.0') > -1;
      const isRc = data.version?.indexOf('rc') > -1;

      setAtomStorage(GPUStackVersionAtom, {
        ...data,
        isProd: !isDev && !isRc,
        isDev,
        isRc
      });
    } catch (error) {
      console.error('queryVersionInfo error', error);
    }
  };

  getAppVersionInfo();

  if (![DEFAULT_ENTER_PAGE.login].includes(location.pathname)) {
    const userInfo = await fetchUserInfo();
    checkDefaultPage(userInfo);
    return {
      fetchUserInfo,
      currentUser: userInfo,
      pluginData
    };
  }
  return {
    fetchUserInfo,
    pluginData
  };
}

export const request: RequestConfig = {
  baseURL: `/${GPUSTACK_API_BASE_URL}`,
  ...requestConfig
};

/**
 * @description patch the client routes
 * @param routes routes
 */
export function patchClientRoutes({ routes }: any) {
  mergeEnterpriseRoutes(routes);
}
