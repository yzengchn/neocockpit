import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table, Button, Tag, Input, Select,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { adminDownloadApi } from '@/services/admin';
import type { CreditLogItem, CreditStats } from '@/types/task';
import { ACTION_LABELS } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;

const ACTION_COLORS: Record<string, string> = {
  theme: '#6366f1',
  digital_human: '#a78bfa',
  diy: '#f59e0b',
  download: '#06b6d4',
  recharge: '#22c55e',
  check_in: '#eab308',
  liked: '#ef4444',
};

export const DownloadPanel: React.FC = () => {
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [taskFilter, setTaskFilter] = useState<string | undefined>();
  const [actionFilter, setActionFilter] = useState<string | undefined>();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-downloads', userFilter, taskFilter, actionFilter],
    queryFn: () => adminDownloadApi.list(0, 200, userFilter, taskFilter, actionFilter),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-download-stats'],
    queryFn: () => adminDownloadApi.stats(),
  });

  const columns: ColumnsType<CreditLogItem> = [
    {
      title: "用户ID", dataIndex: "user_id", key: "user_id", width: 110,
      render: (id: string) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{id}</span>,
    },
    {
      title: "用户名", dataIndex: "user_name", key: "user_name", width: 110,
      render: (name: string | null | undefined) => name
        ? <span style={{ fontWeight: 600, color: "var(--c-text)" }}>{name}</span>
        : <span style={{ color: "var(--c-text-muted)" }}>-</span>,
    },
    {
      title: "操作类型", dataIndex: "action", key: "action", width: 120,
      render: (action: string) => {
        const color = ACTION_COLORS[action] || "var(--c-primary)";
        return (
          <Tag style={{
            fontSize: 11, fontWeight: 700,
            background: color + "18", color, borderColor: color + "35",
          }}>
            {ACTION_LABELS[action] || action}
          </Tag>
        );
      },
    },
    {
      title: "目标ID", dataIndex: "target_id", key: "target_id", width: 110,
      render: (id: string | null) => id
        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-text-secondary)" }}>{id.slice(0, 8)}</span>
        : <span style={{ color: "var(--c-text-muted)" }}>-</span>,
    },
    {
      title: "积分变动", dataIndex: "credits_cost", key: "credits_cost", width: 90,
      render: (cost: number) => cost < 0
        ? <Tag style={{ borderRadius: "var(--radius-xs)", fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#22c55e", borderColor: "rgba(34,197,94,0.3)" }}>+{Math.abs(cost)}</Tag>
        : <Tag style={{ borderRadius: "var(--radius-xs)", fontWeight: 600, background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>-{cost}</Tag>,
    },
    {
      title: "剩余积分", dataIndex: "credits_after", key: "credits_after", width: 90,
      render: (v: number) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{v}</span>,
    },
    {
      title: "时间", dataIndex: "created_at", key: "created_at", width: 170,
      render: (date: string) => date
        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-text-secondary)" }}>{new Date(date).toLocaleString("zh-CN")}</span>
        : "-",
    },
  ];

  return (
    <>
      {/* Stats summary */}
      {stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}>
          {[
            { label: "总记录", value: (stats as CreditStats).total_records, color: "var(--c-primary)" },
            { label: "消耗积分", value: (stats as CreditStats).total_credits_spent, color: "#f97316" },
            { label: "活跃用户", value: (stats as CreditStats).unique_users, color: "var(--c-accent)" },
            { label: "任务数", value: (stats as CreditStats).unique_tasks, color: "#a78bfa" },
          ].map(item => (
            <div key={item.label} style={{
              background: "var(--c-bg-card-solid)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              border: "1px solid var(--c-border)",
            }}>
              <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: "var(--font-mono)" }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Search
          placeholder="按用户ID筛选"
          allowClear
          style={{ width: 200, maxWidth: "100%" }}
          prefix={<SearchOutlined />}
          onSearch={(v) => setUserFilter(v || undefined)}
        />
        <Search
          placeholder="按任务ID筛选"
          allowClear
          style={{ width: 200, maxWidth: "100%" }}
          prefix={<SearchOutlined />}
          onSearch={(v) => setTaskFilter(v || undefined)}
        />
        <Select
          placeholder="按操作类型"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setActionFilter(v || undefined)}
          options={Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>刷新</Button>
      </div>

      <Table
        className="admin-table"
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条`}}
        scroll={{ x: 870 }}
      />
    </>
  );
};
