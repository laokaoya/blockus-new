/**
 * 游戏页面错误/卡死时的回退 UI，提供「返回大厅」确保用户可退出
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  font-size: 1.25rem;
  margin-bottom: 12px;
  color: var(--text-primary);
`;

const Message = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 360px;
`;

const BackBtn = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--surface-border);
    transform: scale(1.02);
  }
`;

export const GameErrorFallback: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/', { replace: true, state: { showTransition: true } });
  };

  return (
    <Container>
      <Title>游戏异常</Title>
      <Message>游戏可能已卡住或发生错误，请返回大厅后重新进入。</Message>
      <BackBtn onClick={handleBack}>返回大厅</BackBtn>
    </Container>
  );
};

export default GameErrorFallback;
