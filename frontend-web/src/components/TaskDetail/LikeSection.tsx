import React, { useMemo, useState } from 'react';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { isUserLoggedIn, taskApi } from '@/services/api';

interface LikeSectionProps {
  taskId: string;
  likes: number;
  containerStyle?: React.CSSProperties;
}

export const LikeSection: React.FC<LikeSectionProps> = ({ taskId, likes, containerStyle }) => {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const { data: likedTaskIds } = useQuery({
    queryKey: ['myLikedTaskIds'],
    queryFn: () => taskApi.listMyLikedTaskIds(),
    enabled: isUserLoggedIn(),
    staleTime: 60_000,
  });

  const likedByMe = likedTaskIds?.includes(taskId) ?? false;

  const likeMutation = useMutation({
    mutationFn: () => taskApi.likeTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myLikedTaskIds'] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        message.warning('请先登录后再点赞');
      } else if (err?.response?.status === 409) {
        message.info('你已经点赞过该任务');
      } else {
        message.error('点赞失败，请稍后再试');
      }
    },
  });

  const disabled = likedByMe || likeMutation.isPending;
  const activeHover = isHovered && !disabled;

  const buttonStyle = useMemo<React.CSSProperties>(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 116,
    padding: '12px 32px',
    borderRadius: 'var(--radius-xl)',
    border: likedByMe ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(239,68,68,0.25)',
    background: likedByMe || activeHover ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.08)',
    boxShadow: likedByMe || activeHover ? '0 0 32px rgba(239,68,68,0.32)' : '0 0 24px rgba(239,68,68,0.12)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transform: activeHover ? 'scale(1.06)' : 'scale(1)',
    transition: 'all 0.3s var(--ease-out)',
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.5px',
    userSelect: 'none',
    outline: 'none',
  }), [activeHover, disabled, likedByMe]);

  const handleLike = () => {
    if (likedByMe || likeMutation.isPending) return;
    if (!isUserLoggedIn()) {
      message.warning('请先登录后再点赞');
      return;
    }
    likeMutation.mutate();
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 28,
      animation: 'fadeInUp 0.4s var(--ease-out) 0.3s both',
      ...containerStyle,
    }}>
      <button
        type="button"
        aria-label={likedByMe ? `已点赞，当前${likes}个赞` : `点赞，当前${likes}个赞`}
        onClick={handleLike}
        disabled={disabled}
        style={buttonStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {likedByMe ? (
          <HeartFilled style={{ fontSize: 22, color: '#ef4444', filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }} />
        ) : (
          <HeartOutlined style={{ fontSize: 22, color: '#ef4444', filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }} />
        )}
        <span>{likes}</span>
      </button>
    </div>
  );
};
