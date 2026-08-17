// AI Provider 层：统一封装模型调用
// 支持智谱 GLM 与火山引擎豆包 Doubao（均为 OpenAI 兼容接口）与 Mock 回退。
// 配置见 .env：
//   AI_PROVIDER=glm|doubao|mock
//   ZHIPU_API_KEY + AI_MODEL（glm 时）
//   ARK_API_KEY + DOUBAO_MODEL（doubao 时，模型可用推理接入点 ID 如 ep-xxx）
const ZHIPU_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export const currentProvider = () => process.env.AI_PROVIDER || 'mock';

export const currentModel = () => {
  if (currentProvider() === 'doubao') return process.env.DOUBAO_MODEL || 'doubao-1-5-lite-32k-250115';
  return process.env.AI_MODEL || 'glm-4.5-flash';
};

// 快模型（出题/真题解析等高频短任务）：doubao 用其轻量模型，glm 用 flash
export const fastModel = () => {
  if (currentProvider() === 'doubao') return process.env.DOUBAO_MODEL || 'doubao-1-5-lite-32k-250115';
  return 'glm-4-flash';
};

// 是否已配置真实模型（未配置时各接口自动回退 Mock）
export const isConfigured = () => {
  const p = currentProvider();
  if (p === 'mock') return false;
  if (p === 'doubao') return !!process.env.ARK_API_KEY;
  return !!process.env.ZHIPU_API_KEY;
};

// 从模型文本中提取 JSON（json 模式一般直接返回 JSON，这里做兜底）
export function safeJson(text) {
  if (!text) return null;
  const t = String(text).trim();
  try {
    return JSON.parse(t);
  } catch {
    // 尝试提取第一个 { ... } 块
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// 从对象中取出数组：兼容 {"questions":[...]} / {"result":[...]} / {"data":[...]} 等包裹
export function extractArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    for (const key of ['questions', 'result', 'data', 'items', 'list']) {
      if (Array.isArray(obj[key])) return obj[key];
    }
    const vals = Object.values(obj).filter((v) => Array.isArray(v));
    if (vals.length === 1) return vals[0];
  }
  return null;
}

// 统一对话入口：messages=[{role,content}]
// opts: { temperature, json, maxTokens, model } —— json 时要求模型输出 JSON；model 缺省用全局配置
export async function chat(messages, { temperature = 0.7, json = false, maxTokens = 1024, model } = {}) {
  if (!isConfigured()) {
    throw new Error('AI 未配置（AI_PROVIDER=mock 或缺少对应 API Key）');
  }

  const p = currentProvider();
  const endpoint = p === 'doubao' ? DOUBAO_ENDPOINT : ZHIPU_ENDPOINT;
  const apiKey = p === 'doubao' ? process.env.ARK_API_KEY : process.env.ZHIPU_API_KEY;
  const name = p === 'doubao' ? '豆包' : '智谱';

  const body = {
    model: model || currentModel(),
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  // 豆包与智谱均支持 json_object；但 glm-4-flash 在 json 模式下偶发返回非 JSON 裸文本，
  // 出题接口已改用提示词约束 + 宽松解析（json:false），此处仅对明确要求 json 的调用生效
  if (json) body.response_format = { type: 'json_object' };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    // 50 秒超时：Vercel 函数上限 60s，留出响应余量
    signal: AbortSignal.timeout(50000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${name} API ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${name} API 返回为空`);
  return String(content);
}
