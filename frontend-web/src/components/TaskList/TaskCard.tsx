import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Tag, Typography, Space } from 'antd';
import { UserOutlined, BulbOutlined, HeartFilled, PictureOutlined, EyeOutlined, AppstoreOutlined } from '@ant-design/icons';
import { TaskListItem, TaskType } from '@/types/task';
import { toResourceUrl } from '@/utils/url';
import { statusConfig } from '@/constants/status';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

interface TaskCardProps {
  task: TaskListItem;
  showLikes?: boolean;
}

export const TaskCard = React.memo<TaskCardProps>(({ task, showLikes = false }) => {
  const cfg = statusConfig[task.status];
  const [hover, setHover] = useState(false);
  const isDigitalHuman = task.task_type === TaskType.DIGITAL_HUMAN;
  const isDIY = task.task_type === TaskType.DIY;
  const isWallpaper = task.task_type === TaskType.WALLPAPER;
  const isTheme = task.task_type === TaskType.THEME;
  const coverImageUrl = toResourceUrl(
    isDigitalHuman ? (task.avatar_image_url || '') : (task.background_image_url || task.preview_image_url || ''),
  );
  const hasImage = Boolean(coverImageUrl);
  const taskHref = `/tasks/${task.task_id}`;

  return (
    <Link
      className="task-card-link"
      to={taskHref}
      aria-label={`查看任务详情：${task.user_input}`}
      style={{
        display: 'block',
        height: '100%',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
    <Card
      className="task-card"
      hoverable
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: hover ? '1px solid var(--c-border-active)' : '1px solid var(--c-border)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        background: 'var(--c-bg-card-solid)',
      }}
      styles={{ body: { padding: 0 } }}
      cover={
        <div className="task-card__cover" style={{ height: 190, overflow: 'hidden', background: cfg.bg, position: 'relative' }}>
          {hasImage ? (
            <img
              alt="preview"
              src={coverImageUrl}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDigitalHuman ? (
                <UserOutlined style={{
                  fontSize: 36, color: cfg.color, opacity: 0.6,
                  filter: `drop-shadow(0 0 12px ${cfg.color}50)`,
                }} />
              ) : isWallpaper ? (
                <PictureOutlined style={{
                  fontSize: 36, color: '#34d399', opacity: 0.6,
                  filter: `drop-shadow(0 0 12px ${cfg.color}50)`,
                }} />
              ) : isTheme ? (
                <AppstoreOutlined style={{
                  fontSize: 36, color: '#06b6d4', opacity: 0.6,
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

          {/* status badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`,
            color: cfg.color, padding: '4px 14px', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '0.3px',
            boxShadow: `0 0 12px ${cfg.color}15`,
          }}>
            {React.cloneElement(cfg.icon as React.ReactElement, { style: { fontSize: 12 } })}
            {' '}{cfg.text}
          </div>
        </div>
      }
    >
      <div className="task-card__body" style={{ padding: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Text ellipsis style={{
            fontSize: 14, lineHeight: 1.5, fontWeight: 600,
            color: 'var(--c-text)', minHeight: 42, display: 'block',
          }}>
            {task.user_input}
          </Text>
          <div className="task-card__meta" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 10, borderTop: '1px solid var(--c-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {isDigitalHuman && (
                <Tag className="neon-tag" style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  <UserOutlined style={{ fontSize: 10 }} /> 数字人
                </Tag>
              )}
              {isTheme && (
                <Tag className="neon-tag" style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  <AppstoreOutlined style={{ fontSize: 10 }} /> 主题
                </Tag>
              )}
              {isDIY && (
                <Tag className="neon-tag" style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  <BulbOutlined style={{ fontSize: 10 }} /> DIY生图
                </Tag>
              )}
              {isWallpaper && (
                <Tag className="neon-tag" style={{
                  background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  <PictureOutlined style={{ fontSize: 10 }} /> 壁纸
                </Tag>
              )}
              {task.ai_provider && (
                <Tag className="neon-tag" style={{
                  background: task.ai_provider.toLowerCase() === 'openai'
                    ? 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)'
                    : task.ai_provider.toLowerCase() === 'doubao'
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : task.ai_provider.toLowerCase() === 'dashscope'
                    ? 'linear-gradient(135deg, #ff6a00 0%, #ee5a00 100%)'
                    : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-accent) 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  {task.ai_provider.toUpperCase()}
                </Tag>
              )}
            </div>
            <div className="task-card__metrics" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginLeft: 'auto', flexShrink: 0,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: 'var(--font-mono)',
              }}>
                <EyeOutlined style={{ fontSize: 12 }} />
                {task.views ?? 0}
              </span>
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
          </div>
        </Space>
      </div>
    </Card>
    </Link>
  );
});
