import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Form, Input, Checkbox, message, Card, Row, Col, Tooltip, Segmented,
  Button,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SyncOutlined,
  TeamOutlined, ThunderboltOutlined, BulbOutlined,
  PictureOutlined, AppstoreOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { TaskFilter, TaskList } from '@/components/TaskList';
import { ProviderField } from '@/components/ProviderField';
import { mergeNotificationsWithLocalRead, upsertReadNotifications, markNotificationsReadInCache } from '@/components/NotificationPanel';
import { UserMenu } from '@/components/UserMenu';
import { taskApi, userApi, presenceApi, iconDescriptionApi, aiProviderApi, notificationApi, setUserAuth, clearUserAuth } from '@/services/api';
import AuthModal from '@/components/AuthModal';
import { usePresence } from '@/hooks/usePresence';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import type { UserInfo, InkSignature, UserNotification, NotificationListResponse, TaskCreate, TaskListItem } from '@/types/task';
import {
  TaskType, isActiveTaskStatus,
} from '@/types/task';
import { glassCard, statHeading } from '@/constants/styles';

const { TextArea } = Input;

const POLL = { ACTIVE: 5_000, IDLE: 30_000, ONLINE: 30_000, DEEP_IDLE: false as const };
const TASK_PAGE_SIZE = 12;
const RANKED_TASK_MAX_ITEMS = 100;

const TASK_TYPE_OPTIONS = [
  { label: '🖼️ 壁纸', value: TaskType.WALLPAPER },
  { label: '🚗 主题', value: TaskType.THEME },
  { label: '👤 数字人', value: TaskType.DIGITAL_HUMAN },
  { label: '🎨 贴纸包', value: TaskType.STICKER_PACK },
  { label: '⚡ DIY生图', value: TaskType.DIY },
];

const TASK_CREATE_LABEL: Record<TaskType, string> = {
  [TaskType.WALLPAPER]: '壁纸任务',
  [TaskType.THEME]: '主题任务',
  [TaskType.DIGITAL_HUMAN]: '数字人任务',
  [TaskType.STICKER_PACK]: '贴纸包任务',
  [TaskType.DIY]: 'DIY生图任务',
};

interface ApiError {
  response?: {
    status?: number;
    data?: {
      detail?: unknown;
    };
  };
}

interface CreateTaskOptions {
  taskType: TaskType;
  form: FormInstance<TaskCreate>;
  includeIconDescriptions?: boolean;
}

const readStoredUser = (): UserInfo | null => {
  if (!localStorage.getItem('aigc_user_token')) return null;
  const raw = localStorage.getItem('aigc_user_info');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getCreateSuccessMessage = (taskType: TaskType, price?: number) => {
  const costText = price && price > 0 ? `（消耗${price}积分）` : '';
  return `${TASK_CREATE_LABEL[taskType]}创建成功！正在生成中...${costText}`;
};

const getApiErrorDetail = (err: unknown): string => {
  const detail = (err as ApiError)?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
};

const getApiErrorStatus = (err: unknown): number | undefined =>
  (err as ApiError)?.response?.status;

const getTaskCreatedAtTime = (task: TaskListItem) => {
  const timestamp = new Date(task.created_at).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const uniqueTasksByFirstOccurrence = (items: TaskListItem[]) => {
  const byId = new Map<string, TaskListItem>();
  for (const item of items) {
    if (!byId.has(item.task_id)) {
      byId.set(item.task_id, item);
    }
  }
  return Array.from(byId.values());
};

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
  const [themeForm] = Form.useForm<TaskCreate>();
  const [avatarForm] = Form.useForm<TaskCreate>();
  const [diyForm] = Form.useForm<TaskCreate>();
  const [wallpaperForm] = Form.useForm<TaskCreate>();
  const [stickerForm] = Form.useForm<TaskCreate>();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskType>(TaskType.WALLPAPER);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const queryClient = useQueryClient();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  /* ── Presence heartbeat (user-scoped) ── */
  usePresence();
  const { isIdle } = useIdleDetector();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(readStoredUser);
  const [locallyReadNotifications, setLocallyReadNotifications] = useState<UserNotification[]>([]);
  const notificationQueryKey = useMemo(() => ['notifications', currentUser?.id] as const, [currentUser?.id]);

  useEffect(() => {
    setLocallyReadNotifications([]);
  }, [currentUser?.id]);

  /* ── Verify user token on mount ── */
  useEffect(() => {
    const token = localStorage.getItem('aigc_user_token');
    if (!token) return;

    userApi.verify()
      .then((user) => {
        setCurrentUser(user);
        setAuthModalOpen(false);
      })
      .catch(() => {
        // Token invalid or expired, clear auth
        clearUserAuth();
        setCurrentUser(null);
      });
  }, []);

  /* ── Auth handlers ── */
  const handleUserLogin = useCallback((token: string, user: Record<string, unknown>, signature?: InkSignature) => {
    setUserAuth(token, user as unknown as UserInfo, signature);
    setCurrentUser(user as unknown as UserInfo);
    setAuthModalOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    clearUserAuth();
    setCurrentUser(null);
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
      const skip = Number(pageParam) || 0;
      if (taskFilter === 'likeRanking') {
        return skip < RANKED_TASK_MAX_ITEMS ? taskApi.listLikeRankingTasks(skip, TASK_PAGE_SIZE) : [];
      }
      if (taskFilter === 'viewRanking') {
        return skip < RANKED_TASK_MAX_ITEMS ? taskApi.listViewRankingTasks(skip, TASK_PAGE_SIZE) : [];
      }
      return taskApi.listTasks(
        skip,
        TASK_PAGE_SIZE,
        taskFilter === 'all' ? undefined : taskFilter,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (taskFilter === 'likeRanking' || taskFilter === 'viewRanking') {
        const loadedCount = pages.reduce((total, page) => total + page.length, 0);
        if (loadedCount >= RANKED_TASK_MAX_ITEMS) return undefined;
        return lastPage.length === TASK_PAGE_SIZE ? loadedCount : undefined;
      }
      return lastPage.length === TASK_PAGE_SIZE ? pages.length * TASK_PAGE_SIZE : undefined;
    },
    refetchOnMount: 'always',
    refetchInterval: isIdle ? POLL.DEEP_IDLE : (q) =>
      q.state.data?.pages.some((page) => page.some((t) => isActiveTaskStatus(t.status)))
        ? POLL.ACTIVE
        : POLL.IDLE,
    refetchIntervalInBackground: false,
  });

  const tasks = useMemo(() => {
    const items = uniqueTasksByFirstOccurrence(taskPages?.pages.flat() ?? []);
    if (taskFilter === 'likeRanking' || taskFilter === 'viewRanking') {
      return items;
    }
    return items.sort((a, b) => getTaskCreatedAtTime(b) - getTaskCreatedAtTime(a));
  }, [taskFilter, taskPages]);

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
    queryFn: () => presenceApi.getOnline(),
    refetchInterval: isIdle ? POLL.DEEP_IDLE : POLL.ONLINE,
    refetchIntervalInBackground: false,
  });

  const { data: iconDescList = [] } = useQuery({
    queryKey: ['iconDescriptionsEnabled'],
    queryFn: () => iconDescriptionApi.list(),
  });

  const { data: aiProviderList = [] } = useQuery({
    queryKey: ['aiProvidersEnabled'],
    queryFn: () => aiProviderApi.list(),
    staleTime: 0,
  });

  const { data: creditPrices } = useQuery({
    queryKey: ['credit-prices'],
    queryFn: () => userApi.getCreditPrices(),
    staleTime: 60_000,
  });

  const {
    data: notificationData,
    isFetching: notificationLoading,
  } = useQuery({
    queryKey: notificationQueryKey,
    queryFn: () => notificationApi.list(),
    enabled: Boolean(currentUser),
    refetchInterval: isIdle ? POLL.DEEP_IDLE : POLL.ONLINE,
    refetchIntervalInBackground: false,
  });

  const serverNotifications = notificationData?.items ?? [];
  const notifications = useMemo(
    () => mergeNotificationsWithLocalRead(serverNotifications, locallyReadNotifications),
    [serverNotifications, locallyReadNotifications],
  );
  const unreadNotificationCount = notificationData?.unread_count ?? 0;

  const handleMarkMessageRead = useCallback(async (item: UserNotification) => {
    if (item.is_read) return;
    try {
      await notificationApi.markRead(item.id);
      const ids = new Set([item.id]);
      setLocallyReadNotifications(prev => upsertReadNotifications(prev, [item]));
      queryClient.setQueryData<NotificationListResponse>(
        notificationQueryKey,
        data => markNotificationsReadInCache(data, ids),
      );
    } catch {
      message.error('通知状态更新失败');
    }
  }, [notificationQueryKey, queryClient]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    const unreadItems = notifications.filter(item => !item.is_read);
    if (unreadItems.length === 0) return;
    try {
      await notificationApi.markAllRead();
      setLocallyReadNotifications(prev => upsertReadNotifications(prev, unreadItems));
      queryClient.setQueryData<NotificationListResponse>(
        notificationQueryKey,
        data => data
          ? {
            ...data,
            items: data.items.map(item => ({ ...item, is_read: true })),
            unread_count: 0,
          }
          : data,
      );
    } catch {
      message.error('通知状态更新失败');
    }
  }, [notificationQueryKey, notifications, queryClient]);

  const handleOpenNotificationLink = useCallback((item: UserNotification) => {
    if (!item.link_url) return;
    if (!item.is_read) {
      void handleMarkMessageRead(item);
    }
    navigate(item.link_url);
  }, [handleMarkMessageRead, navigate]);

  /* ── Set default provider on load ── */
  useEffect(() => {
    if (aiProviderList.length === 0) return;
    const defaultValue = aiProviderList[0].value;
    if (!themeForm.getFieldValue('provider')) themeForm.setFieldValue('provider', defaultValue);
    if (!avatarForm.getFieldValue('provider')) avatarForm.setFieldValue('provider', defaultValue);
    if (!diyForm.getFieldValue('provider')) diyForm.setFieldValue('provider', defaultValue);
    if (!wallpaperForm.getFieldValue('provider')) wallpaperForm.setFieldValue('provider', defaultValue);
    if (!stickerForm.getFieldValue('provider')) stickerForm.setFieldValue('provider', defaultValue);
  }, [aiProviderList, themeForm, avatarForm, diyForm, wallpaperForm, stickerForm]);

  /* ── Derived data ── */
  const statistics = useMemo(() => ({
    total: taskStats?.total ?? 0,
    completed: taskStats?.completed ?? 0,
    processing: taskStats?.processing ?? 0,
    failed: taskStats?.failed ?? 0,
  }), [taskStats]);

  const taskTypeCounts = useMemo(() => ({
    all: taskStats?.total ?? 0,
    likeRanking: 0,
    viewRanking: 0,
    [TaskType.WALLPAPER]: taskStats?.by_type?.[TaskType.WALLPAPER] ?? 0,
    [TaskType.THEME]: taskStats?.by_type?.[TaskType.THEME] ?? 0,
    [TaskType.DIGITAL_HUMAN]: taskStats?.by_type?.[TaskType.DIGITAL_HUMAN] ?? 0,
    [TaskType.STICKER_PACK]: taskStats?.by_type?.[TaskType.STICKER_PACK] ?? 0,
    [TaskType.DIY]: taskStats?.by_type?.[TaskType.DIY] ?? 0,
  }), [taskStats]);

  /* ── Formatters ── */
  const resetFormPreserveProvider = useCallback((form: FormInstance<TaskCreate>) => {
    const provider = form.getFieldValue('provider');
    form.resetFields();
    if (aiProviderList.length > 0) {
      form.setFieldValue('provider', provider ?? aiProviderList[0].value);
    }
  }, [aiProviderList]);

  const getCreditPrice = useCallback((taskType: TaskType) => {
    return creditPrices?.find((item) => item.action === taskType)?.price;
  }, [creditPrices]);

  const createTask = useCallback(async (values: TaskCreate, options: CreateTaskOptions) => {
    const { taskType, form, includeIconDescriptions = false } = options;
    if (!currentUser) {
      setAuthModalOpen(true);
      message.warning('请先登录后再创建任务');
      return;
    }
    setSubmitting(true);
    try {
      await taskApi.createTask({
        user_input: values.user_input,
        provider: values.provider,
        task_type: taskType,
        ...(includeIconDescriptions ? { icon_descriptions: values.icon_descriptions ?? [] } : {}),
      });
      message.success(getCreateSuccessMessage(taskType, getCreditPrice(taskType)));
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      resetFormPreserveProvider(form);
      refetch();
      refetchTaskStats();

      // 防抖：成功后禁用按钮 3 秒
      setTimeout(() => setSubmitting(false), 3000);
    } catch (err: unknown) {
      setSubmitting(false);
      if (getApiErrorStatus(err) === 401) {
        setAuthModalOpen(true);
        message.warning(getApiErrorDetail(err) || '请先登录后再创建任务');
      } else if (getApiErrorStatus(err) === 402) {
        message.error(getApiErrorDetail(err) || '积分不足');
      } else {
        message.error('任务创建失败');
      }
    }
  }, [currentUser, getCreditPrice, queryClient, refetch, refetchTaskStats, resetFormPreserveProvider]);

  /* ── Handlers ── */
  const handleCreateVehicleTheme = useCallback((values: TaskCreate) => {
    createTask(values, { taskType: TaskType.THEME, form: themeForm, includeIconDescriptions: true });
  }, [createTask, themeForm]);

  const handleCreateAvatarTask = useCallback((values: TaskCreate) => {
    createTask(values, { taskType: TaskType.DIGITAL_HUMAN, form: avatarForm });
  }, [avatarForm, createTask]);

  const handleCreateDIYTask = useCallback((values: TaskCreate) => {
    createTask(values, { taskType: TaskType.DIY, form: diyForm });
  }, [createTask, diyForm]);

  const handleCreateWallpaperTask = useCallback((values: TaskCreate) => {
    createTask(values, { taskType: TaskType.WALLPAPER, form: wallpaperForm });
  }, [createTask, wallpaperForm]);

  const handleCreateStickerTask = useCallback((values: TaskCreate) => {
    createTask(values, { taskType: TaskType.STICKER_PACK, form: stickerForm });
  }, [createTask, stickerForm]);

  const handleLoadMoreTasks = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);


  return (
    <div className="web-page-shell home-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <Row className="home-page__hero-row" gutter={[24, 24]}>
        {/* ── Create task ── */}
        <Col xs={24} lg={18}>
          <Card
            className="home-create-card"
            style={{ ...glassCard, height: '100%' }}
            styles={{ body: { padding: 28, display: 'flex', flexDirection: 'column', minHeight: 320, height: '100%' } }}
          >
            <div className="home-create-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{
                margin: 0, fontSize: 22, fontWeight: 800,
                background: 'linear-gradient(135deg, var(--c-primary-light), var(--c-accent-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: 0,
              }}>
                Neocockpit
              </h2>
              {currentUser ? (
                <UserMenu
                  user={currentUser}
                  notifications={notifications}
                  unreadCount={unreadNotificationCount}
                  notificationLoading={notificationLoading}
                  onMarkMessageRead={handleMarkMessageRead}
                  onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                  onOpenNotificationLink={handleOpenNotificationLink}
                  onLogout={handleLogout}
                />
              ) : (
                <Button
                  size="small"
                  onClick={() => setAuthModalOpen(true)}
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    height: 32,
                    padding: '0 20px',
                    background: 'transparent',
                    border: 'none',
                    color: '#818cf8',
                    letterSpacing: '0.3px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#a5b4fc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#818cf8';
                  }}
                >
                  登录 / 注册
                </Button>
              )}
            </div>

            <Segmented
              className="home-task-type-segmented"
              value={activeTab}
              onChange={(value) => setActiveTab(value as TaskType)}
              options={TASK_TYPE_OPTIONS}
              style={{ marginBottom: 20 }}
            />

            {/* Form area — both forms always mounted */}
            <div className="home-create-card__form-area" style={{ flex: 1, position: 'relative' }}>
              {/* ── Wallpaper form ── */}
              <div style={{ display: activeTab === TaskType.WALLPAPER ? 'contents' : 'none' }}>
                <Form form={wallpaperForm} layout="vertical" onFinish={handleCreateWallpaperTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述壁纸风格' }]}>
                    <TextArea rows={5} maxLength={200} showCount placeholder="描述壁纸风格，如：深空星夜，紫蓝渐变，银河横贯画面，点缀星光粒子…" style={{ fontSize: 14 }} />
                  </Form.Item>
                  <div className="home-create-card__hint" style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <PictureOutlined style={{ marginRight: 6 }} />
                    AI 将生成：2560×1440 高清壁纸（LLM 优化提示词 + AI 生图）
                  </div>
                  <div className="home-create-card__provider" style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>


              {/* ── Theme form ── */}
              <div style={{ display: activeTab === TaskType.THEME ? 'contents' : 'none' }}>
                <Form form={themeForm} layout="vertical" onFinish={handleCreateVehicleTheme}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述主题风格' }]}>
                    <TextArea rows={5} maxLength={200} showCount placeholder="描述车载主题风格，如：端午节主题，暖金色调，竹编纹理与龙舟水波纹样…" style={{ fontSize: 14 }} />
                  </Form.Item>
                  {iconDescList.length > 0 && (
                    <Form.Item name="icon_descriptions" rules={[{ required: true, message: '请至少选择一个图标' }]}>
                      <Checkbox.Group className="home-icon-checkbox-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {iconDescList.map((d) => (
                          <Tooltip key={d.name} title={d.description}>
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
                  <div className="home-create-card__hint" style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <AppstoreOutlined style={{ marginRight: 6 }} />
                    AI 将生成：2560×1440 背景图 + 系统图标（LLM 优化提示词 + AI 生图 + 自动切片）
                  </div>
                  <div className="home-create-card__provider" style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>

              {/* ── Digital human form ── */}
              <div style={{ display: activeTab === TaskType.DIGITAL_HUMAN ? 'contents' : 'none' }}>
                <Form form={avatarForm} layout="vertical" onFinish={handleCreateAvatarTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述数字人形象' }]}>
                    <TextArea rows={5} maxLength={200} showCount placeholder="描述数字人形象，如：赛博朋克风格的女性角色，银色短发，左侧有发光纹路，穿着黑色机能风外套，面容冷峻…" style={{ fontSize: 14 }} />
                  </Form.Item>
                  <div className="home-create-card__hint" style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <UserOutlined style={{ marginRight: 6 }} />
                    AI 将生成：全身肖像 · 漫反射贴图 · 法线贴图 · WebGL 预览
                  </div>
                  <div className="home-create-card__provider" style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>

              {/* ── DIY form ── */}
              <div style={{ display: activeTab === TaskType.DIY ? 'contents' : 'none' }}>
                <Form form={diyForm} layout="vertical" onFinish={handleCreateDIYTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请输入生图提示词' }]}>
                    <TextArea rows={6} maxLength={5000} showCount placeholder="输入生图提示词，如：赛博朋克城市夜景，霓虹灯光反射在湿润路面上，8K超高清，电影级画质…" style={{ fontSize: 14 }} />
                  </Form.Item>
                  <div className="home-create-card__hint" style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <BulbOutlined style={{ marginRight: 6 }} />
                    DIY 模式：直接输入提示词 → AI 生图，无 LLM 步骤
                  </div>
                  <div className="home-create-card__provider" style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <ProviderField providers={aiProviderList} loading={submitting} />
                  </div>
                </Form>
              </div>

              {/* ── Sticker Pack form ── */}
              <div style={{ display: activeTab === TaskType.STICKER_PACK ? 'contents' : 'none' }}>
                <Form form={stickerForm} layout="vertical" onFinish={handleCreateStickerTask}>
                  <Form.Item name="user_input"
                    rules={[{ required: true, message: '请描述贴纸风格' }]}>
                    <TextArea rows={6} maxLength={2000} showCount placeholder="描述贴纸风格，如：赛车风格贴纸包，包含火焰、闪电、骷髅、方格旗等元素，扁平化设计，鲜艳配色…" style={{ fontSize: 14 }} />
                  </Form.Item>
                  <div className="home-create-card__hint" style={{ color: 'var(--c-text-muted)', fontSize: 12, letterSpacing: '0.3px', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                    <AppstoreOutlined style={{ marginRight: 6 }} />
                    AI 将生成：4-6个同风格贴纸 · 透明背景 · 3D预览编辑器
                  </div>
                  <div className="home-create-card__provider" style={{ position: 'absolute', bottom: 0, right: 0 }}>
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
            className="home-stats-card"
            style={{ ...glassCard, height: '100%' }}
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
        className="home-task-list-card"
        style={{ ...glassCard, marginTop: 24 }}
        styles={{ body: { padding: 28 } }}
      >
        <TaskList
          tasks={tasks}
          loading={isLoading}
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
        onCancel={() => setAuthModalOpen(false)}
      />
    </div>
  );
};
