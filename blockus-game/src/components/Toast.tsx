// 轻量级 Toast 提示组件，替代 alert 弹窗

import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div<{ $type: 'error' | 'info' | 'success' }>`
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  max-width: 90vw;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  animation: ${slideIn} 0.3s ease-out;
  border: 1px solid;

  ${props => props.$type === 'error' && `
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.5);
  `}
  ${props => props.$type === 'info' && `
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.5);
  `}
  ${props => props.$type === 'success' && `
    background: rgba(34, 197, 94, 0.15);
    color: #86efac;
    border-color: rgba(34, 197, 94, 0.5);
  `}
`;

interface ToastProps {
  message: string;
  type?: 'error' | 'info' | 'success';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'error', onClose, duration = 3500 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <Container $type={type} role="alert">
      {message}
    </Container>
  );
};

export default Toast;
