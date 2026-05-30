import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { adminNotificationApi } from '@/services/admin';
import type {
  NotificationCreate,
  NotificationItem,
  NotificationLevel,
  NotificationUpdate,
} from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { TextArea } = Input;

const LEVEL_OPTIONS: Array<{ value: NotificationLevel; label: string; color: string }> = [
  { value: 'info', label: '普通', color: 'blue' },
  { value: 'success', label: '成功', color: 'green' },
  { value: 'warning', label: '提醒', color: 'gold' },
  { value: 'error', label: '重要', color: 'red' },
];

const LEVEL_META = Object.fromEntries(LEVEL_OPTIONS.map((item) => [item.value, item]));

interface NotificationFormValues {
  title: string;
  content: string;
  level: NotificationLevel;
  enabled: boolean;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const NotificationModal: React.FC<{
  open: boolean;
  editing: NotificationItem | null;
  onOk: (values: NotificationFormValues) => void;
  onCancel: () => void;
}> = ({ open, editing, onOk, onCancel }) => {
  const [form] = Form.useForm<NotificationFormValues>();

  return (
    <Modal
      title={editing ? '编辑通知' : '发布通知'}
      open={open}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      okText="保存"
      destroyOnClose
      width={600}
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue(editing
            ? {
              title: editing.title,
              content: editing.content,
              level: editing.level,
              enabled: editing.enabled,
            }
            : {
              title: '',
              content: '',
              level: 'info',
              enabled: true,
            });
        }
      }}
    >
      <Form form={form} layout="vertical" preserve>
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入通知标题' }]}>
          <Input maxLength={120} showCount placeholder="如：模型渠道维护通知" />
        </Form.Item>
        <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入通知内容' }]}>
          <TextArea rows={5} maxLength={2000} showCount placeholder="输入要展示给用户的通知内容" />
        </Form.Item>
        <Form.Item name="level" label="类型" rules={[{ required: true }]}>
          <Select options={LEVEL_OPTIONS.map(({ value, label }) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="enabled" label="发布状态" valuePropName="checked">
          <Switch checkedChildren="展示" unCheckedChildren="隐藏" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const NotificationPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => adminNotificationApi.listAll(),
  });

  const createMut = useMutation({
    mutationFn: (data: NotificationCreate) => adminNotificationApi.create(data),
    onSuccess: () => {
      message.success('通知已发布');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => message.error('通知发布失败'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NotificationUpdate }) => adminNotificationApi.update(id, data),
    onSuccess: () => {
      message.success('通知已更新');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => message.error('通知更新失败'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminNotificationApi.delete(id),
    onSuccess: () => {
      message.success('通知已删除');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => message.error('通知删除失败'),
  });

  const handleOk = (values: NotificationFormValues) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const columns: ColumnsType<NotificationItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (value: string) => <Text style={{ color: 'var(--c-text-secondary)' }}>{value}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'level',
      key: 'level',
      width: 88,
      render: (value: NotificationLevel) => {
        const meta = LEVEL_META[value] ?? LEVEL_META.info;
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 88,
      render: (value: boolean, record) => (
        <Switch
          size="small"
          checked={value}
          checkedChildren="展示"
          unCheckedChildren="隐藏"
          onChange={(checked) => updateMut.mutate({ id: record.id, data: { enabled: checked } })}
        />
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'right',
      render: (_: unknown, record) => (
        <div className="admin-table-actions">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后用户端不再展示这条通知"
            onConfirm={() => deleteMut.mutate(record.id)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="neon-btn"
        >
          发布通知
        </Button>
        <Tag icon={<BellOutlined />} color="cyan">
          展示中 {items.filter((item) => item.enabled).length} / 全部 {items.length}
        </Tag>
      </div>
      <Table
        className="admin-table"
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        scroll={{ x: 920 }}
      />
      <NotificationModal
        open={modalOpen}
        editing={editing}
        onOk={handleOk}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
      />
    </>
  );
};
