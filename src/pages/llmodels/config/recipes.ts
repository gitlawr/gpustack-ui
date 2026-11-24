/**
 * Deployment recipes: per-model launch configurations the server imports from
 * vLLM recipes and the SGLang cookbook. A recipe is one model; each variant is
 * one configuration rendered upstream for one card, strategy and checkpoint.
 */

/**
 * How a variant fits the selected cluster, judged on its hardware alone:
 * - matched: deployable, on the card and card count it was written for;
 * - compatible: deployable, on other hardware;
 * - incompatible: not deployable on this cluster.
 */
export type RecipeFit = 'matched' | 'compatible' | 'incompatible';

export type RecipeVerification =
  | 'upstream-verified'
  | 'upstream-supported'
  | 'upstream-provided'
  | 'gpustack-verified';

export interface RecipeHardware {
  id: string;
  label: string;
  vendor: string;
  vendor_variant?: string | null;
  gpu_names: string[];
  gpu_count: number;
}

export interface RecipeFeatureMode {
  name: string;
  label: string;
  description: string;
  args: string[];
  env: Record<string, string>;
}

export interface RecipeFeature {
  name: string;
  backend: string;
  description: string;
  default: boolean;
  args: string[];
  env: Record<string, string>;
  modes: RecipeFeatureMode[];
  default_mode?: string | null;
  requires_hf_access: boolean;
}

export interface RecipeOrigin {
  source: string;
  url?: string | null;
  ref?: string | null;
  hardware?: string | null;
  strategy?: string | null;
  variant?: string | null;
}

export interface RecipeVariant {
  name: string;
  backend: string;
  backend_version?: string | null;
  repo_id: string;
  quantization?: string | null;
  quantization_key?: string | null;
  label: string;
  description: string;
  mode?: string | null;
  strategy?: string | null;
  strategy_label?: string | null;
  hardware: RecipeHardware;
  backend_parameters: string[];
  env: Record<string, string>;
  features: string[];
  default_features: string[];
  default_modes: Record<string, string>;
  requires_hf_access: boolean;
  verification: RecipeVerification;
  origin: RecipeOrigin;
}

export interface RecipeNote {
  title: string;
  body: string;
  hardware: string[];
  backend?: string | null;
}

export interface RecipeUpstream {
  source: string;
  url: string;
}

export interface RecipeSummary {
  id: string;
  name: string;
  title: string;
  provider: string;
  description: string;
  categories: string[];
  backends: string[];
  vendors: string[];
  hardware: string[];
  quantizations: string[];
  upstream: RecipeUpstream[];
  variant_count: number;
  model_created_at?: string | null;
}

export interface RecipeDetail extends RecipeSummary {
  first_synced_at?: string | null;
  models: {
    repo_id: string;
    fingerprint?: string | null;
    quantization_key?: string | null;
  }[];
  features: RecipeFeature[];
  notes: RecipeNote[];
  variants: RecipeVariant[];
}

export interface RecipeMatch {
  recipe: RecipeSummary;
  matched_by: 'repo_id' | 'fingerprint';
  variants: string[];
}

export interface RecipeIdentifyResult {
  matches: RecipeMatch[];
  quantization_key?: string | null;
}

export interface RecipeVariantFit {
  name: string;
  fit: RecipeFit;
  backend_version?: string | null;
  messages: string[];
}

export interface RecipeBackendFit {
  backend: string;
  fit: RecipeFit;
  variant_count: number;
}

export interface RecipeEvaluateResult {
  backends: RecipeBackendFit[];
  variants: RecipeVariantFit[];
}

export interface RecipeFeatureChoice {
  enabled: boolean;
  mode?: string | null;
}

export interface RecipeReference {
  name: string;
  variant: string;
  origin: RecipeOrigin;
}

export interface RecipeRenderResult {
  backend: string;
  backend_version?: string | null;
  backend_parameters: string[];
  env: Record<string, string>;
  categories: string[];
  distributed_inference_across_workers: boolean;
  recipe: RecipeReference;
  warnings: string[];
}

/** The model a recipe is looked up for: the deployment form's own source. */
export interface RecipeModelSource {
  source: string;
  huggingface_repo_id?: string | null;
  huggingface_filename?: string | null;
  model_scope_model_id?: string | null;
  model_scope_file_path?: string | null;
  local_path?: string | null;
}

export const RecipeFitRank: Record<RecipeFit, number> = {
  matched: 0,
  compatible: 1,
  incompatible: 2
};

export const RecipeSourceLabels: Record<string, string> = {
  'vllm-recipes': 'vLLM Recipes',
  'sgl-cookbook': 'SGLang Cookbook'
};

/**
 * The feature switches a variant starts with: on for the features its upstream
 * command carried, in the mode it carried them in.
 */
export const defaultFeatureChoices = (
  variant: RecipeVariant | undefined,
  features: RecipeFeature[]
): Record<string, RecipeFeatureChoice> => {
  if (!variant) {
    return {};
  }
  return Object.fromEntries(
    features
      .filter((f) => f.backend === variant.backend)
      .filter((f) => variant.features.includes(f.name))
      .map((f) => [
        f.name,
        {
          enabled: variant.default_features.includes(f.name),
          mode: variant.default_modes[f.name] || f.default_mode || null
        }
      ])
  );
};
