import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, message, Popconfirm,
  Input, Select,
} from 'antd';
import {
  DeleteOutlined, EyeOutlined, SearchOutlined,
} from '@ant-design/icons';
import { taskApi } from '@/services/api';
import { adminTaskApi } from '@/services/admin';
import { Task, TaskStatus } from '@/types/task';
import { TASK_STATUS_FILTER_OPTIONS, TASK_TYPE_OPTIONS } from '@/constants/adminMeta';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { ProviderTag, TaskStatusTag, TaskTypeTag } from '@/components/admin/TableTags';
import { formatDateTime } from '@/utils/format';
import { getWebTaskDetailUrl } from '@/utils/webUrl';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;

export const TaskPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [authorFilter, setAuthorFilter] = useState<string | undefined>();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.tasks,
    queryFn: () => taskApi.listTasks(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTaskApi.deleteTask(id),
    onSuccess: () => { message.success('任务已删除'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.tasks }); },
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
      render: (type: string) => <TaskTypeTag type={type} />,
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
      render: (provider: string | undefined) => <ProviderTag provider={provider} />,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 110,
      render: (status: TaskStatus) => <TaskStatusTag status={status} />,
    },
    {
      title: '浏览量', dataIndex: 'views', key: 'views', width: 90, align: 'right',
      sorter: (a, b) => (a.views ?? 0) - (b.views ?? 0),
      render: (views: number | undefined) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <EyeOutlined />
          {views ?? 0}
        </span>
      ),
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (date: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)' }}>{formatDateTime(date)}</span>,
    },
    {
      title: '操作', key: 'action', width: 140, align: 'right',
      render: (_: unknown, record: Task) => (
        <div className="admin-table-actions">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            href={getWebTaskDetailUrl(record.id)}
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
          options={[...TASK_TYPE_OPTIONS]}
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
          options={[...TASK_STATUS_FILTER_OPTIONS]}
        />
      </div>
      <Table
        className="admin-table"
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 1260 }}
      />
    </>
  );
};
