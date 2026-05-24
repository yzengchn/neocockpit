import React from 'react';
import { Form, Select, Button, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { AIProviderConfig } from '@/types/task';
import { PROVIDER_SELECT_WIDTH } from '@/constants/styles';

interface ProviderFieldProps {
  providers: AIProviderConfig[];
  loading: boolean;
}

/** Reusable provider select + submit button field group. */
export const ProviderField: React.FC<ProviderFieldProps> = ({ providers, loading }) => (
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
  </Space>
);
