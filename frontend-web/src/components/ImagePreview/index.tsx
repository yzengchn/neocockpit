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

type PreviewImage = { name: string; path: string; url: string };

const imageButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'zoom-in',
  lineHeight: 0,
};

const stableImageStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
};

const uniquePreviewImages = (items: PreviewImage[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState(0);
  const [previewItems, setPreviewItems] = useState<PreviewImage[]>([]);

  const authenticatedImages: PreviewImage[] = (images ?? [])
    .map((image) => ({ ...image, url: toResourceUrl(image.path) }))
    .filter((image) => Boolean(image.url));

  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = (mode: 'single' | 'grid') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const openPreview = (items: PreviewImage[], current = 0) => {
    const validItems = uniquePreviewImages(items);
    if (validItems.length === 0) return;
    setPreviewItems(validItems);
    setPreviewCurrent(Math.min(Math.max(current, 0), validItems.length - 1));
    setPreviewVisible(true);
  };

  const previewController = (
    <Image.PreviewGroup
      items={previewItems.map((item) => ({ src: item.url, alt: item.name }))}
      preview={{
        visible: previewVisible,
        current: previewCurrent,
        onVisibleChange: (visible) => setPreviewVisible(visible),
        onChange: (current) => setPreviewCurrent(current),
      }}
    />
  );

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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 10,
            maxHeight: 500,
            overflowY: 'auto',
          }}>
            {authenticatedImages.map((image, index) => (
              <div key={image.path} style={{
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
                }}>
                  <button
                    type="button"
                    aria-label={`查看${image.name}大图`}
                    title="查看大图"
                    onClick={() => openPreview(authenticatedImages, index)}
                    style={imageButtonStyle}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      style={stableImageStyle}
                    />
                  </button>
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
          {previewController}
        </div>
      );
    }

    // Default: single large image view
    const displayPath = imagePath || images[0].path;
    const displayUrl = toResourceUrl(displayPath);
    const displayName = authenticatedImages.find((image) => image.path === displayPath)?.name ?? alt;
    const displayItem = displayUrl ? { name: displayName, path: displayPath, url: displayUrl } : undefined;
    const singlePreviewItems = displayItem
      ? uniquePreviewImages([displayItem, ...authenticatedImages])
      : authenticatedImages;
    const displayPreviewIndex = displayItem
      ? Math.max(singlePreviewItems.findIndex((image) => image.url === displayItem.url), 0)
      : 0;

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
        <div style={{
          minHeight: 320,
          maxHeight: 560,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--c-bg-card-solid)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}>
          {displayItem && (
            <button
              type="button"
              aria-label="查看图片预览大图"
              title="点击查看大图"
              onClick={() => openPreview(singlePreviewItems, displayPreviewIndex)}
              style={imageButtonStyle}
            >
              <img
                src={displayItem.url}
                alt={alt}
                style={{ ...stableImageStyle, maxHeight: 560, borderRadius: 'var(--radius-sm)' }}
              />
            </button>
          )}
        </div>
        {previewController}
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
          {authenticatedImages.map((image) => (
            <div
              key={image.path}
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
                  src={image.url}
                  alt={image.name}
                  style={stableImageStyle}
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
    const displayUrl = toResourceUrl(imagePath);
    const displayItem = displayUrl ? { name: alt, path: imagePath, url: displayUrl } : undefined;
    return (
      <div style={{ padding: 2, background: 'var(--c-bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--c-border)' }}>
        <Text strong style={{ display: 'block', marginBottom: 14, fontSize: 12, color: 'var(--c-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          图片预览
        </Text>
        {displayItem && (
          <button
            type="button"
            aria-label="查看图片预览大图"
            title="点击查看大图"
            onClick={() => openPreview([displayItem], 0)}
            style={{ ...imageButtonStyle, height: 'auto' }}
          >
            <img
              src={displayItem.url}
              alt={alt}
              style={{ ...stableImageStyle, borderRadius: 'var(--radius-sm)' }}
            />
          </button>
        )}
        {previewController}
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
