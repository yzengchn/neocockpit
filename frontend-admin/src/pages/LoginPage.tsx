import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Card } from 'antd';
import { LockOutlined, UserOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { authApi } from '@/services/api';
import { setAdminToken } from '@/services/adminToken';
import { getApiErrorMessage } from '@/utils/format';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const { token } = await authApi.login(values.username, values.password);
      setAdminToken(token);
      message.success('登录成功');
      navigate('/admin');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <Card
        bordered={false}
        style={{
          width: 380,
          background: 'var(--c-bg-card)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--shadow-card)',
        }}
        styles={{ body: { padding: 32 } }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <SafetyCertificateOutlined style={{
            fontSize: 36,
            color: 'var(--c-primary-light)',
            filter: 'drop-shadow(0 0 12px var(--c-glow))',
            marginBottom: 12,
          }} />
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--c-primary-light), var(--c-accent-light))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            管理端登录
          </h2>
          <p style={{
            margin: '8px 0 0',
            color: 'var(--c-text-muted)',
            fontSize: 13,
          }}>
            请输入管理员凭据以继续
          </p>
        </div>

        <Form onFinish={handleLogin} layout="vertical" size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--c-text-muted)' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--c-text-muted)' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="neon-btn"
              style={{ height: 44, fontWeight: 700, fontSize: 15 }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
