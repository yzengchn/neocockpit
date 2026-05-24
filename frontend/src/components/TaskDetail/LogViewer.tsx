import React, { useState } from 'react';
import { Timeline, Typography, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { LogEntry } from '@/types/task';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface LogViewerProps {
  logs: LogEntry[];
}

const levelConfig = {
  info:    { color: '#6366f1', icon: <InfoCircleOutlined /> },
  success: { color: '#22c55e', icon: <CheckCircleOutlined /> },
  error:   { color: '#ef4444', icon: <CloseCircleOutlined /> },
};

/** Clean up log messages: remove verbose URL details and multi-line error trailing info */
const cleanLogMessage = (message: string): string => {
  // Remove "For more information check: https://..." trailing lines
  let cleaned = message.replace(/\nFor more information check:.*$/s, '');
  cleaned = cleaned.replace(/\nFor more information check:.*/g, '');
  // Remove " for url 'https://...'" details inside error messages
  cleaned = cleaned.replace(/ for url 'https?:\/\/[^']+'/g, '');
  // Remove trailing newlines with URL details like "\nhttps://..."
  cleaned = cleaned.replace(/\nhttps?:\/\/\S+$/gm, '');
  // Trim trailing whitespace/newlines
  cleaned = cleaned.trim();
  return cleaned;
};

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedLogs(newExpanded);
  };

  if (!logs || logs.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text-muted)' }}>暂无日志</div>;
  }

  // Filter out prompt content — prompts are shown in a dedicated card
  const filteredLogs = logs.filter(log => {
    const message = log.message.toLowerCase();
    return !message.includes('提示词:') && !message.includes('背景提示词') && !message.includes('图标提示词') && !message.includes('肖像提示词') && !message.includes('纹理提示词') && !message.includes('生成提示词');
  });

  if (filteredLogs.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text-muted)' }}>暂无日志</div>;
  }

  return (
    <Timeline
      items={filteredLogs.map((log, index) => {
        const config = levelConfig[log.level];
        const cleanedMessage = cleanLogMessage(log.message);
        const isLongMessage = cleanedMessage.length > 100;
        const isExpanded = expandedLogs.has(index);
        const displayMessage = isLongMessage && !isExpanded
          ? cleanedMessage.substring(0, 100) + '...'
          : cleanedMessage;

        return {
          color: config.color,
          dot: <span style={{ color: config.color, filter: `drop-shadow(0 0 4px ${config.color}40)` }}>{config.icon}</span>,
          children: (
            <div>
              <Text style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--c-text-muted)', letterSpacing: '0.5px' }}>
                {dayjs(log.timestamp).format('HH:mm:ss')}
              </Text>
              <div style={{ marginTop: 4 }}>
                <Paragraph style={{
                  marginBottom: 0, fontSize: 13, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--c-text)',
                }}>
                  {displayMessage}
                </Paragraph>
                {isLongMessage && (
                  <Button
                    type="link"
                    size="small"
                    icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => toggleExpand(index)}
                    style={{ padding: '4px 0', height: 'auto', fontSize: 11, marginTop: 4, color: 'var(--c-primary-light)' }}
                  >
                    {isExpanded ? '收起' : '展开'}
                  </Button>
                )}
              </div>
            </div>
          ),
        };
      })}
    />
  );
};
