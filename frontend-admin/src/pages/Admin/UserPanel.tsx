import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, message, Popconfirm,
  Input, InputNumber, Modal, Tooltip,
} from 'antd';
import {
  KeyOutlined, EditOutlined, StopOutlined,
  CheckCircleOutlined, DeleteOutlined, ReloadOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { adminUserApi } from '@/services/admin';
import type { UserAdmin, UserAdminUpdate, SignatureView } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';


/* ─── SignatureStroke: SVG ink stroke visualization ─── */
const SignatureStroke: React.FC<{
  points: { x: number; y: number }[];
  anchors?: { x: number; y: number }[] | null;
  size?: number;
}> = ({ points, anchors, size = 220 }) => {
  const pts = points;

  const pathData = pts
    .map((p, i) => {
      const x = p.x * size;
      const y = p.y * size;
      return i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} style={{ borderRadius: 12, background: 'rgba(14,16,24,0.6)' }}>
      {/* 3×3 grid lines */}
      {[1, 2].map(i => {
        const pos = (i / 3) * size;
        return [
          <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={size}
            stroke="rgba(129,140,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />,
          <line key={`h-${i}`} x1={0} y1={pos} x2={size} y2={pos}
            stroke="rgba(129,140,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />,
        ];
      }).flat()}
      {/* Anchor dots */}
      {anchors && anchors.length >= 2 && (
        <>
          <circle cx={anchors[0].x * size} cy={anchors[0].y * size} r={5}
            fill="#22c55e" stroke="rgba(34,197,94,0.3)" strokeWidth={2} />
          <text x={anchors[0].x * size} y={anchors[0].y * size - 10}
            textAnchor="middle" fill="#22c55e" fontSize={10}>起</text>
          <circle cx={anchors[1].x * size} cy={anchors[1].y * size} r={5}
            fill="#ef4444" stroke="rgba(239,68,68,0.3)" strokeWidth={2} />
          <text x={anchors[1].x * size} y={anchors[1].y * size - 10}
            textAnchor="middle" fill="#ef4444" fontSize={10}>终</text>
        </>
      )}
      {/* Ink stroke */}
      <path
        d={pathData}
        fill="none"
        stroke="#818cf8"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
};

export const UserPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAdmin | null>(null);
  const [sigView, setSigView] = useState<SignatureView | null>(null);
  const [editingNickName, setEditingNickName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [rechargeUser, setRechargeUser] = useState<UserAdmin | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(10);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminUserApi.listUsers(0, 200),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserAdminUpdate }) => adminUserApi.updateUser(id, data),
    onSuccess: () => { message.success('更新成功'); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setEditModalOpen(false); },
    onError: () => message.error('更新失败'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminUserApi.deleteUser(id),
    onSuccess: () => { message.success('删除成功'); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => message.error('删除失败'),
  });

  const rechargeMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => adminUserApi.recharge(id, amount),
    onSuccess: (user) => {
      message.success(`充值成功，当前积分: ${user.credits}`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setRechargeModalOpen(false);
    },
    onError: () => message.error('充值失败'),
  });

  const handleViewSig = async (user: UserAdmin) => {
    try {
      const data = await adminUserApi.viewSignature(user.id);
      setSigView(data);
      setSigModalOpen(true);
    } catch { message.error('获取签名失败'); }
  };

  const handleEdit = (user: UserAdmin) => {
    setEditingUser(user);
    setEditingNickName(user.nick_name);
    setEditModalOpen(true);
  };

  const handleToggleDisable = (user: UserAdmin) => {
    updateMut.mutate({ id: user.id, data: { is_disabled: !user.is_disabled } });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const name = editingNickName.trim();
    if (!name) { message.warning('昵称不能为空'); return; }
    if (name.length > 4) { message.warning('昵称最多4个字'); return; }
    setEditLoading(true);
    try {
      await updateMut.mutateAsync({ id: editingUser.id, data: { nick_name: name } });
    } finally {
      setEditLoading(false);
    }
  };

  const columns: ColumnsType<UserAdmin> = [
    {
      title: '用户ID', dataIndex: 'id', key: 'id', width: 110,
      render: (id: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{id}</span>,
    },
    {
      title: '昵称', dataIndex: 'nick_name', key: 'nick_name', width: 120,
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: '状态', dataIndex: 'is_disabled', key: 'is_disabled', width: 90,
      render: (disabled: boolean) => disabled
        ? <Tag color="red" style={{ borderRadius: 'var(--radius-xs)' }}>已禁用</Tag>
        : <Tag color="green" style={{ borderRadius: 'var(--radius-xs)' }}>正常</Tag>,
    },
    {
      title: '任务数', dataIndex: 'task_count', key: 'task_count', width: 80,
      render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>,
    },
    {
      title: '获赞', dataIndex: 'likes_received', key: 'likes_received', width: 80,
      render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>,
    },
    {
      title: '积分', dataIndex: 'credits', key: 'credits', width: 80,
      render: (v: number) => <Tag color={v > 0 ? 'gold' : 'red'} style={{ borderRadius: 'var(--radius-xs)', fontWeight: 600 }}>{v}</Tag>,
    },
    {
      title: '注册时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (date: string) => date
        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-text-secondary)' }}>{new Date(date).toLocaleString('zh-CN')}</span>
        : '-',
    },
    {
      title: '操作', key: 'action', width: 178, align: 'right',
      render: (_: unknown, record: UserAdmin) => (
        <div className="admin-table-actions">
          <Tooltip title="查看签名">
            <Button type="text" size="small" icon={<KeyOutlined />} onClick={() => handleViewSig(record)} aria-label="查看签名" />
          </Tooltip>
          <Tooltip title="编辑用户">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} aria-label="编辑用户" />
          </Tooltip>
          <Tooltip title={record.is_disabled ? '启用用户' : '禁用用户'}>
            <Button
              type="text"
              size="small"
              icon={record.is_disabled ? <CheckCircleOutlined /> : <StopOutlined />}
              danger={!record.is_disabled}
              onClick={() => handleToggleDisable(record)}
              aria-label={record.is_disabled ? '启用用户' : '禁用用户'}
            />
          </Tooltip>
          <Tooltip title="积分充值">
            <Button
              type="text"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => { setRechargeUser(record); setRechargeAmount(10); setRechargeModalOpen(true); }}
              aria-label="积分充值"
            />
          </Tooltip>
          <Popconfirm title="确认删除" description="删除后用户将无法登录，确定？" onConfirm={() => deleteMut.mutate(record.id)} okText="确认" cancelText="取消" okButtonProps={{ danger: true }}>
            <Tooltip title="删除用户">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending} aria-label="删除用户" />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>刷新</Button>
      </div>
      <Table
        className="admin-table"
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 980 }}
      />

      {/* 编辑昵称弹窗 */}
      <Modal
        title="编辑用户"
        open={editModalOpen}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={editLoading}
        okText="保存"
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--c-text-secondary)', fontSize: 13 }}>昵称（最多4个字）</label>
          <Input
            value={editingNickName}
            onChange={(e) => setEditingNickName(e.target.value)}
            maxLength={4}
            placeholder="输入昵称"
          />
        </div>
        {editingUser && (
          <div style={{ color: 'var(--c-text-secondary)', fontSize: 12 }}>
            ID: {editingUser.id}<br />
            积分: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{editingUser.credits}</span><br />
            注册时间: {editingUser.created_at ? new Date(editingUser.created_at).toLocaleString('zh-CN') : '-'}
          </div>
        )}
      </Modal>

      {/* 积分充值弹窗 */}
      <Modal
        title="积分充值"
        open={rechargeModalOpen}
        onOk={() => rechargeUser && rechargeMut.mutate({ id: rechargeUser.id, amount: rechargeAmount })}
        onCancel={() => setRechargeModalOpen(false)}
        confirmLoading={rechargeMut.isPending}
        okText="确认充值"
      >
        {rechargeUser && (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--c-text-secondary)', fontSize: 13 }}>
              用户：{rechargeUser.nick_name}（ID: {rechargeUser.id}）<br />
              当前积分：<span style={{ color: '#f59e0b', fontWeight: 600 }}>{rechargeUser.credits}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--c-text-secondary)', fontSize: 13 }}>充值金额</label>
              <InputNumber
                min={1}
                max={9999}
                value={rechargeAmount}
                onChange={(v) => setRechargeAmount(v ?? 10)}
                style={{ width: '100%' }}
                addonAfter="积分"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 签名查看弹窗 */}
      <Modal
        title="用户签名"
        open={sigModalOpen}
        onCancel={() => setSigModalOpen(false)}
        footer={null}
        width={520}
      >
        {sigView && (
          <div>
            {sigView.raw_points && sigView.raw_points.length >= 2 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <SignatureStroke points={sigView.raw_points} anchors={sigView.anchors} size={220} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.8, color: 'var(--c-text-secondary)', textAlign: 'center' }}>
                  <div>遍历哈希: <span style={{ color: 'var(--c-primary-light)', wordBreak: 'break-all' }}>{sigView.sig_hash.slice(0, 16)}…</span></div>
                  <div>方向哈希: <span style={{ color: 'var(--c-accent)', wordBreak: 'break-all' }}>{sigView.sig_hash_dir ? sigView.sig_hash_dir.slice(0, 16) + '…' : '(无)'}</span></div>
                  <div>笔迹点数: {sigView.raw_points.length}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 2, textAlign: 'center', color: 'var(--c-text-secondary)', padding: '24px 0' }}>
                无笔迹数据（早期注册用户未保存原始笔迹）
                <div style={{ marginTop: 12, fontSize: 11 }}>
                  遍历哈希: <span style={{ color: 'var(--c-primary-light)', wordBreak: 'break-all' }}>{sigView.sig_hash}</span>
                </div>
                <div>
                  方向哈希: <span style={{ color: 'var(--c-accent)', wordBreak: 'break-all' }}>{sigView.sig_hash_dir || '(无)'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
