import { BookOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Flex, Form, Typography, message } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { identifyRecipes } from '../../apis/recipes';
import { modelSourceMap } from '../../config';
import { useFormContext } from '../../config/form-context';
import { RecipeMatch, RecipeModelSource } from '../../config/recipes';
import RecipePicker, { RecipeApplied } from './recipe-picker';

const useStyles = createStyles(({ css, token }) => ({
  entry: css`
    margin-bottom: 16px;
    padding: 8px 12px;
    border: 1px dashed ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
  `,
  muted: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `
}));

// Holds an object value for the form; an <input> would stringify it.
const HiddenValue: React.FC<{ value?: unknown }> = () => null;

/**
 * The recipe a model's source points at, offered above the backend fields.
 *
 * Nothing is applied until the user picks a variant: choosing one replaces the
 * backend, its version, parameters and env in the form, and never the model
 * source, which is why the variants offered are the ones written for it.
 */
const RecipeEntry: React.FC = () => {
  const intl = useIntl();
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const {
    isGGUF,
    flatBackendOptions,
    onBackendChange,
    onValuesChange,
    setImageModePicked
  } = useFormContext();

  const source = Form.useWatch('source', form);
  const huggingfaceRepoId = Form.useWatch('huggingface_repo_id', form);
  const modelScopeModelId = Form.useWatch('model_scope_model_id', form);
  const localPath = Form.useWatch('local_path', form);
  const clusterId = Form.useWatch('cluster_id', form);

  const [matches, setMatches] = useState<RecipeMatch[]>([]);
  const [identified, setIdentified] = useState(false);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string>();

  const modelSource: RecipeModelSource | null = useMemo(() => {
    if (source === modelSourceMap.huggingface_value && huggingfaceRepoId) {
      return { source, huggingface_repo_id: huggingfaceRepoId };
    }
    if (source === modelSourceMap.modelscope_value && modelScopeModelId) {
      return { source, model_scope_model_id: modelScopeModelId };
    }
    if (source === modelSourceMap.local_path_value && localPath) {
      return { source, local_path: localPath };
    }
    return null;
  }, [source, huggingfaceRepoId, modelScopeModelId, localPath]);

  // The model the applied recipe was written for. Another model makes the
  // reference wrong; the first one seen may have arrived with it, from the
  // recipe list.
  const sourceKeyRef = useRef<string>();

  useEffect(() => {
    const sourceKey = JSON.stringify(modelSource);
    if (
      sourceKeyRef.current !== undefined &&
      sourceKeyRef.current !== sourceKey
    ) {
      setApplied(undefined);
      form.setFieldValue(['meta', 'recipe'], undefined);
    }
    sourceKeyRef.current = sourceKey;
    setMatches([]);
    setIdentified(false);
    if (!modelSource || isGGUF) {
      return;
    }
    let cancelled = false;
    // Typed paths change on every keystroke; identify once typing settles.
    const timer = setTimeout(async () => {
      try {
        const result = await identifyRecipes({
          ...modelSource,
          cluster_id: clusterId
        });
        if (!cancelled) {
          setMatches(result.matches || []);
        }
      } catch {
        // No recipe is the same as no answer here: the form works without one.
      } finally {
        if (!cancelled) {
          setIdentified(true);
        }
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [modelSource, clusterId, isGGUF]);

  const handleApply = async ({ rendered, label }: RecipeApplied) => {
    const option = flatBackendOptions?.find(
      (item) => item.value === rendered.backend
    );
    form.setFieldValue('backend', rendered.backend);
    // The form's own backend switch first: it resets what belongs to the
    // previous engine, which the recipe's values then replace.
    await onBackendChange?.(rendered.backend, option);
    form.setFieldsValue({
      backend_version: rendered.backend_version || null,
      image_name: null,
      run_command: null,
      backend_parameters: rendered.backend_parameters,
      distributed_inference_across_workers:
        rendered.distributed_inference_across_workers,
      ...(rendered.categories?.[0]
        ? { categories: rendered.categories[0] }
        : {})
    });
    // Replaced, not merged: setFieldsValue deep-merges maps.
    form.setFieldValue('env', rendered.env);
    form.setFieldValue(['meta', 'recipe'], rendered.recipe);
    setImageModePicked?.(false);
    setApplied(label);
    setOpen(false);
    rendered.warnings?.forEach((warning) => message.warning(warning));
    onValuesChange?.({}, form.getFieldsValue());
  };

  // Registered whatever else renders: only registered fields are submitted.
  const reference = (
    <Form.Item name={['meta', 'recipe']} hidden noStyle>
      <HiddenValue />
    </Form.Item>
  );

  if (!modelSource || isGGUF || !identified) {
    return reference;
  }

  const match = matches[0];
  return (
    <div className={styles.entry}>
      {reference}
      <Flex justify="space-between" align="center" gap={8}>
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <BookOutlined />
          <Typography.Text strong>
            {intl.formatMessage({ id: 'models.recipe.title' })}
          </Typography.Text>
          {match ? (
            <Typography.Text ellipsis>
              {match.recipe.title}
              <span className={styles.muted}>
                {' · '}
                {intl.formatMessage({
                  id: `models.recipe.matchedBy.${match.matched_by}`
                })}
              </span>
            </Typography.Text>
          ) : (
            <span className={styles.muted}>
              {intl.formatMessage({ id: 'models.recipe.none' })}
            </span>
          )}
        </Flex>
        <Button size="small" type="link" onClick={() => setOpen(true)}>
          {intl.formatMessage({
            id: match ? 'models.recipe.choose' : 'models.recipe.search'
          })}
        </Button>
      </Flex>
      {applied && (
        <div className={styles.muted} style={{ marginTop: 4 }}>
          <CheckCircleFilled style={{ color: 'var(--ant-color-success)' }} />{' '}
          {intl.formatMessage(
            { id: 'models.recipe.applied' },
            { name: applied }
          )}
        </div>
      )}
      <RecipePicker
        open={open}
        matches={matches}
        source={modelSource}
        clusterId={clusterId}
        onCancel={() => setOpen(false)}
        onApply={handleApply}
      />
    </div>
  );
};

export default RecipeEntry;
