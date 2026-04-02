import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'antd';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

function Charts() {
  const [supplierData, setSupplierData] = useState([]);
  const [brandData, setBrandData] = useState([]);

  useEffect(() => {
    fetch('${API_URL}/api/v1/dashboard/orders-by-supplier')
      .then(res => res.json())
      .then(data => setSupplierData(data));
    
    fetch('${API_URL}/api/v1/dashboard/orders-by-brand')
      .then(res => res.json())
      .then(data => setBrandData(data));
  }, []);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} lg={12}>
        <Card title="Orders by Supplier (Value)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={supplierData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supplier" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_value" fill="#8884d8" name="Total Value (£)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Orders by Brand">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={brandData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ brand, order_count }) => `${brand}: ${order_count}`}
                outerRadius={100}
                dataKey="order_count"
              >
                {brandData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
}

export default Charts;