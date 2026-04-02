import React, { useState, useEffect } from 'react';
import { Select, Button, Space, Card, Tag, Input, Row, Col } from 'antd';
import { FilterOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const { Option } = Select;
const { Search } = Input;

function Filters({ onFilterChange, orders }) {
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState(0);

  useEffect(() => {
    if (orders && orders.length > 0) {
      setSuppliers([...new Set(orders.map(o => o.supplier))]);
      setBrands([...new Set(orders.map(o => o.brand))]);
      setBuyers([...new Set(orders.map(o => o.buyer_name))]);
    }
  }, [orders]);

  const handleFilterChange = (type, value) => {
    const newFilters = { ...selectedFilters, [type]: value };
    if (!value) delete newFilters[type];
    setSelectedFilters(newFilters);
    setActiveFilters(Object.keys(newFilters).length + (searchText ? 1 : 0));
    onFilterChange({ ...newFilters, search: searchText });
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const newFilters = { ...selectedFilters, search: value };
    if (!value) delete newFilters.search;
    setActiveFilters(Object.keys(selectedFilters).length + (value ? 1 : 0));
    onFilterChange({ ...selectedFilters, search: value });
  };

  const clearFilters = () => {
    setSelectedFilters({});
    setSearchText('');
    setActiveFilters(0);
    onFilterChange({});
  };

  return (
    <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space wrap size="middle">
            <span><FilterOutlined /> Filters {activeFilters > 0 && <Tag color="blue">{activeFilters}</Tag>}</span>
            
            <Search
              placeholder="Search by PO Number, Supplier, or Brand"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && handleSearch('')}
              enterButton={<SearchOutlined />}
            />
            
            <Select
              placeholder="Filter by Supplier"
              allowClear
              style={{ width: 160 }}
              onChange={(value) => handleFilterChange('supplier', value)}
              value={selectedFilters.supplier}
            >
              {suppliers.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>

            <Select
              placeholder="Filter by Brand"
              allowClear
              style={{ width: 160 }}
              onChange={(value) => handleFilterChange('brand', value)}
              value={selectedFilters.brand}
            >
              {brands.map(b => <Option key={b} value={b}>{b}</Option>)}
            </Select>

            <Select
              placeholder="Filter by Buyer"
              allowClear
              style={{ width: 160 }}
              onChange={(value) => handleFilterChange('buyer', value)}
              value={selectedFilters.buyer}
            >
              {buyers.map(b => <Option key={b} value={b}>{b}</Option>)}
            </Select>

            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear All
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

export default Filters;