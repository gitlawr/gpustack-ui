export default {
  'models.button.deploy': '部署模型',
  'models.title': '模型',
  'models.title.edit': '编辑模型',
  'models.table.models': '模型',
  'models.table.name': '模型名称',
  'models.form.source': '来源',
  'models.form.repoid': '仓库 ID',
  'models.form.repoid.desc': '只支持 .gguf 格式',
  'models.form.filename': '文件名',
  'models.form.replicas': '副本数',
  'models.form.selector': '选择器',
  'models.form.configurations': '配置',
  'models.form.s3address': 'S3 地址',
  'models.form.partialoffload.tips':
    '在启用 CPU 卸载后，GPUStack 优先将尽可能多的层加载到 GPU 上，以最大化性能。如果 GPU 资源有限，则某些层将被卸载到 CPU 上，只有在没有 GPU 可用时，才会完全使用 CPU 进行推理。',
  'models.form.distribution.tips':
    '允许在单个 GPU 或 worker 资源不足时，将部分计算卸载到一个或多个远程 woker。',
  'models.openinplayground': '在 Playground 中打开',
  'models.instances': '实例',
  'models.table.replicas.edit': '调整副本数',
  'model.form.ollama.model': 'Ollama 模型',
  'model.form.ollamaholder': '请选择或输入模型名称',
  'model.deploy.sort': '排序',
  'model.deploy.search.placeholder': '从 {source} 搜索模型',
  'model.form.ollamatips':
    '提示：以下为 GPUStack 预设的 Ollama 模型，请选择你想要的模型或者直接在右侧表单 【{name}】 输入框中输入你要部署的模型。',
  'models.sort.name': '名称',
  'models.sort.size': '大小',
  'models.sort.likes': '点赞量',
  'models.sort.trending': '趋势',
  'models.sort.downloads': '下载量',
  'models.sort.updated': '更新时间',
  'models.search.result': '{count} 个结果',
  'models.data.card': '模型简介',
  'models.available.files': '可用文件',
  'models.viewin.hf': '在 Hugging Face 中查看',
  'models.viewin.modelscope': '在 ModelScope 中查看',
  'models.architecture': '架构',
  'models.search.noresult': '未找到相关模型',
  'models.search.nofiles': '无可用文件',
  'models.search.networkerror': '网络连接异常!',
  'models.search.hfvisit': '请确保您可以访问',
  'models.search.unsupport': '暂不支持该模型，部署后可能无法使用',
  'models.form.scheduletype': '调度方式',
  'models.form.scheduletype.auto': '自动',
  'models.form.scheduletype.manual': '手动',
  'models.form.scheduletype.auto.tips':
    '自动根据当前资源情况部署模型实例到合适的 GPU/Worker。',
  'models.form.scheduletype.manual.tips':
    '手动调度可指定模型实例部署的 GPU/Worker。',
  'models.form.manual.schedule': '手动调度',
  'models.table.gpuindex': 'GPU 序号',
  'models.table.backend': '后端',
  'models.table.acrossworker': '跨 worker 推理',
  'models.table.cpuoffload': 'CPU 卸载',
  'models.table.layers': '层',
  'models.form.backend': '后端',
  'models.form.backend_parameters': '后端参数',
  'models.search.gguf.tips': '1. GGUF 模型后端为 llama-box(llama.cpp)',
  'models.search.vllm.tips': '2. 非 GGUF 模型后端为 vLLM',
  'models.form.ollamalink': '在 Ollama Library 中查找',
  'models.form.backend_parameters.llamabox.placeholder':
    '例如，--ctx-size=8192',
  'models.form.backend_parameters.vllm.placeholder':
    '例如，--max-model-len=8192'
};
