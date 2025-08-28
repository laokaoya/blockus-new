import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface GameRecord {
  id: string;
  date: string;
  duration: number;
  players: {
    name: string;
    color: string;
    score: number;
    isWinner: boolean;
  }[];
  settings: {
    aiDifficulty: string;
    timeLimit: number;
  };
  moves: GameMove[];
  finalBoard: number[][];
}

interface GameMove {
  playerColor: string;
  pieceType: number;
  shapeIndex: number;
  position: { x: number; y: number };
  timestamp: number;
  boardChanges: { x: number; y: number; color: number }[];
}

interface UserStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  winRate: number;
  bestScore: number;
  averageScore: number;
  totalPlayTime: number;
  averageGameTime: number;
}

const StatisticsContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ContentWrapper = styled.div`
  width: 90%;
  max-width: 1260px;
  transform: scale(0.9);
  transform-origin: top center;
  margin-bottom: 40px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  margin: 10px 0 0 0;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ContentContainer = styled.div`
  display: flex;
  gap: 30px;
  max-width: 1400px;
  width: 100%;
  
  @media (max-width: 1200px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const StatsCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const CardTitle = styled.h2`
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.5rem;
  text-align: center;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 2px solid #e9ecef;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
`;

const HistoryList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const HistoryItem = styled.div<{ isSelected: boolean }>`
  padding: 15px;
  margin-bottom: 10px;
  background: ${props => props.isSelected ? '#667eea' : '#f8f9fa'};
  color: ${props => props.isSelected ? 'white' : '#333'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid ${props => props.isSelected ? '#667eea' : '#e9ecef'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const GameDate = styled.div`
  font-weight: bold;
  font-size: 1.1rem;
`;

const GameDuration = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const PlayersInfo = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const PlayerInfo = styled.div<{ isWinner: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: ${props => props.isWinner ? '#28a745' : '#6c757d'};
  color: white;
  border-radius: 15px;
  font-size: 0.9rem;
  font-weight: ${props => props.isWinner ? 'bold' : 'normal'};
`;

const PlayerColor = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => {
    const colorMap: { [key: string]: string } = {
      red: '#dc3545',
      yellow: '#ffc107',
      blue: '#007bff',
      green: '#28a745'
    };
    return colorMap[props.color] || '#6c757d';
  }};
`;

const ReplayContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const ReplayBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  gap: 1px;
  background: #ccc;
  padding: 15px;
  border-radius: 15px;
  margin: 20px auto;
  width: 500px;
  height: 500px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border: 2px solid #333;
`;

const BoardCell = styled.div<{ color: number }>`
  width: 22px;
  height: 22px;
  background: ${props => {
    if (props.color === 0) {
      return '#fff'; // 空位 - 白色
    }
    const colors = ['transparent', '#FF4444', '#FFDD44', '#4444FF', '#44FF44'];
    return colors[props.color] || '#fff';
  }};
  border: 1px solid #ddd;
  border-radius: 3px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
`;

const ReplayControls = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 20px 0;
`;

const ControlButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 25px;
  background: #667eea;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  
  &:hover {
    background: #5a6fd8;
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: #667eea;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const BackButton = styled.button`
  position: absolute;
  left: 20px;
  top: 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userStats, setUserStats] = useState<UserStats>({
    totalGames: 0,
    totalWins: 0,
    totalScore: 0,
    winRate: 0,
    bestScore: 0,
    averageScore: 0,
    totalPlayTime: 0,
    averageGameTime: 0
  });
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayBoard, setReplayBoard] = useState<number[][]>([]);
  const isPlayingRef = useRef(false); // 使用ref来跟踪播放状态

  // 加载用户统计数据和游戏历史
  useEffect(() => {
    loadUserStats();
    loadGameHistory();
  }, []);

  const loadUserStats = () => {
    const savedStats = localStorage.getItem('userStats');
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setUserStats({
        ...stats,
        averageScore: stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames) : 0,
        averageGameTime: stats.totalGames > 0 ? Math.round(stats.totalPlayTime / stats.totalGames) : 0
      });
    }
  };

  const loadGameHistory = () => {
    const savedHistory = localStorage.getItem('gameHistory');
    if (savedHistory) {
      setGameHistory(JSON.parse(savedHistory));
    }
  };

  const clearGameHistory = () => {
    if (window.confirm('确定要清除所有历史对局记录吗？此操作不可恢复。')) {
      localStorage.removeItem('gameHistory');
      setGameHistory([]);
      setSelectedGame(null);
      setReplayBoard(Array(20).fill(null).map(() => Array(20).fill(0)));
      setCurrentMoveIndex(0);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleGameSelect = (game: GameRecord) => {
    setSelectedGame(game);
    setCurrentMoveIndex(0);
    setIsPlaying(false);
    // 初始化回放棋盘
    const initialBoard = Array(20).fill(null).map(() => Array(20).fill(0));
    setReplayBoard(initialBoard);
  };

  const playReplay = () => {
    if (!selectedGame) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    let moveIndex = currentMoveIndex;
    
    const playNextMove = () => {
      if (moveIndex < selectedGame.moves.length && isPlayingRef.current) {
        // 从当前累积状态开始，播放下一步
        const currentBoard = getBoardAtStep(moveIndex);
        setReplayBoard(currentBoard);
        setCurrentMoveIndex(moveIndex + 1);
        moveIndex++;
        setTimeout(playNextMove, 2000); // 每2秒播放一步
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };
    
    playNextMove();
  };

  // 获取指定步骤的棋盘状态
  const getBoardAtStep = (stepIndex: number) => {
    const board = Array(20).fill(null).map(() => Array(20).fill(0));
    
    // 从第一步开始，累积到指定步骤
    for (let i = 0; i <= stepIndex; i++) {
      const move = selectedGame!.moves[i];
      move.boardChanges.forEach(change => {
        if (change.x >= 0 && change.x < 20 && change.y >= 0 && change.y < 20) {
          board[change.y][change.x] = change.color;
        }
      });
    }
    
    return board;
  };

  const playMove = (move: GameMove) => {
    console.log('播放移动:', move);
    console.log('当前棋盘状态:', replayBoard);
    
    const newBoard = replayBoard.map(row => [...row]);
    
    // 直接应用棋盘变化，新增块而不是重新计算
    move.boardChanges.forEach(change => {
      if (change.x >= 0 && change.x < 20 && change.y >= 0 && change.y < 20) {
        newBoard[change.y][change.x] = change.color;
        console.log(`在位置 (${change.x}, ${change.y}) 放置颜色 ${change.color}`);
      }
    });
    
    console.log('新棋盘状态:', newBoard);
    setReplayBoard(newBoard);
  };

  const pauseReplay = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  const resetReplay = () => {
    setCurrentMoveIndex(0);
    setIsPlaying(false);
    const initialBoard = Array(20).fill(null).map(() => Array(20).fill(0));
    setReplayBoard(initialBoard);
  };

  const nextMove = () => {
    if (!selectedGame || currentMoveIndex >= selectedGame.moves.length) return;
    
    playMove(selectedGame.moves[currentMoveIndex]);
    setCurrentMoveIndex(currentMoveIndex + 1);
  };

  const prevMove = () => {
    if (!selectedGame || currentMoveIndex <= 0) return;
    
    setCurrentMoveIndex(currentMoveIndex - 1);
    // 重新计算到当前步骤的棋盘状态
    const initialBoard = Array(20).fill(null).map(() => Array(20).fill(0));
    setReplayBoard(initialBoard);
    
    // 重新播放到当前步骤
    for (let i = 0; i < currentMoveIndex - 1; i++) {
      const move = selectedGame.moves[i];
      playMove(move);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    // 根据当前语言设置日期格式
    const currentLanguage = localStorage.getItem('language') || 'zh';
    return new Date(dateString).toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'en-US');
  };

  return (
    <StatisticsContainer>
      <BackButton onClick={() => navigate('/')}>← {t('common.back')}</BackButton>
      
      <Header>
        <Title>{t('statistics.title')}</Title>
        <Subtitle>{t('statistics.subtitle')}</Subtitle>
      </Header>

      <ContentWrapper>
        <ContentContainer>
          <LeftPanel>
            <StatsCard>
              <CardTitle>{t('statistics.overallStats')}</CardTitle>
              <StatsGrid>
                <StatItem>
                  <StatValue>{userStats.totalGames}</StatValue>
                  <StatLabel>{t('statistics.totalGames')}</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{userStats.totalWins}</StatValue>
                  <StatLabel>{t('statistics.totalWins')}</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{userStats.winRate.toFixed(1)}%</StatValue>
                  <StatLabel>{t('statistics.winRate')}</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{userStats.bestScore}</StatValue>
                  <StatLabel>{t('statistics.bestScore')}</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{userStats.averageScore}</StatValue>
                  <StatLabel>{t('statistics.averageScore')}</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{formatDuration(userStats.averageGameTime)}</StatValue>
                  <StatLabel>{t('statistics.averageTime')}</StatLabel>
                </StatItem>
              </StatsGrid>
            </StatsCard>

            <StatsCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <CardTitle>{t('statistics.gameHistory')}</CardTitle>
                {gameHistory.length > 0 && (
                  <ControlButton 
                    onClick={clearGameHistory}
                    style={{ 
                      backgroundColor: '#e74c3c', 
                      color: 'white',
                      fontSize: '12px',
                      padding: '6px 12px',
                      border: 'none'
                    }}
                    title={t('statistics.clearHistory')}
                  >
                    🗑️ {t('statistics.clearHistory')}
                  </ControlButton>
                )}
              </div>
              <HistoryList>
                {gameHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    {t('statistics.noHistory')}
                  </div>
                ) : (
                  gameHistory.map((game) => (
                    <HistoryItem
                      key={game.id}
                      isSelected={selectedGame?.id === game.id}
                      onClick={() => handleGameSelect(game)}
                    >
                      <GameInfo>
                        <GameDate>{formatDate(game.date)}</GameDate>
                        <GameDuration>{formatDuration(game.duration)}</GameDuration>
                      </GameInfo>
                      <PlayersInfo>
                        {game.players.map((player) => (
                          <PlayerInfo key={player.color} isWinner={player.isWinner}>
                            <PlayerColor color={player.color} />
                            {player.name}: {player.score}
                          </PlayerInfo>
                        ))}
                      </PlayersInfo>
                    </HistoryItem>
                  ))
                )}
              </HistoryList>
            </StatsCard>
          </LeftPanel>

          <RightPanel>
            <ReplayContainer>
              <CardTitle>{t('statistics.replay')}</CardTitle>
              {selectedGame ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h3>{formatDate(selectedGame.date)}</h3>
                    <p>{t('statistics.aiDifficulty')}: {selectedGame.settings.aiDifficulty} | {t('statistics.timeLimit')}: {selectedGame.settings.timeLimit}{t('settings.seconds')}</p>
                  </div>
                  
                  <ReplayBoard>
                    {replayBoard.map((row, y) =>
                      row.map((cell, x) => (
                        <BoardCell key={`${x}-${y}`} color={cell} />
                      ))
                    )}
                  </ReplayBoard>

                  <ProgressBar>
                    <ProgressFill 
                      progress={selectedGame.moves.length > 0 ? (currentMoveIndex / (selectedGame.moves.length + 1)) * 100 : 0} 
                    />
                  </ProgressBar>

                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {t('statistics.steps')} {currentMoveIndex + 1} / {selectedGame.moves.length + 1}
                  </div>

                  <ReplayControls>
                    <ControlButton onClick={resetReplay}>🔄 {t('statistics.reset')}</ControlButton>
                    <ControlButton onClick={prevMove} disabled={currentMoveIndex <= 0}>⬅️ {t('statistics.previous')}</ControlButton>
                    <ControlButton onClick={isPlaying ? pauseReplay : playReplay}>
                      {isPlaying ? `⏸️ ${t('statistics.pause')}` : `▶️ ${t('statistics.play')}`}
                    </ControlButton>
                    <ControlButton onClick={nextMove} disabled={currentMoveIndex >= (selectedGame.moves.length + 1) - 1}>
                      ➡️ {t('statistics.next')}
                    </ControlButton>
                  </ReplayControls>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                  {t('statistics.selectGame')}
                </div>
              )}
            </ReplayContainer>
          </RightPanel>
        </ContentContainer>
      </ContentWrapper>
    </StatisticsContainer>
  );
};

export default Statistics;
