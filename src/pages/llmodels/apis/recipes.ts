import { request } from '@umijs/max';
import {
  RecipeDetail,
  RecipeEvaluateResult,
  RecipeFeatureChoice,
  RecipeIdentifyResult,
  RecipeModelSource,
  RecipeRenderResult,
  RecipeSummary
} from '../config/recipes';

export const RECIPES_API = '/recipes';

export async function queryRecipes(
  params: {
    page?: number;
    perPage?: number;
    search?: string;
    backend?: string;
    vendor?: string;
    category?: string;
  },
  options?: { token?: any }
) {
  return request<Global.PageResponse<RecipeSummary>>(RECIPES_API, {
    method: 'GET',
    params,
    cancelToken: options?.token
  });
}

export async function queryRecipe(id: string) {
  return request<RecipeDetail>(`${RECIPES_API}/${encodeURIComponent(id)}`, {
    method: 'GET'
  });
}

export async function identifyRecipes(
  data: RecipeModelSource & { cluster_id?: number },
  options?: { token?: any }
) {
  return request<RecipeIdentifyResult>(`${RECIPES_API}/identify`, {
    method: 'POST',
    data,
    cancelToken: options?.token
  });
}

export async function evaluateRecipe(
  id: string,
  data: RecipeModelSource & {
    cluster_id?: number;
    backend?: string;
    variants?: string[];
  },
  options?: { token?: any }
) {
  return request<RecipeEvaluateResult>(
    `${RECIPES_API}/${encodeURIComponent(id)}/evaluate`,
    {
      method: 'POST',
      data,
      cancelToken: options?.token
    }
  );
}

export async function renderRecipe(
  id: string,
  data: RecipeModelSource & {
    cluster_id?: number;
    variant: string;
    features: Record<string, RecipeFeatureChoice>;
  }
) {
  return request<RecipeRenderResult>(
    `${RECIPES_API}/${encodeURIComponent(id)}/render`,
    {
      method: 'POST',
      data
    }
  );
}
