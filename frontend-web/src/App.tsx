import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HomePage } from './pages/HomePage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import ProfilePage from './pages/ProfilePage';
import '@/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 10_000,
      gcTime: 5 * 60_000,
    },
  },
});

const App: React.FC = () => {
   return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 14,
          fontFamily: "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
          colorBgContainer: '#0e1018',
          colorBgElevated: '#161825',
          colorBgLayout: '#08090d',
          colorBorder: 'rgba(99,102,241,0.14)',
          colorText: '#e4e4e7',
          colorTextSecondary: '#9ca3af',
        },
        components: {
          Card: { colorBgContainer: '#0e1018' },
          Table: { colorBgContainer: '#0e1018' },
          Input: { colorBgContainer: '#111320' },
          Select: { colorBgContainer: '#111320' },
          Modal: { contentBg: '#161825', headerBg: '#161825' },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="app-shell">
            {/* grid background */}
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            {/* top-center radial glow */}
            <div style={{
              position: 'fixed',
              top: -320,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 1000,
              height: 600,
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.04) 40%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            {/* bottom-right accent glow */}
            <div style={{
              position: 'fixed',
              bottom: -200,
              right: -100,
              width: 500,
              height: 500,
              background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
