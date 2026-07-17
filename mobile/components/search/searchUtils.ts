export const STATION_ALIASES: Record<string, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenzhen: '深圳',
  hangzhou: '杭州',
  nanjing: '南京',
  chengdu: '成都',
  wuhan: '武汉',
  xian: '西安',
  "xi'an": '西安',
};

export const formatDateForApi = (date: Date): string => {
  // Use local date to avoid UTC day-shift from toISOString().
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildStationCandidates = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const noCountry = trimmed
    .replace(/,\s*china$/i, '')
    .replace(/\s+china$/i, '')
    .trim();

  const key = noCountry.toLowerCase();
  const alias = STATION_ALIASES[key];

  return Array.from(new Set([trimmed, noCountry, alias].filter(Boolean) as string[]));
};

export const pickLowestPrice = (prices?: Record<string, string>): number | null => {
  if (!prices) return null;
  const values = Object.values(prices)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (values.length === 0) return null;
  return Math.min(...values);
};

export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};
