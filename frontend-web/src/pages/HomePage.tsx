import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Form, Input, Checkbox, message, Card, Row, Col, Tooltip, Segmented, Popover,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SyncOutlined,
  TeamOutlined, ThunderboltOutlined, UserOutlined, BulbOutlined,
  LogoutOutlined,
  PictureOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { TaskFilter, TaskList } from '@/components/TaskList';
import { ProviderField } from '@/components/ProviderField';
import { taskApi, userApi, presenceApi, iconDescriptionApi, aiProviderApi, setUserAuth, clearUserAuth } from '@/services/api';
import AuthModal from '@/components/AuthModal';
import { usePresence } from '@/hooks/usePresence';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import type { UserInfo, InkSignature } from '@/types/task';
import {
  TaskType, isActiveTaskStatus, TaskCreate,
} from '@/types/task';
import { glassCard, statHeading } from '@/constants/styles';

const { TextArea } = Input;

const POLL = { ACTIVE: 5_000, IDLE: 30_000, ONLINE: 30_000, DEEP_IDLE: false as const };
const TASK_PAGE_SIZE = 12;

/* ── Stat chip ──────────────────────────────────── */
const StatChip: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
}> = ({ icon, value, label, accent }) => (
  <div className="stat-chip" style={{ '--accent': accent } as React.CSSProperties}>
    <div className="stat-chip__glow" />
    <div className="stat-chip__body">
      <span className="stat-chip__icon">{icon}</span>
      <span className="stat-chip__value">{value}</span>
    </div>
    <span className="stat-chip__label">{label}</span>
  </div>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [themeForm] = Form.useForm();
  const [avatarForm] = Form.useForm();
  const [diyForm] = Form.useForm();
  const [wallpaperForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('wallpaper');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const queryClient = useQueryClient();
  const [authVersion, setAuthVersion] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(() => !localStorage.getItem('aigc_user_token'));

  /* ── Presence heartbeat (user-scoped) ── */
  usePresence('/');
  const { isIdle } = useIdleDetector();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(() => {
    const raw = localStorage.getItem('aigc_user_info');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  /* ── Verify user token on mount ── */
  useEffect(() => {
    const token = localStorage.getItem('aigc_user_token');
    if (!token) return;

    userApi.verify(token)
      .then((user) => {
        setCurrentUser(user);
        setAuthModalOpen(false);
      })
      .catch(() => {
        // Token invalid or expired, clear auth
        clearUserAuth();
        setCurrentUser(null);
        setAuthModalOpen(true);
      });
  }, []);

  /* ── Auth handlers ── */
  const handleUserLogin = useCallback((token: string, user: Record<string, unknown>, signature?: InkSignature) => {
    setUserAuth(token, user as unknown as UserInfo, signature);
    setCurrentUser(user as unknown as UserInfo);
    setAuthModalOpen(false);
    // Force re-render so toResourceUrl() picks up new token — no network refetch needed
    setAuthVersion((v) => v + 1);
  }, [queryClient]);




  const handleLogout = useCallback(() => {
    clearUserAuth();
    setCurrentUser(null);
    setAuthModalOpen(true);
    setAuthVersion((v) => v + 1);
    queryClient.invalidateQueries();
  }, [queryClient]);

  /* ── Data queries ── */
  const {
    data: taskPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['tasks', taskFilter],
    queryFn: ({ pageParam }) => {
      if (taskFilter === 'popular') {
        return taskApi.listPopularTasks(100);
      }
      return taskApi.listTasks(
        pageParam,
        TASK_PAGE_SIZE,
        taskFilter === 'all' ? undefined : taskFilter,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (taskFilter === 'popular') return undefined;
      return lastPage.length === TASK_PAGE_SIZE ? pages.length * TASK_PAGE_SIZE : undefined;
    },
    refetchOnMount: 'always',
    refetchInterval: isIdle ? POLL.DEEP_IDLE : (q) =>
      q.state.data?.pages.some((page) => page.some((t) => isActiveTaskStatus(t.status)))
        ? POLL.ACTIVE
        : POLL.IDLE,
    refetchIntervalInBackground: false,
  });

  const tasks = useMemo(() => taskPages?.pages.flat() ?? [], [taskPages]);

  const { data: taskStats, refetch: refetchTaskStats } = useQuery({
    queryKey: ['taskStats'],
    queryFn: () => taskApi.getTaskStats(),
    refetchOnMount: 'always',
    refetchInterval: isIdle ? POLL.DEEP_IDLE : (tasks.some((t) => isActiveTaskStatus(t.status)) ? POLL.ACTIVE : POLL.IDLE),
    refetchIntervalInBackground: false,
  });

  const { data: queueStatus } = useQuery({
    queryKey: ['queueStatus'],
    queryFn: () => taskApi.getQueueStatus(),
    refetchInterval: isIdle ? POLL.DEEP_IDLE : (q) => {
      const s = q.state.data;
      return s && (s.processing_count > 0 || s.queued_count > 0) ? POLL.ACTIVE : POLL.IDLE;
    },
    refetchIntervalInBackground: false,
  });

  const { data: onlineData } = useQuery({
    queryKey: ['onlineCount'],
    queryFn: () => presenceApi.getOnline('/'),
    refetchInterval: isIdle ? POLL.DEEP_IDLE : POLL.ONLINE,
    refetchIntervalInBackground: false,
  });

  const { data: iconDescList = [] } = useQuery({
    queryKey: ['iconDescriptionsEnabled'],
    queryFn: () => iconDescriptionApi.list(true),
  });

  const { data: aiProviderList = [] } = useQuery({
    queryKey: ['aiProvidersEnabled'],
    queryFn: () => aiProviderApi.list(true),
    staleTime: 0,
  });

  const { data: creditPrices } = useQuery({
    queryKey: ['credit-prices'],
    queryFn: () => userApi.getCreditPrices(),
    staleTime: 60_000,
  });

  /* ── Set default provider on load ── */
  useEffect(() => {
    if (aiProviderList.length === 0) return;
    const defaultValue = aiProviderList[0].value;
    if (!themeForm.getFieldValue('provider')) themeForm.setFieldValue('provider', defaultValue);
    if (!avatarForm.getFieldValue('provider')) avatarForm.setFieldValue('provider', defaultValue);
    if (!diyForm.getFieldValue('provider')) diyForm.setFieldValue('provider', defaultValue);
    if (!wallpaperForm.getFieldValue('provider')) wallpaperForm.setFieldValue('provider', defaultValue);
  }, [aiProviderList, themeForm, avatarForm, diyForm, wallpaperForm]);

  /* ── Derived data ── */
  const statistics = useMemo(() => ({
    total: taskStats?.total ?? 0,
    completed: taskStats?.completed ?? 0,
    processing: taskStats?.processing ?? 0,
    failed: taskStats?.failed ?? 0,
  }), [taskStats]);

  const taskTypeCounts = useMemo(() => ({
    all: taskStats?.total ?? 0,
    popular: 0,
    [TaskType.WALLPAPER]: taskStats?.by_type?.[TaskType.WALLPAPER] ?? 0,
    [TaskType.THEME]: taskStats?.by_type?.[TaskType.THEME] ?? 0,
    [TaskType.DIGITAL_HUMAN]: taskStats?.by_type?.[TaskType.DIGITAL_HUMAN] ?? 0,
    [TaskType.DIY]: taskStats?.by_type?.[TaskType.DIY] ?? 0,
  }), [taskStats]);

  /* ── Formatters ── */
  const resetFormPreserveProvider = (form: ReturnType<typeof Form.useForm>[0]) => {
    const provider = form.getFieldValue('provider');
    form.resetFields();
    if (aiProviderList.length > 0) {
      form.setFieldValue('provider', provider ?? aiProviderList[0].value);
    }
  };

  /* ── Handlers ── */
  const handleCreateThemeTask = async (values: TaskCreate) => {
    setSubmitting(true);
    try {
      await taskApi.createTask({
        user_input: values.user_input,
        provider: values.provider,
        task_type: TaskType.THEME,
        icon_descriptions: values.icon_descriptions ?? [],
      });
      const tp = creditPrices?.find(c => c.action === 'theme');
      message.success('主题任务创建成功！正在生成中...' + (tp && tp.price > 0 ? '（消耗' + tp.price + '积分）' : ''));
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      resetFormPreserveProvider(themeForm);
      refetch();
      refetchTaskStats();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402) {
        message.error(detail || '积分不足');
      } else {
        message.error('任务创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAvatarTask = async (values: TaskCreate) => {
    setSubmitting(true);
    try {
      await taskApi.createTask({
        user_input: values.user_input,
        provider: values.provider,
        task_type: TaskType.DIGITAL_HUMAN,
      });
      const dp = creditPrices?.find(c => c.action === 'digital_human');
      message.success('数字人任务创建成功！正在生成中...' + (dp && dp.price > 0 ? '（消耗' + dp.price + '积分）' : ''));
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      resetFormPreserveProvider(avatarForm);
      refetch();
      refetchTaskStats();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402) {
        message.error(detail || '积分不足');
      } else {
        message.error('任务创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDIYTask = async (values: TaskCreate) => {
    setSubmitting(true);
    try {
      await taskApi.createTask({
        user_input: values.user_input,
        provider: values.provider,
        task_type: TaskType.DIY,
      });
      const dyp = creditPrices?.find(c => c.action === 'diy');
      message.success('DIY生图任务创建成功！正在生成中...' + (dyp && dyp.price > 0 ? '（消耗' + dyp.price + '积分）' : ''));
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      resetFormPreserveProvider(diyForm);
      refetch();
      refetchTaskStats();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402) {
        message.error(detail || '积分不足');
      } else {
        message.error('任务创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWallpaperTask = async (values: TaskCreate) => {
    setSubmitting(true);
    try {
      await taskApi.createTask({
        user_input: values.user_input,
        provider: values.provider,
        task_type: TaskType.WALLPAPER,
      });
      const wp = creditPrices?.find(c => c.action === 'wallpaper');
      message.success('壁纸任务创建成功！正在生成中...' + (wp && wp.price > 0 ? '（消耗' + wp.price + '积分）' : ''));
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      resetFormPreserveProvider(wallpaperForm);
      refetch();
      refetchTaskStats();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402) {
        message.error(detail || '积分不足');
      } else {
        message.error('任务创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskClick = useCallback((taskId: string) => {
    navigate(`/tasks/${taskId}`);
  }, [navigate]);

  const handleLoadMoreTasks = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);


  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <Row gutter={[24, 24]}>
        {/* ── Create task ── */}
        <Col xs={24} lg={18}>
          <Card
            style={{ ...glassCard, animation: 'fadeInUp 0.4s var(--ease-out) both', height: '100%' }}
            styles={{ body: { padding: 28, display: 'flex', flexDirection: 'column', minHeight: 320, height: '100%' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{
                margin: 0, fontSize: 22, fontWeight: 800,
                background: 'linear-gradient(135deg, var(--c-primary-light), var(--c-accent-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: 0,
              }}>
                NeoCockpit
              </h2>
              {currentUser && (
                <Popover
                  content={(
                    <div style={{ minWidth: 100 }}>
                      <div
                        onClick={() => navigate('/profile')}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: 'var(--c-text)',
                          fontSize: 13,
                          padding: '6px 0',
                          borderBottom: '1px solid var(--c-border)',
                          marginBottom: 4,
                        }}
                      >
                        <UserOutlined style={{ color: '#818cf8' }} />
                        个人中心
                      </div>
                      <div
                        onClick={handleLogout}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: 'var(--c-text)',
                          fontSize: 13,
                          padding: '4px 0',
                        }}
                      >
                        <LogoutOutlined style={{ color: '#f87171' }} />
                        退出登录
                      </div>
                    </div>
                  )}
                  trigger="click"
                  placement="bottom"
                >
                  <span style={{
                    color: 'var(--c-text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}>
                    🖌️ {currentUser.nick_name}
                  </span>
                </Popover>
              )}
            </div>

            <Segmented
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { label: '🖼️ 壁纸', value: 'wallpaper' },
                { label: '🚗 主题', value: 'theme' },
                { label: '👤 数字人', value: 'digital_human' },
                { label: '⚡ DIY生图', value: 'diy' },
              ]}
              style={{ marginBottom: 20 }}
            />

            {/* Form area — both forms always mounted */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* ── Wallpaper form ── */}
              <div style={{ display: activeTab === 'wallpaper' ? 'contents' : 'none' }}>
                <Form form={wallpaperForm} layout="vertical" onFinish={handleCreateWallpaperTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述壁纸风格' }]}>
                    <TextArea rows={3} maxLength={200} showCount placeholder="描述壁纸风格，如：深空星夜，紫蓝渐变，银河横贯画面，点缀星光粒子…" style={{ fontSize: 14, minHeight: 130 }} />
                  </Form.Item>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <PictureOutlined style={{ marginRight: 6 }} />
                    AI 将生成：2560×1440 高清壁纸（LLM 优化提示词 + AI 生图）
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>


              {/* ── Theme form ── */}
              <div style={{ display: activeTab === 'theme' ? 'contents' : 'none' }}>
                <Form form={themeForm} layout="vertical" onFinish={handleCreateThemeTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述主题风格' }]}>
                    <TextArea rows={3} maxLength={200} showCount placeholder="描述车载主题风格，如：端午节主题，暖金色调，竹编纹理与龙舟水波纹样…" style={{ fontSize: 14, minHeight: 130 }} />
                  </Form.Item>
                  {iconDescList.length > 0 && (
                    <Form.Item name="icon_descriptions" rules={[{ required: true, message: '请至少选择一个图标' }]}>
                      <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {iconDescList.map((d) => (
                          <Tooltip key={d.id} title={d.description}>
                            <Checkbox
                              value={d.name}
                              style={{
                                margin: 0, padding: '8px 16px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--c-border)',
                                background: 'var(--c-bg-input)',
                                transition: 'all 0.25s var(--ease-out)',
                              }}
                              className="icon-checkbox"
                            >{d.name}</Checkbox>
                          </Tooltip>
                        ))}
                      </Checkbox.Group>
                    </Form.Item>
                  )}
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <AppstoreOutlined style={{ marginRight: 6 }} />
                    AI 将生成：2560×1440 背景图 + 系统图标（LLM 优化提示词 + AI 生图 + 自动切片）
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>

              {/* ── Digital human form ── */}
              <div style={{ display: activeTab === 'digital_human' ? 'contents' : 'none' }}>
                <Form form={avatarForm} layout="vertical" onFinish={handleCreateAvatarTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述数字人形象' }]}>
                    <TextArea rows={3} maxLength={200} showCount placeholder="描述数字人形象，如：赛博朋克风格的女性角色，银色短发，左侧有发光纹路，穿着黑色机能风外套，面容冷峻…" style={{ fontSize: 14, minHeight: 130 }} />
                  </Form.Item>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <UserOutlined style={{ marginRight: 6 }} />
                    AI 将生成：全身肖像 · 漫反射贴图 · 法线贴图 · WebGL 预览
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>

              {/* ── DIY form ── */}
              <div style={{ display: activeTab === 'diy' ? 'contents' : 'none' }}>
                <Form form={diyForm} layout="vertical" onFinish={handleCreateDIYTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请输入生图提示词' }]}>
                    <TextArea rows={6} maxLength={5000} showCount placeholder="输入生图提示词，如：赛博朋克城市夜景，霓虹灯光反射在湿润路面上，8K超高清，电影级画质…" style={{ fontSize: 14, minHeight: 200 }} />
                  </Form.Item>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <BulbOutlined style={{ marginRight: 6 }} />
                    DIY 模式：直接输入提示词 → AI 生图，无 LLM 步骤
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>

            </div>
          </Card>
        </Col>

        {/* Stats */}
        <Col xs={24} lg={6}>
          <Card
            style={{ ...glassCard, animation: 'scaleIn 0.5s var(--ease-out) 0.12s both', height: '100%' }}
            styles={{ body: { padding: 22 } }}
          >
            <h3 style={statHeading}>任务统计</h3>
            <Row gutter={[12, 12]}>
              <Col span={12}><StatChip icon={<CheckCircleOutlined />} value={statistics.completed} label="完成" accent="#22c55e" /></Col>
              <Col span={12}><StatChip icon={<SyncOutlined />} value={statistics.processing} label="生成中" accent="#6366f1" /></Col>
              <Col span={12}><StatChip icon={<CloseCircleOutlined />} value={statistics.failed} label="失败" accent="#ef4444" /></Col>
              <Col span={12}><StatChip icon={<ThunderboltOutlined />} value={statistics.total} label="总计" accent="#06b6d4" /></Col>
              <Col span={12}><StatChip icon={<ClockCircleOutlined />} value={queueStatus?.queued_count ?? 0} label="排队" accent="#eab308" /></Col>
              <Col span={12}><StatChip icon={<TeamOutlined />} value={onlineData?.total ?? 0} label="在线" accent="#a78bfa" /></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Task list */}
      <Card
        style={{ ...glassCard, animation: 'scaleIn 0.5s var(--ease-out) 0.25s both', marginTop: 24 }}
        styles={{ body: { padding: 28 } }}
      >
        <TaskList
          key={authVersion}
          tasks={tasks}
          loading={isLoading}
          onTaskClick={handleTaskClick}
          activeFilter={taskFilter}
          counts={taskTypeCounts}
          hasMore={Boolean(hasNextPage)}
          loadingMore={isFetchingNextPage}
          onFilterChange={setTaskFilter}
          onLoadMore={handleLoadMoreTasks}
        />
      </Card>
    <AuthModal
        open={authModalOpen}
        onLogin={handleUserLogin}
        onRegister={userApi.register}
        onLoginBySignature={userApi.login}
      />
    </div>
  );
};
