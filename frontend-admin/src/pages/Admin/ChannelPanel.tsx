import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Space, Tag, message, Popconfirm,
  Input, Form, Modal, Switch, InputNumber, Select, Typography, Tooltip,
} from 'antd';
import {
  DeleteOutlined, PlusOutlined, EditOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { adminChannelApi } from '@/services/admin';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import type { ImageChannel, ImageChannelCreate, ImageChannelUpdate } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'dashscope', label: '阿里云' },
  { value: 'doubao', label: '豆包' },
] as const;

const PROVIDER_LABEL_MAP = Object.fromEntries(PROVIDER_OPTIONS.map(o => [o.value, o.label]));

const DEFAULT_FORM_VALUES: Omit<ImageChannelCreate, 'provider' | 'name' | 'base_url'> = {
  api_key: null,
  model: null,
  max_concurrent: 1,
  weight: 1,
  enabled: true,
  extra_config: null,
};

const NEW_FORM_VALUES: ImageChannelCreate = {
  provider: 'openai',
  name: '',
  base_url: '',
  ...DEFAULT_FORM_VALUES,
};

type ChannelFormValues = Omit<ImageChannelCreate, 'extra_config'> & {
  extra_config?: Record<string, unknown> | string | null;
};

function toFormValues(channel: ImageChannel): ImageChannelCreate {
  return {
    provider: channel.provider,
    name: channel.name,
    base_url: channel.base_url,
    api_key: channel.api_key,
    model: channel.model,
    max_concurrent: channel.max_concurrent,
    weight: channel.weight,
    enabled: channel.enabled,
    extra_config: channel.extra_config,
  };
}

// ── ChannelModal ──────────────────────────────────────────────────────────

const ChannelModal: React.FC<{
  open: boolean;
  editing: ImageChannel | null;
  onOk: (values: ImageChannelCreate) => void;
  onCancel: () => void;
}> = ({ open, editing, onOk, onCancel }) => {
  const [form] = Form.useForm<ChannelFormValues>();

  return (
    <Modal
      title={editing ? '编辑渠道' : '新增渠道'}
      open={open}
      onOk={() =>
        form.validateFields().then((values) => {
          if (typeof values.extra_config === 'string') {
            message.error('扩展配置 JSON 格式错误');
            return;
          }

          // Clean empty strings to null for optional fields
          const cleaned: ImageChannelCreate = {
            ...values,
            api_key: values.api_key || null,
            model: values.model || null,
            extra_config: values.extra_config ?? null,
          };
          onOk(cleaned);
        })
      }
      onCancel={onCancel}
      okText="保存"
      destroyOnClose
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue(editing ? toFormValues(editing) : NEW_FORM_VALUES);
        }
      }}
      width={560}
    >
      <Form form={form} layout="vertical" preserve>
        <Form.Item name="provider" label="所属 Provider" rules={[{ required: true, message: '请选择 Provider' }]}>
          <Select options={[...PROVIDER_OPTIONS]} />
        </Form.Item>
        <Form.Item name="name" label="渠道名称" rules={[{ required: true, message: '请输入渠道名称' }]}>
          <Input placeholder="如：OpenAI-美国代理" />
        </Form.Item>
        <Form.Item name="base_url" label="API Endpoint" rules={[{ required: true, message: '请输入 API 地址' }]}>
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item name="api_key" label="API Key">
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item name="model" label="模型">
          <Input placeholder="如：dall-e-3" />
        </Form.Item>
        <Space style={{ width: '100%' }} size="large" wrap>
          <Form.Item name="max_concurrent" label="最大并发数" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="weight" label="权重" rules={[{ required: true }]} tooltip="权重越大优先级越高，同 Provider 多渠道时按权重分配任务流量">
            <InputNumber min={1} max={100} style={{ width: 120 }} />
          </Form.Item>
        </Space>
        <Form.Item
          name="extra_config"
          label="扩展配置 (JSON)"
          tooltip="渠道专属参数，如 DashScope 的 api_mode/watermark/prompt_extend/negative_prompt，OpenAI 的 retry_attempts 等"
          getValueFromEvent={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const raw = e.target.value?.trim();
            if (!raw) return null;
            try {
              const parsed = JSON.parse(raw);
              if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return raw;
              }
              return parsed as Record<string, unknown>;
            } catch {
              return raw;
            }
          }}
          getValueProps={(v: Record<string, unknown> | string | null | undefined) => ({
            value: typeof v === 'string' ? v : v ? JSON.stringify(v, null, 2) : '',
          })}
        >
          <Input.TextArea
            rows={4}
            placeholder='{"api_mode": "auto", "watermark": false, "prompt_extend": true}'
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── ChannelPanel ──────────────────────────────────────────────────────────

export const ChannelPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImageChannel | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.imageChannels,
    queryFn: () => adminChannelApi.listAll(),
  });

  const createMut = useMutation({
    mutationFn: (v: ImageChannelCreate) => adminChannelApi.create(v),
    onSuccess: () => { message.success('渠道添加成功'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.imageChannels }); },
    onError: () => message.error('渠道添加失败'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ImageChannelUpdate> }) => adminChannelApi.update(id, data),
    onSuccess: () => { message.success('渠道更新成功'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.imageChannels }); },
    onError: () => message.error('渠道更新失败'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminChannelApi.delete(id),
    onSuccess: () => { message.success('渠道删除成功'); queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.imageChannels }); },
    onError: () => message.error('渠道删除失败'),
  });

  const handleOk = (values: ImageChannelCreate) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const providerStats = useMemo(() => {
    const acc: Record<string, { maxConcurrent: number; count: number; invokeCount: number }> = {};
    for (const ch of items) {
      if (ch.enabled) {
        if (!acc[ch.provider]) acc[ch.provider] = { maxConcurrent: 0, count: 0, invokeCount: 0 };
        acc[ch.provider].maxConcurrent += ch.max_concurrent;
        acc[ch.provider].count += 1;
        acc[ch.provider].invokeCount += ch.invoke_count || 0;
      }
    }
    return acc;
  }, [items]);

  const columns: ColumnsType<ImageChannel> = [
    {
      title: 'Provider', dataIndex: 'provider', key: 'provider', width: 100,
      render: (v: string) => <Tag color="blue">{PROVIDER_LABEL_MAP[v] || v}</Tag>,
    },
    { title: '渠道名称', dataIndex: 'name', key: 'name', width: 140 },
    {
      title: 'Endpoint', dataIndex: 'base_url', key: 'base_url', width: 240, ellipsis: true,
      render: (v: string) => <Text copyable style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
    },
    { title: '并发', dataIndex: 'max_concurrent', key: 'max_concurrent', width: 60, align: 'center' },
    { title: '权重', dataIndex: 'weight', key: 'weight', width: 55, align: 'center' },
    { title: '调用', dataIndex: 'invoke_count', key: 'invoke_count', width: 60, align: 'center' },
    {
      title: '扩展配置', dataIndex: 'extra_config', key: 'extra_config', width: 140, ellipsis: true,
      render: (v: Record<string, unknown> | null | undefined) =>
        !v || Object.keys(v).length === 0
          ? <Text type="secondary">—</Text>
          : <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{JSON.stringify(v)}</Text>,
    },
    {
      title: '操作', key: 'action', width: 184, align: 'right',
      render: (_: unknown, record: ImageChannel) => (
        <div className="admin-table-actions">
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(checked) => updateMut.mutate({ id: record.id, data: { enabled: checked } })}
          />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除渠道后，排队任务将分配到其他可用渠道"
            onConfirm={() => deleteMut.mutate(record.id)}
            okText="确认" cancelText="取消" okButtonProps={{ danger: true }}
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }} className="neon-btn">
          新增渠道
        </Button>
        <Space wrap>
          {Object.entries(providerStats).map(([provider, stat]) => (
            <Tag key={provider} icon={<ApiOutlined />} color="purple">
              {PROVIDER_LABEL_MAP[provider] || provider}: {stat.count} 渠道 / 并发 {stat.maxConcurrent} / 调用 {stat.invokeCount}
            </Tag>
          ))}
        </Space>
      </div>
      <Table className="admin-table" columns={columns} dataSource={items} rowKey="id" loading={isLoading} pagination={false} size="small" scroll={{ x: 1060 }} />
      <ChannelModal open={modalOpen} editing={editing} onOk={handleOk} onCancel={() => { setModalOpen(false); setEditing(null); }} />
    </>
  );
};
