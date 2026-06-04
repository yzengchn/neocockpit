import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Form, Input, Modal, Popover, message } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { NotificationPanel } from '@/components/NotificationPanel';
import { feedbackApi } from '@/services/api';
import type { UserInfo, UserNotification, FeedbackCreate } from '@/types/task';

const { TextArea } = Input;

const TITLE_MAX = 120;
const CONTENT_MAX = 2000;
const CONTACT_MAX = 120;

interface UserMenuProps {
  user: UserInfo;
  notifications: UserNotification[];
  unreadCount: number;
  notificationLoading: boolean;
  onMarkMessageRead: (item: UserNotification) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenNotificationLink: (item: UserNotification) => void;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  notifications,
  unreadCount,
  notificationLoading,
  onMarkMessageRead,
  onMarkAllNotificationsRead,
  onOpenNotificationLink,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [feedbackForm] = Form.useForm<FeedbackCreate>();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const handleFeedbackSubmit = async (values: FeedbackCreate) => {
    setFeedbackSubmitting(true);
    try {
      const result = await feedbackApi.submit({
        title: values.title.trim(),
        content: values.content.trim(),
        contact: values.contact.trim(),
      });
      message.success(result.message || '反馈已提交');
      feedbackForm.resetFields();
      setFeedbackModalOpen(false);
    } catch (error: unknown) {
      const detail = typeof (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail === 'string'
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : '';
      message.error(detail || '反馈提交失败');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          type="text"
          size="small"
          icon={<MessageOutlined />}
          onClick={() => setFeedbackModalOpen(true)}
          style={{
            color: 'var(--c-text-secondary)',
            fontSize: 13,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          反馈
        </Button>
        <Popover
          content={(
            <NotificationPanel
              items={notifications}
              unreadCount={unreadCount}
              loading={notificationLoading}
              onMarkRead={onMarkMessageRead}
              onMarkAllRead={onMarkAllNotificationsRead}
              onOpenLink={onOpenNotificationLink}
            />
          )}
          trigger="click"
          placement="bottomRight"
        >
          <Badge count={unreadCount} size="small" overflowCount={99}>
            <Button
              type="text"
              size="small"
              icon={<BellOutlined />}
              aria-label="通知"
              style={{
                width: 30,
                height: 30,
                color: unreadCount > 0 ? 'var(--c-accent-light)' : 'var(--c-text-secondary)',
                border: '1px solid var(--c-border)',
                borderRadius: 8,
                background: 'rgba(17, 19, 32, 0.72)',
              }}
            />
          </Badge>
        </Popover>
        <Popover
          content={(
            <div style={{ minWidth: 100 }}>
              <div
                onClick={() => navigate('/profile')}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--c-text)',
                  fontSize: 13,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--c-border)',
                  marginBottom: 4,
                }}
              >
                <UserOutlined style={{ color: '#818cf8' }} />
                个人中心
              </div>
              <div
                onClick={onLogout}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--c-text)',
                  fontSize: 13,
                  padding: '4px 0',
                }}
              >
                <LogoutOutlined style={{ color: '#f87171' }} />
                退出登录
              </div>
            </div>
          )}
          trigger="click"
          placement="bottom"
        >
          <span style={{
            color: 'var(--c-text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}>
            🖌️ {user.nick_name}
          </span>
        </Popover>
      </div>

      <Modal
        open={feedbackModalOpen}
        title="建议反馈"
        centered
        destroyOnClose
        onCancel={() => !feedbackSubmitting && setFeedbackModalOpen(false)}
        footer={null}
        width={520}
      >
        <div style={{ color: 'var(--c-text-secondary)', fontSize: 13, marginBottom: 20 }}>
          产品的成长离不开您的参与，您的建议可能成为下一个版本的新功能。
        </div>
        <Form
          form={feedbackForm}
          layout="vertical"
          onFinish={handleFeedbackSubmit}
          disabled={feedbackSubmitting}
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[
              { required: true, message: '请填写反馈标题' },
              { min: 2, message: '标题至少需要2个字' },
              { max: TITLE_MAX, message: `标题不能超过${TITLE_MAX}个字` },
            ]}
          >
            <Input maxLength={TITLE_MAX} showCount placeholder="例如：首页任务列表筛选不够明显" />
          </Form.Item>

          <Form.Item
            label="内容"
            name="content"
            rules={[
              { required: true, message: '请填写反馈内容' },
              { min: 10, message: '内容至少需要10个字' },
              { max: CONTENT_MAX, message: `内容不能超过${CONTENT_MAX}个字` },
            ]}
          >
            <TextArea
              rows={6}
              maxLength={CONTENT_MAX}
              showCount
              placeholder="请描述你的建议、遇到的问题，或你希望增加的功能。"
            />
          </Form.Item>

          <Form.Item
            label="联系方式"
            name="contact"
            rules={[
              { required: true, message: '请填写联系方式' },
              { min: 2, message: '联系方式至少需要2个字' },
              { max: CONTACT_MAX, message: `联系方式不能超过${CONTACT_MAX}个字` },
            ]}
          >
            <Input maxLength={CONTACT_MAX} showCount placeholder="微信 / 手机号 / 邮箱" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setFeedbackModalOpen(false)} disabled={feedbackSubmitting}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={feedbackSubmitting}>
              提交反馈
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default UserMenu;
