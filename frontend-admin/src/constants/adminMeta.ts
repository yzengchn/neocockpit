import {
  AIProvider,
  TaskStatus,
  TaskType,
  type NotificationLevel,
} from '@/types/task';

export const PROVIDER_CONFIG: Record<string, { color: string; text: string }> = {
  [AIProvider.OPENAI]: { color: '#6366f1', text: 'OpenAI' },
  [AIProvider.DOUBAO]: { color: '#d946ef', text: '豆包' },
  [AIProvider.DASHSCOPE]: { color: '#06b6d4', text: '阿里云' },
};

export const TASK_TYPE_CONFIG: Record<TaskType, { color: string; text: string }> = {
  [TaskType.WALLPAPER]: { color: 'green', text: '壁纸' },
  [TaskType.THEME]: { color: 'blue', text: '主题' },
  [TaskType.DIGITAL_HUMAN]: { color: 'purple', text: '数字人' },
  [TaskType.DIY]: { color: 'orange', text: 'DIY生图' },
};

export const TASK_TYPE_OPTIONS = [
  { label: '壁纸', value: TaskType.WALLPAPER },
  { label: '车载主题', value: TaskType.THEME },
  { label: '数字人', value: TaskType.DIGITAL_HUMAN },
  { label: 'DIY生图', value: TaskType.DIY },
] as const;

export const TASK_STATUS_FILTER_OPTIONS = [
  { label: '成功', value: TaskStatus.COMPLETED },
  { label: '失败', value: TaskStatus.FAILED },
  { label: '排队中', value: TaskStatus.QUEUED },
  { label: '处理中', value: TaskStatus.PROCESSING },
  { label: '生成背景', value: TaskStatus.GENERATING_BG },
  { label: '生成图标', value: TaskStatus.GENERATING_ICONS },
  { label: '生成肖像', value: TaskStatus.GENERATING_AVATAR },
  { label: '生成纹理', value: TaskStatus.GENERATING_TEXTURES },
  { label: '切片', value: TaskStatus.SLICING },
  { label: '合成', value: TaskStatus.COMPOSITING },
] as const;

export const ACTION_COLORS: Record<string, string> = {
  wallpaper: '#22c55e',
  theme: '#6366f1',
  digital_human: '#a78bfa',
  diy: '#f59e0b',
  download: '#06b6d4',
  recharge: '#22c55e',
  check_in: '#eab308',
  liked: '#ef4444',
};

export const NOTIFICATION_LEVEL_OPTIONS: Array<{
  value: NotificationLevel;
  label: string;
  color: string;
}> = [
  { value: 'info', label: '普通', color: 'green' },
  { value: 'warning', label: '提醒', color: 'gold' },
  { value: 'error', label: '重要', color: 'red' },
];

export const NOTIFICATION_LEVEL_META = Object.fromEntries(
  NOTIFICATION_LEVEL_OPTIONS.map((item) => [item.value, item]),
) as Record<NotificationLevel, (typeof NOTIFICATION_LEVEL_OPTIONS)[number]>;
