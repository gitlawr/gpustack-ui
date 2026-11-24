import { modelsExpandKeysAtom } from '@/atoms/models';
import { PageAction } from '@/config';
import { ExportOutlined } from '@ant-design/icons';
import { IconFont, NoResult } from '@gpustack/core-ui';
import { useIntl, useNavigate } from '@umijs/max';
import {
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message
} from 'antd';
import { createStyles } from 'antd-style';
import { useAtom } from 'jotai';
import _ from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import PageBox from '../_components/page-box';
import { createModel } from './apis';
import { queryRecipes } from './apis/recipes';
import DeployModal from './components/deployment/deploy-modal';
import RecipePicker, { RecipeApplied } from './components/recipe/recipe-picker';
import { modelSourceMap } from './config';
import {
  RecipeSourceLabels,
  RecipeSummary,
  RecipeUpstream
} from './config/recipes';
import { ClusterOption, FormData, SourceType } from './config/types';
import { useGenerateWorkerOptions } from './hooks/use-form-initial-values';

const useStyles = createStyles(({ css, token }) => ({
  filters: css`
    margin-bottom: 16px;
  `,
  card: css`
    height: 100%;
    .ant-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
    }
  `,
  muted: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  footer: css`
    margin-top: auto;
  `
}));

const BACKENDS = ['vLLM', 'SGLang'];
const VENDORS = ['nvidia', 'amd', 'ascend', 'thead'];

const Recipes: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { styles } = useStyles();
  const { getWorkerOptionList, clusterList: clusterOptions } =
    useGenerateWorkerOptions();
  // The hook's options carry every ClusterOption field; only its type is
  // narrower.
  const clusterList = clusterOptions as unknown as ClusterOption[];
  const [, setModelsExpandKeys] = useAtom(modelsExpandKeysAtom);

  const [list, setList] = useState<{
    items: RecipeSummary[];
    loading: boolean;
    loadend: boolean;
  }>({ items: [], loading: false, loadend: false });
  const [filters, setFilters] = useState<{
    search?: string;
    backend?: string;
    vendor?: string;
  }>({});
  const [picking, setPicking] = useState<string>();
  const [deploy, setDeploy] = useState<{
    open: boolean;
    initialValues?: Record<string, any>;
  }>({ open: false });

  const fetchRecipes = async (params: typeof filters) => {
    setList((current) => ({ ...current, loading: true }));
    try {
      const result = await queryRecipes({ ...params, page: -1 });
      setList({ items: result.items || [], loading: false, loadend: true });
    } catch {
      setList((current) => ({ ...current, loading: false, loadend: true }));
    }
  };
  // Typing searches once it settles; the selects search at once.
  const searchRef = useRef(_.debounce(fetchRecipes, 300));

  const handleFilterChange = (patch: typeof filters, debounce = false) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (debounce) {
      searchRef.current(next);
    } else {
      fetchRecipes(next);
    }
  };

  useEffect(() => {
    getWorkerOptionList();
    fetchRecipes({});
  }, []);

  const handleApply = ({ rendered, source, clusterId }: RecipeApplied) => {
    const repo = source.huggingface_repo_id || '';
    setPicking(undefined);
    setDeploy({
      open: true,
      initialValues: {
        ...source,
        name: _.toLower(_.split(repo, '/').pop()),
        cluster_id: clusterId,
        backend: rendered.backend,
        backend_version: rendered.backend_version || null,
        backend_parameters: rendered.backend_parameters,
        env: rendered.env,
        categories: rendered.categories?.[0] || null,
        distributed_inference_across_workers:
          rendered.distributed_inference_across_workers,
        meta: { recipe: rendered.recipe }
      }
    });
  };

  const handleCreateModel = async (data: FormData) => {
    try {
      const model = await createModel({ data });
      setDeploy({ open: false });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      setModelsExpandKeys([model.id]);
      navigate('/models/deployments');
    } catch {
      // The request layer reports the error.
    }
  };

  const renderCard = (item: RecipeSummary) => (
    <Col key={item.id} xs={24} md={12} xl={8} xxl={6}>
      <Card
        hoverable
        className={styles.card}
        onClick={() => setPicking(item.id)}
      >
        <Typography.Text strong ellipsis={{ tooltip: item.name }}>
          {item.title}
        </Typography.Text>
        <span className={styles.muted}>
          {[item.provider, item.name].filter(Boolean).join(' · ')}
        </span>
        <Typography.Paragraph
          type="secondary"
          ellipsis={{ rows: 2, tooltip: item.description }}
          style={{ marginBottom: 0 }}
        >
          {item.description}
        </Typography.Paragraph>
        <Flex wrap gap={4}>
          {item.backends.map((name) => (
            <Tag key={name} color="blue">
              {name}
            </Tag>
          ))}
          {item.quantizations.map((name) => (
            <Tag key={name}>{name.toUpperCase()}</Tag>
          ))}
        </Flex>
        <span className={styles.muted}>{item.hardware.join(' / ')}</span>
        <Flex className={styles.footer} justify="space-between" gap={8}>
          <span className={styles.muted}>
            {intl.formatMessage(
              { id: 'models.recipe.list.variants' },
              { count: item.variant_count }
            )}
            {item.model_created_at &&
              ` · ${intl.formatMessage(
                { id: 'models.recipe.list.released' },
                { date: item.model_created_at }
              )}`}
          </span>
          <Space size={8}>
            {_.uniqBy(item.upstream, 'source').map(
              (upstream: RecipeUpstream) => (
                <a
                  key={upstream.source}
                  href={upstream.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.muted}
                  onClick={(e) => e.stopPropagation()}
                >
                  {RecipeSourceLabels[upstream.source] || upstream.source}{' '}
                  <ExportOutlined />
                </a>
              )
            )}
          </Space>
        </Flex>
      </Card>
    </Col>
  );

  return (
    <PageBox>
      <Space className={styles.filters} wrap>
        <Input
          allowClear
          style={{ width: 260 }}
          placeholder={intl.formatMessage({ id: 'models.recipe.list.search' })}
          onChange={(e) =>
            handleFilterChange({ search: e.target.value || undefined }, true)
          }
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder={intl.formatMessage({
            id: 'models.recipe.list.filter.backend'
          })}
          options={BACKENDS.map((value) => ({ label: value, value }))}
          onChange={(backend) => handleFilterChange({ backend })}
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder={intl.formatMessage({
            id: 'models.recipe.list.filter.vendor'
          })}
          options={VENDORS.map((value) => ({ label: value, value }))}
          onChange={(vendor) => handleFilterChange({ vendor })}
        />
      </Space>
      <Spin spinning={list.loading}>
        <Row gutter={[16, 16]}>{list.items.map(renderCard)}</Row>
      </Spin>
      <NoResult
        minHeight="calc(100vh - 300px)"
        loading={list.loading}
        loadend={list.loadend}
        dataSource={list.items}
        image={<IconFont type="icon-layers" />}
        filters={filters}
        noFoundText={intl.formatMessage({ id: 'models.recipe.none' })}
        title={intl.formatMessage({ id: 'models.recipe.none' })}
      ></NoResult>
      {picking && (
        <RecipePicker
          open={!!picking}
          browse={{ recipeId: picking, clusterList }}
          onCancel={() => setPicking(undefined)}
          onApply={handleApply}
        />
      )}
      <DeployModal
        deploymentType="modelFiles"
        title={intl.formatMessage({ id: 'models.button.deploy' })}
        open={deploy.open}
        action={PageAction.CREATE}
        source={modelSourceMap.huggingface_value as SourceType}
        width={600}
        initialValues={deploy.initialValues}
        clusterList={clusterList}
        onCancel={() => setDeploy({ open: false })}
        onOk={handleCreateModel}
      ></DeployModal>
    </PageBox>
  );
};

export default Recipes;
