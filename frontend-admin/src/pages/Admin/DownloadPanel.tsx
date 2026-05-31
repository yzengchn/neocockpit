import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table, Button, Input, Select,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { adminDownloadApi } from '@/services/admin';
import { ActionTag, CreditDeltaTag } from '@/components/admin/TableTags';
import { ADMIN_QUERY_KEYS } from '@/constants/queryKeys';
import { formatDateTime } from '@/utils/format';
import type { CreditLogItem } from '@/types/task';
import { ACTION_LABELS } from '@/types/task';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;

export const DownloadPanel: React.FC = () => {
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [taskFilter, setTaskFilter] = useState<string | undefined>();
  const [actionFilter, setActionFilter] = useState<string | undefined>();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.downloads(userFilter, taskFilter, actionFilter),
    queryFn: () => adminDownloadApi.list(0, 200, userFilter, taskFilter, actionFilter),
  });

  const { data: stats } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.downloadStats,
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
      render: (action: string) => <ActionTag action={action} />,
    },
    {
      title: "目标ID", dataIndex: "target_id", key: "target_id", width: 110,
      render: (id: string | null) => id
        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-text-secondary)" }}>{id.slice(0, 8)}</span>
        : <span style={{ color: "var(--c-text-muted)" }}>-</span>,
    },
    {
      title: "积分变动", dataIndex: "credits_cost", key: "credits_cost", width: 90,
      render: (cost: number) => <CreditDeltaTag value={cost} />,
    },
    {
      title: "剩余积分", dataIndex: "credits_after", key: "credits_after", width: 90,
      render: (v: number) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{v}</span>,
    },
    {
      title: "时间", dataIndex: "created_at", key: "created_at", width: 170,
      render: (date: string) => date
        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-text-secondary)" }}>{formatDateTime(date)}</span>
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
            { label: "总记录", value: stats.total_records, color: "var(--c-primary)" },
            { label: "消耗积分", value: stats.total_credits_spent, color: "#f97316" },
            { label: "活跃用户", value: stats.unique_users, color: "var(--c-accent)" },
            { label: "任务数", value: stats.unique_tasks, color: "#a78bfa" },
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
