import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, List, Avatar, Drawer, Tooltip } from 'antd';
import { MessageOutlined, AudioOutlined, SendOutlined, CloseOutlined, AudioMutedOutlined } from '@ant-design/icons';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const Chatbot = ({ orders = [], kpi = null }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your PO Assistant. You can ask me about orders, totals, or voice your commands.", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Could not start recognition", err);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processCommand = (command) => {
    const cmd = command.toLowerCase();
    let response = "I'm sorry, I didn't understand that command. Try asking about 'total orders', 'total value', or 'recent POs'.";

    if (cmd.includes('total orders') || cmd.includes('how many orders')) {
      response = `There are currently ${orders.length} orders in the system.`;
    } else if (cmd.includes('total value') || cmd.includes('value of orders')) {
      const val = kpi?.total_value || orders.reduce((sum, o) => sum + (o.total_value || 0), 0);
      response = `The total value of all orders is approximately £${val.toLocaleString()}.`;
    } else if (cmd.includes('recent') || cmd.includes('latest')) {
      if (orders.length > 0) {
        const latest = orders[orders.length - 1];
        response = `The most recent order is ${latest.po_number} from ${latest.supplier}.`;
      } else {
        response = "There are no orders yet.";
      }
    } else if (cmd.includes('supplier') || cmd.includes('brands')) {
      response = `We have active orders from ${kpi?.active_suppliers || 0} suppliers across ${kpi?.active_brands || 0} brands.`;
    }

    setMessages(prev => [...prev, { text: response, sender: 'bot' }]);
  };

  const handleSendMessage = (text) => {
    const message = text || inputValue;
    if (!message.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text: message, sender: 'user' }]);
    setInputValue('');
    
    // Process and respond after a small delay
    setTimeout(() => {
      processCommand(message);
    }, 500);
  };

  return (
    <>
      <Tooltip title="PO Assistant">
        <Button 
          type="primary" 
          shape="circle" 
          icon={<MessageOutlined style={{ fontSize: '24px' }} />} 
          size="large"
          style={{ 
            position: 'fixed', 
            bottom: 30, 
            right: 30, 
            width: 60, 
            height: 60, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}
          onClick={() => setVisible(true)}
        />
      </Tooltip>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>PO Automation Assistant</span>
            <CloseOutlined onClick={() => setVisible(false)} style={{ cursor: 'pointer' }} />
          </div>
        }
        placement="right"
        closable={false}
        onClose={() => setVisible(false)}
        open={visible}
        width={350}
        bodyStyle={{ display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f5f5f5' }}>
          <List
            dataSource={messages}
            renderItem={item => (
              <List.Item style={{ borderBottom: 'none', padding: '8px 0', justifyContent: item.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: item.sender === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  maxWidth: '85%'
                }}>
                  <Avatar style={{ backgroundColor: item.sender === 'user' ? '#1890ff' : '#52c41a', margin: item.sender === 'user' ? '0 0 0 8px' : '0 8px 0 0' }}>
                    {item.sender === 'user' ? 'U' : 'PO'}
                  </Avatar>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: item.sender === 'user' ? '#1890ff' : '#fff',
                    color: item.sender === 'user' ? '#fff' : '#000',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    borderTopRightRadius: item.sender === 'user' ? 0 : '12px',
                    borderTopLeftRadius: item.sender === 'bot' ? 0 : '12px',
                  }}>
                    {item.text}
                  </div>
                </div>
              </List.Item>
            )}
          />
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #e8e8e8', background: '#fff' }}>
          <Input.Group compact style={{ display: 'flex' }}>
            <Button 
              icon={isListening ? <AudioOutlined style={{ color: 'red' }} /> : <AudioMutedOutlined />} 
              onClick={toggleListen}
              disabled={!SpeechRecognition}
              title={SpeechRecognition ? "Click to speak" : "Speech recognition not supported in this browser"}
            />
            <Input 
              style={{ flex: 1 }} 
              placeholder="Type a command..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={() => handleSendMessage()}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSendMessage()} />
          </Input.Group>
        </div>
      </Drawer>
    </>
  );
};

export default Chatbot;
