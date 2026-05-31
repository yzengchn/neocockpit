import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Empty, Input, List, Tag, Tooltip, Typography, message } from 'antd';
import { CloseOutlined, MessageOutlined, RollbackOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { taskApi, isUserLoggedIn } from '@/services/api';
import type { TaskComment, TaskCommentListResponse } from '@/types/task';
import { glassCardOverflow } from '@/constants/styles';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const COMMENT_MIN_LENGTH = 10;
const COMMENT_MAX_LENGTH = 150;

const COMMENT_STATUS_LABEL: Record<TaskComment['status'], string> = {
  pending: '审核中',
  approved: '',
  rejected: '未通过',
};

const COMMENT_STATUS_COLOR: Record<TaskComment['status'], string> = {
  pending: '#fbbf24',
  approved: 'var(--c-text-muted)',
  rejected: '#f87171',
};

type CommentSubmitPayload = {
  content: string;
  parentId?: string | null;
};

interface CommentSectionProps {
  taskId: string;
  isIdle: boolean;
}

const formatCommentTime = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getApiErrorDetail = (err: any): string => {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
};

export const CommentSection: React.FC<CommentSectionProps> = ({ taskId, isIdle }) => {
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<TaskComment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [reviewingCommentIds, setReviewingCommentIds] = useState<Set<string>>(() => new Set());

  const commentMutation = useMutation({
    mutationFn: ({ content, parentId }: CommentSubmitPayload) =>
      taskApi.createComment(taskId, { content, parent_id: parentId }),
    onSuccess: (comment, variables) => {
      if (variables.parentId) {
        setReplyContent('');
        setReplyTarget(null);
      } else {
        setCommentContent('');
      }
      setReviewingCommentIds((prev) => {
        const next = new Set(prev);
        next.add(comment.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      message.success('评论已提交，审核中');
    },
    onError: (err: any) => {
      const detail = getApiErrorDetail(err);
      if (err?.response?.status === 401) {
        message.warning('请先登录后再评论');
      } else if (err?.response?.status === 400) {
        message.error(detail || '评论失败');
      } else if (err?.response?.status === 503) {
        message.error(detail || '评论审核暂不可用，请稍后再试');
      } else {
        message.error('评论失败，请稍后再试');
      }
    },
  });

  const shouldIncludeMyReviewing = reviewingCommentIds.size > 0;

  const { data: commentsData, isLoading: commentsLoading } = useQuery<TaskCommentListResponse>({
    queryKey: ['taskComments', taskId, shouldIncludeMyReviewing],
    queryFn: () => taskApi.listComments(taskId, 0, 100, shouldIncludeMyReviewing),
    enabled: !!taskId,
    staleTime: 5_000,
    refetchInterval: isIdle || !shouldIncludeMyReviewing ? false : (query) => {
      const hasPendingReviewingComment = query.state.data?.items.some((comment) =>
        reviewingCommentIds.has(comment.id) && comment.status === 'pending',
      );
      return hasPendingReviewingComment ? 3000 : false;
    },
  });

  const visibleComments = useMemo(() => {
    return (commentsData?.items ?? []).filter((comment) =>
      comment.status === 'approved' || reviewingCommentIds.has(comment.id),
    );
  }, [commentsData?.items, reviewingCommentIds]);

  const rootComments = useMemo(
    () => visibleComments.filter((comment) => !comment.parent_id),
    [visibleComments],
  );

  const repliesByParentId = useMemo(() => {
    const groups = new Map<string, TaskComment[]>();
    visibleComments.forEach((comment) => {
      if (!comment.parent_id) return;
      const replies = groups.get(comment.parent_id) ?? [];
      replies.push(comment);
      groups.set(comment.parent_id, replies);
    });
    return groups;
  }, [visibleComments]);

  useEffect(() => {
    setCommentContent('');
    setReplyTarget(null);
    setReplyContent('');
    setReviewingCommentIds(new Set());
  }, [taskId]);

  const handleSubmitComment = (parentId?: string | null) => {
    const content = (parentId ? replyContent : commentContent).trim();
    if (!content) {
      message.warning('请输入评论内容');
      return;
    }
    if (content.length < COMMENT_MIN_LENGTH) {
      message.warning(`评论至少需要${COMMENT_MIN_LENGTH}个字`);
      return;
    }
    if (content.length > COMMENT_MAX_LENGTH) {
      message.warning(`评论不能超过${COMMENT_MAX_LENGTH}字`);
      return;
    }
    if (!isUserLoggedIn()) {
      message.warning('请先登录后再评论');
      return;
    }
    commentMutation.mutate({ content, parentId });
  };

  const renderReplyInput = (target: TaskComment) => {
    if (replyTarget?.id !== target.id) return null;

    const replyLength = replyContent.trim().length;
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 10,
        alignItems: 'end',
        marginTop: 12,
      }}>
        <TextArea
          value={replyContent}
          maxLength={COMMENT_MAX_LENGTH}
          showCount
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder={`回复 ${target.author}`}
          onChange={(event) => setReplyContent(event.target.value)}
          onPressEnter={(event) => {
            if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
              event.preventDefault();
              handleSubmitComment(target.id);
            }
          }}
          style={{
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: 'var(--c-text)',
          }}
        />
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={() => {
            setReplyTarget(null);
            setReplyContent('');
          }}
          style={{
            height: 40,
            color: 'var(--c-text-muted)',
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={commentMutation.isPending}
          disabled={replyLength < COMMENT_MIN_LENGTH || replyLength > COMMENT_MAX_LENGTH}
          onClick={() => handleSubmitComment(target.id)}
          className="neon-btn"
          style={{
            height: 40,
            borderRadius: 'var(--radius-xs)',
            fontWeight: 700,
          }}
        >
          回复
        </Button>
      </div>
    );
  };

  const renderCommentItem = (comment: TaskComment, isReply = false) => (
    <div style={{
      padding: isReply ? '10px 0' : '0',
      opacity: comment.status === 'pending' ? 0.82 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isReply ? 10 : 12 }}>
        <Avatar
          size={isReply ? 28 : 36}
          icon={<UserOutlined />}
          style={{
            flex: '0 0 auto',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(6,182,212,0.95))',
            boxShadow: '0 0 18px rgba(6,182,212,0.22)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text style={{ color: 'var(--c-text)', fontWeight: 700 }}>{comment.author}</Text>
            {comment.reply_to_author && (
              <Text style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>
                回复 {comment.reply_to_author}
              </Text>
            )}
            <Text style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>
              {formatCommentTime(comment.created_at)}
            </Text>
            {comment.status !== 'approved' && (
              <Text style={{
                color: COMMENT_STATUS_COLOR[comment.status],
                fontSize: 12,
                fontWeight: 700,
              }}>
                {COMMENT_STATUS_LABEL[comment.status]}
              </Text>
            )}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginTop: 6,
          }}>
            <Paragraph style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              color: comment.status === 'rejected' ? 'var(--c-text-muted)' : 'var(--c-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.8,
            }}>
              {comment.content}
            </Paragraph>
            {comment.status === 'approved' && (
              <Tooltip title="回复">
                <Button
                  type="text"
                  size="small"
                  shape="circle"
                  aria-label={`回复 ${comment.author}`}
                  icon={<RollbackOutlined />}
                  onClick={() => {
                    setReplyTarget(comment);
                    setReplyContent('');
                  }}
                  style={{
                    flex: '0 0 auto',
                    width: 28,
                    height: 28,
                    minWidth: 28,
                    color: '#67e8f9',
                    border: 'none',
                    background: 'transparent',
                    boxShadow: 'none',
                  }}
                />
              </Tooltip>
            )}
          </div>
          {comment.status === 'rejected' && comment.review_reason && (
            <Text style={{ color: '#f87171', fontSize: 12 }}>
              {comment.review_reason}
            </Text>
          )}
          {renderReplyInput(comment)}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title={
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--c-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <MessageOutlined />
          评论
          <Tag style={{
            marginLeft: 4,
            border: 'none',
            background: 'transparent',
            color: '#67e8f9',
            borderRadius: 'var(--radius-xs)',
            fontWeight: 700,
          }}>
            {visibleComments.length}
          </Tag>
        </span>
      }
      style={{
        ...glassCardOverflow,
        background: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        border: 'none',
        boxShadow: 'none',
        marginTop: 0,
        animation: 'fadeInUp 0.4s var(--ease-out) 0.35s both',
      }}
      styles={{
        body: { padding: '12px 24px 24px', background: 'transparent' },
        header: {
          minHeight: 0,
          padding: '0 24px',
          borderBottom: 'none',
          background: 'transparent',
        },
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'end',
        marginBottom: 22,
      }}>
        <TextArea
          value={commentContent}
          maxLength={COMMENT_MAX_LENGTH}
          showCount
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder="写下对这个作品的具体看法"
          onChange={(event) => setCommentContent(event.target.value)}
          onPressEnter={(event) => {
            if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
              event.preventDefault();
              handleSubmitComment();
            }
          }}
          style={{
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: 'var(--c-text)',
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={commentMutation.isPending}
          disabled={
            commentContent.trim().length < COMMENT_MIN_LENGTH ||
            commentContent.trim().length > COMMENT_MAX_LENGTH
          }
          onClick={() => handleSubmitComment()}
          className="neon-btn"
          style={{
            height: 40,
            borderRadius: 'var(--radius-xs)',
            fontWeight: 700,
          }}
        >
          发布
        </Button>
      </div>

      <List
        loading={commentsLoading}
        dataSource={rootComments}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无评论" /> }}
        split={false}
        renderItem={(comment) => {
          const replies = repliesByParentId.get(comment.id) ?? [];
          return (
            <List.Item style={{
              padding: '16px 0',
              borderBottom: 'none',
            }}>
              <div style={{ width: '100%' }}>
                {renderCommentItem(comment)}
                {replies.length > 0 && (
                  <div style={{ marginLeft: 48, marginTop: 2 }}>
                    {replies.map((reply) => (
                      <div key={reply.id}>
                        {renderCommentItem(reply, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};
