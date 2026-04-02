import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, message, Select, DatePicker, Button, Table } from 'antd';
import { 
  ShoppingOutlined, 
  DollarOutlined, 
  TeamOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Option } = Select;

const API_URL = 'http://localhost:8000';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_orders: 0,
    total_value: 0,
    avg_value: 0,
    active_suppliers: 0,
    active_brands: 0
  });
  const [supplierData, setSupplierData] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    supplier: null,
    brand: null,
    dateRange: null
  });
  const [timeline, setTimeline] = useState({ on_time: 0, delayed: 0, total: 0 });
  const wsRef = React.useRef(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const metricsRes = await axios.get(`${API_URL}/api/v1/dashboard/kpi`);
      setMetrics(metricsRes.data);

      const supplierRes = await axios.get(`${API_URL}/api/v1/dashboard/orders-by-supplier`);
      setSupplierData(supplierRes.data);

      const brandRes = await axios.get(`${API_URL}/api/v1/dashboard/orders-by-brand`);
      setBrandData(brandRes.data);

      const ordersRes = await axios.get(`${API_URL}/api/v1/orders/`);
      setOrders(ordersRes.data);
      // timeline
      try {
        const tl = await axios.get(`${API_URL}/api/v1/dashboard/timeline/`);
        setTimeline(tl.data);
      } catch (e) {}
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to fetch dashboard data. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    // WebSocket for live updates
    try {
      wsRef.current = new WebSocket('ws://localhost:8000/ws/updates');
      wsRef.current.onmessage = (evt) => {
        const data = evt.data || '';
        if (data.startsWith('uploaded:') || data.startsWith('processed:')) {
          fetchData();
        }
      };
    } catch (e) {
      console.warn('WebSocket not available', e);
    }
    return () => clearInterval(interval);
  }, []);

  // Upload handler
  const handleFile = async (file) => {
    const form = new FormData();
    form.append('file', file);
    try {
      await axios.post(`${API_URL}/api/v1/upload/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success('File uploaded');
    } catch (e) {
      message.error('Upload failed');
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/export/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchase_orders.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      message.error('Export failed');
    }
  };

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number', render: (text) => <a href="#">{text}</a> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
    { title: 'Buyer', dataIndex: 'buyer_name', key: 'buyer_name' },
    { title: 'Quantity', dataIndex: 'total_order_qty', key: 'total_order_qty' },
    { title: 'Value (£)', dataIndex: 'total_gbp_value', key: 'total_gbp_value', render: (value) => `£${value?.toFixed(2) || 0}` },
    { title: 'Delivery Date', dataIndex: 'delivery_date', key: 'delivery_date' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Purchase Order Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="file-upload" style={{ display: 'none' }} type="file" accept="application/pdf" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
          <label htmlFor="file-upload">
            <Button icon={<UploadOutlined />}>Upload PDF</Button>
          </label>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Select style={{ width: '100%' }} placeholder="Filter by Supplier" allowClear onChange={(value) => setFilters({ ...filters, supplier: value })}>
              {supplierData.map(sup => (<Option key={sup.supplier} value={sup.supplier}>{sup.supplier}</Option>))}
            </Select>
          </Col>
          <Col span={6}>
            <Select style={{ width: '100%' }} placeholder="Filter by Brand" allowClear onChange={(value) => setFilters({ ...filters, brand: value })}>
              {brandData.map(brand => (<Option key={brand.brand} value={brand.brand}>{brand.brand}</Option>))}
            </Select>
          </Col>
          <Col span={8}><RangePicker style={{ width: '100%' }} /></Col>
          <Col span={4}><Button type="primary" style={{ width: '100%' }}>Apply Filters</Button></Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Orders" value={metrics.total_orders} prefix={<ShoppingOutlined />} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Order Value" value={metrics.total_value} precision={2} prefix={<DollarOutlined />} suffix="GBP" valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Average Order Value" value={metrics.avg_value} precision={2} prefix={<DollarOutlined />} suffix="GBP" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Active Suppliers" value={metrics.active_suppliers} prefix={<TeamOutlined />} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Orders by Supplier">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={supplierData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="supplier" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="order_count" fill="#8884d8" name="Order Count" />
                <Bar yAxisId="right" dataKey="total_value" fill="#82ca9d" name="Total Value (£)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Orders by Brand">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={brandData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.brand}: ${entry.order_count}`} outerRadius={100} fill="#8884d8" dataKey="order_count">
                  {brandData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="On-time deliveries" value={timeline.on_time} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Delayed deliveries" value={timeline.delayed} />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Purchase Orders">
        <Table dataSource={orders} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: true }} />
      </Card>
    </div>
  );
};

export default Dashboard;
