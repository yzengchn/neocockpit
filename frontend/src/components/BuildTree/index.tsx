import React, { useState, useMemo } from 'react';
import { Tree, Typography } from 'antd';
import { FileImageOutlined, FileOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { BuildTree } from '@/types/task';

const { Text } = Typography;

interface BuildTreeViewerProps {
  buildTree: BuildTree;
  onSelect: (path: string, isDirectory: boolean) => void;
}

const directoryNameMap: Record<string, string> = {
  'icons': '图标', 'icon': '图标', 'backgrounds': '背景', 'background': '背景',
  'images': '图片', 'image': '图片', 'assets': '资源', 'slices': '切片',
  'slice': '切片', 'preview': '预览', 'previews': '预览', 'output': '输出',
  'product': '产品', 'resources': '资源', 'textures': '纹理', 'materials': '材质',
  'models': '模型', 'sprites': '精灵图', 'ui': '界面', 'fonts': '字体',
  'sounds': '音效', 'music': '音乐', 'videos': '视频', 'animations': '动画',
  'effects': '特效', 'particles': '粒子', 'shaders': '着色器', 'configs': '配置',
  'data': '数据', 'scripts': '脚本', 'scenes': '场景', 'prefabs': '预制体',
  'temp': '临时', 'cache': '缓存', 'build': '构建', 'dist': '分发',
  'src': '源码', 'public': '公共', 'static': '静态', 'docs': '文档',
  'generate': '产物', 'ac': '空调','media': '媒体','tire': '胎压','weather': '天气'
};

const getDirectoryDisplayName = (key: string): string => directoryNameMap[key.toLowerCase()] || key;

const convertToTreeData = (tree: BuildTree, parentKey = ''): DataNode[] => {
  const entries = Object.entries(tree);
  const files: Array<[string, any]> = [];
  const directories: Array<[string, any]> = [];
  entries.forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'type' in value) files.push([key, value]);
    else directories.push([key, value]);
  });
  const sortedEntries = [...files, ...directories];
  return sortedEntries.map(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}/${key}` : key;
    if (value && typeof value === 'object' && 'type' in value) {
      const urlPath = 'path' in value ? String((value as any).path) : fullKey;
      const fileType = (value as any).type;
      const fileIcon = fileType === 'mesh'
        ? <FileOutlined style={{ color: 'var(--c-primary-light)' }} />
        : fileType === 'file'
          ? <FileOutlined style={{ color: 'var(--c-text-muted)' }} />
          : <FileImageOutlined style={{ color: 'var(--c-accent-light)' }} />;
      return { title: key, key: fullKey, icon: fileIcon, isLeaf: true, isDirectory: false, urlPath } as any;
    }
    const displayName = getDirectoryDisplayName(key);
    const titleNode = (
      <span>
        {key}
        {displayName !== key && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>({displayName})</Text>}
      </span>
    );
    return {
      title: titleNode,
      key: fullKey,
      icon: ({ expanded }: { expanded?: boolean }) =>
        expanded ? <FolderOpenOutlined style={{ color: 'var(--c-accent)' }} /> : <FolderOutlined style={{ color: 'var(--c-primary-light)' }} />,
      children: convertToTreeData(value as BuildTree, fullKey),
      isDirectory: true,
    };
  });
};

export const BuildTreeViewer: React.FC<BuildTreeViewerProps> = ({ buildTree, onSelect }) => {
  const treeData = useMemo(() => convertToTreeData(buildTree), [buildTree]);

  // Collect directory keys to expand by default:
  // - Expand all dirs that have sub-dirs, EXCEPT children of "icons" (too many sub-dirs)
  // - Expand the "icons" dir itself, but not its children
  const defaultExpandedKeys = useMemo(() => {
    const keys: React.Key[] = [];
    const collect = (nodes: DataNode[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          const nodeKey = String(node.key);
          const isIconsDir = nodeKey === 'icons' || nodeKey.endsWith('/icons');
          if (isIconsDir) {
            // Only expand the icons directory itself, NOT its children
            keys.push(node.key);
            continue;
          }
          const hasSubDir = node.children.some(c => c.children && c.children.length > 0);
          if (hasSubDir) {
            keys.push(node.key);
            collect(node.children);
          }
        }
      }
    };
    collect(treeData);
    return keys;
  }, [treeData]);

  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(defaultExpandedKeys);

  // Re-sync expanded keys when tree data changes
  React.useEffect(() => {
    setExpandedKeys(defaultExpandedKeys);
  }, [defaultExpandedKeys]);

  const findNodeInfo = (nodes: DataNode[], key: string): { isDirectory: boolean; urlPath?: string } | null => {
    for (const node of nodes) {
      if (node.key === key) return { isDirectory: (node as any).isDirectory || false, urlPath: (node as any).urlPath };
      if (node.children) { const found = findNodeInfo(node.children, key); if (found) return found; }
    }
    return null;
  };

  const handleSelect = (keys: React.Key[]) => {
    setSelectedKeys(keys);
    if (keys.length > 0) {
      const key = keys[0] as string;
      const nodeInfo = findNodeInfo(treeData, key);
      if (nodeInfo && !nodeInfo.isDirectory && nodeInfo.urlPath) {
        onSelect(nodeInfo.urlPath, false);
      } else {
        onSelect(key, nodeInfo?.isDirectory || false);
      }
    }
  };

  return (
    <div>
      <Text style={{ display: 'block', marginBottom: 10, fontSize: 12, color: 'var(--c-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
        文件树
      </Text>
      <Tree
        showIcon
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys)}
        selectedKeys={selectedKeys}
        treeData={treeData}
        onSelect={handleSelect}
        style={{ background: 'transparent', fontSize: 13 }}
      />
    </div>
  );
};
