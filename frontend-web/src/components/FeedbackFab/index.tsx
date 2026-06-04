import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Form, Input, Modal, message } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

import { feedbackApi } from '@/services/api';
import type { FeedbackCreate } from '@/types/task';

const { TextArea } = Input;

const TITLE_MAX = 120;
const CONTENT_MAX = 2000;
const CONTACT_MAX = 120;

export const FeedbackFab: React.FC = () => {
  const [form] = Form.useForm<FeedbackCreate>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => setOpen(true);

  const handleCancel = () => {
    if (submitting) return;
    setOpen(false);
  };

  const handleSubmit = async (values: FeedbackCreate) => {
    setSubmitting(true);
    try {
      const result = await feedbackApi.submit({
        title: values.title.trim(),
        content: values.content.trim(),
        contact: values.contact.trim(),
      });
      message.success(result.message || '反馈已提交');
      form.resetFields();
      setOpen(false);
    } catch (error: unknown) {
      const detail = typeof (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail === 'string'
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : '';
      message.error(detail || '反馈提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const fab = createPortal(
    <button
      type="button"
      className="feedback-fab"
      onClick={handleOpen}
      aria-label="建议反馈"
    >
      <span className="feedback-fab__glow" />
      <MessageOutlined className="feedback-fab__icon" />
    </button>,
    document.body,
  );

  return (
    <>
      {fab}

      <Modal
        open={open}
        title="建议反馈"
        centered
        destroyOnClose
        onCancel={handleCancel}
        footer={null}
        width={520}
      >
        <div className="feedback-modal__intro">
          产品的成长离不开您的参与，您的建议可能成为下一个版本的新功能。
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={submitting}
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

          <div className="feedback-modal__actions">
            <Button onClick={handleCancel} disabled={submitting}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交反馈
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default FeedbackFab;
