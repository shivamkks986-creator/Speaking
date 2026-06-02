export const todayKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const yesterdayKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const randomId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

export const pickRandom = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getDayIndex = (): number => {
  // Monday = 0 ... Sunday = 6
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
};

export const truncate = (text: string, n: number): string =>
  text.length <= n ? text : `${text.slice(0, n - 1)}…`;
