// ============================================
// API Configuration - USE THIS VARIABLE
// ============================================
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';
import { message, Button, Table, Space, Card, Statistic, Row, Col, Spin, Modal, Input, Form } from 'antd';
import { 
  ShoppingOutlined, 
  DollarOutlined, 
  TeamOutlined, 
  ReloadOutlined, 
  DeleteOutlined,
  LoginOutlined,
  LogoutOutlined,
  SwapOutlined,
  PoundOutlined
} from '@ant-design/icons';
import UploadSection from './UploadSection';
import ExportButton from './ExportButton';
import Charts from './Charts';
import Filters from './Filters';

function App() {
  const [kpi, setKpi] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loginModalVisible, setLoginModalVisible] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [usdAmount, setUsdAmount] = useState(100);
  const [gbpAmount, setGbpAmount] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);

  // Debug log to verify API_URL
  console.log('🔗 Backend API URL:', API_URL);
  console.log('🌍 Environment:', process.env.NODE_ENV);

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(savedUser);
      setLoginModalVisible(false);
    }
  }, []);

  // Fetch exchange rate periodically
  useEffect(() => {
    if (isAuthenticated) {
      fetchExchangeRate();
      const rateInterval = setInterval(fetchExchangeRate, 300000); // Every 5 minutes
      return () => clearInterval(rateInterval);
    }
  }, [isAuthenticated]);

  const fetchExchangeRate = async () => {
    try {
      // ✅ FIXED: Use API_URL instead of hardcoded localhost
      const response = await fetch(`${API_URL}/api/v1/currency/rate`);
      const data = await response.json();
      setExchangeRate(data.usd_to_gbp);
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    }
  };

  const handleCurrencyConversion = () => {
    if (exchangeRate) {
      const converted = usdAmount * exchangeRate;
      setGbpAmount(converted);
      message.success(`$${usdAmount} USD = £${converted.toFixed(2)} GBP (Rate: ${exchangeRate.toFixed(4)})`);
    } else {
      message.error('Exchange rate not available');
    }
  };

  const handleLogin = async (values) => {
    setLoginLoading(true);
    try {
      // ✅ FIXED: Use API_URL instead of hardcoded localhost
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', data.user);
        setIsAuthenticated(true);
        setUser(data.user);
        setLoginModalVisible(false);
        message.success(`Welcome ${data.user}!`);
        fetchData();
      } else {
        message.error(data.detail || 'Invalid username or password');
      }
    } catch (error) {
      message.error(`Login failed. Make sure backend is running at ${API_URL}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUser(null);
    setLoginModalVisible(true);
    message.info('Logged out successfully');
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // ✅ FIXED: Use API_URL instead of hardcoded localhost
      const kpiResponse = await fetch(`${API_URL}/api/v1/dashboard/kpi`, { headers });
      if (!kpiResponse.ok) throw new Error(`KPI API error: ${kpiResponse.status}`);
      const kpiData = await kpiResponse.json();
      setKpi(kpiData);
      
      // ✅ FIXED: Use API_URL instead of hardcoded localhost
      const ordersResponse = await fetch(`${API_URL}/api/v1/orders/`, { headers });
      if (!ordersResponse.ok) throw new Error(`Orders API error: ${ordersResponse.status}`);
      const ordersData = await ordersResponse.json();
      setOrders(ordersData);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
      message.error(`Failed to load data from backend at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters including search
  useEffect(() => {
    if (!orders.length) return;
    
    let filtered = [...orders];
    
    // Apply search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(o => 
        o.po_number?.toLowerCase().includes(searchLower) ||
        o.supplier?.toLowerCase().includes(searchLower) ||
        o.brand?.toLowerCase().includes(searchLower) ||
        o.buyer_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply supplier filter
    if (filters.supplier) {
      filtered = filtered.filter(o => o.supplier === filters.supplier);
    }
    
    // Apply brand filter
    if (filters.brand) {
      filtered = filtered.filter(o => o.brand === filters.brand);
    }
    
    // Apply buyer filter
    if (filters.buyer) {
      filtered = filtered.filter(o => o.buyer_name === filters.buyer);
    }
    
    setFilteredOrders(filtered);
  }, [orders, filters]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      // Refresh every 30 seconds
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [refreshTrigger, isAuthenticated]);

  const handleUploadComplete = () => {
    message.info('Refreshing data...');
    fetchData();
  };

  const handleDeleteOrder = async (orderId) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this order?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          // ✅ FIXED: Use API_URL instead of hardcoded localhost
          const response = await fetch(`${API_URL}/api/v1/orders/${orderId}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (response.ok) {
            message.success('Order deleted successfully');
            fetchData();
          } else {
            message.error('Failed to delete order');
          }
        } catch (error) {
          message.error('Error deleting order');
        }
      }
    });
  };

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number', width: 150 },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 150 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120, 
      render: (text) => <span style={{ background: '#e6f7ff', padding: '2px 8px', borderRadius: 4 }}>{text}</span> },
    { title: 'Buyer', dataIndex: 'buyer_name', key: 'buyer_name', width: 130 },
    { title: 'Quantity', dataIndex: 'total_order_qty', key: 'total_order_qty', width: 80, align: 'right' },
    { title: 'Value (£)', dataIndex: 'total_gbp_value', key: 'total_gbp_value', width: 100, align: 'right', 
      render: (v) => `£${v?.toLocaleString()}` },
    { title: 'Delivery Date', dataIndex: 'delivery_date', key: 'delivery_date', width: 110 },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteOrder(record.id)} size="small" />
      )
    }
  ];

  // Login Modal
  if (!isAuthenticated) {
    return (
      <Modal
        title="🔐 Login to PO Automation System"
        open={loginModalVisible}
        closable={false}
        footer={null}
        centered
      >
        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="admin or user" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input.Password placeholder="admin123 or user123" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loginLoading} block icon={<LoginOutlined />}>
              Login
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center' }}>
            <small>Demo: admin/admin123 or user/user123</small>
          </div>
        </Form>
      </Modal>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Spin size="large" tip="Loading dashboard..." />
        <p>Connecting to backend at {API_URL}</p>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <h2 style={{ color: 'red' }}>⚠️ Cannot Connect to Backend</h2>
        <p>Error: {error}</p>
        <p>Backend URL: {API_URL}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1890ff' }}>📊 PO Automation Dashboard</h1>
          <p style={{ color: '#666', marginTop: 8 }}>Real-time Purchase Order Management System</p>
        </div>
        <Space>
          <Button 
            icon={<SwapOutlined />} 
            onClick={() => setCurrencyModalVisible(true)}
          >
            Currency Converter
          </Button>
          <ExportButton orders={filteredOrders} />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout ({user})
          </Button>
        </Space>
      </div>

      {/* Currency Converter Modal */}
      <Modal
        title="💱 Live Currency Converter"
        open={currencyModalVisible}
        onCancel={() => setCurrencyModalVisible(false)}
        footer={null}
      >
        <div style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {exchangeRate && (
              <div style={{ fontSize: 16, color: '#666' }}>
                1 USD = {exchangeRate.toFixed(4)} GBP
                <br />
                <small>Updated: {new Date().toLocaleTimeString()}</small>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Input
              prefix="$"
              type="number"
              value={usdAmount}
              onChange={(e) => setUsdAmount(parseFloat(e.target.value) || 0)}
              style={{ width: 150 }}
              size="large"
            />
            <SwapOutlined style={{ fontSize: 20 }} />
            <Input
              prefix="£"
              value={gbpAmount?.toFixed(2) || ''}
              placeholder="Result"
              style={{ width: 150 }}
              size="large"
              readOnly
            />
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Button type="primary" onClick={handleCurrencyConversion} icon={<SwapOutlined />}>
              Convert Currency
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Section */}
      <UploadSection onUploadComplete={handleUploadComplete} />
      
      {/* KPI Cards */}
      {kpi && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Total Orders" 
                value={kpi.total_orders} 
                prefix={<ShoppingOutlined />} 
                valueStyle={{ color: '#3f8600' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Total Value" 
                value={kpi.total_value} 
                precision={2} 
                prefix="£" 
                valueStyle={{ color: '#cf1322' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Average Order" 
                value={kpi.avg_value} 
                precision={2} 
                prefix="£" 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Active Suppliers" 
                value={kpi.active_suppliers} 
                prefix={<TeamOutlined />} 
              />
            </Card>
          </Col>
        </Row>
      )}
      
      {/* Charts Section */}
      <Charts />
      
      {/* Filters and Orders Table */}
      <Card 
        title={`📋 Orders (${filteredOrders.length} of ${orders.length} records)`} 
        bordered={false}
        style={{ marginTop: 24 }}
        extra={<ExportButton orders={filteredOrders} />}
      >
        <Filters onFilterChange={setFilters} orders={orders} />
        
        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true, 
            showTotal: (total) => `Total ${total} orders`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: true }}
          loading={loading}
        />
      </Card>
      
      {/* Footer */}
      <div style={{ marginTop: 24, padding: 16, textAlign: 'center', color: '#999', borderTop: '1px solid #e8e8e8' }}>
        <p>🔄 Auto-refreshes every 30 seconds | 💱 Live currency rates | 🔐 Secure authentication | ✅ Version 2.0</p>
        <p style={{ fontSize: 12 }}>Exchange rate: 1 USD = {exchangeRate?.toFixed(4) || 'loading...'} GBP</p>
        <p style={{ fontSize: 11, color: '#ccc' }}>Backend: {API_URL}</p>
      </div>
    </div>
  );
}

export default App;