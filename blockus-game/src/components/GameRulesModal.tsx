import React from 'react';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: left;
  
  @media (max-width: 768px) {
    padding: 20px;
    margin: 10px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
  text-align: left;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #333;
  font-size: 1.8rem;
  text-align: left;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 5px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`;

const Section = styled.div`
  margin-bottom: 25px;
  text-align: left;
`;

const SectionTitle = styled.h3`
  color: #333;
  font-size: 1.3rem;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
`;

const SectionIcon = styled.span`
  font-size: 1.2rem;
`;

const SectionDescription = styled.p`
  color: #666;
  line-height: 1.6;
  margin: 0 0 15px 0;
  text-align: left;
`;

const RulesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
`;

const RuleItem = styled.li`
  color: #555;
  line-height: 1.6;
  margin-bottom: 10px;
  padding-left: 20px;
  position: relative;
  text-align: left;
  
  &:before {
    content: '•';
    color: #667eea;
    font-weight: bold;
    position: absolute;
    left: 0;
  }
`;

const ControlsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
`;

const ControlItem = styled.li`
  color: #555;
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
  text-align: left;
  
  &:before {
    content: '→';
    color: #667eea;
    font-weight: bold;
    position: absolute;
    left: 0;
  }
`;

const StartingPositionImage = styled.div`
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  padding: 20px;
  margin-top: 15px;
  text-align: center;
`;

const ImageCaption = styled.div`
  font-weight: bold;
  color: #333;
  font-size: 1.1rem;
  margin-bottom: 10px;
`;

const ImageDescription = styled.div`
  color: #666;
  line-height: 1.6;
  font-size: 0.95rem;
`;

const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose }) => {
  const { t, tArray } = useLanguage();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t('help.title')}</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <Section>
          <SectionTitle>
            <SectionIcon>🎯</SectionIcon>
            {t('help.objective')}
          </SectionTitle>
          <SectionDescription>
            {t('help.objectiveDesc')}
          </SectionDescription>
        </Section>

        <Section>
          <SectionTitle>
            <SectionIcon>📋</SectionIcon>
            {t('help.rules')}
          </SectionTitle>
          <RulesList>
            {tArray('help.rulesDesc').map((rule, index) => (
              <RuleItem key={index}>{rule}</RuleItem>
            ))}
          </RulesList>
        </Section>

        <Section>
          <SectionTitle>
            <SectionIcon>🎮</SectionIcon>
            {t('help.controls')}
          </SectionTitle>
          <ControlsList>
            {tArray('help.controlsDesc').map((control, index) => (
              <ControlItem key={index}>{control}</ControlItem>
            ))}
          </ControlsList>
        </Section>

        <Section>
          <SectionTitle>
            <SectionIcon>📍</SectionIcon>
            {t('help.startingPosition')}
          </SectionTitle>
          <SectionDescription>
            {t('help.startingPositionDesc')}
          </SectionDescription>
          <StartingPositionImage>
            <ImageCaption>游戏起始位置示意图</ImageCaption>
            <ImageDescription>
              左上角（0,0位置）是游戏的起始点，第一个拼图必须放置在这里。
              这个位置会有特殊的黄色发光提示，帮助玩家识别起始位置。
            </ImageDescription>
          </StartingPositionImage>
        </Section>
      </ModalContent>
    </ModalOverlay>
  );
};

export default GameRulesModal;
