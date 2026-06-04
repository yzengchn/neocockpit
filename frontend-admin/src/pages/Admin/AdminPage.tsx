import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { Button, Layout, Menu, Space, Spin, Tabs } from 'antd';
import {
  ReloadOutlined, HomeOutlined,
  AppstoreOutlined, LogoutOutlined, CloudServerOutlined,
  UserOutlined,
  DownloadOutlined,
  DollarOutlined,
  ApiOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { clearAdminToken } from '@/services/adminToken';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { getWebHomeUrl } from '@/utils/webUrl';
import type { MenuProps, TabsProps } from 'antd';

const TaskPanel = lazy(() => import('@/pages/Admin/TaskPanel').then(({ TaskPanel }) => ({ default: TaskPanel })));
const IconPanel = lazy(() => import('@/pages/Admin/IconPanel').then(({ IconPanel }) => ({ default: IconPanel })));
const ProviderPanel = lazy(() => import('@/pages/Admin/ProviderPanel').then(({ ProviderPanel }) => ({ default: ProviderPanel })));
const ChannelPanel = lazy(() => import('@/pages/Admin/ChannelPanel').then(({ ChannelPanel }) => ({ default: ChannelPanel })));
const UserPanel = lazy(() => import('@/pages/Admin/UserPanel').then(({ UserPanel }) => ({ default: UserPanel })));
const CreditPricePanel = lazy(() => import('@/pages/Admin/CreditPricePanel').then(({ CreditPricePanel }) => ({ default: CreditPricePanel })));
const DownloadPanel = lazy(() => import('@/pages/Admin/DownloadPanel').then(({ DownloadPanel }) => ({ default: DownloadPanel })));
const NotificationPanel = lazy(() => import('@/pages/Admin/NotificationPanel').then(({ NotificationPanel }) => ({ default: NotificationPanel })));
const FeedbackPanel = lazy(() => import('@/pages/Admin/FeedbackPanel').then(({ FeedbackPanel }) => ({ default: FeedbackPanel })));

type AdminTabKey =
  | 'tasks'
  | 'icon-descriptions'
  | 'ai-providers'
  | 'image-channels'
  | 'users'
  | 'credit-prices'
  | 'downloads'
  | 'notifications'
  | 'feedbacks';

const ADMIN_TABS: Array<{
  key: AdminTabKey;
  title: string;
  icon: React.ReactNode;
  Component: React.LazyExoticComponent<React.ComponentType>;
  queryKeys: QueryKey[];
}> = [
  { key: 'tasks', title: '任务管理', icon: <AppstoreOutlined />, Component: TaskPanel, queryKeys: [ADMIN_QUERY_KEYS.tasks] },
  { key: 'icon-descriptions', title: '图标描述', icon: <AppstoreOutlined />, Component: IconPanel, queryKeys: [ADMIN_QUERY_KEYS.iconDescriptions] },
  { key: 'ai-providers', title: 'AI 提供商', icon: <CloudServerOutlined />, Component: ProviderPanel, queryKeys: [ADMIN_QUERY_KEYS.aiProviders] },
  { key: 'image-channels', title: '图片渠道', icon: <ApiOutlined />, Component: ChannelPanel, queryKeys: [ADMIN_QUERY_KEYS.imageChannels] },
  { key: 'users', title: '用户管理', icon: <UserOutlined />, Component: UserPanel, queryKeys: [ADMIN_QUERY_KEYS.users] },
  { key: 'credit-prices', title: '积分单价', icon: <DollarOutlined />, Component: CreditPricePanel, queryKeys: [ADMIN_QUERY_KEYS.creditPrices] },
  { key: 'downloads', title: '积分记录', icon: <DownloadOutlined />, Component: DownloadPanel, queryKeys: [ADMIN_QUERY_KEYS.downloadList, ADMIN_QUERY_KEYS.downloadStats] },
  { key: 'notifications', title: '公告通知', icon: <BellOutlined />, Component: NotificationPanel, queryKeys: [ADMIN_QUERY_KEYS.notifications] },
  { key: 'feedbacks', title: '建议反馈', icon: <MessageOutlined />, Component: FeedbackPanel, queryKeys: [ADMIN_QUERY_KEYS.feedbacks] },
];

const { Sider, Content } = Layout;
const DEFAULT_ADMIN_TAB: AdminTabKey = 'tasks';
const FIXED_ADMIN_TABS = new Set<AdminTabKey>([DEFAULT_ADMIN_TAB]);
const ADMIN_SIDER_WIDTH = 176;
const ADMIN_SIDER_COLLAPSED_WIDTH = 56;

const PanelFallback: React.FC = () => (
  <div style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}>
    <Spin />
  </div>
);

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeKey, setActiveKey] = useState<AdminTabKey>(DEFAULT_ADMIN_TAB);
  const [openKeys, setOpenKeys] = useState<AdminTabKey[]>([DEFAULT_ADMIN_TAB]);
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeTab = ADMIN_TABS.find((tab) => tab.key === activeKey) ?? ADMIN_TABS[0];

  const menuItems = useMemo<MenuProps['items']>(
    () => ADMIN_TABS.map(({ key, title, icon }) => ({ key, icon, label: title })),
    [],
  );

  const openTabConfigs = useMemo(
    () => openKeys
      .map((key) => ADMIN_TABS.find((tab) => tab.key === key))
      .filter((tab): tab is (typeof ADMIN_TABS)[number] => Boolean(tab)),
    [openKeys],
  );

  const tabItems = useMemo(
    () => openTabConfigs.map(({ key, title, icon, Component }) => ({
      key,
      label: (
        <span className="admin-page-tab-label">
          {icon}
          <span>{title}</span>
        </span>
      ),
      closable: !FIXED_ADMIN_TABS.has(key),
      children: (
        <Suspense fallback={<PanelFallback />}>
          <Component />
        </Suspense>
      ),
    })),
    [openTabConfigs],
  );

  const openAdminPage = (key: AdminTabKey) => {
    setOpenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setActiveKey(key);
  };

  const closeAdminPage = (key: AdminTabKey) => {
    if (FIXED_ADMIN_TABS.has(key)) {
      return;
    }
    setOpenKeys((prev) => {
      const targetIndex = prev.indexOf(key);
      const nextKeys = prev.filter((item) => item !== key);
      if (activeKey === key) {
        setActiveKey(nextKeys[targetIndex - 1] ?? nextKeys[targetIndex] ?? DEFAULT_ADMIN_TAB);
      }
      return nextKeys.length ? nextKeys : [DEFAULT_ADMIN_TAB];
    });
  };

  const handleTabEdit: TabsProps['onEdit'] = (targetKey, action) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      closeAdminPage(targetKey as AdminTabKey);
    }
  };

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
    <div className="admin-page-frame">
      <Layout className="admin-layout-shell">
        <Sider
          className="admin-sider"
          width={ADMIN_SIDER_WIDTH}
          collapsedWidth={ADMIN_SIDER_COLLAPSED_WIDTH}
          breakpoint="lg"
          collapsible
          collapsed={collapsed}
          trigger={null}
          onCollapse={setCollapsed}
        >
          <div className="admin-brand">
            <div className="admin-brand-mark">N</div>
            <div className="admin-brand-text">
              <span>NeoCockpit</span>
              <small>管理后台</small>
            </div>
            <Button
              className="admin-sider-toggle"
              type="text"
              size="small"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
              onClick={() => setCollapsed((prev) => !prev)}
            />
          </div>
          <Menu
            mode="inline"
            items={menuItems}
            selectedKeys={[activeKey]}
            inlineCollapsed={collapsed}
            onClick={({ key }) => openAdminPage(key as AdminTabKey)}
          />
        </Sider>

        <Layout className="admin-main">
          <header className="admin-topbar">
            <div className="admin-page-title">
              <h2>{activeTab.title}</h2>
              <span>管理后台</span>
            </div>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>刷新</Button>
              <Button type="primary" icon={<HomeOutlined />} href={getWebHomeUrl()} className="neon-btn">返回首页</Button>
              <Button danger icon={<LogoutOutlined />} onClick={() => { clearAdminToken(); navigate('/login'); }}>退出登录</Button>
            </Space>
          </header>

          <Content className="admin-content">
            <Tabs
              className="admin-page-tabs"
              type="editable-card"
              hideAdd
              activeKey={activeKey}
              onChange={(key) => setActiveKey(key as AdminTabKey)}
              onEdit={handleTabEdit}
              items={tabItems}
            />
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};
