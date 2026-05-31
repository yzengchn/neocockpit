export enum TaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  GENERATING_BG = 'generating_bg',
  GENERATING_ICONS = 'generating_icons',
  GENERATING_AVATAR = 'generating_avatar',
  GENERATING_TEXTURES = 'generating_textures',
  SLICING = 'slicing',
  COMPOSITING = 'compositing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const ACTIVE_TASK_STATUSES = new Set<TaskStatus>([
  TaskStatus.QUEUED,
  TaskStatus.PROCESSING,
  TaskStatus.GENERATING_BG,
  TaskStatus.GENERATING_ICONS,
  TaskStatus.GENERATING_AVATAR,
  TaskStatus.GENERATING_TEXTURES,
  TaskStatus.SLICING,
  TaskStatus.COMPOSITING,
]);

export const isActiveTaskStatus = (status?: TaskStatus): boolean =>
  status !== undefined && ACTIVE_TASK_STATUSES.has(status);

export enum TaskType {
  WALLPAPER = 'wallpaper',
  THEME = 'theme',
  DIGITAL_HUMAN = 'digital_human',
  DIY = 'diy',
}

export enum AIProvider {
  OPENAI = 'openai',
  DOUBAO = 'doubao',
  DASHSCOPE = 'dashscope',
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error';
  message: string;
}

export interface BuildTreeNode {
  path: string;
  type: 'image' | 'folder' | 'mesh' | 'file';
  size?: [number, number];
  position?: [number, number];
}

export interface BuildTree {
  [key: string]: BuildTreeNode | BuildTree;
}

export interface TaskListItem {
  id: string;
  user_input: string;
  task_type: TaskType;
  ai_provider?: string;
  author?: string;
  icon_descriptions?: string[];
  status: TaskStatus;
  background_image_url?: string;
  preview_image_url?: string;
  avatar_image_url?: string;
  likes: number;
  views: number;
  created_at: string;
  updated_at?: string;
}

export interface TaskActionResult {
  id: string;
  task_type: TaskType;
  status: TaskStatus;
}

export interface Task extends TaskListItem {
  background_prompt?: string;
  icon_prompt?: string;
  normal_detail?: string;
  view_prompts?: {
    character_anchor?: string;
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  icon_image_url?: string;
  avatar_atlas_url?: string;
  view_image_urls?: {
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  texture_albedo_url?: string;
  texture_normal_url?: string;
  logs: LogEntry[];
  output_path?: string;
}

export interface TaskCreate {
  user_input: string;
  provider?: string;
  task_type?: TaskType;
  icon_descriptions?: string[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  author: string;
  parent_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_author?: string | null;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  review_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string | null;
}

export interface TaskCommentListResponse {
  items: TaskComment[];
  total: number;
}

export interface TaskCommentCreate {
  content: string;
  parent_id?: string | null;
}

export interface QueueStatus {
  is_processing: boolean;
  processing_task_ids: string[];
  processing_count: number;
  queued_count: number;
  max_concurrent_tasks?: number;
  max_concurrent_tasks_per_provider?: number;
  providers?: Record<string, {
    processing_count: number;
    queued_count: number;
    processing_task_ids: string[];
  }>;
  channels?: Record<string, {
    provider: string;
    name: string;
    running_count: number;
    max_concurrent: number;
    processing_task_ids: string[];
  }>;
  channels_overview?: Array<{
    id: string;
    provider: string;
    name: string;
    max_concurrent: number;
    weight: number;
    running_count: number;
  }>;
}

export interface TaskStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  by_type: Partial<Record<TaskType, number>>;
}

// Presence / heartbeat types

export interface PresenceRegisterRequest {
  session_id: string;
  path?: string;
}

export interface PresenceHeartbeatRequest {
  session_id: string;
  path?: string;
}

export interface PresenceUnregisterRequest {
  session_id: string;
}

export interface OnlineResponse {
  total: number;
  paths: Record<string, number>;
}

// Icon description config types

export interface IconDescription {
  id: string;
  name: string;
  directory_name: string;
  description: string;
  enabled: boolean;
  sort_order: number;
}

export interface IconDescriptionCreate {
  name: string;
  directory_name: string;
  description: string;
  enabled?: boolean;
  sort_order?: number;
}

export interface IconDescriptionUpdate {
  name?: string;
  directory_name?: string;
  description?: string;
  enabled?: boolean;
  sort_order?: number;
}
// AI Provider config types

export interface AIProviderConfig {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
  sort_order: number;
}

export interface AIProviderConfigCreate {
  name: string;
  value: string;
  enabled?: boolean;
  sort_order?: number;
}

export interface AIProviderConfigUpdate {
  name?: string;
  value?: string;
  enabled?: boolean;
  sort_order?: number;
}

// User / Pen-auth types

export interface AnchorPoint {
  x: number;  // [0,1] 标准化坐标
  y: number;
}

export interface InkSignature {
  grid_traversal: number[];        // 有序格子序列（3×3 网格，0-8，保留遍历顺序）
  grid_traversal_coarse: number[]; // 兼容保留，实际为空
  direction_sequence: number[];    // 方向编码序列（0-7），长度 = grid_traversal.length - 1
  unique_cells: number;            // 穿过的唯一格子数
  start?: AnchorPoint;             // 签名起点锚点
  end?: AnchorPoint;               // 签名终点锚点
  raw_points?: { x: number; y: number }[]; // 原始标准化笔迹点序列 [0,1]，用于还原真实笔迹展示
}

export interface UserInfo {
  id: string;
  nick_name: string;
  credits: number;
  created_at: string;
}

export type NotificationLevel = 'info' | 'warning' | 'error';

export interface UserNotification {
  id: string;
  title: string;
  content: string;
  link_url?: string | null;
  level: NotificationLevel;
  is_read: boolean;
  created_at: string | null;
}

export interface NotificationListResponse {
  items: UserNotification[];
  unread_count: number;
}

export interface UserAdmin {
  id: string;
  nick_name: string;
  sig_hash: string;
  sig_hash_dir: string | null;
  is_disabled: boolean;
  task_count: number;
  likes_received: number;
  credits: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserAdminUpdate {
  nick_name?: string;
  is_disabled?: boolean;
}

export interface SignatureView {
  sig_hash: string;
  sig_hash_dir: string | null;
}

export interface DownloadLog {
  id: string;
  user_id: string;
  task_id: string;
  credits_cost: number;
  created_at: string | null;
}

export interface DownloadStats {
  total_downloads: number;
  total_credits_spent: number;
  unique_users: number;
  unique_tasks: number;
}


// Credit system types

export interface CreditPrice {
  id: string;
  action: string;
  price: number;
  label: string;
  sort_order: number;
  updated_at: string | null;
}

export interface CreditPriceUpdate {
  price?: number;
  label?: string;
  sort_order?: number;
}
 
 export interface CreditPriceCreate {
   action: string;
   price: number;
   label: string;
   sort_order?: number;
 }

export const ACTION_LABELS: Record<string, string> = {
  wallpaper: '车载壁纸',
  theme: '车载主题',
  digital_human: '数字人形象',
  diy: 'DIY生图',
  download: '打包下载',
  recharge: '充值',
  check_in: '每日签到',
  liked: '被点赞奖励',
};

export interface CreditLogItem {
  id: string;
  user_id: string;
  target_id: string | null;
  action: string;
  credits_cost: number;
  credits_after: number;
  created_at: string | null;
}

export interface CreditStats {
  total_records: number;
  total_credits_spent: number;
  unique_users: number;
  unique_tasks: number;
}

export interface AuthTokenResponse {
  token: string;
  user: UserInfo;
}
