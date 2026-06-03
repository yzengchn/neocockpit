import React from 'react';
import { Button, Empty } from 'antd';
import { CheckOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { NotificationPanelProps } from './types';
import { notificationAccent, formatNotificationTime } from './utils';

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onOpenLink,
}) => (
  <div style={{ width: 420, maxWidth: 'calc(100vw - 32px)' }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingBottom: 10,
      marginBottom: 10,
      borderBottom: '1px solid var(--c-border)',
    }}>
      <div>
        <div style={{ color: 'var(--c-text)', fontWeight: 800, fontSize: 14 }}>通知</div>
        <div style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>
          {unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读'}
        </div>
      </div>
      <Button
        size="small"
        type="text"
        icon={<CheckOutlined />}
        disabled={unreadCount === 0 || loading}
        onClick={onMarkAllRead}
      >
        全部已读
      </Button>
    </div>

    {items.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
    ) : (
      <div style={{ display: 'grid', gap: 10, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {items.map((item) => {
          const accent = notificationAccent[item.level] ?? notificationAccent.info;
          return (
            <div
              key={item.id}
              onClick={() => { if (!item.is_read) onMarkRead(item); }}
              onKeyDown={(event) => {
                if (item.is_read) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onMarkRead(item);
                }
              }}
              role="button"
              tabIndex={item.is_read ? -1 : 0}
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: item.is_read ? 'default' : 'pointer',
                border: `1px solid ${item.is_read ? 'var(--c-border)' : accent}`,
                background: item.is_read ? 'rgba(15, 17, 25, 0.72)' : 'rgba(17, 24, 39, 0.92)',
                borderRadius: 8,
                padding: '10px 12px',
                boxShadow: item.is_read ? 'none' : `0 0 18px ${accent}22`,
                outline: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accent,
                  opacity: item.is_read ? 0.35 : 1,
                  flex: '0 0 auto',
                }} />
                <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 13, flex: 1 }}>
                  {item.title}
                </span>
                <span style={{ color: 'var(--c-text-muted)', fontSize: 11 }}>
                  {formatNotificationTime(item.created_at)}
                </span>
              </div>
              <div style={{
                color: item.is_read ? 'var(--c-text-muted)' : 'var(--c-text-secondary)',
                fontSize: 12,
                lineHeight: 1.6,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 6,
              }}>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}>
                  {item.content}
                </span>
                {item.link_url && (
                  <button
                    type="button"
                    aria-label="直达任务详情"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenLink(item);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      flex: '0 0 auto',
                      gap: 3,
                      padding: '1px 6px',
                      minHeight: 22,
                      borderRadius: 6,
                      border: `1px solid ${accent}66`,
                      background: `${accent}14`,
                      color: accent,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    To
                    <ArrowRightOutlined style={{ fontSize: 10 }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
