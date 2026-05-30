import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, message, Popconfirm,
  Input, Select,
} from 'antd';
import {
  DeleteOutlined, EyeOutlined, SearchOutlined,
} from '@ant-design/icons';
import { taskApi } from '@/services/api';
import { adminTaskApi } from '@/services/admin';
import { Task, TaskStatus, AIProvider, TaskType } from '@/types/task';
import { statusConfig } from '@/constants/status';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;

const providerConfig: Record<string, { color: string; text: string }> = {
  [AIProvider.OPENAI]: { color: '#6366f1', text: 'OpenAI' },
  [AIProvider.DOUBAO]: { color: '#d946ef', text: '豆包' },
  [AIProvider.DASHSCOPE]: { color: '#06b6d4', text: '阿里云' },
};

const taskTypeConfig: Record<string, { color: string; text: string }> = {
  [TaskType.WALLPAPER]: { color: 'green', text: '壁纸' },
  [TaskType.THEME]: { color: 'blue', text: '主题' },
  [TaskType.DIGITAL_HUMAN]: { color: 'purple', text: '数字人' },
  [TaskType.DIY]: { color: 'orange', text: 'DIY生图' },
};

const getTaskDetailUrl = (taskId: string) => {
  const configuredBaseUrl = String(import.meta.env.VITE_WEB_BASE_URL || '').trim();
  const baseUrl = configuredBaseUrl || (() => {
    const url = new URL(window.location.origin);
    if (url.port === '5174') {
      url.port = '5173';
    }
    return url.toString();
  })();

  return new URL(`/tasks/${taskId}`, baseUrl).toString();
};

export const TaskPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [authorFilter, setAuthorFilter] = useState<string | undefined>();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.listTasks(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTaskApi.deleteTask(id),
    onSuccess: () => { message.success('任务已删除'); queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
    onError: () => message.error('删除失败'),
  });

  // Extract unique authors for filter dropdown
  const authorOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.author) set.add(t.author); });
    return Array.from(set).sort().map(a => ({ label: a, value: a }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(search) ||
        t.user_input.toLowerCase().includes(search) ||
        (t.author && t.author.toLowerCase().includes(search))
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter(t => t.task_type === typeFilter);
    }
    if (authorFilter) {
      filtered = filtered.filter(t => t.author === authorFilter);
    }
    return filtered;
  }, [tasks, searchText, statusFilter, typeFilter, authorFilter]);

  const handleDelete = (id: string) => deleteMutation.mutate(id);

  const columns: ColumnsType<Task> = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 110,
      render: (id: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)' }}>{id.slice(0, 8)}</span>,
    },
    {
      title: '类型', dataIndex: 'task_type', key: 'task_type', width: 90,
      render: (type: string) => {
        const cfg = taskTypeConfig[type];
        if (!cfg) return <span>{type}</span>;
        return <Tag color={cfg.color} style={{ borderRadius: 'var(--radius-xs)' }}>{cfg.text}</Tag>;
      },
    },
    {
      title: '作者', dataIndex: 'author', key: 'author', width: 100,
      render: (author: string | undefined) => author
        ? <span style={{ fontWeight: 600 }}>{author}</span>
        : <span style={{ color: 'var(--c-text-muted)' }}>-</span>,
    },
    {
      title: '用户输入', dataIndex: 'user_input', key: 'user_input', ellipsis: true,
      render: (text: string) => <span style={{ color: 'var(--c-text)' }}>{text}</span>,
    },
    {
      title: 'AI供应商', dataIndex: 'ai_provider', key: 'ai_provider', width: 110,
      render: (provider: string) => {
        const config = providerConfig[provider];
        if (!config) return <span style={{ color: 'var(--c-text-muted)' }}>{provider}</span>;
        return (
          <Tag style={{
            borderRadius: 'var(--radius-xs)',
            background: `${config.color}12`,
            color: config.color,
            border: `1px solid ${config.color}25`,
            fontWeight: 600,
          }}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 110,
      render: (status: TaskStatus) => {
        const config = statusConfig[status];
        return (
          <Tag style={{
            borderRadius: 'var(--radius-xs)',
            background: `${config.color}12`,
            color: config.color,
            border: `1px solid ${config.color}25`,
            fontWeight: 600,
          }}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (date: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)' }}>{new Date(date).toLocaleString('zh-CN')}</span>,
    },
    {
      title: '操作', key: 'action', width: 140, align: 'right',
      render: (_: unknown, record: Task) => (
        <div className="admin-table-actions">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            href={getTaskDetailUrl(record.id)}
            target="_blank"
            rel="noopener noreferrer"
            title="在新标签打开任务详情"
          >
            查看
          </Button>
          <Popconfirm title="确认删除" description="确定要删除这个任务吗？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Search
          placeholder="搜索任务ID/用户输入/作者"
          allowClear
          style={{ width: 280, maxWidth: '100%' }}
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          placeholder="任务类型"
          allowClear
          style={{ width: 120 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: '壁纸', value: TaskType.WALLPAPER },
            { label: '车载主题', value: TaskType.THEME },
            { label: '数字人', value: TaskType.DIGITAL_HUMAN },
            { label: 'DIY生图', value: TaskType.DIY },
          ]}
        />
        <Select
          placeholder="作者"
          allowClear
          style={{ width: 140 }}
          value={authorFilter}
          onChange={setAuthorFilter}
          options={authorOptions}
          showSearch
          filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
        />
        <Select
          placeholder="任务状态"
          allowClear
          style={{ width: 140 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: '✅ 成功', value: TaskStatus.COMPLETED },
            { label: '❌ 失败', value: TaskStatus.FAILED },
            { label: '⏳ 排队中', value: TaskStatus.QUEUED },
            { label: '🔄 处理中', value: TaskStatus.PROCESSING },
            { label: '🖼️ 生成背景', value: TaskStatus.GENERATING_BG },
            { label: '🎨 生成图标', value: TaskStatus.GENERATING_ICONS },
            { label: '👤 生成肖像', value: TaskStatus.GENERATING_AVATAR },
            { label: '🧵 生成纹理', value: TaskStatus.GENERATING_TEXTURES },
            { label: '✂️ 切片', value: TaskStatus.SLICING },
            { label: '📦 合成', value: TaskStatus.COMPOSITING },
          ]}
        />
      </div>
      <Table
        className="admin-table"
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1180 }}
      />
    </>
  );
};
