import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Col, Progress, Row, Spin, Tag, Button, Typography, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SkinOutlined, AppstoreOutlined, FileTextOutlined, RedoOutlined, PictureOutlined, EyeOutlined } from '@ant-design/icons';
import { LogViewer } from '@/components/TaskDetail/LogViewer';
import { ImageBlock } from '@/components/TaskDetail/ImageBlock';
import { LikeSection } from '@/components/TaskDetail/LikeSection';
import { CommentSection } from '@/components/TaskDetail/CommentSection';
import { BuildTreeViewer } from '@/components/BuildTree';
import { ImagePreview } from '@/components/ImagePreview';
import { StickerPackPreview } from '@/components/StickerPackPreview';
import AuthModal from '@/components/AuthModal';
import { taskApi, userApi, setUserAuth } from '@/services/api';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { getUserInfo, isUserLoggedIn } from '@/services/api';
import { TaskStatus, TaskType, isActiveTaskStatus } from '@/types/task';
import type { BuildTree, BuildTreeNode, Task } from '@/types/task';
import { statusConfig } from '@/constants/status';
import { TASK_TYPE_CONFIG } from '@/constants/taskType';
import { glassCardOverflow } from '@/constants/styles';

const { Text, Paragraph } = Typography;

const Portrait3DViewer = React.lazy(() => import('@/components/Portrait3DViewer'));

type BuildImage = { name: string; path: string };
type BuildTreeRecord = Record<string, unknown>;

const IMAGE_PATH_RE = /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isBuildTreeNode = (value: unknown): value is BuildTreeNode =>
  isRecord(value) && typeof value.path === 'string' && typeof value.type === 'string';

const toImageName = (name: string, prefix = '') => (prefix ? `${prefix}/${name}` : name);
const stripUrlSuffix = (path: string) => path.split(/[?#]/, 1)[0] || path;
const isImageNode = (node: BuildTreeNode) =>
  node.type === 'image' || IMAGE_PATH_RE.test(stripUrlSuffix(node.path));

const collectBuildImages = (tree: BuildTreeRecord, prefix = ''): BuildImage[] => {
  const images: BuildImage[] = [];
  for (const [name, value] of Object.entries(tree)) {
    if (isBuildTreeNode(value)) {
      if (isImageNode(value)) {
        images.push({ name: toImageName(name, prefix), path: value.path });
      }
      continue;
    }

    if (isRecord(value)) {
      images.push(...collectBuildImages(value, toImageName(name, prefix)));
    }
  }
  return images;
};

const findFirstBuildImagePath = (tree: BuildTreeRecord): string | undefined => {
  for (const value of Object.values(tree)) {
    if (isBuildTreeNode(value)) {
      if (isImageNode(value)) return value.path;
      continue;
    }

    if (isRecord(value)) {
      const found = findFirstBuildImagePath(value);
      if (found) return found;
    }
  }
  return undefined;
};

const getDefaultPreviewImagePath = (task: Task | undefined, fileTree: BuildTree | undefined): string | undefined => {
  if (!task) return undefined;
  if (task.task_type === TaskType.DIGITAL_HUMAN) {
    if (task.avatar_image_url) return task.avatar_image_url;
  } else if (task.background_image_url) {
    return task.background_image_url;
  }
  if (task.preview_image_url) return task.preview_image_url;
  if (fileTree && task.status === TaskStatus.COMPLETED) return findFirstBuildImagePath(fileTree);
  return undefined;
};

export const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [selectedImagePath, setSelectedImagePath] = useState<string>();
  const [selectedDirectory, setSelectedDirectory] = useState<string>();
  const [previewViewMode, setPreviewViewMode] = useState<'single' | 'grid'>('single');
  const [downloading, setDownloading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [retryDisabled, setRetryDisabled] = useState(false);
  const { isIdle } = useIdleDetector();

  const queryClient = useQueryClient();

  const recordViewMutation = useMutation({
    mutationFn: (id: string) => taskApi.recordTaskView(id),
    onSuccess: (data) => {
      queryClient.setQueryData<Task>(['task', data.task_id], (current) =>
        current ? { ...current, views: data.views } : current,
      );
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => taskApi.retryTask(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['fileTree', taskId] });
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      // 防抖：成功后禁用按钮 3 秒
      setRetryDisabled(true);
      setTimeout(() => setRetryDisabled(false), 3000);
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;

      if (status === 401) {
        message.warning('请先登录');
        setAuthModalOpen(true);
      } else if (status === 402) {
        message.error(detail || '积分不足');
      } else if (status === 403) {
        message.error('只有任务创建者才能再次生成');
      } else {
        message.error('操作失败，请稍后重试');
      }
    },
  });

  const { data: creditPrices } = useQuery({
    queryKey: ['credit-prices'],
    queryFn: () => userApi.getCreditPrices(),
    staleTime: 60_000,
  });

  useQuery({
    queryKey: ['my-credits'],
    queryFn: () => userApi.getCredits(),
    enabled: isUserLoggedIn(),
    staleTime: 10_000,
  });

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId!),
    enabled: !!taskId,
    refetchInterval: isIdle ? false : (query) =>
      isActiveTaskStatus(query.state.data?.status) ? 2000 : false,
  });
  const currentUser = getUserInfo();
  const isLoggedIn = isUserLoggedIn();
  const isOwnTask = Boolean(task?.user_id && currentUser?.id === task.user_id);

  // Fetch file tree from database (public access)
  const { data: fileTree } = useQuery<BuildTree>({
    queryKey: ['fileTree', taskId],
    queryFn: () => taskApi.getFileTree(taskId!),
    enabled: !!taskId && task?.status === TaskStatus.COMPLETED,
  });

  // Collect image resource paths from fileTree (resources are publicly accessible)
  const allBuildImages = useMemo(() => {
    if (!fileTree || task?.status !== TaskStatus.COMPLETED) return undefined;
    const images = collectBuildImages(fileTree);
    return images.length > 0 ? images : undefined;
  }, [fileTree, task?.status]);

  const filteredBuildImages = useMemo(() => {
    if (!allBuildImages) return undefined;
    if (!selectedDirectory) return allBuildImages;
    return allBuildImages.filter(img => img.name.startsWith(`${selectedDirectory}/`));
  }, [allBuildImages, selectedDirectory]);

  React.useEffect(() => {
    setSelectedImagePath(undefined);
    setSelectedDirectory(undefined);
    setPreviewViewMode('single');
  }, [taskId]);

  React.useEffect(() => {
    if (!task?.task_id) return;
    recordViewMutation.mutate(task.task_id);
  }, [task?.task_id]);

  const defaultPreviewImagePath = useMemo(() => {
    return getDefaultPreviewImagePath(task, fileTree);
  }, [task, fileTree]);

  const previewImagePath = selectedImagePath ?? (selectedDirectory ? undefined : defaultPreviewImagePath);

  const handleSelectFile = (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      setSelectedDirectory(path);
      setPreviewViewMode('grid');
      setSelectedImagePath(undefined);
    } else {
      const parentDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      setSelectedDirectory(parentDir);
      setSelectedImagePath(path);
      setPreviewViewMode('single');
    }
  };

  if (isLoading || !task) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const dh = task.task_type === TaskType.DIGITAL_HUMAN;
  const diy = task.task_type === TaskType.DIY;
  const wallpaper = task.task_type === TaskType.WALLPAPER;
  const stickerPack = task.task_type === TaskType.STICKER_PACK;
  const taskTypeConfig = TASK_TYPE_CONFIG[task.task_type];
  const cfg = statusConfig[task.status] || statusConfig[TaskStatus.QUEUED];
  const isTaskActive = isActiveTaskStatus(task.status);
  const portraitMeshUrl = dh && task.status === TaskStatus.COMPLETED
    ? `/api/resource/${task.task_id}/product/mesh/portrait_3d_mesh.json`
    : undefined;

  const renderPromptBlock = (
    key: string,
    icon: React.ReactNode,
    label: string,
    text: string,
    rgb: string,
    barGradient: string,
    iconColor: string,
  ) => (
    <div key={key} style={{
      position: "relative",
      borderRadius: "var(--radius-md)",
      background: `linear-gradient(135deg, rgba(${rgb},0.06) 0%, rgba(${rgb},0.02) 100%)`,
      border: `1px solid rgba(${rgb},0.18)`,
      padding: 20,
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: 3, height: "100%",
        background: `linear-gradient(180deg, ${barGradient})`,
        borderRadius: "3px 0 0 3px",
      }} />
      <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: iconColor, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
        {icon} {label}
      </Text>
      <Paragraph style={{
        fontSize: 13, lineHeight: 1.9, color: "var(--c-text)",
        whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0,
      }}>
        {text}
      </Paragraph>
    </div>
  );

  const viewPromptStyles = {
    front: { label: "正面视角提示词", rgb: "129,140,248", bar: "#818cf8, #6366f1", icon: "#818cf8" },
    right: { label: "右侧视角提示词", rgb: "56,189,248",  bar: "#38bdf8, #0284c7", icon: "#38bdf8" },
    back:  { label: "背面视角提示词", rgb: "244,114,182", bar: "#f472b6, #db2777", icon: "#f472b6" },
    left:  { label: "左侧视角提示词", rgb: "94,234,212",  bar: "#5eead4, #14b8a6", icon: "#5eead4" },
  } as const;

  return (
    <div className="web-page-shell task-detail-page" style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Back button ── */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: 20, color: 'var(--c-text-muted)', fontSize: 13 }}
      >
        返回首页
      </Button>

      <Row className="task-detail-page__main-row" gutter={[24, 24]}>
        {/* ── Left column: status + logs ── */}
        <Col xs={24} md={8} className="task-detail-page__side-col">
          {/* Status card */}
          <Card className="task-detail-page__status-card" style={{ ...glassCardOverflow, marginBottom: 24 }} styles={{ body: { padding: 24 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text title={task.task_id} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--c-text-muted)', wordBreak: 'break-all' }}>
                {task.task_id}
              </Text>
              <Tag color={cfg.color} className="neon-tag">{cfg.text}</Tag>
            </div>

            {isTaskActive && (
              <Progress
                className="task-progress task-progress--active"
                percent={(() => {
                  const s = task.status;
                  if (s === TaskStatus.GENERATING_BG || s === TaskStatus.GENERATING_AVATAR) return 35;
                  if (s === TaskStatus.GENERATING_ICONS || s === TaskStatus.GENERATING_TEXTURES) return 55;
                  if (s === TaskStatus.SLICING) return 70;
                  if (s === TaskStatus.COMPOSITING) return 85;
                  if (s === TaskStatus.PROCESSING) return 15;
                  return 5;
                })()}
                strokeColor={cfg.color}
                showInfo={false}
                size="small"
                style={{
                  marginBottom: 16,
                  '--task-progress-color': cfg.color,
                } as React.CSSProperties}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tag style={{
                background: taskTypeConfig.gradient,
                color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)',
                fontWeight: 700, fontSize: 11,
              }}>
                {taskTypeConfig.label}
              </Tag>

              {diy && task.status === TaskStatus.COMPLETED && isOwnTask && (
                <Button
                  type="primary"
                  icon={<RedoOutlined />}
                  size="small"
                  loading={retryMutation.isPending}
                  disabled={retryDisabled || retryMutation.isPending}
                  onClick={() => retryMutation.mutate()}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 700,
                    fontSize: 11,
                    height: 28,
                  }}
                >
                  再次生成
                </Button>
              )}
            </div>

            {task.status === TaskStatus.FAILED && (
              <Button
                type="primary"
                icon={<RedoOutlined />}
                size="small"
                loading={retryMutation.isPending}
                disabled={retryDisabled || retryMutation.isPending}
                onClick={() => retryMutation.mutate()}
                style={{
                  marginTop: 12,
                  background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 700,
                  fontSize: 12,
                  height: 32,
                  width: '100%',
                }}
              >
                {retryMutation.isPending ? '重试中...' : '重新生成'}
              </Button>
            )}
          </Card>

          {/* Execution log card */}
          <Card
            className="task-detail-page__log-card"
            title={<span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--c-text-secondary)' }}>执行日志</span>}
            style={glassCardOverflow}
            styles={{
              body: { padding: 20 },
              header: { borderBottom: '1px solid var(--c-border)' },
            }}
          >
            <LogViewer logs={task.logs} />
          </Card>
        </Col>

        {/* ── Right column: preview + prompts + images ── */}
        <Col xs={24} md={16} className="task-detail-page__content-col">
          {/* Digital Human 3D Preview */}
          {dh && isLoggedIn && task.avatar_atlas_url && portraitMeshUrl && (
            <Card style={{ ...glassCardOverflow, marginBottom: 24 }} styles={{ body: { padding: 0 } }}>
              <React.Suspense
                fallback={(
                  <div className="portrait-3d portrait-3d--loading">
                    <Spin size="large" />
                  </div>
                )}
              >
                <Portrait3DViewer
                  atlasUrl={task.avatar_atlas_url || ''}
                  meshUrl={portraitMeshUrl}
                />
              </React.Suspense>
            </Card>
          )}

          {/* Design prompts card */}
          {(task.user_input || task.background_prompt || task.icon_prompt || (dh && task.normal_detail) || diy) && (
            <Card
              className="task-detail-page__prompt-card"
              title={
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--c-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {task.author && (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-secondary)', textTransform: 'none', letterSpacing: '0' }}>
                        作者：
                        <span style={{
                          color: 'var(--c-primary)',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-accent) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}>
                          {task.author}
                        </span>
                      </span>
                      <span style={{ color: 'var(--c-border)', margin: '0 4px' }}>|</span>
                    </>
                  )}
                  设计提示词
                </span>
              }
              style={{ ...glassCardOverflow, marginBottom: 24 }}
              styles={{
                body: { padding: 24 },
                header: { borderBottom: '1px solid var(--c-border)' },
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* User input prompt */}
                {task.user_input && (
                  <div style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.02) 100%)",
                    border: "1px solid rgba(52,211,153,0.18)",
                    padding: 20,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                      background: "linear-gradient(180deg, #34d399, #10b981)",
                      borderRadius: "3px 0 0 3px",
                    }} />
                    <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: "#34d399", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      <FileTextOutlined style={{ marginRight: 6 }} />
                      用户输入词
                    </Text>
                    <Paragraph style={{
                      fontSize: 13, lineHeight: 1.9, color: "var(--c-text)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0,
                    }}>
                      {task.user_input}
                    </Paragraph>
                  </div>
                )}

                {/* Avatar / Background prompt (skip for DIY - user input is the prompt) */}
                {/* Background prompt (theme only — digital_human uses dedicated view prompt cards below; sticker_pack has its own block) */}
                {task.background_prompt && !diy && !dh && !wallpaper && !stickerPack && (
                  <div style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, rgba(129,140,248,0.06) 0%, rgba(129,140,248,0.02) 100%)",
                    border: "1px solid rgba(129,140,248,0.18)",
                    padding: 20,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                      background: "linear-gradient(180deg, #818cf8, #6366f1)",
                      borderRadius: "3px 0 0 3px",
                    }} />
                    <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: "#818cf8", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      <SkinOutlined style={{ marginRight: 6 }} />
                      背景提示词
                    </Text>
                    <Paragraph style={{
                      fontSize: 13, lineHeight: 1.9, color: "var(--c-text)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0,
                    }}>
                      {task.background_prompt}
                    </Paragraph>
                  </div>
                )}

                {/* Digital human: character anchor */}
                {dh && task.view_prompts?.character_anchor && renderPromptBlock(
                  "anchor",
                  <FileTextOutlined style={{ marginRight: 6 }} />,
                  "角色锚定描述",
                  task.view_prompts.character_anchor,
                  "236,72,153",
                  "#ec4899, #db2777",
                  "#ec4899",
                )}

                {/* Digital human: 4 view prompts */}
                {dh && (["front", "right", "back", "left"] as const).map((v) => {
                  const text = task.view_prompts?.[v];
                  if (!text) return null;
                  const s = viewPromptStyles[v];
                  return renderPromptBlock(
                    v,
                    <SkinOutlined style={{ marginRight: 6 }} />,
                    s.label,
                    text,
                    s.rgb,
                    s.bar,
                    s.icon,
                  );
                })}

                {wallpaper && task.background_prompt && (
                  <div style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.02) 100%)",
                    border: "1px solid rgba(52,211,153,0.18)",
                    padding: 20,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                      background: "linear-gradient(180deg, #34d399, #06b6d4)",
                      borderRadius: "3px 0 0 3px",
                    }} />
                    <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: "#34d399", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      <PictureOutlined style={{ marginRight: 6 }} />
                      壁纸提示词
                    </Text>
                    <Paragraph style={{ fontSize: 13, color: "var(--c-text)", margin: 0, lineHeight: 1.7 }}>
                      {task.background_prompt}
                    </Paragraph>
                  </div>
                )}

                {/* Sticker pack: AI-generated design prompts */}
                {stickerPack && task.background_prompt && (
                  <div style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, rgba(244,114,182,0.06) 0%, rgba(244,114,182,0.02) 100%)",
                    border: "1px solid rgba(244,114,182,0.18)",
                    padding: 20,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                      background: "linear-gradient(180deg, #f472b6, #ec4899)",
                      borderRadius: "3px 0 0 3px",
                    }} />
                    <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: "#f472b6", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      <SkinOutlined style={{ marginRight: 6 }} />
                      贴纸设计提示词
                    </Text>
                    <Paragraph style={{
                      fontSize: 13, lineHeight: 1.9, color: "var(--c-text)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0,
                    }}>
                      {task.background_prompt}
                    </Paragraph>
                  </div>
                )}

                {/* Texture / Icon prompt (skip for DIY) */}
                {task.icon_prompt && !diy && !stickerPack && (
                  <div style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    background: dh
                      ? "linear-gradient(135deg, rgba(167,139,250,0.06) 0%, rgba(167,139,250,0.02) 100%)"
                      : "linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.02) 100%)",
                    border: dh
                      ? "1px solid rgba(167,139,250,0.18)"
                      : "1px solid rgba(6,182,212,0.18)",
                    padding: 20,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                      background: dh
                        ? "linear-gradient(180deg, #a78bfa, #7c3aed)"
                        : "linear-gradient(180deg, #06b6d4, #22d3ee)",
                      borderRadius: "3px 0 0 3px",
                    }} />
                    <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: dh ? "#a78bfa" : "#22d3ee", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      {dh
                        ? <><SkinOutlined style={{ marginRight: 6 }} />纹理提示词</>
                        : <><AppstoreOutlined style={{ marginRight: 6 }} />图标提示词</>
                      }
                    </Text>
                    <Paragraph style={{
                      fontSize: 13, lineHeight: 1.9, color: "var(--c-text)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0,
                    }}>
                      {task.icon_prompt}
                    </Paragraph>
                  </div>
                )}

                {/* Normal detail prompt */}
                {dh && task.normal_detail && (
                  <div style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 100%)",
                    border: "1px solid rgba(245,158,11,0.18)",
                    padding: 20,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                      background: "linear-gradient(180deg, #f59e0b, #fbbf24)",
                      borderRadius: "3px 0 0 3px",
                    }} />
                    <Text style={{ fontSize: 12, display: "flex", alignItems: "center", marginBottom: 10, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      <SkinOutlined style={{ marginRight: 6 }} />
                      法线贴图细节描述
                    </Text>
                    <Paragraph style={{
                      fontSize: 13, lineHeight: 1.9, color: "var(--c-text)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0,
                    }}>
                      {task.normal_detail}
                    </Paragraph>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── Generated images ── */}
          {(task.background_image_url || task.icon_image_url || task.avatar_image_url || task.texture_albedo_url || task.texture_normal_url || task.view_image_urls) && (
            <Card
              className="task-detail-page__images-card"
              style={{
                ...glassCardOverflow,
                marginBottom: 24,
                background: 'var(--c-bg-card-solid)',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
              }}
              styles={{ body: { padding: 28 } }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-secondary)', marginBottom: 20, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 10 }}>
                生成结果
                {task.ai_provider && (
                  <Tag style={{
                    background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-accent) 100%)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)',
                    fontWeight: 700, fontSize: 11,
                  }}>
                    {task.ai_provider.toUpperCase()}
                  </Tag>
                )}
              </h3>
              <Row className="task-detail-page__images-grid" gutter={24}>
                {dh && (["front", "right", "back", "left"] as const).map((v) => {
                  const url = task.view_image_urls?.[v];
                  if (!url) return null;
                  const label = { front: "正面视角", right: "右侧视角", back: "背面视角", left: "左侧视角" }[v];
                  return <Col key={v} xs={24} md={12}><ImageBlock label={label} src={url} alt={label} /></Col>;
                })}
                {dh && <Col xs={24} md={12}><ImageBlock label="漫反射贴图" src={task.texture_albedo_url} alt="Albedo" /></Col>}
                {dh && <Col xs={24} md={12}><ImageBlock label="法线贴图" src={task.texture_normal_url} alt="Normal" /></Col>}
                {!dh && !diy && !wallpaper && <Col xs={24} md={12}><ImageBlock label="背景图" src={task.background_image_url} alt="Background" /></Col>}
                {!dh && !diy && !wallpaper && <Col xs={24} md={12}><ImageBlock label="图标" src={task.icon_image_url} alt="Icon" /></Col>}
                {diy && <Col xs={24} md={12}><ImageBlock label="生成图片" src={task.background_image_url} alt="Generated" /></Col>}
                {wallpaper && <Col xs={24} md={12}><ImageBlock label="壁纸" src={task.background_image_url} alt="Wallpaper" /></Col>}
              </Row>
            </Card>
          )}

        </Col>
      </Row>

      {/* ── Resource package (full width, independent) ── */}
      {fileTree && task?.status === TaskStatus.COMPLETED && (
        <Card
          className="task-detail-page__resource-card"
          title={
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--c-text-secondary)' }}>
              {stickerPack ? '3D 编辑器' : '资源包'}
            </span>
          }
          extra={
            !stickerPack && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                loading={downloading}
                className="neon-btn"
                onClick={async () => {
                  if (!isLoggedIn) {
                    setAuthModalOpen(true);
                    return;
                  }
                  if (downloading) return;
                  setDownloading(true);
                  try {
                    const ticket = await taskApi.downloadZip(task.task_id);
                    if (ticket.charged && ticket.credits_cost > 0) message.success('下载已开始（消耗' + ticket.credits_cost + '积分）');
                    else message.success('下载已开始');
                    if (ticket.charged) queryClient.invalidateQueries({ queryKey: ['my-credits'] });
                  } finally { setDownloading(false); }
                }}
              >
                打包下载{(() => {
                  if (isOwnTask) return '';
                  const p = creditPrices?.find(c => c.action === 'download');
                  if (p && p.price > 0) return ` (${p.price}积分)`;
                  return '';
                })()}
              </Button>
            )
          }
          style={{
            ...glassCardOverflow,
            marginTop: 24,
            background: 'var(--c-bg-card-solid)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
          styles={{
            body: { padding: stickerPack ? 0 : 24 },
            header: { borderBottom: '1px solid var(--c-border)' },
          }}
        >
          {stickerPack ? (
            <StickerPackPreview buildImages={allBuildImages} />
          ) : (
            <Row className="task-detail-page__resource-row" gutter={[2, 20]} style={{ alignItems: 'flex-start' }}>
              <Col xs={24} md={7}>
                <div className="task-detail-page__build-tree" style={{ background: 'var(--c-bg-card)', borderRadius: 'var(--radius-md)', padding: 2, maxHeight: 520, overflowY: 'auto' }}>
                  <BuildTreeViewer buildTree={fileTree} onSelect={handleSelectFile} />
                </div>
              </Col>
              <Col xs={24} md={17}>
                <ImagePreview
                  imagePath={previewImagePath}
                  images={filteredBuildImages}
                  onSelectImage={(path) => setSelectedImagePath(path)}
                  autoPreview
                  viewMode={previewViewMode}
                  onViewModeChange={setPreviewViewMode}
                />
              </Col>
            </Row>
          )}
        </Card>
      )}
      {/* ── Like + comments (only for completed tasks) ── */}
      {task?.status === TaskStatus.COMPLETED && taskId && (
        <div className="task-detail-page__social-row" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'start',
          marginTop: 28,
          animation: 'fadeInUp 0.4s var(--ease-out) 0.3s both',
        }}>
          <div />
          <LikeSection
            taskId={taskId}
            likes={task.likes ?? 0}
            containerStyle={{ marginTop: 0, animation: 'none' }}
          />
          <div style={{
            justifySelf: 'end',
            alignSelf: 'start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            paddingTop: 2,
            color: 'var(--c-text-muted)',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}>
            <EyeOutlined style={{ fontSize: 15 }} />
            <span>浏览量 {task.views ?? 0}</span>
          </div>
        </div>
      )}

      {task?.status === TaskStatus.COMPLETED && taskId && (
        <CommentSection taskId={taskId} isIdle={isIdle} />
      )}

      <AuthModal
        open={authModalOpen}
        onLogin={(token, user, signature) => {
          setUserAuth(token, user as any, signature);
          setAuthModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['my-credits'] });
          queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        }}
        onRegister={userApi.register}
        onLoginBySignature={userApi.login}
        onCancel={() => setAuthModalOpen(false)}
      />
    </div>
  );
};
