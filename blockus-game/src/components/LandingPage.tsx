import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: transparent;
  position: relative;
  overflow: hidden;
`;

const Content = styled.div`
  text-align: center;
  z-index: 10;
  animation: ${fadeIn} 0.8s ease-out;
  max-width: 800px;
  width: 100%;
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 800;
  margin: 0 0 10px 0;
  color: #fff;
  letter-spacing: 2px;
  font-family: 'Rajdhani', sans-serif;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  
  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin: 0 0 50px 0;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 40px;
  }
`;

const ActionButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 20px 60px;
  border-radius: 50px;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.5);
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: 16px 40px;
    font-size: 1.2rem;
  }
`;

const BackgroundShape = styled.div<{ size: number; top: string; left: string; color: string; delay: string }>`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  top: ${props => props.top};
  left: ${props => props.left};
  background: ${props => props.color};
  opacity: 0.1;
  border-radius: 20px;
  transform: rotate(45deg);
  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${props => props.delay};
  z-index: 1;
`;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleStart = useCallback(async () => {
    // 自动以访客身份登录
    const guestProfile = {
      id: `guest_${Date.now()}`,
      nickname: `Guest_${Math.floor(Math.random() * 10000)}`,
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
    
    await login(guestProfile);
    navigate('/', { state: { showTransition: true } });
  }, [login, navigate]);

  return (
    <Container>
      {/* 装饰背景 */}
      <BackgroundShape size={300} top="-50px" left="-50px" color="#6366f1" delay="0s" />
      <BackgroundShape size={200} top="60%" left="85%" color="#10b981" delay="2s" />
      <BackgroundShape size={150} top="20%" left="80%" color="#f59e0b" delay="1s" />
      <BackgroundShape size={250} top="70%" left="10%" color="#ef4444" delay="3s" />

      <Content>
        <Title>{t('game.gameName')}</Title>
        <Subtitle>{t('game.description') || 'Strategy. Territory. Domination.'}</Subtitle>
        
        <ActionButton onClick={handleStart}>
          {t('game.start') || 'PLAY NOW'}
        </ActionButton>
      </Content>
    </Container>
  );
};

export default LandingPage;
