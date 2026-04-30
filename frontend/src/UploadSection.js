import React, { useState } from 'react';
import { Upload, Button, message, List, Tag, Spin } from 'antd';
import { UploadOutlined, FilePdfOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
// At the top of UploadSection.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
function UploadSection({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploadResults, setUploadResults] = useState([]);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select PDF files first');
      return;
    }

    setUploading(true);
    setUploading(true);
    
    const uploadPromises = fileList.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file.originFileObj || file);
      
      console.log('Uploading file:', file.name);
      
      try {
        const response = await axios.post(`${API_URL}/api/v1/upload/pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }); 
        
        message.success(`✅ ${file.name} processed successfully! PO: ${response.data.po_number}`);
        return {
          name: file.name,
          status: 'success',
          po_number: response.data.po_number,
          data: response.data.extracted_data
        };
      } catch (error) {
        console.error('Upload error for', file.name, error);
        message.error(`❌ Failed to process ${file.name}`);
        return {
          name: file.name,
          status: 'error',
          error: error.response?.data?.detail || error.message || 'Upload failed'
        };
      }
    });

    const results = await Promise.all(uploadPromises);

    setUploadResults(results);
    setUploading(false);
    setFileList([]);
    
    if (onUploadComplete) {
      setTimeout(() => onUploadComplete(), 1000);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList: fileList,
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error(`${file.name} is not a PDF file`);
        return false;
      }
      // Check file size (max 10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name} must be smaller than 10MB!`);
        return false;
      }
      setFileList([...fileList, file]);
      return false;
    },
    onRemove: (file) => {
      setFileList(fileList.filter(f => f.uid !== file.uid));
    },
    onDrop: (e) => {
      console.log('Dropped files', e.dataTransfer.files);
    }
  };

  return (
    <div style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>📄 Upload Purchase Orders</h2>
      
      <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <FilePdfOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">Click or drag PDF files here</p>
        <p className="ant-upload-hint">Support for single or bulk upload of purchase order PDFs (Max 10MB each)</p>
      </Upload.Dragger>

      {fileList.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <Button 
            type="primary" 
            onClick={handleUpload} 
            loading={uploading}
            icon={<UploadOutlined />}
          >
            Upload {fileList.length} file(s)
          </Button>
          <Button onClick={() => setFileList([])} disabled={uploading}>
            Clear
          </Button>
        </div>
      )}

      {uploadResults.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Upload Results</h3>
          <List
            size="small"
            bordered
            dataSource={uploadResults}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  avatar={item.status === 'success' ? 
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} /> : 
                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                  }
                  title={item.name}
                  description={item.status === 'success' ? 
                    `PO Number: ${item.po_number}` : 
                    `Error: ${item.error}`
                  }
                />
                {item.status === 'success' && <Tag color="green">Processed</Tag>}
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
}

export default UploadSection;
