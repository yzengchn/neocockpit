import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
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
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { adminNotificationApi } from '@/services/admin';
import { NOTIFICATION_LEVEL_META, NOTIFICATION_LEVEL_OPTIONS } from '@/constants/adminMeta';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { formatDateTime, getApiErrorMessage } from '@/utils/format';
import type {
  NotificationCreate,
  NotificationItem,
  NotificationLevel,
  NotificationUpdate,
} from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { TextArea } = Input;

type NotificationListScope = 'announcement' | 'notification';

interface NotificationFormValues {
  title: string;
  content: string;
  level: NotificationLevel;
  enabled: boolean;
}

const normalizeNotificationLevel = (value?: string | null): NotificationLevel => {
  if (value === 'warning' || value === 'error') {
    return value;
  }
  return 'info';
};

const NotificationModal: React.FC<{
  open: boolean;
  editing: NotificationItem | null;
  saving: boolean;
  onOk: (values: NotificationFormValues) => void;
  onCancel: () => void;
}> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm<NotificationFormValues>();

  return (
    <Modal
      title={editing ? (editing.user_id ? '编辑通知' : '编辑公告') : '发布公告'}
      open={open}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      okText="保存"
      confirmLoading={saving}
      destroyOnClose
      width={600}
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue(editing
            ? {
              title: editing.title,
              content: editing.content,
              level: normalizeNotificationLevel(editing.level),
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
        <Form.Item name="level" label="严重程度" rules={[{ required: true }]}>
          <Select options={NOTIFICATION_LEVEL_OPTIONS.map(({ value, label }) => ({ value, label }))} />
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
  const [listScope, setListScope] = useState<NotificationListScope>('announcement');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.notifications,
    queryFn: () => adminNotificationApi.listAll(),
  });

  const createMut = useMutation({
    mutationFn: (data: NotificationCreate) => adminNotificationApi.create(data),
    onSuccess: () => {
      message.success('公告已发布');
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.notifications });
    },
    onError: (error) => message.error(getApiErrorMessage(error, '公告发布失败')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NotificationUpdate }) => adminNotificationApi.update(id, data),
    onSuccess: () => {
      message.success('通知已更新');
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.notifications });
    },
    onError: (error) => message.error(getApiErrorMessage(error, '通知更新失败')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminNotificationApi.delete(id),
    onSuccess: () => {
      message.success('通知已删除');
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.notifications });
    },
    onError: () => message.error('通知删除失败'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleOk = (values: NotificationFormValues) => {
    const payload: NotificationCreate = {
      title: values.title.trim(),
      content: values.content.trim(),
      level: values.level,
      enabled: values.enabled,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload }, { onSuccess: closeModal });
    } else {
      createMut.mutate(payload, { onSuccess: closeModal });
    }
  };

  const announcementCount = items.filter((item) => !item.user_id).length;
  const notificationCount = items.filter((item) => item.user_id).length;
  const filteredItems = items.filter((item) => (
    listScope === 'announcement' ? !item.user_id : Boolean(item.user_id)
  ));

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
      key: 'scope',
      width: 190,
      render: (_: unknown, record) => {
        if (!record.user_id) {
          return (
            <Tag icon={<TeamOutlined />} color="green">
              公告
            </Tag>
          );
        }
        return (
          <Space size={6} wrap>
            <Tag icon={<UserOutlined />} color="purple">
              通知
            </Tag>
            <Text style={{ color: 'var(--c-text-secondary)' }}>
              {record.user_id} - {record.user_name || '未知用户'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 88,
      render: (value: string) => {
        const meta = NOTIFICATION_LEVEL_META[normalizeNotificationLevel(value)];
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
        <Space size={12} wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="neon-btn"
          >
            发布公告
          </Button>
          <Radio.Group
            value={listScope}
            onChange={(event) => setListScope(event.target.value)}
            options={[
              { label: '公告', value: 'announcement' },
              { label: '通知', value: 'notification' },
            ]}
          />
        </Space>
        <Space size={8} wrap>
          <Tag icon={<BellOutlined />} color="cyan">
            展示中 {items.filter((item) => item.enabled).length} / 全部 {items.length}
          </Tag>
          <Tag color="green">
            公告 {announcementCount}
          </Tag>
          <Tag color="purple">
            通知 {notificationCount}
          </Tag>
        </Space>
      </div>
      <Table
        className="admin-table"
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        scroll={{ x: 1100 }}
      />
      <NotificationModal
        open={modalOpen}
        editing={editing}
        saving={createMut.isPending || updateMut.isPending}
        onOk={handleOk}
        onCancel={closeModal}
      />
    </>
  );
};
