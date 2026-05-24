import React from 'react';
import { Typography, Image } from 'antd';
import { imageFrame, imageLabel } from '@/constants/styles';

const { Text } = Typography;

interface ImageBlockProps {
  label: string;
  src?: string;
  alt: string;
}

/** Reusable labeled image block (used in TaskDetailPage generated results). */
export const ImageBlock: React.FC<ImageBlockProps> = ({ label, src, alt }) => {
  if (!src) return null;
  return (
    <>
      <Text style={imageLabel}>{label}</Text>
      <div style={imageFrame}>
        <Image src={src} alt={alt} preview={{ mask: '点击查看大图' }} style={{ width: '100%', display: 'block' }} />
      </div>
    </>
  );
};
