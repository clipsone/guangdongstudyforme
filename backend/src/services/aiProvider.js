// AI Provider 层：统一封装模型调用
// 支持智谱 GLM（OpenAI 兼容接口）与 Mock 回退。
// 配置见 .env：AI_PROVIDER=glm|mock、ZHIPU_API_KEY、AI_MODEL
const ZHIPU_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const currentProvider = () => process.env.AI_PROVIDER || 'mock';
const apiKey = () => process.env.ZHIPU_API_KEY || '';
export const currentModel = () => process.env.AI_MODEL || 'glm-4.5-flash';

// 是否已配置真实模型（未配置时各接口自动回退 Mock）
export const isConfigured = () => currentProvider() !== 'mock' && !!apiKey();

// 从模型文本中提取 JSON（智谱 json 模式一般直接返回 JSON，这里做兜底）
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
// opts: { temperature, json } —— json 时要求模型输出 JSON 对象
export async function chat(messages, { temperature = 0.7, json = false, maxTokens = 1024 } = {}) {
  if (!isConfigured()) {
    throw new Error('AI 未配置（AI_PROVIDER=mock 或缺少 ZHIPU_API_KEY）');
  }

  const body = {
    model: currentModel(),
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  if (json) body.response_format = { type: 'json_object' };

  const resp = await fetch(ZHIPU_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
    // 50 秒超时：Vercel 函数上限 60s，留出响应余量
    signal: AbortSignal.timeout(50000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`智谱 API ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('智谱 API 返回为空');
  return String(content);
}
