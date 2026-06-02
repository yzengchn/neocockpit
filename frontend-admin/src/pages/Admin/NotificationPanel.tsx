import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
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
  NotificationMessageType,
  NotificationUpdate,
} from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { TextArea } = Input;
const NOTIFICATION_PAGE_SIZE = 10;

type NotificationListScope = NotificationMessageType;

interface NotificationFormValues {
  message_type: NotificationMessageType;
  title: string;
  content: string;
  level: NotificationLevel;
  enabled: boolean;
  user_ids_text?: string;
}

const normalizeNotificationLevel = (value?: string | null): NotificationLevel => {
  if (value === 'warning' || value === 'error') {
    return value;
  }
  return 'info';
};

const parseUserIds = (value?: string): string[] => {
  const ids = (value || '')
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
};

const NotificationModal: React.FC<{
  open: boolean;
  editing: NotificationItem | null;
  defaultMessageType: NotificationListScope;
  saving: boolean;
  onOk: (values: NotificationFormValues) => void;
  onCancel: () => void;
}> = ({ open, editing, defaultMessageType, saving, onOk, onCancel }) => {
  const [form] = Form.useForm<NotificationFormValues>();
  const messageType = Form.useWatch('message_type', form) || defaultMessageType;
  const modalTitle = editing
    ? (editing.message_type === 'notification' ? '编辑通知' : '编辑公告')
    : (messageType === 'notification' ? '发送通知' : '发布公告');

  return (
    <Modal
      title={modalTitle}
      open={open}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      okText="保存"
      confirmLoading={saving}
      destroyOnClose
      width={680}
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue(editing
            ? {
              message_type: editing.message_type,
              title: editing.title,
              content: editing.content,
              level: normalizeNotificationLevel(editing.level),
              enabled: editing.enabled,
              user_ids_text: '',
            }
            : {
              message_type: defaultMessageType,
              title: '',
              content: '',
              level: 'info',
              enabled: true,
              user_ids_text: '',
            });
        }
      }}
    >
      <Form form={form} layout="vertical" preserve>
        {!editing && (
          <Form.Item name="message_type" label="发布类型" rules={[{ required: true }]}>
            <Segmented
              block
              options={[
                { label: '公告', value: 'announcement' },
                { label: '通知', value: 'notification' },
              ]}
            />
          </Form.Item>
        )}
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入通知标题' }]}>
          <Input maxLength={120} showCount placeholder="如：模型渠道维护通知" />
        </Form.Item>
        <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入通知内容' }]}>
          <TextArea rows={5} maxLength={2000} showCount placeholder="输入要展示给用户的通知内容" />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prev, next) => prev.message_type !== next.message_type}>
          {({ getFieldValue }) => {
            if (editing || getFieldValue('message_type') !== 'notification') {
              return null;
            }
            return (
              <Form.Item
                name="user_ids_text"
                label="接收用户"
                rules={[
                  {
                    validator: (_, value) => {
                      const ids = parseUserIds(value);
                      if (ids.length === 0) {
                        return Promise.reject(new Error('请输入至少一个目标用户 ID'));
                      }
                      if (ids.length > 500) {
                        return Promise.reject(new Error('单次最多指定 500 个用户'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <TextArea
                  rows={4}
                  maxLength={5000}
                  showCount
                  placeholder="输入用户 ID，多个 ID 可用换行、逗号或空格分隔"
                />
              </Form.Item>
            );
          }}
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
  const [notificationPage, setNotificationPage] = useState(1);

  const { data: announcementItems = [], isLoading: isAnnouncementLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.notificationAnnouncements,
    queryFn: () => adminNotificationApi.listAnnouncements(),
  });
  const { data: notificationPageData, isLoading: isNotificationLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.notificationPage(notificationPage, NOTIFICATION_PAGE_SIZE),
    queryFn: () => adminNotificationApi.listNotifications(
      (notificationPage - 1) * NOTIFICATION_PAGE_SIZE,
      NOTIFICATION_PAGE_SIZE,
    ),
  });

  const createMut = useMutation({
    mutationFn: (data: NotificationCreate) => adminNotificationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.notifications });
    },
    onError: (error) => message.error(getApiErrorMessage(error, '发布失败')),
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
    const basePayload = {
      title: values.title.trim(),
      content: values.content.trim(),
      level: values.level,
      enabled: values.enabled,
    };
    if (editing) {
      const payload: NotificationUpdate = basePayload;
      updateMut.mutate({ id: editing.id, data: payload }, { onSuccess: closeModal });
    } else {
      const payload: NotificationCreate = {
        ...basePayload,
        message_type: values.message_type,
      };
      if (values.message_type === 'notification') {
        payload.user_ids = parseUserIds(values.user_ids_text);
      }
      createMut.mutate(payload, {
        onSuccess: (created) => {
          message.success(created.message_type === 'notification' ? '通知已发送' : '公告已发布');
          if (created.message_type === 'notification') {
            setNotificationPage(1);
          }
          setListScope(created.message_type);
          closeModal();
        },
      });
    }
  };

  const notificationItems = notificationPageData?.items || [];
  const notificationCount = notificationPageData?.total || 0;
  const announcementCount = announcementItems.length;
  const filteredItems = listScope === 'announcement' ? announcementItems : notificationItems;
  const isLoading = listScope === 'announcement' ? isAnnouncementLoading : isNotificationLoading;
  const scopeTabs = [
    {
      key: 'announcement',
      label: (
        <Space className="notification-scope-tab-label" size={6}>
          <span>公告</span>
          <Tag color="green" style={{ marginInlineEnd: 0 }}>{announcementCount}</Tag>
        </Space>
      ),
    },
    {
      key: 'notification',
      label: (
        <Space className="notification-scope-tab-label" size={6}>
          <span>通知</span>
          <Tag color="purple" style={{ marginInlineEnd: 0 }}>{notificationCount}</Tag>
        </Space>
      ),
    },
  ];

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
        if (record.message_type === 'announcement') {
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
              {record.target_count > 1
                ? `${record.target_count} 个接收人`
                : record.user_id
                  ? `${record.user_id} - ${record.user_name || '未知用户'}`
                  : `${record.target_count} 个接收人`}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '已读',
      key: 'read_state',
      width: 110,
      render: (_: unknown, record) => {
        if (record.message_type === 'announcement') {
          return <Tag color="blue">{record.read_count} 人已读</Tag>;
        }
        if (record.target_count > 1) {
          return <Tag color={record.read_count >= record.target_count ? 'green' : 'gold'}>{record.read_count}/{record.target_count} 已读</Tag>;
        }
        return (
          <Tag color={record.is_read ? 'green' : 'default'}>
            {record.is_read ? '已读' : '未读'}
          </Tag>
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
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending} aria-label="删除" />
            </Tooltip>
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
            {listScope === 'notification' ? '发送通知' : '发布公告'}
          </Button>
          <Tabs
            className="notification-scope-tabs"
            activeKey={listScope}
            items={scopeTabs}
            onChange={(key) => setListScope(key as NotificationListScope)}
            size="small"
            tabBarGutter={20}
            indicator={{ size: 28, align: 'start' }}
            style={{ minWidth: 180 }}
          />
        </Space>
      </div>
      <Table
        className="admin-table"
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        loading={isLoading}
        pagination={listScope === 'notification'
          ? {
            current: notificationPage,
            pageSize: NOTIFICATION_PAGE_SIZE,
            total: notificationCount,
            showSizeChanger: false,
            showTotal: (total: number) => `共 ${total} 条`,
            onChange: (page) => setNotificationPage(page),
          }
          : false}
        size="small"
        scroll={{ x: 1210 }}
      />
      <NotificationModal
        open={modalOpen}
        editing={editing}
        defaultMessageType="announcement"
        saving={createMut.isPending || updateMut.isPending}
        onOk={handleOk}
        onCancel={closeModal}
      />
    </>
  );
};
