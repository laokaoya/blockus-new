// 道具卡使用广播特效

import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { PlayerColor } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';

const fadeInOut = keyframes`
  0% { opacity: 0; transform: scale(0.9); }
  15% { opacity: 1; transform: scale(1); }
  85% { opacity: 1; }
  100% { opacity: 0; transform: scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const Card = styled.div`
  background: var(--surface-color);
  border: 2px solid var(--surface-border);
  border-radius: 16px;
  padding: 20px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: ${fadeInOut} 2.5s ease-out forwards;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Avatar = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 20px;
`;

const Text = styled.div`
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
`;

const CardName = styled.span`
  color: #a78bfa;
  font-weight: 700;
`;

interface ItemUseBroadcastProps {
  playerName: string;
  playerColor: PlayerColor;
  cardName: string;
  targetName?: string;
  onDone: () => void;
}

const ItemUseBroadcast: React.FC<ItemUseBroadcastProps> = ({
  playerName, playerColor, cardName, targetName, onDone,
}) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const color = PLAYER_COLORS[playerColor] || '#6b7280';
  const msg = targetName
    ? `${playerName} 对 ${targetName} 使用了「${cardName}」`
    : `${playerName} 使用了「${cardName}」`;

  return (
    <Overlay>
      <Card>
        <Avatar $color={color}>{playerName.charAt(0)}</Avatar>
        <Text>
          {msg.split(cardName)[0]}
          <CardName>{cardName}</CardName>
          {msg.split(cardName)[1] || ''}
        </Text>
      </Card>
    </Overlay>
  );
};

export default ItemUseBroadcast;
