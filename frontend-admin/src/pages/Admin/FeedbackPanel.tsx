import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Tag, Typography, Space, Tooltip } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { adminFeedbackApi, type FeedbackItem } from '@/services/admin';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { formatDateTime } from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';

const { Text, Paragraph } = Typography;
const FEEDBACK_PAGE_SIZE = 20;

export const FeedbackPanel: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.feedbacks, page],
    queryFn: () => adminFeedbackApi.list(page, FEEDBACK_PAGE_SIZE),
  });

  const columns: ColumnsType<FeedbackItem> = [
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (value: string) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#9ca3af' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(value)}
          </Text>
        </Space>
      ),
    },
    {
      title: '用户',
      key: 'user',
      width: 140,
      render: (_: unknown, record: FeedbackItem) => (
        <Space size={4}>
          <UserOutlined style={{ color: record.user_id ? '#818cf8' : '#9ca3af' }} />
          {record.user_nick_name ? (
            <Text>{record.user_nick_name}</Text>
          ) : (
            <Text type="secondary">游客</Text>
          )}
        </Space>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip title={text}>
          <Text strong>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip title={text}>
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 0, color: 'var(--c-text-secondary)' }}
          >
            {text}
          </Paragraph>
        </Tooltip>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
      width: 160,
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip title={text}>
          <Text copyable={{ text }}>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
      render: (text: string | null) => (
        <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {text || '-'}
        </Text>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>建议反馈</span>
          {data && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              共 {data.total} 条
            </Tag>
          )}
        </Space>
      }
      bordered={false}
    >
      <Table
        columns={columns}
        dataSource={data?.items || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: FEEDBACK_PAGE_SIZE,
          total: data?.total || 0,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
          onChange: setPage,
        }}
        size="small"
      />
    </Card>
  );
};

export default FeedbackPanel;
