import React from 'react';
import { Form, Select, Button, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { AIProviderConfig } from '@/types/task';
import { PROVIDER_SELECT_WIDTH } from '@/constants/styles';

interface ProviderFieldProps {
  providers: AIProviderConfig[];
  loading: boolean;
  creditCost?: number;
  creditsBalance?: number;
}

/** Reusable provider select + submit button field group. */
export const ProviderField: React.FC<ProviderFieldProps> = ({ providers, loading, creditCost, creditsBalance }) => (
  <Space size={8}>
    <Form.Item name="provider" style={{ marginBottom: 0 }}>
      <Select style={{ width: PROVIDER_SELECT_WIDTH }}>
        {providers.map((p) => (
          <Select.Option key={p.value} value={p.value}>{p.name}</Select.Option>
        ))}
      </Select>
    </Form.Item>
    <Button
      type="primary"
      htmlType="submit"
      loading={loading}
      className="neon-btn"
      style={{ height: 40, padding: '0 28px', fontSize: 14 }}
    >
      <RocketOutlined /> 开始生成
    </Button>
    {creditCost !== undefined && creditCost > 0 && (
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: (creditsBalance !== undefined && creditsBalance < creditCost) ? '#ef4444' : '#f59e0b',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}>
        💰 {creditCost} 积分
        {(creditsBalance !== undefined && creditsBalance < creditCost) && ' (不足)'}
      </span>
    )}
    {creditCost === 0 && (
      <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
        免费
      </span>
    )}
  </Space>
);
