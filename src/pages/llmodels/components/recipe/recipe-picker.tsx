import { ExportOutlined, WarningOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Empty,
  Flex,
  Modal,
  Radio,
  Segmented,
  Select,
  Spin,
  Switch,
  Tooltip,
  Typography
} from 'antd';
import { createStyles } from 'antd-style';
import _ from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import {
  evaluateRecipe,
  queryRecipe,
  queryRecipes,
  renderRecipe
} from '../../apis/recipes';
import { modelSourceMap } from '../../config';
import {
  RecipeBackendFit,
  RecipeDetail,
  RecipeFeature,
  RecipeFeatureChoice,
  RecipeMatch,
  RecipeModelSource,
  RecipeRenderResult,
  RecipeSourceLabels,
  RecipeVariant,
  RecipeVariantFit,
  defaultFeatureChoices
} from '../../config/recipes';
import { ClusterOption } from '../../config/types';
import { RecipeFitBadge, RecipeVerificationTag } from './fit-badge';

const useStyles = createStyles(({ css, token }) => ({
  section: css`
    margin-bottom: 16px;
  `,
  sectionTitle: css`
    font-weight: 600;
    margin-bottom: 8px;
  `,
  variantList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 360px;
    overflow-y: auto;
    padding-right: 4px;
  `,
  variant: css`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    &:hover {
      border-color: ${token.colorPrimaryHover};
    }
  `,
  variantSelected: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  muted: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  feature: css`
    padding: 6px 0;
  `
}));

export interface RecipeApplied {
  rendered: RecipeRenderResult;
  source: RecipeModelSource;
  clusterId?: number;
  label: string;
}

type RecipePickerProps = {
  open: boolean;
  onCancel: () => void;
  onApply: (applied: RecipeApplied) => void;
  /** From a deployment form: the model is the form's, and so is the cluster. */
  matches?: RecipeMatch[];
  source?: RecipeModelSource;
  clusterId?: number;
  /** From the recipe list: the user picks the cluster and the checkpoint. */
  browse?: { recipeId: string; clusterList: ClusterOption[] };
};

export const variantLabel = (
  variant: RecipeVariant,
  intl: ReturnType<typeof useIntl>
) =>
  [
    variant.quantization?.toUpperCase(),
    intl.formatMessage(
      { id: 'models.recipe.gpus' },
      { label: variant.hardware.label, count: variant.hardware.gpu_count }
    ),
    variant.strategy_label
  ]
    .filter(Boolean)
    .join(' · ');

const defaultCluster = (clusterList: ClusterOption[]) =>
  (clusterList.find((c) => c.is_default) || clusterList[0])?.value as
    | number
    | undefined;

type Scope = {
  recipeId?: string;
  detail?: RecipeDetail;
  // From the recipe list only; a form brings its own cluster and model.
  clusterId?: number;
  checkpoint?: string;
};

type Evaluation = {
  backends: RecipeBackendFit[];
  backend?: string;
  fits: RecipeVariantFit[];
  variantName?: string;
  choices: Record<string, RecipeFeatureChoice>;
};

const EMPTY_EVALUATION: Evaluation = { backends: [], fits: [], choices: {} };

const RecipePicker: React.FC<RecipePickerProps> = (props) => {
  const { open, onCancel, onApply, browse, matches = [] } = props;
  const intl = useIntl();
  const { styles, cx } = useStyles();

  const [scope, setScope] = useState<Scope>({});
  const [evaluation, setEvaluation] = useState<Evaluation>(EMPTY_EVALUATION);
  const [status, setStatus] = useState({
    loading: false,
    evaluating: false,
    applying: false
  });
  const [searchOptions, setSearchOptions] = useState<
    { label: string; value: string }[]
  >([]);
  // Only the newest evaluation may land: a slower, older one would show the
  // variants of a cluster or checkpoint the user has already left.
  const requestRef = useRef(0);

  const { recipeId, detail, checkpoint } = scope;
  const { backends, backend, fits, variantName, choices } = evaluation;
  const { loading, evaluating, applying } = status;

  const sourceOf = (next: Scope): RecipeModelSource | undefined => {
    if (!browse) {
      return props.source;
    }
    return next.checkpoint
      ? {
          source: modelSourceMap.huggingface_value,
          huggingface_repo_id: next.checkpoint
        }
      : undefined;
  };
  const clusterOf = (next: Scope) =>
    browse ? next.clusterId : props.clusterId;
  // A matched recipe offers the variants written for the form's model; from the
  // list, those of the chosen checkpoint; a recipe searched by hand, all.
  const variantNamesOf = (next: Scope) =>
    browse
      ? next.detail?.variants
          .filter((v) => v.repo_id === next.checkpoint)
          .map((v) => v.name)
      : matches.find((m) => m.recipe.id === next.recipeId)?.variants;

  const source = sourceOf(scope);
  const clusterId = clusterOf(scope);
  const variantNames = variantNamesOf(scope);
  const checkpoints = _.uniq(
    (detail?.variants || []).map((v) => v.repo_id)
  ).map((repo: string) => ({ label: repo, value: repo }));
  const byName = _.keyBy(detail?.variants || [], 'name');
  const variants = fits
    .map((fit) => ({ fit, variant: byName[fit.name] }))
    .filter((item) => item.variant);
  const selected = variantName ? byName[variantName] : undefined;
  const features = (detail?.features || []).filter(
    (f) =>
      selected &&
      f.backend === selected.backend &&
      selected.features.includes(f.name)
  );
  const notes = (detail?.notes || []).filter(
    (note) =>
      selected &&
      (!note.backend || note.backend === selected.backend) &&
      (!note.hardware.length || note.hardware.includes(selected.hardware.id))
  );

  /**
   * Rank the backends (unless one is chosen), then evaluate the chosen
   * backend's variants and preselect the first that deploys.
   */
  const evaluate = async (
    next: Scope,
    chosen?: Pick<Evaluation, 'backend' | 'backends'>
  ) => {
    const nextSource = sourceOf(next);
    if (!next.recipeId || !next.detail || !nextSource) {
      setEvaluation(EMPTY_EVALUATION);
      return;
    }
    const requestId = ++requestRef.current;
    setStatus((current) => ({ ...current, evaluating: true }));
    const body = {
      ...nextSource,
      cluster_id: clusterOf(next),
      variants: variantNamesOf(next)
    };
    try {
      let ranked = chosen?.backends || [];
      let name = chosen?.backend;
      if (!name) {
        ranked = (await evaluateRecipe(next.recipeId, body)).backends;
        name = ranked[0]?.backend;
      }
      const result = name
        ? await evaluateRecipe(next.recipeId, { ...body, backend: name })
        : { variants: [] as RecipeVariantFit[] };
      if (requestId !== requestRef.current) {
        return;
      }
      const first = result.variants.find((v) => v.fit !== 'incompatible');
      const variant = next.detail.variants.find((v) => v.name === first?.name);
      setEvaluation({
        backends: ranked,
        backend: name,
        fits: result.variants,
        variantName: variant?.name,
        choices: defaultFeatureChoices(variant, next.detail.features)
      });
    } finally {
      if (requestId === requestRef.current) {
        setStatus((current) => ({ ...current, evaluating: false }));
      }
    }
  };

  const openRecipe = async (id: string, base: Scope) => {
    setScope({ ...base, recipeId: id });
    setEvaluation(EMPTY_EVALUATION);
    setStatus((current) => ({ ...current, loading: true }));
    try {
      const recipe = await queryRecipe(id);
      const next: Scope = {
        ...base,
        recipeId: id,
        detail: recipe,
        checkpoint: browse ? recipe.variants[0]?.repo_id : undefined
      };
      setScope(next);
      await evaluate(next);
    } finally {
      setStatus((current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    if (browse) {
      openRecipe(browse.recipeId, {
        clusterId: defaultCluster(browse.clusterList)
      });
      return;
    }
    setSearchOptions(
      matches.map((m) => ({ label: m.recipe.title, value: m.recipe.id }))
    );
    if (matches[0]) {
      openRecipe(matches[0].recipe.id, {});
    } else {
      setScope({});
      setEvaluation(EMPTY_EVALUATION);
    }
  }, [open]);

  const handleRecipeChange = (id: string) => {
    openRecipe(id, { clusterId: scope.clusterId });
  };

  const handleClusterChange = (value: number) => {
    const next = { ...scope, clusterId: value };
    setScope(next);
    evaluate(next);
  };

  const handleCheckpointChange = (value: string) => {
    const next = { ...scope, checkpoint: value };
    setScope(next);
    evaluate(next);
  };

  const handleBackendChange = (value: string) => {
    setEvaluation({ ...EMPTY_EVALUATION, backends, backend: value });
    evaluate(scope, { backend: value, backends });
  };

  const handleVariantSelect = (name: string) => {
    setEvaluation((current) => ({
      ...current,
      variantName: name,
      choices: defaultFeatureChoices(byName[name], detail?.features || [])
    }));
  };

  const updateChoice = (name: string, patch: Partial<RecipeFeatureChoice>) => {
    setEvaluation((current) => ({
      ...current,
      choices: {
        ...current.choices,
        [name]: {
          ...(current.choices[name] ?? { enabled: false, mode: null }),
          ...patch
        }
      }
    }));
  };

  const searchRef = useRef(
    _.debounce(async (search: string) => {
      const result = await queryRecipes({ search, page: 1, perPage: 20 });
      setSearchOptions(
        (result.items || []).map((item) => ({
          label: item.title,
          value: item.id
        }))
      );
    }, 300)
  );

  const handleApply = async () => {
    if (!recipeId || !selected || !source) {
      return;
    }
    setStatus((current) => ({ ...current, applying: true }));
    try {
      const rendered = await renderRecipe(recipeId, {
        ...source,
        cluster_id: clusterId,
        variant: selected.name,
        features: choices
      });
      onApply({
        rendered,
        source,
        clusterId,
        label: `${detail?.title} · ${variantLabel(selected, intl)}`
      });
    } finally {
      setStatus((current) => ({ ...current, applying: false }));
    }
  };

  const renderVariant = (variant: RecipeVariant, fit: RecipeVariantFit) => {
    const checked = variant.name === variantName;
    return (
      <div
        key={variant.name}
        className={cx(styles.variant, checked && styles.variantSelected)}
        onClick={() => handleVariantSelect(variant.name)}
      >
        <Flex justify="space-between" align="center" gap={8}>
          <Flex align="center" gap={8} style={{ minWidth: 0 }}>
            <Radio checked={checked} />
            <RecipeFitBadge fit={fit.fit} showText={false} />
            <Typography.Text strong ellipsis>
              {variantLabel(variant, intl)}
            </Typography.Text>
          </Flex>
          <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
            <span className={styles.muted}>
              {fit.backend_version
                ? `${variant.backend} ${fit.backend_version}`
                : variant.backend_version || ''}
            </span>
            <RecipeVerificationTag verification={variant.verification} />
          </Flex>
        </Flex>
        <div className={styles.muted} style={{ marginTop: 4, paddingLeft: 24 }}>
          {variant.repo_id}
          {variant.origin.url && (
            <>
              {' · '}
              <a
                href={variant.origin.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {intl.formatMessage(
                  { id: 'models.recipe.from' },
                  {
                    source:
                      RecipeSourceLabels[variant.origin.source] ||
                      variant.origin.source
                  }
                )}{' '}
                <ExportOutlined />
              </a>
            </>
          )}
        </div>
        {fit.fit === 'incompatible' && fit.messages.length > 0 && (
          <div
            className={styles.muted}
            style={{ marginTop: 4, paddingLeft: 24 }}
          >
            {fit.messages.join(' ')}
          </div>
        )}
      </div>
    );
  };

  const renderFeature = (feature: RecipeFeature) => {
    const choice = choices[feature.name] || { enabled: false };
    return (
      <Flex
        key={feature.name}
        className={styles.feature}
        justify="space-between"
        align="center"
        gap={12}
      >
        <div style={{ minWidth: 0 }}>
          <Flex align="center" gap={6}>
            <Typography.Text>{feature.name}</Typography.Text>
            {feature.requires_hf_access && (
              <Tooltip
                title={intl.formatMessage({ id: 'models.recipe.feature.hf' })}
              >
                <WarningOutlined
                  style={{ color: 'var(--ant-color-warning)' }}
                />
              </Tooltip>
            )}
          </Flex>
          {feature.description && (
            <Typography.Paragraph
              className={styles.muted}
              ellipsis={{ rows: 2, tooltip: feature.description }}
              style={{ marginBottom: 0 }}
            >
              {feature.description}
            </Typography.Paragraph>
          )}
        </div>
        <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
          {feature.modes.length > 0 && (
            <Select
              size="small"
              style={{ width: 120 }}
              disabled={!choice.enabled}
              value={choice.mode || feature.default_mode}
              options={feature.modes.map((m) => ({
                label: m.label || m.name,
                value: m.name
              }))}
              onChange={(mode) => updateChoice(feature.name, { mode })}
            />
          )}
          <Switch
            size="small"
            checked={choice.enabled}
            onChange={(enabled) => updateChoice(feature.name, { enabled })}
          />
        </Flex>
      </Flex>
    );
  };

  return (
    <Modal
      open={open}
      width={860}
      destroyOnHidden
      title={
        browse
          ? detail?.title
          : intl.formatMessage({ id: 'models.recipe.title' })
      }
      onCancel={onCancel}
      onOk={handleApply}
      okText={intl.formatMessage({
        id: browse ? 'models.recipe.deploy' : 'models.recipe.apply'
      })}
      okButtonProps={{ disabled: !selected, loading: applying }}
    >
      <div className={styles.section}>
        {browse ? (
          <Flex gap={12}>
            <Select
              style={{ flex: 1 }}
              value={scope.clusterId}
              placeholder={intl.formatMessage({
                id: 'models.recipe.detail.cluster'
              })}
              options={browse.clusterList.map((c) => ({
                label: c.label,
                value: c.value
              }))}
              onChange={handleClusterChange}
            />
            <Select
              style={{ flex: 2 }}
              value={checkpoint}
              placeholder={intl.formatMessage({
                id: 'models.recipe.detail.models'
              })}
              options={checkpoints}
              onChange={handleCheckpointChange}
            />
          </Flex>
        ) : (
          <Select
            showSearch
            style={{ width: '100%' }}
            value={recipeId}
            placeholder={intl.formatMessage({ id: 'models.recipe.search' })}
            options={searchOptions}
            filterOption={false}
            onSearch={searchRef.current}
            onChange={handleRecipeChange}
          />
        )}
        {detail && (
          <div className={styles.muted} style={{ marginTop: 6 }}>
            {detail.description}
          </div>
        )}
      </div>
      <Spin spinning={loading}>
        {detail && backends.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {intl.formatMessage({ id: 'models.recipe.backend' })}
            </div>
            <Segmented
              value={backend}
              onChange={(value) => handleBackendChange(value as string)}
              options={backends.map((b) => ({
                value: b.backend,
                label: (
                  <Flex align="center" gap={6}>
                    <RecipeFitBadge fit={b.fit} showText={false} />
                    {`${b.backend} (${b.variant_count})`}
                  </Flex>
                )
              }))}
            />
          </div>
        )}
        {detail && !loading && variantNames?.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={intl.formatMessage({
              id: 'models.recipe.noVariants'
            })}
          />
        )}
        {backend && backends.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {intl.formatMessage({ id: 'models.recipe.variants' })}
            </div>
            <Spin spinning={evaluating}>
              <div className={styles.variantList}>
                {variants.map(({ variant, fit }) =>
                  renderVariant(variant, fit)
                )}
                {evaluating && variants.length === 0 && (
                  <div className={styles.muted}>
                    {intl.formatMessage({ id: 'models.recipe.evaluating' })}
                  </div>
                )}
              </div>
            </Spin>
          </div>
        )}
        {features.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {intl.formatMessage({ id: 'models.recipe.features' })}
            </div>
            {features.map(renderFeature)}
          </div>
        )}
        {notes.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {intl.formatMessage({ id: 'models.recipe.notes' })}
            </div>
            <Flex vertical gap={8}>
              {notes.map((note, index) => (
                <Alert
                  key={index}
                  type="info"
                  showIcon
                  message={note.title}
                  description={
                    <Typography.Paragraph
                      ellipsis={{ rows: 3, expandable: true }}
                      style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                    >
                      {note.body}
                    </Typography.Paragraph>
                  }
                />
              ))}
            </Flex>
          </div>
        )}
        {selected && !browse && (
          <Alert
            type="warning"
            showIcon
            message={intl.formatMessage({ id: 'models.recipe.apply.tips' })}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default RecipePicker;
