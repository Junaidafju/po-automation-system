import React from 'react';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

function ExportButton({ orders }) {
  const exportToExcel = () => {
    const exportData = orders.map(order => ({
      'PO Number': order.po_number,
      'Supplier': order.supplier,
      'Brand': order.brand,
      'Buyer': order.buyer_name,
      'Quantity': order.total_order_qty,
      'Value (£)': order.total_gbp_value,
      'Delivery Date': order.delivery_date
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');
    XLSX.writeFile(wb, `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Button icon={<DownloadOutlined />} onClick={exportToExcel}>
      Export to Excel
    </Button>
  );
}

export default ExportButton;