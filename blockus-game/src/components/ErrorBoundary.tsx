// 全局错误边界：捕获子组件渲染错误，防止白屏

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--bg-gradient);
  color: var(--text-primary);
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 12px;
  color: var(--text-primary);
`;

const Message = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 400px;
`;

const RetryBtn = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Container>
          <Title>出错了</Title>
          <Message>
            {this.state.error.message || '页面加载时发生错误，请刷新重试。'}
          </Message>
          <RetryBtn onClick={this.handleRetry}>重新加载</RetryBtn>
        </Container>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
