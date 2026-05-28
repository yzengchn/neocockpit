import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, message, Row, Col, Tag, Table } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleFilled, CalendarOutlined, FireOutlined, EyeOutlined } from '@ant-design/icons';
import { glassCard, gradientHeading } from '@/constants/styles';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { userApi, taskApi } from '@/services/api';
import { ACTION_LABELS, TaskStatus, TaskListItem } from '@/types/task';
import { getStoredSignature } from '@/services/api';
import type { InkSignature } from '@/types/task';
import { statusConfig } from '@/constants/status';

const DIR_ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/* ─── SignatureStroke: raw ink stroke with hover mask ─── */
const SignatureStroke: React.FC<{ signature: InkSignature; size?: number }> = ({
  signature,
  size = 200,
}) => {
  const pts = signature.raw_points;
  const [hovered, setHovered] = useState(false);

  if (!pts || pts.length < 2) return <SignatureGrid signature={signature} size={size} />;

  const pathData = pts
    .map((p, i) => {
      const x = p.x * size;
      const y = p.y * size;
      return i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={size} height={size} style={{ borderRadius: 12, background: 'rgba(14,16,24,0.6)' }}>
        {Array.from({ length: 2 }, (_, i) => {
          const pos = ((i + 1) / 3) * size;
          return [
            <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={size}
              stroke="rgba(129,140,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />,
            <line key={`h-${i}`} x1={0} y1={pos} x2={size} y2={pos}
              stroke="rgba(129,140,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />,
          ];
        }).flat()}
        <path
          d={pathData}
          fill="none"
          stroke="#818cf8"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
        {(() => {
          const s = pts[0];
          return <circle cx={s.x * size} cy={s.y * size} r={5}
            fill="#22c55e" stroke="rgba(34,197,94,0.3)" strokeWidth={2} />;
        })()}
        {(() => {
          const e = pts[pts.length - 1];
          return <circle cx={e.x * size} cy={e.y * size} r={5}
            fill="#ef4444" stroke="rgba(239,68,68,0.3)" strokeWidth={2} />;
        })()}
      </svg>
      {/* Hover mask */}
      {!hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 12,
          background: 'rgba(8,9,13,0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6,
          color: 'var(--c-text-muted)', fontSize: 12,
          transition: 'opacity 0.2s',
        }}>
          <EyeOutlined style={{ fontSize: 16 }} />
          悬停查看笔迹
        </div>
      )}
    </div>
  );
};

/* ─── SignatureGrid: 3×3 grid with traversal path ─── */
const SignatureGrid: React.FC<{ signature: InkSignature; size?: number }> = ({
  signature,
  size = 200,
}) => {
  const gridSize = 3;
  const cellSize = size / gridSize;
  const traversal = signature.grid_traversal;
  const directions = signature.direction_sequence;
  const uniqueCells = useMemo(() => new Set(traversal), [traversal]);

  const cellCenters = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (let i = 0; i < gridSize * gridSize; i++) {
      const col = i % gridSize;
      const row = Math.floor(i / gridSize);
      map.set(i, { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 });
    }
    return map;
  }, [cellSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
      <svg width={size} height={size} style={{ borderRadius: 12, background: 'rgba(14,16,24,0.6)' }}>
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          const filled = uniqueCells.has(i);
          return (
            <rect key={`cell-${i}`}
              x={col * cellSize + 1} y={row * cellSize + 1}
              width={cellSize - 2} height={cellSize - 2} rx={6}
              fill={filled ? 'rgba(129,140,248,0.25)' : 'rgba(99,102,241,0.05)'}
              stroke={filled ? 'rgba(129,140,248,0.35)' : 'rgba(99,102,241,0.1)'}
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: gridSize - 1 }, (_, i) => {
          const pos = (i + 1) * cellSize;
          return [
            <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={size}
              stroke="rgba(129,140,248,0.15)" strokeWidth={1} strokeDasharray="4 4" />,
            <line key={`h-${i}`} x1={0} y1={pos} x2={size} y2={pos}
              stroke="rgba(129,140,248,0.15)" strokeWidth={1} strokeDasharray="4 4" />,
          ];
        }).flat()}
        {traversal.length > 1 && (
          <polyline
            points={traversal.map((cell) => `${cellCenters.get(cell)!.x},${cellCenters.get(cell)!.y}`).join(' ')}
            fill="none" stroke="rgba(129,140,248,0.6)" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {directions.map((dir, i) => {
          if (i >= traversal.length - 1) return null;
          const from = cellCenters.get(traversal[i])!;
          const to = cellCenters.get(traversal[i + 1])!;
          return (
            <text key={`dir-${i}`}
              x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 + 4}
              textAnchor="middle" fill="rgba(167,139,250,0.9)" fontSize={11} fontFamily="monospace"
            >{DIR_ARROWS[dir]}</text>
          );
        })}
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          if (!uniqueCells.has(i)) return null;
          return (
            <text key={`num-${i}`}
              x={col * cellSize + cellSize / 2} y={row * cellSize + cellSize / 2 + 5}
              textAnchor="middle" fill="rgba(129,140,248,0.5)" fontSize={12} fontWeight={700}
            >{i}</text>
          );
        })}
        {traversal.length > 0 && (() => {
          const start = cellCenters.get(traversal[0])!;
          const end = cellCenters.get(traversal[traversal.length - 1])!;
          return [
            <circle key="start" cx={start.x} cy={start.y} r={5}
              fill="#22c55e" stroke="rgba(34,197,94,0.3)" strokeWidth={2} />,
            <circle key="end" cx={end.x} cy={end.y} r={5}
              fill="#ef4444" stroke="rgba(239,68,68,0.3)" strokeWidth={2} />,
          ];
        })()}
      </svg>
      <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>量化路径图</span>
    </div>
  );
};

/* ─── Check-in calendar ─── */
const CheckInCalendar: React.FC<{
  checkedDates: string[];
  todayChecked: boolean;
  streak: number;
  month: string;
  onCheckIn: () => void;
  checking: boolean;
}> = ({ checkedDates, todayChecked, streak, month, onCheckIn, checking }) => {
  const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates]);

  const { daysInMonth, firstDayOffset } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDow = new Date(y, m - 1, 1).getDay();
    const firstDayOffset = firstDow === 0 ? 6 : firstDow - 1;
    return { daysInMonth, firstDayOffset };
  }, [month]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <CalendarOutlined style={{ color: '#6366f1', fontSize: 18 }} />
        <span style={{ color: 'var(--c-text-secondary)', fontWeight: 600, fontSize: 14 }}>签到日历</span>
        <span style={{ color: 'var(--c-text-muted)', fontSize: 12, marginLeft: 'auto' }}>{month}</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 16, padding: '12px 16px',
        borderRadius: 12,
        background: todayChecked ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.06)',
        border: `1px solid ${todayChecked ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <FireOutlined style={{ color: streak > 0 ? '#f59e0b' : 'var(--c-text-muted)', fontSize: 18 }} />
          <span style={{ color: 'var(--c-text-secondary)', fontSize: 13 }}>
            连续签到 <b style={{ color: streak > 0 ? '#f59e0b' : 'var(--c-text-muted)', fontFamily: 'var(--font-mono)' }}>{streak}</b> 天
          </span>
        </div>
        <Button
          type="primary"
          size="small"
          loading={checking}
          disabled={todayChecked}
          onClick={onCheckIn}
          style={{
            borderRadius: 8, fontWeight: 600,
            background: todayChecked ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #6366f1, #06b6d4)',
            border: 'none',
            color: todayChecked ? '#22c55e' : '#fff',
          }}
        >
          {todayChecked ? '✓ 已签到' : '签到 +10💰'}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, padding: '4px 0', color: 'var(--c-text-muted)' }}>{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />;
          const dateStr = `${month}-${String(day).padStart(2, '0')}`;
          const checked = checkedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div key={day} style={{
              padding: '6px 0', borderRadius: 8,
              fontSize: 13, fontWeight: isToday ? 700 : 400,
              color: checked ? '#22c55e' : isToday ? '#6366f1' : 'var(--c-text-muted)',
              background: checked ? 'rgba(34,197,94,0.1)' : isToday ? 'rgba(99,102,241,0.1)' : 'transparent',
            }}>
              {day}
              {checked && <CheckCircleFilled style={{ position: 'absolute', top: 2, right: 2, fontSize: 8, color: '#22c55e' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── ProfilePage ─── */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const user = useMemo(() => {
    const raw = localStorage.getItem('aigc_user_info');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);

  const signature = useMemo(() => getStoredSignature(), []);

  const { data: creditsData } = useQuery({
    queryKey: ['user-credits'],
    queryFn: userApi.getCredits,
  });
  const credits = creditsData?.credits;
  const creditPrices = creditsData?.prices;

  const { data: checkInData, refetch: refetchCheckIn } = useQuery({
    queryKey: ['checkIn'],
    queryFn: userApi.getCheckInStatus,
  });

  const { data: creditHistoryData, fetchNextPage: fetchNextCreditPage, hasNextPage: hasMoreCredits } = useInfiniteQuery({
    queryKey: ['creditHistory'],
    queryFn: ({ pageParam = 0 }) => userApi.getCreditHistory(pageParam, 8),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
  const creditHistory = creditHistoryData?.pages.flatMap(p => p.items) ?? [];

  const { data: myTasksData, fetchNextPage: fetchNextTaskPage, hasNextPage: hasMoreTasks } = useInfiniteQuery({
    queryKey: ['myTasks'],
    queryFn: ({ pageParam = 0 }) => taskApi.listMyTasks(pageParam, 6),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
  const myTasks = myTasksData?.pages.flatMap(p => p.items) ?? [];

  const handleScrollLoad = useCallback((e: React.UIEvent<HTMLDivElement>, fetchNext: () => void, hasMore: boolean | undefined) => {
    const el = e.currentTarget;
    if (!hasMore) return;
    const threshold = 40;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
      fetchNext();
    }
  }, []);

  const handleCheckIn = useCallback(async () => {
    setChecking(true);
    try {
      await userApi.checkIn();
      message.success('签到成功，+10积分！');
      refetchCheckIn();
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      queryClient.invalidateQueries({ queryKey: ['creditHistory'] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '签到失败');
    } finally {
      setChecking(false);
    }
  }, [refetchCheckIn, queryClient]);

  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--c-text-muted)' }}>
        请先登录后查看个人中心
        <Button type="link" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}
          style={{ color: 'var(--c-text-muted)' }} />
        <h2 style={gradientHeading}>个人中心</h2>
      </div>

      <Row gutter={[24, 24]}>
        {/* ── Left column ── */}
        <Col xs={24} lg={16}>
          <Card style={glassCard} styles={{ body: { padding: 24 } }}>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
              }}>
                <UserOutlined />
              </div>
              <div>
                <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 16 }}>{user.nick_name}</div>
                {user.created_at && (
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 12, marginTop: 2 }}>
                    注册时间：{new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            </div>

            {/* Credits */}
            <div style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(234,179,8,0.06)',
              border: '1px solid rgba(234,179,8,0.12)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ color: 'var(--c-text-secondary)', fontSize: 12, fontWeight: 600 }}>积分余额</span>
              <span style={{
                fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: credits != null && credits > 0 ? '#eab308' : '#ef4444',
              }}>
                {credits ?? '...'}
              </span>
            </div>

            {/* Price breakdown */}
            {creditPrices && creditPrices.length > 0 && (
              <div style={{
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 6,
              }}>
                {creditPrices.map((p: { action: string; price: number; label: string }) => {
                  const canAfford = (credits ?? 0) >= p.price;
                  return (
                    <div key={p.action} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 'var(--radius-xs)',
                      border: `1px solid ${canAfford ? 'rgba(99,102,241,0.14)' : 'rgba(239,68,68,0.14)'}`,
                      background: canAfford ? 'rgba(99,102,241,0.04)' : 'rgba(239,68,68,0.04)',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, flex: 1,
                        color: canAfford ? 'var(--c-text-secondary)' : '#ef4444',
                      }}>{p.label}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: p.price === 0 ? '#22c55e' : canAfford ? '#eab308' : '#ef4444',
                      }}>
                        {p.price === 0 ? '免费' : `${p.price}💰`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Signature display */}
            {signature ? (
              <div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: 11, letterSpacing: '0.5px', marginBottom: 10 }}>
                  签名图案
                </div>
                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SignatureStroke signature={signature} size={180} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SignatureGrid signature={signature} size={180} />
                </div>
                </div>
                <div style={{
                  color: 'var(--c-text-muted)', fontSize: 12, marginTop: 10,
                  padding: '6px 10px', background: 'rgba(234,179,8,0.06)',
                  borderRadius: 8, border: '1px solid rgba(234,179,8,0.12)',
                }}>
                  💡 左侧原始笔迹（悬停查看），右侧量化路径图。绿=起笔，红=收笔。
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--c-text-muted)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
                签名数据未保存
              </div>
            )}
          </Card>

          {/* My tasks list */}
          <Card style={{ ...glassCard, marginTop: 16 }} styles={{ body: { padding: 24 } }}>
            <div style={{ color: 'var(--c-text-muted)', fontSize: 11, letterSpacing: '0.5px', marginBottom: 12 }}>
              我创建的任务
            </div>
            {myTasks.length > 0 ? (
              <div
                style={{ maxHeight: 340, overflowY: 'auto' }}
                onScroll={(e) => handleScrollLoad(e, fetchNextTaskPage, hasMoreTasks)}
              >
              <Table
                dataSource={myTasks}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: '用户输入', dataIndex: 'user_input', key: 'user_input',
                    ellipsis: true,
                    render: (text: string) => (
                      <span style={{ color: 'var(--c-text)', fontSize: 12, maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {text}
                      </span>
                    ),
                  },
                  {
                    title: '状态', dataIndex: 'status', key: 'status', width: 90,
                    render: (status: TaskStatus) => {
                      const cfg = statusConfig[status];
                      return cfg ? (
                        <Tag style={{
                          borderRadius: 6, fontSize: 11, fontWeight: 600,
                          color: cfg.color,
                          background: `${cfg.color}18`,
                          border: `1px solid ${cfg.color}30`,
                        }}>
                          {cfg.text}
                        </Tag>
                      ) : <span>{status}</span>;
                    },
                  },
                  {
                    title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 140,
                    render: (date: string) => (
                      <span style={{ color: 'var(--c-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {date ? new Date(date).toLocaleString('zh-CN') : '-'}
                      </span>
                    ),
                  },
                  {
                    title: '', key: 'action', width: 70,
                    render: (_: unknown, record: TaskListItem) => (
                      <Button type="link" size="small"
                        style={{ color: 'var(--c-accent)', padding: 0, fontSize: 12 }}
                        onClick={() => navigate(`/tasks/${record.id}`)}
                      >
                        查看
                      </Button>
                    ),
                  },
                ]}
              />
              {hasMoreTasks && (
                <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--c-text-muted)', fontSize: 12 }}>
                  向下滚动加载更多...
                </div>
              )}
              </div>
            ) : (
              <div style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                暂无创建的任务
              </div>
            )}
          </Card>
        </Col>

        {/* ── Right column ── */}
        <Col xs={24} lg={8}>
          {/* Check-in calendar */}
          {checkInData && (
            <Card style={glassCard} styles={{ body: { padding: 24 } }}>
              <CheckInCalendar
                checkedDates={checkInData.checked_dates}
                todayChecked={checkInData.today_checked}
                streak={checkInData.streak}
                month={checkInData.month}
                onCheckIn={handleCheckIn}
                checking={checking}
              />
            </Card>
          )}

          {/* Credit history */}
          <Card style={{ ...glassCard, marginTop: 16 }} styles={{ body: { padding: 24 } }}>
            <div style={{ color: 'var(--c-text-muted)', fontSize: 11, letterSpacing: '0.5px', marginBottom: 12 }}>
              积分使用记录
            </div>
            {creditHistory.length > 0 ? (
              <div
                style={{ maxHeight: 440, overflowY: 'auto' }}
                onScroll={(e) => handleScrollLoad(e, fetchNextCreditPage, hasMoreCredits)}
              >
              <Table
                dataSource={creditHistory}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: '操作', dataIndex: 'action', key: 'action', width: 100,
                    render: (action: string) => ACTION_LABELS[action] || action,
                  },
                  {
                    title: '积分变动', dataIndex: 'credits_cost', key: 'credits_cost', width: 80,
                    render: (cost: number) => cost < 0
                      ? <span style={{ color: '#22c55e', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>+{Math.abs(cost)}</span>
                      : <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>-{cost}</span>,
                  },

                  {
                    title: '时间', dataIndex: 'created_at', key: 'created_at',
                    render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
                  },
                ]}
              />
              {hasMoreCredits && (
                <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--c-text-muted)', fontSize: 12 }}>
                  向下滚动加载更多...
                </div>
              )}
              </div>
            ) : (
              <div style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                暂无积分使用记录
              </div>
            )}
          </Card>

        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
