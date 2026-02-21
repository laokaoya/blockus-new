// 道具卡栏 + 道具使用阶段 UI

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ItemCard, ItemCardId, CreativePlayerState } from '../../types/creative';
import { Player } from '../../types/game';
import { PLAYER_COLORS } from '../../constants/pieces';

interface ItemCardBarProps {
  creativePlayer: CreativePlayerState | undefined;
  isItemPhase: boolean;
  itemPhaseTimeLeft: number;
  players: Player[];
  currentPlayerId: string;
  onUseCard: (cardIndex: number) => void;
  onSkipPhase: () => void;
  // 目标选择
  targetSelection: { cardIndex: number; card: ItemCard } | null;
  onConfirmTarget: (targetId: string) => void;
  onCancelTarget?: () => void;
  /** 创意模式：用于显示目标钢铁护盾特效 */
  creativePlayers?: CreativePlayerState[];
}

const slideUp = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
`;

const Container = styled.div<{ $isPhase: boolean }>`
  position: fixed;
  bottom: ${props => props.$isPhase ? '120px' : '110px'};
  left: 50%;
  transform: translateX(-50%);
  z-index: 10002;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: ${slideUp} 0.4s ease-out;
  
  @media (max-width: 768px) {
    bottom: ${props => props.$isPhase ? '100px' : '95px'};
  }
`;

const PhaseHeader = styled.div`
  background: var(--surface-color);
  border: 1px solid rgba(251, 191, 36, 0.5);
  border-radius: 12px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(10px);
`;

const PhaseTitle = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #fbbf24;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const PhaseTimer = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  min-width: 30px;
  text-align: center;
`;

const SkipButton = styled.button.attrs({ type: 'button' })`
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 4px 14px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: var(--surface-border);
    color: var(--text-primary);
  }
`;

const CardsRow = styled.div`
  display: flex;
  gap: 10px;
`;

const CardSlot = styled.button<{ $cardType: ItemCardId }>`
  width: 80px;
  height: 100px;
  border-radius: 10px;
  border: 2px solid ${props => getCardColor(props.$cardType)};
  background: var(--surface-color);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  animation: ${pulse} 2s infinite;
  
  &:hover {
    transform: translateY(-5px) scale(1.05);
    border-color: var(--text-primary);
    box-shadow: 0 0 20px ${props => getCardColor(props.$cardType)}40;
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
  
  @media (max-width: 768px) {
    width: 65px;
    height: 85px;
  }
`;

const CardIcon = styled.div`
  font-size: 1.5rem;
`;

const CardName = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  font-family: 'Rajdhani', 'Microsoft YaHei', sans-serif;
`;

// 目标选择面板
const TargetPanel = styled.div`
  background: var(--surface-color);
  border: 1px solid rgba(99, 102, 241, 0.5);
  border-radius: 12px;
  padding: 15px 20px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const TargetTitle = styled.div`
  font-family: 'Rajdhani', 'Microsoft YaHei', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #a78bfa;
`;

const TargetList = styled.div`
  display: flex;
  gap: 12px;
`;

const steelShine = keyframes`
  0%, 100% { box-shadow: 0 0 8px #94a3b8, 0 0 12px #64748b; }
  50% { box-shadow: 0 0 12px #cbd5e1, 0 0 18px #94a3b8; }
`;

const TargetButton = styled.button<{ $color: string; $hasSteel?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 2px solid ${props => props.$hasSteel ? '#94a3b8' : PLAYER_COLORS[props.$color]};
  background: var(--surface-highlight);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    background: ${props => PLAYER_COLORS[props.$color]}30;
    transform: translateY(-3px);
  }
  ${props => props.$hasSteel && css`
    &::after {
      content: '🛡';
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 12px;
    }
  `}
`;

const TargetAvatar = styled.div<{ $color: string; $hasSteel?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => PLAYER_COLORS[props.$color]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 0.9rem;
  ${props => props.$hasSteel && css`
    border: 2px solid #94a3b8;
    animation: ${steelShine} 2s ease-in-out infinite;
  `}
`;

const TargetName = styled.div`
  font-size: 0.75rem;
  color: var(--text-primary);
  font-weight: 600;
`;

function getCardColor(cardType: ItemCardId): string {
  switch (cardType) {
    case 'item_blackhole': return '#1f2937';
    case 'item_shrink':    return '#dc2626';
    case 'item_curse':     return '#7c3aed';
    case 'item_steel':     return '#3b82f6';
    case 'item_freeze':    return '#06b6d4';
    case 'item_pressure':  return '#f97316';
    case 'item_plunder':   return '#eab308';
    case 'item_blame':     return '#ec4899';
    default: return '#6b7280';
  }
}

function getCardIcon(cardType: ItemCardId): string {
  switch (cardType) {
    case 'item_blackhole': return '●';
    case 'item_shrink':    return '▼';
    case 'item_curse':     return '☠';
    case 'item_steel':     return '🛡';
    case 'item_freeze':    return '❄';
    case 'item_pressure':  return '⏱';
    case 'item_plunder':   return '💰';
    case 'item_blame':     return '↻';
    default: return '?';
  }
}

const ItemCardBar: React.FC<ItemCardBarProps> = ({
  creativePlayer,
  isItemPhase,
  itemPhaseTimeLeft,
  players,
  currentPlayerId,
  onUseCard,
  onSkipPhase,
  targetSelection,
  onConfirmTarget,
  onCancelTarget,
  creativePlayers,
}) => {
  if (!creativePlayer) return null;
  const { itemCards } = creativePlayer;
  if (itemCards.length === 0 && !isItemPhase) return null;

  const opponents = players.filter(p => p.id !== currentPlayerId && !p.isSettled);
  const hasSteel = (playerId: string) =>
    creativePlayers?.some(cp => cp.playerId === playerId && cp.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0));

  return (
    <Container $isPhase={isItemPhase}>
      {/* 目标选择面板 */}
      {targetSelection && (
        <TargetPanel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <TargetTitle>选择目标 — {targetSelection.card.name}</TargetTitle>
            <SkipButton onClick={onCancelTarget || onSkipPhase}>取消</SkipButton>
          </div>
          <TargetList>
            {opponents.map(p => (
              <TargetButton key={p.id} $color={p.color} $hasSteel={hasSteel(p.id)} onClick={() => onConfirmTarget(p.id)} title={hasSteel(p.id) ? '钢铁护盾（道具无效）' : undefined}>
                <TargetAvatar $color={p.color} $hasSteel={hasSteel(p.id)}>{p.name.charAt(0)}</TargetAvatar>
                <TargetName>{p.name}{hasSteel(p.id) ? ' 🛡' : ''}</TargetName>
              </TargetButton>
            ))}
          </TargetList>
        </TargetPanel>
      )}

      {/* 道具阶段标题 */}
      {isItemPhase && !targetSelection && (
        <PhaseHeader>
          <PhaseTitle>道具阶段</PhaseTitle>
          <PhaseTimer>{itemPhaseTimeLeft}s</PhaseTimer>
          <SkipButton onClick={onSkipPhase}>跳过</SkipButton>
        </PhaseHeader>
      )}

      {/* 道具卡列表 */}
      {itemCards.length > 0 && (
        <CardsRow>
          {itemCards.map((card, index) => (
            <CardSlot
              key={card.id}
              $cardType={card.cardType}
              onClick={() => isItemPhase ? onUseCard(index) : undefined}
              style={{ opacity: isItemPhase ? 1 : 0.5, cursor: isItemPhase ? 'pointer' : 'default' }}
              title={card.description}
            >
              <CardIcon>{getCardIcon(card.cardType)}</CardIcon>
              <CardName>{card.name}</CardName>
            </CardSlot>
          ))}
        </CardsRow>
      )}
    </Container>
  );
};

export default ItemCardBar;
