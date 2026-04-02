import React, { useState, useEffect } from 'react';
import { Card, InputNumber, Button, Space, Typography, message, Statistic, Row, Col } from 'antd';
import { SwapOutlined, DollarOutlined, PoundOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function CurrencyConverter() {
  const [usdAmount, setUsdAmount] = useState(100);
  const [gbpAmount, setGbpAmount] = useState(null);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/currency/rate');
      const data = await response.json();
      setRate(data.usd_to_gbp);
      setLastUpdated(new Date(data.timestamp));
      return data.usd_to_gbp;
    } catch (error) {
      message.error('Failed to fetch exchange rate');
      return 0.78;
    }
  };

  const convertCurrency = async () => {
    setLoading(true);
    try {
      const currentRate = await fetchRate();
      const converted = usdAmount * currentRate;
      setGbpAmount(converted);
      message.success(`Converted $${usdAmount} to £${converted.toFixed(2)} at rate ${currentRate}`);
    } catch (error) {
      message.error('Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
  }, []);

  return (
    <Card title="💱 Live Currency Converter" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Row gutter={16} align="middle">
        <Col span={24}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: 'white' }}>USD to GBP Converter</Title>
              {rate && (
                <Text style={{ color: 'white' }}>
                  Live Rate: 1 USD = {rate.toFixed(4)} GBP
                  {lastUpdated && <span style={{ fontSize: 12 }}> (Updated: {lastUpdated.toLocaleTimeString()})</span>}
                </Text>
              )}
            </div>
            
            <Row gutter={16} justify="center">
              <Col span={10}>
                <InputNumber
                  prefix={<DollarOutlined />}
                  value={usdAmount}
                  onChange={setUsdAmount}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="USD Amount"
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Col>
              <Col span={4} style={{ textAlign: 'center' }}>
                <SwapOutlined style={{ fontSize: 24, color: 'white' }} />
              </Col>
              <Col span={10}>
                <InputNumber
                  prefix={<PoundOutlined />}
                  value={gbpAmount}
                  style={{ width: '100%' }}
                  size="large"
                  readOnly
                  placeholder="GBP Amount"
                  formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Col>
            </Row>
            
            <div style={{ textAlign: 'center' }}>
              <Button 
                type="primary" 
                onClick={convertCurrency} 
                loading={loading}
                icon={<SwapOutlined />}
                size="large"
              >
                Convert Currency
              </Button>
            </div>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

export default CurrencyConverter;