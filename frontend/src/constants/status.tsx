import { TaskStatus } from '@/types/task';
import React from 'react';
import {
  ClockCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

export interface StatusConfig {
  color: string;
  text: string;
  icon: React.ReactNode;
  iconBg: string;
  progress: number;
  bg?: string;
}

export const statusConfig: Record<TaskStatus, StatusConfig> = {
  [TaskStatus.QUEUED]: {
    color: '#a1a1aa',
    text: '排队中',
    icon: <ClockCircleOutlined />,
    iconBg: 'linear-gradient(135deg,#27272a 0%,#3f3f46 100%)',
    progress: 0,
    bg: 'linear-gradient(135deg,#18181b 0%,#27272a 100%)',
  },
  [TaskStatus.PROCESSING]: {
    color: '#6366f1',
    text: '生成提示词',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)',
    progress: 15,
    bg: 'linear-gradient(135deg,#0f0d2e 0%,#1e1b4b 100%)',
  },
  [TaskStatus.GENERATING_BG]: {
    color: '#8b5cf6',
    text: '生成背景图',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#2e1065 0%,#4c1d95 100%)',
    progress: 35,
    bg: 'linear-gradient(135deg,#1a0533 0%,#2e1065 100%)',
  },
  [TaskStatus.GENERATING_ICONS]: {
    color: '#d946ef',
    text: '生成图标',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#4a044e 0%,#701a75 100%)',
    progress: 55,
    bg: 'linear-gradient(135deg,#2d0433 0%,#4a044e 100%)',
  },
  [TaskStatus.GENERATING_AVATAR]: {
    color: '#a78bfa',
    text: '生成肖像',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#2e1065 0%,#4c1d95 100%)',
    progress: 30,
    bg: 'linear-gradient(135deg,#1e1044 0%,#3b1f6e 100%)',
  },
  [TaskStatus.GENERATING_TEXTURES]: {
    color: '#f0abfc',
    text: '生成纹理',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#4a044e 0%,#701a75 100%)',
    progress: 60,
    bg: 'linear-gradient(135deg,#2d1a44 0%,#4c1d6e 100%)',
  },
  [TaskStatus.SLICING]: {
    color: '#06b6d4',
    text: '切片中',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#083344 0%,#155e75 100%)',
    progress: 75,
    bg: 'linear-gradient(135deg,#04262e 0%,#083344 100%)',
  },
  [TaskStatus.COMPOSITING]: {
    color: '#f59e0b',
    text: '合成预览',
    icon: <LoadingOutlined />,
    iconBg: 'linear-gradient(135deg,#451a03 0%,#78350f 100%)',
    progress: 90,
    bg: 'linear-gradient(135deg,#2a1000 0%,#451a03 100%)',
  },
  [TaskStatus.COMPLETED]: {
    color: '#22c55e',
    text: '完成',
    icon: <CheckCircleOutlined />,
    iconBg: 'linear-gradient(135deg,#052e16 0%,#14532d 100%)',
    progress: 100,
    bg: 'linear-gradient(135deg,#032010 0%,#052e16 100%)',
  },
  [TaskStatus.FAILED]: {
    color: '#ef4444',
    text: '失败',
    icon: <CloseCircleOutlined />,
    iconBg: 'linear-gradient(135deg,#450a0a 0%,#7f1d1d 100%)',
    progress: 0,
    bg: 'linear-gradient(135deg,#2a0505 0%,#450a0a 100%)',
  },
};
