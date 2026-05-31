import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, message, Popconfirm,
  Input, Form, Modal, Switch, InputNumber,
} from 'antd';
import {
  DeleteOutlined, PlusOutlined, EditOutlined,
} from '@ant-design/icons';
import { adminIconApi } from '@/services/admin';
import { EnabledTag } from '@/components/admin/TableTags';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import type { IconDescription, IconDescriptionCreate, IconDescriptionUpdate } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;

interface IconDescFormValues {
  name: string;
  directory_name: string;
  description: string;
  enabled: boolean;
  sort_order: number;
}

const IconDescModal: React.FC<{
  open: boolean;
  editing: IconDescription | null;
  onOk: (values: IconDescFormValues) => void;
  onCancel: () => void;
}> = ({ open, editing, onOk, onCancel }) => {
  const [form] = Form.useForm<IconDescFormValues>();

  const handleOpened = () => {
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        directory_name: editing.directory_name,
        description: editing.description,
        enabled: editing.enabled,
        sort_order: editing.sort_order,
      });
    } else {
      form.setFieldsValue({ name: '', directory_name: '', description: '', enabled: true, sort_order: 0 });
    }
  };

  return (
    <Modal
      title={editing ? '编辑图标描述' : '新增图标描述'}
      open={open}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      okText="保存"
      destroyOnClose
      afterOpenChange={(visible) => { if (visible) handleOpened(); }}
    >
      <Form form={form} layout="vertical" preserve={true}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如：天气、胎压、信号" />
        </Form.Item>
        <Form.Item name="directory_name" label="目录名称" rules={[{ required: true, message: '请输入目录名称' }]}>
          <Input placeholder="如：weather、tire_pressure、media" />
        </Form.Item>
        <Form.Item name="description" label="图标描述" rules={[{ required: true, message: '请输入描述' }]}>
          <TextArea rows={3} placeholder="描述图标的样式和内容，供 LLM 优化提示词" />
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

export const IconPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IconDescription | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.iconDescriptions,
    queryFn: () => adminIconApi.listAll(),
  });

  const createMut = useMutation({
    mutationFn: (v: IconDescriptionCreate) => adminIconApi.create(v),
    onSuccess: () => { message.success('添加成功'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.iconDescriptions }); },
    onError: () => message.error('添加失败'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IconDescriptionUpdate }) => adminIconApi.update(id, data),
    onSuccess: () => { message.success('更新成功'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.iconDescriptions }); },
    onError: () => message.error('更新失败'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminIconApi.delete(id),
    onSuccess: () => { message.success('删除成功'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.iconDescriptions }); },
    onError: () => message.error('删除失败'),
  });

  const handleOk = (values: IconDescFormValues) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const columns: ColumnsType<IconDescription> = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '目录名称', dataIndex: 'directory_name', key: 'directory_name', width: 140,
      render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)' }}>{v}</span>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80,
      render: (v: boolean) => <EnabledTag enabled={v} />,
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '操作', key: 'action', width: 140, align: 'right',
      render: (_: unknown, record: IconDescription) => (
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
          新增图标描述
        </Button>
      </div>
      <Table className="admin-table" columns={columns} dataSource={items} rowKey="id" loading={isLoading} pagination={false} size="small" scroll={{ x: 780 }} />
      <IconDescModal open={modalOpen} editing={editing} onOk={handleOk} onCancel={() => { setModalOpen(false); setEditing(null); }} />
    </>
  );
};
