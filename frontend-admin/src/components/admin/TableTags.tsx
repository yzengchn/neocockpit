import React from 'react';
import { Tag } from 'antd';
import {
  ACTION_COLORS,
  PROVIDER_CONFIG,
  TASK_TYPE_CONFIG,
} from '@/constants/adminMeta';
import { statusConfig } from '@/constants/status';
import { ACTION_LABELS, TaskStatus, TaskType } from '@/types/task';

interface ToneTagProps {
  color: string;
  children: React.ReactNode;
}

const ToneTag: React.FC<ToneTagProps> = ({ color, children }) => (
  <Tag
    style={{
      borderRadius: 'var(--radius-xs)',
      background: `${color}18`,
      color,
      borderColor: `${color}35`,
      fontWeight: 600,
    }}
  >
    {children}
  </Tag>
);

export const EnabledTag: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <Tag color={enabled ? 'green' : 'default'} style={{ borderRadius: 'var(--radius-xs)', fontSize: 12 }}>
    {enabled ? '启用' : '禁用'}
  </Tag>
);

export const ProviderTag: React.FC<{ provider?: string | null }> = ({ provider }) => {
  if (!provider) {
    return <span style={{ color: 'var(--c-text-muted)' }}>-</span>;
  }

  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    return <span style={{ color: 'var(--c-text-muted)' }}>{provider}</span>;
  }

  return <ToneTag color={config.color}>{config.text}</ToneTag>;
};

export const TaskTypeTag: React.FC<{ type: TaskType | string }> = ({ type }) => {
  const config = TASK_TYPE_CONFIG[type as TaskType];
  if (!config) {
    return <span>{type}</span>;
  }

  return <Tag color={config.color} style={{ borderRadius: 'var(--radius-xs)' }}>{config.text}</Tag>;
};

export const TaskStatusTag: React.FC<{ status: TaskStatus | string }> = ({ status }) => {
  const config = statusConfig[status as TaskStatus];
  if (!config) {
    return <span>{status}</span>;
  }

  return <ToneTag color={config.color}>{config.text}</ToneTag>;
};

export const ActionTag: React.FC<{ action: string }> = ({ action }) => {
  const color = ACTION_COLORS[action] || '#6366f1';
  return (
    <Tag
      style={{
        fontSize: 11,
        fontWeight: 700,
        background: `${color}18`,
        color,
        borderColor: `${color}35`,
      }}
    >
      {ACTION_LABELS[action] || action}
    </Tag>
  );
};

export const CreditDeltaTag: React.FC<{ value: number }> = ({ value }) => {
  const isIncome = value < 0;
  const color = value === 0 ? '#a1a1aa' : isIncome ? '#22c55e' : '#ef4444';
  const label = value === 0 ? '0' : isIncome ? `+${Math.abs(value)}` : `-${value}`;

  return (
    <Tag
      style={{
        borderRadius: 'var(--radius-xs)',
        fontWeight: 600,
        background: `${color}1f`,
        color,
        borderColor: `${color}4d`,
      }}
    >
      {label}
    </Tag>
  );
};
