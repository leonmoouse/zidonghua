const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const appConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  pollInterval: parseNumber(import.meta.env.VITE_POLL_INTERVAL_MS, 1200),
  requestTimeout: parseNumber(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 20000)
};

if (!appConfig.apiBaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('VITE_API_BASE_URL 未配置，将导致请求失败');
}

export const intentOptions = [
  { key: 'troubleshooting', label: '排查修复 / Troubleshooting' },
  { key: 'mythbusting', label: '神话粉碎 / 反常识观点' },
  { key: 'mechanism', label: '机制解释 / 科学原理' },
  { key: 'howto', label: '教程 / How-to' },
  { key: 'conversion', label: '转化文案 / 方案推荐' },
  { key: 'decision', label: '取舍决策 / 方案对比' },
  { key: 'editorial', label: '立场社论 / 观点针砭' },
  { key: 'mobilization', label: '动员类 / 号召行动' }
] as const;
