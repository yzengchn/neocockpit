import React, { useMemo } from 'react';
import { Typography, Image } from 'antd';
import { imageFrame, imageLabel } from '@/constants/styles';

const { Text } = Typography;

interface ImageBlockProps {
  label: string;
  src?: string;
  alt: string;
}

/** Append user token to /api/resource/ URLs for authenticated access. */
function withToken(url: string): string {
  if (!url.startsWith('/api/resource/')) return url;
  const token = localStorage.getItem('aigc_user_token');
  if (!token) return url;
  return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
}

/** Reusable labeled image block (used in TaskDetailPage generated results). */
export const ImageBlock: React.FC<ImageBlockProps> = ({ label, src, alt }) => {
  if (!src) return null;
  const authSrc = useMemo(() => withToken(src), [src]);
  return (
    <>
      <Text style={imageLabel}>{label}</Text>
      <div style={imageFrame}>
        <Image src={authSrc} alt={alt} preview={{ mask: '点击查看大图' }} style={{ width: '100%', display: 'block' }} />
      </div>
    </>
  );
};
