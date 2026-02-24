import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// 初始天梯 AI 玩家（名字真实感）
const SEED_LADDER_ENTRIES: Array<{ id: string; nickname: string; ladderPoints: number; isAI?: boolean }> = [
  { id: 'ai_1', nickname: '张明远', ladderPoints: 2847, isAI: true },
  { id: 'ai_2', nickname: '李思琪', ladderPoints: 2653, isAI: true },
  { id: 'ai_3', nickname: '王浩然', ladderPoints: 2512, isAI: true },
  { id: 'ai_4', nickname: '陈雨萱', ladderPoints: 2398, isAI: true },
  { id: 'ai_5', nickname: '刘子轩', ladderPoints: 2280, isAI: true },
  { id: 'ai_6', nickname: '赵雅婷', ladderPoints: 2156, isAI: true },
  { id: 'ai_7', nickname: '周俊杰', ladderPoints: 2034, isAI: true },
  { id: 'ai_8', nickname: '吴梦琪', ladderPoints: 1892, isAI: true },
  { id: 'ai_9', nickname: '郑博文', ladderPoints: 1756, isAI: true },
  { id: 'ai_10', nickname: '孙晓琳', ladderPoints: 1620, isAI: true },
];

const Container = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 280px;
`;

const Header = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid var(--surface-border);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04));
  
  &::before {
    content: '';
    display: block;
    width: 4px;
    height: 24px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    border-radius: 2px;
    margin-bottom: 8px;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Subtitle = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const Row = styled.div<{ $isCurrentUser?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  transition: background 0.2s;
  background: ${p => p.$isCurrentUser ? 'rgba(99, 102, 241, 0.15)' : 'transparent'};
  border-left: ${p => p.$isCurrentUser ? '3px solid #6366f1' : '3px solid transparent'};
  
  &:hover {
    background: var(--surface-highlight);
  }
`;

const Rank = styled.div<{ $top?: boolean }>`
  width: 28px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${p => p.$top ? '#f59e0b' : 'var(--text-secondary)'};
  text-align: center;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
`;

const Name = styled.div`
  flex: 1;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Points = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  color: var(--primary-color);
  font-size: 1rem;
`;

const AITag = styled.span`
  font-size: 0.65rem;
  color: var(--text-muted);
  background: var(--surface-highlight);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
`;

interface LadderBoardProps {
  className?: string;
}

const LadderBoard: React.FC<LadderBoardProps> = ({ className }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isGuest = !user || (user.profile as { isGuest?: boolean }).isGuest;
  const myPoints = (user?.stats as { ladderPoints?: number })?.ladderPoints ?? 1000;

  const entries = useMemo(() => {
    const list = [...SEED_LADDER_ENTRIES];
    if (user && !isGuest) {
      list.push({
        id: user.profile.id,
        nickname: user.profile.nickname,
        ladderPoints: myPoints,
        isAI: false,
      });
    }
    return list.sort((a, b) => b.ladderPoints - a.ladderPoints).slice(0, 11);
  }, [user, isGuest, myPoints]);

  if (isGuest) return null;

  return (
    <Container className={className}>
      <Header>
        <Title>{t('ladder.title') || '天梯排行'}</Title>
        <Subtitle>{t('ladder.subtitle') || '赢取对局获得积分'}</Subtitle>
      </Header>
      <List>
        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const isMe = !entry.isAI && entry.id === user?.profile.id;
          return (
            <Row key={entry.id} $isCurrentUser={isMe}>
              <Rank $top={rank <= 3}>{rank}</Rank>
              <Avatar>
                {entry.nickname.charAt(0).toUpperCase()}
              </Avatar>
              <Name>
                {entry.nickname}
                {entry.isAI && <AITag>AI</AITag>}
              </Name>
              <Points>{entry.ladderPoints}</Points>
            </Row>
          );
        })}
      </List>
    </Container>
  );
};

export default LadderBoard;
