export default {
  'playground.system.tips': '在这里输入系统消息',
  'playground.title': '试验场',
  'playground.system': '系统',
  'playground.systemMessage': '系统消息',
  'playground.user': '用户',
  'playground.assistant': '小助手',
  'playground.newMessage': '新消息',
  'playground.viewcode': '查看代码',
  'playground.model': '模型',
  'playground.parameters': '参数',
  'playground.viewcode.info':
    '你可以使用以下代码将当前的提示和设置集成到你的应用程序中。',
  'playground.completion': '补全',
  'playground.prompt': '提示',
  'playground.timeToFirstToken': '输出首个 token 时间',
  'playground.timePerOutputToken': '生成每个 token 时间',
  'playground.tokenusage': 'Token 使用量',
  'models.openinplayground': '打开试验场',
  'playground.tokenoutput': '输出',
  'playground.params.temperature.tips':
    '控制随机性：降低温度会导致更少的随机完成。当温度接近零时，模型将变得确定性和重复性。',
  'playground.params.maxtokens.tips':
    '生成的最大 token 数。输入的 token 和生成的 token 的总长度受模型上下文长度的限制。',
  'playground.params.topp.tips':
    '通过核心采样控制多样性：0.5 表示考虑所有基于概率权重选项的一半。',
  'playground.params.seed.tips':
    '如果指定，我们的系统将尽最大努力进行确定性采样，以便使用相同 seed 和参数的重复请求应返回相同的结果。',
  'playground.params.stop.tips':
    '停止序列是一个预定义或用户指定的文本字符串，当这些序列出现时，它会提示 AI 停止生成后续的 token。',
  'playground.viewcode.tips':
    '{here} 查看 API 密钥。您应该使用环境变量或密钥管理工具将您的密钥暴露给您的应用程序。',
  'playground.viewcode.here': '这里',
  'playground.delete.img': '删除图片',
  'playground.img.upload': '上传图片',
  'playground.img.upload.success': '上传成功',
  'playground.img.upload.error': '上传失败',
  'playground.toolbar.clearmsg': '清空消息',
  'playground.toolbar.autoplay': '自动播放',
  'playground.toolbar.prompts': '提示词',
  'playground.toolbar.compare2Model': '2 模型对比',
  'playground.toolbar.compare3Model': '3 模型对比',
  'playground.toolbar.compare4Model': '4 模型对比',
  'playground.toolbar.compare6Model': '6 模型对比',
  'playground.input.holder': '按 <kbd>/</kbd> 开始输入',
  'playground.input.keyword.holder': '按 <kbd>/</kbd> 输入你的查询',
  'playground.input.prompt.holder': '按 <kbd>/</kbd> 输入提示',
  'playground.input.text.holder': '按 <kbd>/</kbd> 输入文本',
  'playground.compare.apply': '应用',
  'playground.compare.applytoall': '应用到所有模型',
  'playground.model.noavailable': '无可用模型',
  'playground.model.noavailable.tips':
    '请先部署模型，且不是 Embedding Only 的模型',
  'playground.params.counts': '数量',
  'playground.params.quality': '质量',
  'playground.params.style': '风格',
  'playground.params.size': '尺寸',
  'playground.params.voice': '声音',
  'playground.params.format': '格式',
  'playground.params.speed': '播放速度',
  'playground.params.language': '语言',
  'playground.params.width': '宽度',
  'playground.params.height': '高度',
  'playground.params.custom': '自定义',
  'playground.params.standard': '标准',
  'playground.params.hd': '高清',
  'playground.params.style.vivid': '生动',
  'playground.params.style.natural': '自然',
  'playground.params.empty.tips': '生成的图片将出现在这里',
  'playground.embedding.documents': '文档',
  'playground.embedding.addtext': '添加文本',
  'playground.embedding.inputyourtext': '输入你的文本',
  'playground.embedding.output': '输出',
  'playground.embedding.chart': '图表',
  'playground.rerank.query': '查询',
  'playground.rerank.rank': '排序',
  'playground.rerank.score': '分数',
  'playground.rerank.query.holder': '输入查询',
  'playground.image.prompt': '输入提示',
  'playground.audio.texttospeech': '文本转语音',
  'playground.audio.speechtotext': '语音转文本',
  'playground.audio.texttospeech.tips': '生成的语音将出现在这里',
  'playground.audio.speechtotext.tips': '上传音频文件或开始录音',
  'playground.audio.enablemic': '请允许浏览器访问麦克风，以便开始录音',
  'playground.audio.enablemic.doc': '参考文档',
  'playground.audio.startrecord': '开始录音',
  'playground.audio.stoprecord': '停止录音',
  'playground.audio.generating.tips': '生成的文本将出现在这里',
  'playground.audio.uploadfile.tips': '请上传音频文件，支持格式：{formats}',
  'playground.audio.button.generate': '生成文本',
  'playground.input.multiplePaste': '批量输入',
  'playground.input.multiplePaste.tips':
    '启用后，粘贴的多行文本将自动按换行符分割为表单中的单独条目。',
  'playground.multiple.on': '开启',
  'playground.multiple.off': '关闭',
  'playground.image.params.sampler': '采样方法',
  'playground.image.params.schedule': '调度',
  'playground.image.params.samplerSteps': '迭代步数',
  'playground.image.params.seed': '种子',
  'playground.image.params.randomseed': '随机种子',
  'playground.image.params.negativePrompt': '负向提示',
  'playground.image.params.cfgScale': '提示词引导系数',
  'playground.image.params.custom': '高级',
  'playground.image.params.custom.tips': 'API 风格',
  'playground.image.params.openai': 'OpenAI 兼容',
  'playground.embedding.handler.tips': '高度调节',
  'playground.embedding.pcatips1':
    'PCA（主成分分析）用于降低嵌入向量的维数，使它们更容易可视化。',
  'playground.embedding.pcatips2':
    '在图表中，点之间的距离表示相应文档之间的相似度。点越近意味着相似度越高。',
  'playground.audio.button.play': '播放',
  'playground.audio.button.download': '下载',
  'playground.audio.button.stop': '停止',
  'playground.image.prompt.random': '随机提示词',
  'playground.audio.button.fast': '快进',
  'playground.audio.button.slow': '慢放',
  'playground.audio.generating': '生成中',
  'playgorund.audio.voice.error':
    '声音无法使用。该模型可能仍在初始化。请稍候后刷新。'
};
