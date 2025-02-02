declare namespace Global {
  interface Pagination {
    page: number;
    perPage?: number;
    watch?: boolean;
  }
  interface PageResponse<T> {
    items: T[];
    pagination: {
      total: number;
      totalPage: number;
      page: number;
      perPage: number;
    };
  }

  interface UserInfo {
    username: string;
    is_admin: boolean;
    full_name: string;
    require_password_change: boolean;
    id: number;
  }

  interface BaseListItem {
    key: string;
    value: string | number;
  }

  interface BaseOption {
    label: string;
    value: string | number;
  }

  type SearchParams = Pagination & { search?: string };
}
