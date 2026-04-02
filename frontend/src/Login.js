import React, { useState } from 'react';
import { Modal, Input, Button, Form, message, Card } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';

function Login({ onLoginSuccess }) {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', data.user);
        message.success(`Welcome ${data.user}!`);
        setVisible(false);
        onLoginSuccess(data);
      } else {
        message.error('Invalid username or password');
      }
    } catch (error) {
      message.error('Login failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="🔐 Login to PO Automation System"
      open={visible}
      closable={false}
      footer={null}
      centered
    >
      <Card>
        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin or user" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="admin123 or user123" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block icon={<LoginOutlined />}>
              Login
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <small>Demo credentials: admin/admin123 or user/user123</small>
          </div>
        </Form>
      </Card>
    </Modal>
  );
}

export default Login;