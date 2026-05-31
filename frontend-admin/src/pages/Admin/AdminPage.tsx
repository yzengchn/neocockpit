import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { Card, Button, Space, Spin, Tabs } from 'antd';
import {
  ReloadOutlined, HomeOutlined,
  AppstoreOutlined, LogoutOutlined, CloudServerOutlined,
  UserOutlined,
  DownloadOutlined,
  DollarOutlined,
  ApiOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { clearAdminToken } from '@/services/adminToken';
import { glassCard, gradientHeading } from '@/constants/styles';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { getWebHomeUrl } from '@/utils/webUrl';

const TaskPanel = lazy(() => import('@/pages/Admin/TaskPanel').then(({ TaskPanel }) => ({ default: TaskPanel })));
const IconPanel = lazy(() => import('@/pages/Admin/IconPanel').then(({ IconPanel }) => ({ default: IconPanel })));
const ProviderPanel = lazy(() => import('@/pages/Admin/ProviderPanel').then(({ ProviderPanel }) => ({ default: ProviderPanel })));
const ChannelPanel = lazy(() => import('@/pages/Admin/ChannelPanel').then(({ ChannelPanel }) => ({ default: ChannelPanel })));
const UserPanel = lazy(() => import('@/pages/Admin/UserPanel').then(({ UserPanel }) => ({ default: UserPanel })));
const CreditPricePanel = lazy(() => import('@/pages/Admin/CreditPricePanel').then(({ CreditPricePanel }) => ({ default: CreditPricePanel })));
const DownloadPanel = lazy(() => import('@/pages/Admin/DownloadPanel').then(({ DownloadPanel }) => ({ default: DownloadPanel })));
const NotificationPanel = lazy(() => import('@/pages/Admin/NotificationPanel').then(({ NotificationPanel }) => ({ default: NotificationPanel })));

type AdminTabKey =
  | 'tasks'
  | 'icon-descriptions'
  | 'ai-providers'
  | 'image-channels'
  | 'users'
  | 'credit-prices'
  | 'downloads'
  | 'notifications';

const ADMIN_TABS: Array<{
  key: AdminTabKey;
  label: React.ReactNode;
  Component: React.LazyExoticComponent<React.ComponentType>;
  queryKeys: QueryKey[];
}> = [
  { key: 'tasks', label: '任务管理', Component: TaskPanel, queryKeys: [ADMIN_QUERY_KEYS.tasks] },
  { key: 'icon-descriptions', label: <span><AppstoreOutlined /> 图标描述</span>, Component: IconPanel, queryKeys: [ADMIN_QUERY_KEYS.iconDescriptions] },
  { key: 'ai-providers', label: <span><CloudServerOutlined /> AI 提供商</span>, Component: ProviderPanel, queryKeys: [ADMIN_QUERY_KEYS.aiProviders] },
  { key: 'image-channels', label: <span><ApiOutlined /> 图片渠道</span>, Component: ChannelPanel, queryKeys: [ADMIN_QUERY_KEYS.imageChannels] },
  { key: 'users', label: <span><UserOutlined /> 用户管理</span>, Component: UserPanel, queryKeys: [ADMIN_QUERY_KEYS.users] },
  { key: 'credit-prices', label: <span><DollarOutlined /> 积分单价</span>, Component: CreditPricePanel, queryKeys: [ADMIN_QUERY_KEYS.creditPrices] },
  { key: 'downloads', label: <span><DownloadOutlined /> 积分记录</span>, Component: DownloadPanel, queryKeys: [ADMIN_QUERY_KEYS.downloadList, ADMIN_QUERY_KEYS.downloadStats] },
  { key: 'notifications', label: <span><BellOutlined /> 公告通知</span>, Component: NotificationPanel, queryKeys: [ADMIN_QUERY_KEYS.notifications] },
];

const PanelFallback: React.FC = () => (
  <div style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}>
    <Spin />
  </div>
);

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeKey, setActiveKey] = useState<AdminTabKey>('tasks');
  const [refreshing, setRefreshing] = useState(false);

  const activeTab = ADMIN_TABS.find((tab) => tab.key === activeKey) ?? ADMIN_TABS[0];

  const tabItems = useMemo(
    () => ADMIN_TABS.map(({ key, label, Component }) => ({
      key,
      label,
      children: activeKey === key
        ? (
          <Suspense fallback={<PanelFallback />}>
            <Component />
          </Suspense>
        )
        : null,
    })),
    [activeKey],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        activeTab.queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(16px, 4vw, 40px) clamp(12px, 3vw, 24px)' }}>
      <Card
        className="admin-shell"
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 1440,
          margin: '0 auto',
          ...glassCard,
        }}
        styles={{ body: { padding: 'clamp(16px, 3vw, 32px)', minWidth: 0 } }}
      >
        {/* Header */}
        <div style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <h2 style={{
            ...gradientHeading,
            fontSize: 22,
            letterSpacing: '-0.3px',
          }}>
            管理后台
          </h2>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>刷新</Button>
            <Button type="primary" icon={<HomeOutlined />} href={getWebHomeUrl()} className="neon-btn">返回首页</Button>
            <Button danger icon={<LogoutOutlined />} onClick={() => { clearAdminToken(); navigate('/admin/login'); }}>退出登录</Button>
          </Space>
        </div>

        <Tabs
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key as AdminTabKey)}
          items={tabItems}
        />
      </Card>
    </div>
  );
};
