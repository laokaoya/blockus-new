// 特殊方格触发效果弹窗

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { TileEffect, SpecialTileType } from '../../types/creative';
import { EffectResult } from '../../utils/creativeModeEngine';

interface EffectPopupProps {
  effect: TileEffect;
  result: EffectResult;
  onClose?: () => void;
}

const popIn = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  60% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const TYPE_COLORS: Record<SpecialTileType, { bg: string; glow: string; border: string }> = {
  gold:    { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)', glow: 'rgba(251, 191, 36, 0.6)', border: '#fbbf24' },
  purple:  { bg: 'linear-gradient(135deg, #a78bfa, #8b5cf6, #7c3aed)', glow: 'rgba(139, 92, 246, 0.6)', border: '#a78bfa' },
  red:     { bg: 'linear-gradient(135deg, #f87171, #ef4444, #dc2626)', glow: 'rgba(248, 113, 113, 0.6)', border: '#f87171' },
  barrier: { bg: 'linear-gradient(135deg, #6b7280, #4b5563)', glow: 'rgba(107, 114, 128, 0.4)', border: '#6b7280' },
};

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 5000;
  pointer-events: none;
`;

const Popup = styled.div<{ tileType: SpecialTileType }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${popIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  
  background: rgba(15, 23, 42, 0.95);
  border: 2px solid ${props => TYPE_COLORS[props.tileType].border};
  border-radius: 20px;
  padding: 30px 40px;
  text-align: center;
  min-width: 280px;
  max-width: 400px;
  box-shadow: 0 0 60px ${props => TYPE_COLORS[props.tileType].glow},
              inset 0 0 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
`;

const TypeBadge = styled.div<{ tileType: SpecialTileType }>`
  display: inline-block;
  padding: 4px 16px;
  border-radius: 20px;
  background: ${props => TYPE_COLORS[props.tileType].bg};
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 15px;
`;

const EffectName = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
`;

const EffectDescription = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Rajdhani', 'Microsoft YaHei', sans-serif;
  line-height: 1.5;
`;

const ScoreChange = styled.div<{ positive: boolean }>`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 12px;
  color: ${props => props.positive ? '#4ade80' : '#f87171'};
`;

const TYPE_LABELS: Record<SpecialTileType, string> = {
  gold: '★ GOLD',
  purple: '? MYSTERY',
  red: '! RISK',
  barrier: '■ BARRIER',
};

const EffectPopup: React.FC<EffectPopupProps> = ({ effect, result }) => {
  const scoreChange = result.scoreChange;

  return (
    <Overlay>
      <Popup tileType={effect.type}>
        <TypeBadge tileType={effect.type}>{TYPE_LABELS[effect.type]}</TypeBadge>
        <EffectName>{effect.name}</EffectName>
        <EffectDescription>{effect.description}</EffectDescription>
        {scoreChange !== 0 && (
          <ScoreChange positive={scoreChange > 0}>
            {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
          </ScoreChange>
        )}
        {result.grantItemCard && (
          <div style={{ marginTop: '8px', color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600 }}>
            🃏 获得道具卡！
          </div>
        )}
        {result.extraTurn && (
          <div style={{ marginTop: '8px', color: '#4ade80', fontSize: '0.9rem', fontWeight: 600 }}>
            ⚡ 额外回合！
          </div>
        )}
      </Popup>
    </Overlay>
  );
};

export default EffectPopup;
