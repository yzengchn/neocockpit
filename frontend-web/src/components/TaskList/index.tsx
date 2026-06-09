import React, { useEffect, useRef, useState } from 'react';
import { Row, Col, Spin, Empty } from 'antd';
import { FireFilled, HeartFilled } from '@ant-design/icons';
import { TaskCard } from './TaskCard';
import { TaskListItem, TaskType } from '@/types/task';




interface TaskListProps {
  tasks: TaskListItem[];
  loading: boolean;
  activeFilter: TaskFilter;
  counts: Record<TaskFilter, number>;
  hasMore: boolean;
  loadingMore: boolean;
  onFilterChange: (filter: TaskFilter) => void;
  onLoadMore: () => void;
}



export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading,
  activeFilter,
  counts,
  hasMore,
  loadingMore,
  onFilterChange,
  onLoadMore,
}) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [scrollArmed, setScrollArmed] = useState(false);

  const filterOptions: Array<{
    key: TaskFilter;
    label: string;
    count: number;
    accent: string;
  }> = [
    { key: TaskType.WALLPAPER, label: '壁纸', count: counts[TaskType.WALLPAPER], accent: '#34d399' },
    { key: TaskType.THEME, label: '车载主题', count: counts[TaskType.THEME], accent: '#22d3ee' },
    { key: TaskType.DIGITAL_HUMAN, label: '数字人', count: counts[TaskType.DIGITAL_HUMAN], accent: '#a78bfa' },
    { key: TaskType.DIY, label: 'DIY生图', count: counts[TaskType.DIY], accent: '#f59e0b' },
    { key: 'all', label: '任务', count: counts.all, accent: '#6366f1' },
  ];

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (scrollArmed && entry.isIntersecting && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, scrollArmed]);

  useEffect(() => {
    setScrollArmed(false);
    const armLoadMore = () => setScrollArmed(true);
    window.addEventListener('scroll', armLoadMore, { passive: true, once: true });
    return () => window.removeEventListener('scroll', armLoadMore);
  }, [activeFilter]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="task-list-section">
      <div className="task-list-toolbar" style={{
        marginBottom: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div className="task-list-rank-tabs" style={{ display: 'flex', gap: 0 }}>
          <button
            type="button"
            onClick={() => onFilterChange('all' as TaskFilter)}
            style={{
              color: activeFilter === 'all' ? '#fff' : 'var(--c-text-secondary)',
              fontSize: 14,
              fontWeight: 700,
              padding: '4px 16px',
              minHeight: 28,
              borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
              background: activeFilter === 'all' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)',
              border: activeFilter === 'all' ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--c-border)',
              borderRight: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0,
              whiteSpace: 'nowrap',
            }}
          >所有任务</button>
          <button
            type="button"
            onClick={() => onFilterChange('likeRanking' as TaskFilter)}
            style={{
              color: activeFilter === 'likeRanking' ? '#fff' : 'var(--c-text-secondary)',
              fontSize: 14,
              fontWeight: 700,
              padding: '4px 16px',
              minHeight: 28,
              borderRadius: 0,
              background: activeFilter === 'likeRanking' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.06)',
              border: activeFilter === 'likeRanking' ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--c-border)',
              borderRight: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <HeartFilled
              style={{
                marginRight: 6,
                color: '#ef4444',
              }}
            />
            Top100
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('viewRanking' as TaskFilter)}
            style={{
              color: activeFilter === 'viewRanking' ? '#fff' : 'var(--c-text-secondary)',
              fontSize: 14,
              fontWeight: 700,
              padding: '4px 16px',
              minHeight: 28,
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              background: activeFilter === 'viewRanking' ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.06)',
              border: activeFilter === 'viewRanking' ? '1px solid rgba(6,182,212,0.5)' : '1px solid var(--c-border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <FireFilled
              style={{
                marginRight: 6,
                color: '#f97316',
              }}
            />
            Hot100
          </button>
        </div>
        <div className="task-list-type-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          {filterOptions.map((option) => {
            const active = activeFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onFilterChange(option.key)}
                style={{
                  color: active ? '#fff' : 'var(--c-text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 12px',
                  minHeight: 28,
                  borderRadius: 'var(--radius-sm)',
                  background: active ? `${option.accent}22` : 'rgba(99,102,241,0.06)',
                  border: active ? `1px solid ${option.accent}88` : '1px solid var(--c-border)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 0,
                  whiteSpace: 'nowrap',
                }}
                aria-pressed={active}
              >
                <span style={{ color: active ? option.accent : 'var(--c-text)', marginRight: 4 }}>
                  {option.count}
                </span>
                个{option.label}
              </button>
            );
          })}
        </div>
      </div>
      {tasks.length === 0 ? (
        <Empty
          description={
            <span style={{ color: 'var(--c-text-muted)', fontSize: 14, letterSpacing: 0 }}>
              {counts.all === 0 ? '暂无任务，快来创建第一个' : '当前类型暂无任务'}
            </span>
          }
          style={{ padding: '80px 0' }}
        />
      ) : (
        <>
          <Row className="task-list-grid" gutter={[16, 16]}>
            {tasks.map((task, i) => (
              <Col key={task.task_id} xs={24} sm={12} md={8} lg={6} className="task-list-grid__item"
                style={{ animation: `fadeInUp 0.4s var(--ease-out) ${Math.min(i, 11) * 0.04}s both` }}>
                <TaskCard task={task} showLikes={activeFilter === "likeRanking"} />
              </Col>
            ))}
          </Row>
          {hasMore && (
            <div
              ref={loadMoreRef}
              style={{ textAlign: 'center', padding: '32px 0', minHeight: 60 }}
            >
              {loadingMore && <Spin />}
            </div>
          )}
          {!hasMore && tasks.length > 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--c-text-muted)', fontSize: 12 }}>
              — 已加载全部 —
            </div>
          )}
        </>
      )}
    </div>
  );
};
export type TaskFilter = 'all' | 'likeRanking' | 'viewRanking' | TaskType.WALLPAPER | TaskType.THEME | TaskType.DIGITAL_HUMAN | TaskType.DIY;
