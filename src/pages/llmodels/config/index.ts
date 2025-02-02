import { StatusMaps } from '@/config';
import { EditOutlined } from '@ant-design/icons';

export const ollamaModelOptions = [
  {
    label: 'llama3.1',
    value: 'llama3.1',
    name: 'llama3.1',
    id: 'llama3.1',
    tags: ['8B', '70B', '405B']
  },
  {
    label: 'llama3',
    value: 'llama3',
    name: 'llama3',
    tags: ['8B', '70B'],
    id: 'llama3'
  },
  {
    label: 'gemma2',
    value: 'gemma2',
    name: 'gemma2',
    tags: ['9B', '27B'],
    id: 'gemma2'
  },
  {
    label: 'mistral-nemo',
    value: 'mistral-nemo',
    name: 'mistral-nemo',
    tags: ['12B'],
    id: 'mistral-nemo'
  },
  {
    label: 'mistral-large',
    value: 'mistral-large',
    name: 'mistral-large',
    tags: ['123B'],
    id: 'mistral-large'
  },
  {
    label: 'mistral',
    value: 'mistral',
    name: 'mistral',
    tags: ['7B'],
    id: 'mistral'
  },
  // {
  //   label: 'llava',
  //   value: 'llava',
  //   name: 'llava',
  //   tags: ['7B', '13B', '34B'],
  //   id: 'llava'
  // },
  {
    label: 'qwen2',
    value: 'qwen2',
    name: 'qwen2',
    tags: ['0.5B', '1.5B', '7B', '72B'],
    id: 'qwen2'
  },
  {
    label: 'phi3.5',
    value: 'phi3.5',
    name: 'phi3.5',
    tags: ['3B'],
    id: 'phi3.5'
  },
  {
    label: 'codellama',
    value: 'codellama',
    name: 'codellama',
    tags: ['7B', '13B', '34B', '70B'],
    id: 'codellama'
  },
  {
    label: 'deepseek-coder-v2',
    value: 'deepseek-coder-v2',
    name: 'deepseek-coder-v2',
    tags: ['16B', '236B'],
    id: 'deepseek-coder-v2'
  }
];

export const modelSourceMap: Record<string, string> = {
  huggingface: 'Hugging Face',
  ollama_library: 'Ollama Library',
  s3: 'S3',
  huggingface_value: 'huggingface',
  ollama_library_value: 'ollama_library',
  s3_value: 's3'
};

export const InstanceStatusMap = {
  Initializing: 'initializing',
  Pending: 'pending',
  Running: 'running',
  Scheduled: 'scheduled',
  Error: 'error',
  Downloading: 'downloading',
  Unknown: 'unknown',
  Analyzing: 'analyzing'
};

export const InstanceStatusMapValue = {
  [InstanceStatusMap.Initializing]: 'Initializing',
  [InstanceStatusMap.Pending]: 'Pending',
  [InstanceStatusMap.Running]: 'Running',
  [InstanceStatusMap.Scheduled]: 'Scheduled',
  [InstanceStatusMap.Error]: 'Error',
  [InstanceStatusMap.Downloading]: 'Downloading',
  [InstanceStatusMap.Unknown]: 'Unknown',
  [InstanceStatusMap.Analyzing]: 'Analyzing'
};

export const status: any = {
  [InstanceStatusMap.Running]: StatusMaps.success,
  [InstanceStatusMap.Pending]: StatusMaps.transitioning,
  [InstanceStatusMap.Initializing]: StatusMaps.transitioning,
  [InstanceStatusMap.Scheduled]: StatusMaps.transitioning,
  [InstanceStatusMap.Error]: StatusMaps.error,
  [InstanceStatusMap.Downloading]: StatusMaps.transitioning,
  [InstanceStatusMap.Unknown]: StatusMaps.inactive,
  [InstanceStatusMap.Analyzing]: StatusMaps.transitioning
};

export const ActionList = [
  {
    label: 'common.button.edit',
    key: 'edit',
    icon: EditOutlined
  },
  {
    label: 'models.openinplayground',
    key: 'chat',
    icon: EditOutlined
  },
  {
    label: 'common.button.delete',
    key: 'delete',
    icon: EditOutlined
  }
];

export const ModelSortType = {
  trendingScore: 'trendingScore',
  likes: 'likes',
  downloads: 'downloads',
  lastModified: 'lastModified'
};

export const placementStrategyOptions = [
  {
    label: 'Spread',
    value: 'spread'
  },
  {
    label: 'Binpack',
    value: 'binpack'
  }
];
