import React from 'react';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'classic' | 'creative';
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  text-align: left;
  
  @media (max-width: 768px) {
    padding: 20px;
    margin: 10px;
    max-height: 95vh;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--surface-border);
  text-align: left;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.8rem;
  text-align: left;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 5px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--text-primary);
  }
`;

const Section = styled.div`
  margin-bottom: 25px;
  text-align: left;
`;

const SectionTitle = styled.h3`
  color: var(--text-primary);
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
  color: var(--text-secondary);
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
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  padding-left: 20px;
  position: relative;
  text-align: left;
  
  &:before {
    content: '•';
    color: var(--primary-color);
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
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
  text-align: left;
  
  &:before {
    content: '→';
    color: var(--primary-color);
    font-weight: bold;
    position: absolute;
    left: 0;
  }
`;

const StartingPositionImage = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-top: 15px;
  text-align: center;
`;

const ImageCaption = styled.div`
  font-weight: bold;
  color: var(--text-primary);
  font-size: 1.1rem;
  margin-bottom: 10px;
`;

const ImageDescription = styled.div`
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
`;

const RuleImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 10px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--surface-border);
`;

// 创意模式方格可视化
const TileShowcase = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
`;

const TileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const TileSample = styled.div<{ bg: string; borderColor: string; solid?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.bg};
  border: ${p => p.solid ? '2px solid #4b5563' : `1.5px solid ${p.borderColor}`};
  font-weight: 900;
  font-size: ${p => p.solid ? '16px' : '14px'};
  color: ${p => p.borderColor};
  text-shadow: ${p => p.solid ? 'none' : `0 0 6px ${p.borderColor}`};
`;

const TileInfo = styled.div`
  flex: 1;
`;

const TileName = styled.div<{ color: string }>`
  font-weight: 700;
  font-size: 0.95rem;
  color: ${p => p.color};
  margin-bottom: 2px;
`;

const TileDesc = styled.div`
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
`;

const TabRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid ${p => p.active ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255,255,255,0.08)'};
  background: ${p => p.active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)'};
  color: ${p => p.active ? '#a5b4fc' : 'var(--text-secondary)'};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(99, 102, 241, 0.1); }
`;

const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose, mode = 'classic' }) => {
  const { t, tArray } = useLanguage();
  const [activeTab, setActiveTab] = React.useState<'classic' | 'creative'>(mode);

  React.useEffect(() => { if (isOpen) setActiveTab(mode); }, [isOpen, mode]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t('help.title')}</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {/* 模式切换 Tab */}
        <TabRow>
          <TabButton active={activeTab === 'classic'} onClick={() => setActiveTab('classic')}>
            {t('help.classicTab')}
          </TabButton>
          <TabButton active={activeTab === 'creative'} onClick={() => setActiveTab('creative')}>
            {t('help.creativeTab')}
          </TabButton>
        </TabRow>

        {activeTab === 'classic' ? (
          <>
            <Section>
              <SectionTitle><SectionIcon>🎯</SectionIcon>{t('help.objective')}</SectionTitle>
              <SectionDescription>{t('help.objectiveDesc')}</SectionDescription>
            </Section>
            <Section>
              <SectionTitle><SectionIcon>📋</SectionIcon>{t('help.rules')}</SectionTitle>
              <RulesList>
                {tArray('help.rulesDesc').map((rule, index) => (
                  <RuleItem key={index}>{rule}</RuleItem>
                ))}
              </RulesList>
            </Section>
            <Section>
              <SectionTitle><SectionIcon>🎮</SectionIcon>{t('help.controls')}</SectionTitle>
              <ControlsList>
                {tArray('help.controlsDesc').map((control, index) => (
                  <ControlItem key={index}>{control}</ControlItem>
                ))}
              </ControlsList>
            </Section>
            <Section>
              <SectionTitle><SectionIcon>📍</SectionIcon>{t('help.startingPosition')}</SectionTitle>
              <SectionDescription>{t('help.startingPositionDesc')}</SectionDescription>
              <RuleImage src="/images/starting-position.png" alt="Starting Position"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </Section>
            <Section>
              <SectionTitle><SectionIcon>📐</SectionIcon>{t('help.placementRules')}</SectionTitle>
              <SectionDescription>{t('help.placementRulesDesc')}</SectionDescription>
              <RuleImage src="/images/placement-rules.png" alt="Placement Rules"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </Section>
            <Section>
              <SectionTitle><SectionIcon>🔗</SectionIcon>{t('help.connectionRules')}</SectionTitle>
              <SectionDescription>{t('help.connectionRulesDesc')}</SectionDescription>
              <RuleImage src="/images/connection-rules.png" alt="Connection Rules"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </Section>
          </>
        ) : (
          <>
            <Section>
              <SectionTitle><SectionIcon>✨</SectionIcon>{t('help.creativeOverview')}</SectionTitle>
              <SectionDescription>{t('help.creativeOverviewDesc')}</SectionDescription>
            </Section>

            <Section>
              <SectionTitle><SectionIcon>🗺️</SectionIcon>{t('help.specialTiles')}</SectionTitle>
              <SectionDescription>{t('help.specialTilesDesc')}</SectionDescription>
              <TileShowcase>
                <TileRow>
                  <TileSample bg="rgba(251, 191, 36, 0.3)" borderColor="#fbbf24">★</TileSample>
                  <TileInfo>
                    <TileName color="#fbbf24">{t('help.goldTileName')}</TileName>
                    <TileDesc>{t('help.goldTileDesc')}</TileDesc>
                  </TileInfo>
                </TileRow>
                <TileRow>
                  <TileSample bg="rgba(167, 139, 250, 0.3)" borderColor="#a78bfa">?</TileSample>
                  <TileInfo>
                    <TileName color="#a78bfa">{t('help.purpleTileName')}</TileName>
                    <TileDesc>{t('help.purpleTileDesc')}</TileDesc>
                  </TileInfo>
                </TileRow>
                <TileRow>
                  <TileSample bg="rgba(248, 113, 113, 0.3)" borderColor="#f87171">!</TileSample>
                  <TileInfo>
                    <TileName color="#f87171">{t('help.redTileName')}</TileName>
                    <TileDesc>{t('help.redTileDesc')}</TileDesc>
                  </TileInfo>
                </TileRow>
                <TileRow>
                  <TileSample bg="rgba(55, 55, 60, 0.95)" borderColor="#6b7280" solid>×</TileSample>
                  <TileInfo>
                    <TileName color="#9ca3af">{t('help.barrierTileName')}</TileName>
                    <TileDesc>{t('help.barrierTileDesc')}</TileDesc>
                  </TileInfo>
                </TileRow>
              </TileShowcase>
            </Section>

            <Section>
              <SectionTitle><SectionIcon>🃏</SectionIcon>{t('help.itemCards')}</SectionTitle>
              <SectionDescription>{t('help.itemCardsDesc')}</SectionDescription>
              <RulesList>
                {tArray('help.itemCardsList').map((item, i) => (
                  <RuleItem key={i}>{item}</RuleItem>
                ))}
              </RulesList>
            </Section>

            <Section>
              <SectionTitle><SectionIcon>🛡️</SectionIcon>{t('help.statusEffects')}</SectionTitle>
              <SectionDescription>{t('help.statusEffectsDesc')}</SectionDescription>
            </Section>

            <Section>
              <SectionTitle><SectionIcon>📋</SectionIcon>{t('help.creativePlacement')}</SectionTitle>
              <RulesList>
                {tArray('help.creativePlacementDesc').map((rule, i) => (
                  <RuleItem key={i}>{rule}</RuleItem>
                ))}
              </RulesList>
            </Section>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default GameRulesModal;
