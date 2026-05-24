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

export interface Task {
  id: string;
  user_input: string;
  task_type: TaskType;
  background_image_url?: string;
  background_prompt?: string;
  icon_prompt?: string;
  normal_detail?: string;
  icon_image_url?: string;
  preview_image_url?: string;
  avatar_image_url?: string;
  avatar_atlas_url?: string;
  texture_albedo_url?: string;
  texture_normal_url?: string;
  ai_provider?: string;
  icon_descriptions?: string[];
  status: TaskStatus;
  logs: LogEntry[];
  output_path?: string;
  likes: number;
  created_at: string;
  updated_at?: string;
}

export interface TaskCreate {
  user_input: string;
  provider?: string;
  task_type?: TaskType;
  icon_descriptions?: string[];
}

export interface QueueStatus {
  is_processing: boolean;
  processing_task_ids: string[];
  processing_count: number;
  queued_count: number;
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
