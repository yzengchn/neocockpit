import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, InputNumber, Button, message, Tag, Modal, Input, Popconfirm } from 'antd';
import { DollarOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminCreditPriceApi } from '@/services/admin';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { getApiErrorMessage } from '@/utils/format';
import type { CreditPrice, CreditPriceCreate, CreditPriceUpdate } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

export const CreditPricePanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState(5);

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.creditPrices,
    queryFn: () => adminCreditPriceApi.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreditPriceUpdate }) =>
      adminCreditPriceApi.update(id, data),
    onSuccess: () => {
      message.success('积分单价已更新');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.creditPrices });
    },
    onError: () => message.error('更新失败'),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreditPriceCreate) => adminCreditPriceApi.create(data),
    onSuccess: () => {
      message.success('积分配置已创建');
      setCreateModalOpen(false);
      setNewAction('');
      setNewLabel('');
      setNewPrice(5);
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.creditPrices });
    },
    onError: (err: unknown) => {
      message.error(getApiErrorMessage(err, '创建失败'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCreditPriceApi.delete(id),
    onSuccess: () => {
      message.success('积分配置已删除');
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.creditPrices });
    },
    onError: () => message.error('删除失败'),
  });

  const columns: ColumnsType<CreditPrice> = [
    {
      title: '操作类型',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record: CreditPrice) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined style={{ color: 'gold' }} />
          <span style={{ fontWeight: 600 }}>{label}</span>
          <Tag style={{ fontSize: 10, fontFamily: 'monospace' }}>{record.action}</Tag>
        </span>
      ),
    },
    {
      title: '积分单价',
      dataIndex: 'price',
      key: 'price',
      width: 200,
      render: (price: number, record: CreditPrice) => {
        if (editingId === record.id) {
          return (
            <InputNumber
              min={0}
              max={999}
              value={editPrice}
              onChange={(v) => setEditPrice(v ?? 0)}
              size="small"
              style={{ width: 100 }}
            />
          );
        }
        const color = price === 0 ? '#22c55e' : price <= 3 ? '#eab308' : '#ef4444';
        return (
          <Tag
            onClick={() => { setEditingId(record.id); setEditPrice(price); }}
            style={{
              cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: color + '18', color, borderColor: color + '35',
              padding: '2px 12px',
            }}
          >
            {price === 0 ? '免费' : price + ' 积分'}
          </Tag>
        );
      },
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
      render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      align: 'right' as const,
      render: (_: unknown, record: CreditPrice) => {
        if (editingId === record.id) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: record.id, data: { price: editPrice } })}
            >
              保存
            </Button>
          );
        }
        return (
          <div className="admin-table-actions">
            <Button
              size="small"
              type="text"
              onClick={() => { setEditingId(record.id); setEditPrice(record.price); }}
            >
              编辑
            </Button>
            <Popconfirm title="确认删除" description="删除后该操作类型将免费，确定？" onConfirm={() => deleteMutation.mutate(record.id)} okText="确认" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  const handleCreate = () => {
    if (!newAction.trim()) { message.warning('请输入操作类型'); return; }
    if (!newLabel.trim()) { message.warning('请输入显示名称'); return; }
    createMutation.mutate({ action: newAction.trim(), price: newPrice, label: newLabel.trim() });
  };

  return (
    <>
    <div style={{ marginBottom: 16 }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setCreateModalOpen(true)}
        className="neon-btn"
      >
        新增积分配置
      </Button>
    </div>
    <Table
      className="admin-table"
      dataSource={prices}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      pagination={false}
      size="small"
      scroll={{ x: 720 }}
      style={{ marginTop: 12 }}
    />

    <Modal
      title="新增积分配置"
      open={createModalOpen}
      onOk={handleCreate}
      onCancel={() => setCreateModalOpen(false)}
      confirmLoading={createMutation.isPending}
      okText="创建"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--c-text-secondary)', fontSize: 13 }}>操作类型（英文枚举，如 custom_action）</label>
          <Input
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            placeholder="custom_action"
            maxLength={32}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--c-text-secondary)', fontSize: 13 }}>显示名称</label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="自定义操作"
            maxLength={32}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--c-text-secondary)', fontSize: 13 }}>积分单价</label>
          <InputNumber
            min={0}
            max={9999}
            value={newPrice}
            onChange={(v) => setNewPrice(v ?? 0)}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Modal>
    </>
  );
};
