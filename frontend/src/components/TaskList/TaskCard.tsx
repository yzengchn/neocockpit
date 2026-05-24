import React, { useState } from 'react';
import { Card, Tag, Typography, Space } from 'antd';
import { UserOutlined, BulbOutlined, HeartFilled } from '@ant-design/icons';
import { Task, TaskType } from '@/types/task';
import { statusConfig } from '@/constants/status';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

interface TaskCardProps {
  task: Task;
  onClick: (taskId: string) => void;
  showLikes?: boolean;
}

export const TaskCard = React.memo<TaskCardProps>(({ task, onClick, showLikes = false }) => {
  const cfg = statusConfig[task.status];
  const [hover, setHover] = useState(false);
  const isDigitalHuman = task.task_type === TaskType.DIGITAL_HUMAN;
  const isDIY = task.task_type === TaskType.DIY;
  const coverImageUrl = isDigitalHuman ? task.avatar_image_url : task.background_image_url || task.preview_image_url;
  const hasImage = Boolean(coverImageUrl);

  return (
    <Card
      hoverable
      onClick={() => onClick(task.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: hover ? '1px solid var(--c-border-active)' : '1px solid var(--c-border)',
        boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transition: 'border-color 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), transform 0.35s var(--ease-out)',
        cursor: 'pointer',
        background: 'var(--c-bg-card-solid)',
        transform: hover ? 'translateY(-6px)' : 'translateY(0)',
      }}
      styles={{ body: { padding: 0 } }}
      cover={
        <div style={{ height: 190, overflow: 'hidden', background: cfg.bg, position: 'relative' }}>
          {hasImage ? (
            <img
              alt="preview"
              src={coverImageUrl}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 0.5s var(--ease-out)',
                transform: hover ? 'scale(1.08)' : 'scale(1)',
              }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDigitalHuman ? (
                <UserOutlined style={{
                  fontSize: 36, color: cfg.color, opacity: 0.6,
                  filter: `drop-shadow(0 0 12px ${cfg.color}50)`,
                }} />
              ) : isDIY ? (
                <BulbOutlined style={{
                  fontSize: 36, color: '#f59e0b', opacity: 0.6,
                  filter: `drop-shadow(0 0 12px ${cfg.color}50)`,
                }} />
              ) : (
                React.cloneElement(cfg.icon as React.ReactElement, {
                  style: { fontSize: 36, color: cfg.color, opacity: 0.6, filter: `drop-shadow(0 0 12px ${cfg.color}50)` },
                })
              )}
            </div>
          )}

          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(to top, rgba(8,9,13,0.85) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* task type badge */}
          {isDigitalHuman && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
              color: '#a78bfa', padding: '4px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
              letterSpacing: '0.3px',
              backdropFilter: 'blur(8px)',
            }}>
              <UserOutlined /> 数字人
            </div>
          )}
          {isDIY && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', padding: '4px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
              letterSpacing: '0.3px',
              backdropFilter: 'blur(8px)',
            }}>
              <BulbOutlined /> DIY生图
            </div>
          )}

          {/* status badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: `${cfg.color}18`, border: `1px solid ${cfg.color}35`,
            color: cfg.color, padding: '4px 14px', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '0.3px',
            boxShadow: `0 0 12px ${cfg.color}15`,
            backdropFilter: 'blur(8px)',
          }}>
            {React.cloneElement(cfg.icon as React.ReactElement, { style: { fontSize: 12 } })}
            {' '}{cfg.text}
          </div>
        </div>
      }
    >
      <div style={{ padding: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Text ellipsis style={{
            fontSize: 14, lineHeight: 1.5, fontWeight: 600,
            color: 'var(--c-text)', minHeight: 42, display: 'block',
          }}>
            {task.user_input}
          </Text>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 10, borderTop: '1px solid var(--c-border)',
          }}>
            {task.ai_provider && (
              <Tag className="neon-tag" style={{
                background: isDigitalHuman
                  ? 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)'
                  : isDIY
                  ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                  : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-accent) 100%)',
                color: '#fff',
              }}>
                {task.ai_provider.toUpperCase()}
              </Tag>
            )}
            {showLikes && (task.likes ?? 0) > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#ef4444',
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: 'var(--font-mono)',
              }}>
                <HeartFilled style={{ fontSize: 12 }} />
                {task.likes}
              </span>
            )}
            <Text style={{ fontSize: 12, color: 'var(--c-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {dayjs(task.created_at).fromNow()}
            </Text>
          </div>
        </Space>
      </div>
    </Card>
  );
});

