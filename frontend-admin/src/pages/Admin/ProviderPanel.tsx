import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, message, Popconfirm,
  Input, Form, Modal, Switch, InputNumber,
} from 'antd';
import {
  DeleteOutlined, PlusOutlined, EditOutlined,
} from '@ant-design/icons';
import { adminProviderApi } from '@/services/admin';
import type { AIProviderConfig, AIProviderConfigCreate, AIProviderConfigUpdate } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

interface AIProviderFormValues {
  name: string;
  value: string;
  enabled: boolean;
  sort_order: number;
}

const AIProviderModal: React.FC<{
  open: boolean;
  editing: AIProviderConfig | null;
  onOk: (values: AIProviderFormValues) => void;
  onCancel: () => void;
}> = ({ open, editing, onOk, onCancel }) => {
  const [form] = Form.useForm<AIProviderFormValues>();

  const handleOpened = () => {
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        value: editing.value,
        enabled: editing.enabled,
        sort_order: editing.sort_order,
      });
    } else {
      form.setFieldsValue({ name: '', value: '', enabled: true, sort_order: 0 });
    }
  };

  return (
    <Modal
      title={editing ? '编辑 AI 提供商' : '新增 AI 提供商'}
      open={open}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      okText="保存"
      destroyOnClose
      afterOpenChange={(visible) => { if (visible) handleOpened(); }}
    >
      <Form form={form} layout="vertical" preserve={true}>
        <Form.Item name="name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
          <Input placeholder="如：阿里云、豆包、OpenAI" />
        </Form.Item>
        <Form.Item name="value" label="枚举值" rules={[{ required: true, message: '请输入枚举值' }]}>
          <Input placeholder="如：dashscope、doubao、openai" />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="sort_order" label="排序">
          <InputNumber min={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const ProviderPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AIProviderConfig | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => adminProviderApi.listAll(),
  });

  const createMut = useMutation({
    mutationFn: (v: AIProviderFormValues) => adminProviderApi.create(v as AIProviderConfigCreate),
    onSuccess: () => { message.success('添加成功'); queryClient.invalidateQueries({ queryKey: ['ai-providers'] }); },
    onError: () => message.error('添加失败'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIProviderFormValues> }) => adminProviderApi.update(id, data as AIProviderConfigUpdate),
    onSuccess: () => { message.success('更新成功'); queryClient.invalidateQueries({ queryKey: ['ai-providers'] }); },
    onError: () => message.error('更新失败'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminProviderApi.delete(id),
    onSuccess: () => { message.success('删除成功'); queryClient.invalidateQueries({ queryKey: ['ai-providers'] }); },
    onError: () => message.error('删除失败'),
  });

  const handleOk = (values: AIProviderFormValues) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const columns: ColumnsType<AIProviderConfig> = [
    { title: '显示名称', dataIndex: 'name', key: 'name', width: 140 },
    { title: '枚举值', dataIndex: 'value', key: 'value', width: 140,
      render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)' }}>{v}</span>,
    },
    {
      title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 'var(--radius-xs)', fontSize: 12 }}>
          {v ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '操作', key: 'action', width: 140, align: 'right',
      render: (_: unknown, record: AIProviderConfig) => (
        <div className="admin-table-actions">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除" description="确定要删除吗？" onConfirm={() => deleteMut.mutate(record.id)} okText="确认" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }} className="neon-btn">
          新增 AI 提供商
        </Button>
      </div>
      <Table className="admin-table" columns={columns} dataSource={items} rowKey="id" loading={isLoading} pagination={false} size="small" scroll={{ x: 620 }} />
      <AIProviderModal open={modalOpen} editing={editing} onOk={handleOk} onCancel={() => { setModalOpen(false); setEditing(null); }} />
    </>
  );
};
