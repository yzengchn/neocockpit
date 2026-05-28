import React, { useState } from 'react';
import { Image, Empty, Typography, Button } from 'antd';
import { AppstoreOutlined, PictureOutlined } from '@ant-design/icons';
import { toResourceUrl } from '@/utils/url';

const { Text } = Typography;

interface ImagePreviewProps {
  imagePath?: string;
  images?: Array<{ name: string; path: string }>;
  alt?: string;
  onSelectImage?: (path: string) => void;
  /** When true, show enhanced preview experience */
  autoPreview?: boolean;
  /** External view mode override */
  viewMode?: 'single' | 'grid';
  /** Callback when view mode changes */
  onViewModeChange?: (mode: 'single' | 'grid') => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imagePath,
  images,
  alt = 'Preview',
  onSelectImage,
  autoPreview = false,
  viewMode: externalViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'single' | 'grid'>('single');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = (mode: 'single' | 'grid') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  // autoPreview mode: single image view by default, switchable to grid
  if (autoPreview && images && images.length > 0) {
    if (viewMode === 'grid') {
      return (
        <div style={{
          background: 'var(--c-bg-card)',
          borderRadius: 'var(--radius-md)',
          padding: 2,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 12, color: 'var(--c-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              所有图片 ({images.length})
            </Text>
            <Button size="small" type="text" icon={<PictureOutlined />}
              onClick={() => setViewMode('single')}
              style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>
              单图预览
            </Button>
          </div>
          <Image.PreviewGroup>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
              maxHeight: 500,
              overflowY: 'auto',
            }}>
              {images.map((image, index) => (
                <div key={index} style={{
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--c-border)',
                  background: 'var(--c-bg-card-solid)',
                  transition: 'border-color 0.3s var(--ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-border-active)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                >
                  <div style={{
                    width: '100%',
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}>
                    <Image
                      src={toResourceUrl(image.path)}
                      alt={image.name}
                      preview={{ mask: '查看大图' }}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <Text style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      color: 'var(--c-text-muted)', lineHeight: 1.3,
                    }} ellipsis={{ tooltip: image.name }}>
                      {image.name}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        </div>
      );
    }

    // Default: single large image view
    const displayPath = toResourceUrl(imagePath || images[0].path);
    return (
      <div style={{
        background: 'var(--c-bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 2,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: 'var(--c-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            图片预览
          </Text>
          <Button size="small" type="text" icon={<AppstoreOutlined />}
            onClick={() => setViewMode('grid')}
            style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>
            网格浏览 ({images.length})
          </Button>
        </div>
        <Image
          src={toResourceUrl(displayPath)}
          alt={alt}
          preview={{ mask: '点击查看大图' }}
          style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }}
        />
      </div>
    );
  }

  // Non-autoPreview mode: grid view
  if (images && images.length > 0) {
    return (
      <div style={{ padding: 2, background: 'var(--c-bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--c-border)' }}>
        <Text strong style={{ display: 'block', marginBottom: 14, fontSize: 12, color: 'var(--c-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          图片预览 ({images.length})
        </Text>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 14,
          maxHeight: 560,
          overflowY: 'auto',
          padding: 4
        }}>
          {images.map((image, index) => (
            <div
              key={index}
              onClick={() => onSelectImage?.(image.path)}
              style={{
                cursor: 'pointer',
                padding: 10,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--c-border)',
                background: 'var(--c-bg-card-solid)',
                transition: 'border-color 0.3s var(--ease-out), transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--c-border-active)';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--c-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '100%',
                height: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--c-bg-elevated)',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden',
              }}>
                <img
                  src={toResourceUrl(image.path)}
                  alt={image.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
              <Text style={{
                fontSize: 11,
                textAlign: 'center',
                wordBreak: 'break-all',
                lineHeight: 1.4,
                color: 'var(--c-text-muted)',
                width: '100%',
                fontFamily: 'var(--font-mono)',
              }} ellipsis={{ tooltip: image.name }}>
                {image.name}
              </Text>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single image without autoPreview
  if (imagePath) {
    return (
      <div style={{ padding: 2, background: 'var(--c-bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--c-border)' }}>
        <Text strong style={{ display: 'block', marginBottom: 14, fontSize: 12, color: 'var(--c-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          图片预览
        </Text>
        <Image
          src={toResourceUrl(imagePath || '')}
          alt={alt}
          style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }}
          preview={{ mask: '点击查看大图' }}
        />
      </div>
    );
  }

  // Empty state
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--c-bg-card)',
      borderRadius: 'var(--radius-md)',
      minHeight: 300,
    }}>
      <Empty description={<span style={{ color: 'var(--c-text-muted)' }}>点击文件树查看图片</span>} />
    </div>
  );
};
