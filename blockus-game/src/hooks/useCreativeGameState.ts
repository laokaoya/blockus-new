// 创意模式游戏状态管理 Hook
// 基于经典模式扩展，增加特殊方格、道具卡、状态效果系统

import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Player, Piece, Position, PlayerColor } from '../types/game';
import {
  SpecialTile, CreativePlayerState, CreativeGameState,
  TileEffect, ItemCard, StatusEffect, PendingEffect,
} from '../types/creative';
import { PIECE_SHAPES } from '../constants/pieces';
import { canPlacePiece, placePiece, calculateScore, isGameFinished } from '../utils/gameEngine';
import { AIPlayer } from '../utils/aiPlayer';
import { rotatePiece, flipPiece, getUniqueTransformations } from '../utils/pieceTransformations';
import soundManager from '../utils/soundManager';
import {
  generateSpecialTiles, rollGoldEffect, rollPurpleEffect, rollRedEffect,
  rollItemCard, resolveEffect, resolveItemCard,
  tickStatusEffects, addItemCard, findTriggeredTiles,
  initCreativePlayerStates, aiDecideItemCard, EffectResult, ItemResult,
} from '../utils/creativeModeEngine';

const BOARD_SIZE = 20;
const DEFAULT_TURN_TIME_LIMIT = 60;
const ITEM_PHASE_TIME = 30; // 道具阶段 30 秒

interface GameSettings {
  aiDifficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  showHints: boolean;
}

function getLocalizedPlayerName(color: PlayerColor, language: string = 'zh'): string {
  if (language === 'en') {
    switch (color) {
      case 'red': return 'Player';
      case 'yellow': return 'AI-Yellow';
      case 'blue': return 'AI-Blue';
      case 'green': return 'AI-Green';
      default: return 'Player';
    }
  }
  switch (color) {
    case 'red': return '玩家';
    case 'yellow': return 'AI-小黄';
    case 'blue': return 'AI-小蓝';
    case 'green': return 'AI-小绿';
    default: return '玩家';
  }
}

export function useCreativeGameState() {
  const [gameSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('gameSettings');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { aiDifficulty: 'medium', timeLimit: 60, showHints: true };
  });

  const getCurrentLanguage = (): string => localStorage.getItem('language') || 'zh';

  // ==================== 基础游戏状态 ====================
  const [gameState, setGameState] = useState<GameState>(() => initializeGameState());
  const [aiPlayers, setAiPlayers] = useState<AIPlayer[]>([]);
  const [thinkingAI, setThinkingAI] = useState<string | null>(null);
  const [lastAIMove, setLastAIMove] = useState<Array<{ x: number; y: number }>>([]);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutCountRef = useRef<Record<string, number>>({});

  // ==================== 创意模式状态 ====================
  const [creativeState, setCreativeState] = useState<CreativeGameState>(() => ({
    specialTiles: generateSpecialTiles(),
    creativePlayers: [],
    itemPhase: false,
    itemPhaseTimeLeft: 0,
    pendingEffect: null,
    lastTriggeredTile: null,
  }));

  // 效果展示队列
  const [effectQueue, setEffectQueue] = useState<Array<{ effect: TileEffect; result: EffectResult }>>([]);
  const [showingEffect, setShowingEffect] = useState<{ effect: TileEffect; result: EffectResult } | null>(null);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [luckyWheelEffect, setLuckyWheelEffect] = useState<TileEffect | null>(null);

  // 道具使用状态
  const [itemTargetSelection, setItemTargetSelection] = useState<{
    cardIndex: number;
    card: ItemCard;
  } | null>(null);

  // ==================== 初始化 ====================

  useEffect(() => {
    const ais = [
      new AIPlayer('yellow', gameSettings.aiDifficulty),
      new AIPlayer('blue', gameSettings.aiDifficulty),
      new AIPlayer('green', gameSettings.aiDifficulty),
    ];
    setAiPlayers(ais);
  }, [gameSettings.aiDifficulty]);

  function initializeGameState(): GameState {
    const lang = getCurrentLanguage();
    const players: Player[] = [
      createPlayer('red', getLocalizedPlayerName('red', lang)),
      createPlayer('yellow', getLocalizedPlayerName('yellow', lang)),
      createPlayer('blue', getLocalizedPlayerName('blue', lang)),
      createPlayer('green', getLocalizedPlayerName('green', lang)),
    ];
    const firstIdx = Math.floor(Math.random() * players.length);
    players[firstIdx].isCurrentTurn = true;
    const timeLimit = gameSettings.timeLimit || DEFAULT_TURN_TIME_LIMIT;

    return {
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)),
      players,
      currentPlayerIndex: firstIdx,
      gamePhase: 'playing',
      turnTimeLimit: timeLimit,
      timeLeft: firstIdx === 0 ? timeLimit : 0,
      selectedPiece: null,
      selectedPiecePosition: null,
      turnCount: 1,
      moves: [],
    };
  }

  function createPlayer(color: PlayerColor, name: string): Player {
    const pieces: Piece[] = [];
    let pieceId = 0;
    Object.entries(PIECE_SHAPES).forEach(([type, shapes]) => {
      const pieceType = parseInt(type) as 1 | 2 | 3 | 4 | 5;
      shapes.forEach((shape, shapeIndex) => {
        pieces.push({
          id: `${color}-${pieceType}-${shapeIndex}-${pieceId++}`,
          type: pieceType,
          shape,
          color,
          isUsed: false,
        });
      });
    });
    return {
      id: color, name, color, pieces,
      score: 0, isSettled: false, isCurrentTurn: false,
      isAI: color !== 'red',
    };
  }

  // 初始化创意模式玩家状态（在 gameState 初始化后）
  useEffect(() => {
    if (gameState.players.length > 0 && creativeState.creativePlayers.length === 0) {
      setCreativeState(prev => ({
        ...prev,
        creativePlayers: initCreativePlayerStates(gameState.players),
      }));
    }
  }, [gameState.players, creativeState.creativePlayers.length]);

  // ==================== 基础操作 ====================

  const selectPiece = useCallback((piece: Piece | null) => {
    if (piece) soundManager.selectPiece();
    setGameState(prev => ({ ...prev, selectedPiece: piece }));
  }, []);

  const rotateSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      soundManager.rotatePiece();
      return { ...prev, selectedPiece: rotatePiece(prev.selectedPiece) };
    });
  }, []);

  const flipSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      soundManager.flipPiece();
      return { ...prev, selectedPiece: flipPiece(prev.selectedPiece) };
    });
  }, []);

  // ==================== 核心：找下一个活跃玩家 ====================

  const findNextActivePlayer = useCallback((currentIndex: number, players: Player[]): number => {
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    while (players[nextIndex].isSettled && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    return nextIndex;
  }, []);

  // ==================== 回合开始时处理状态效果 ====================

  const processItemPhaseForAI = useCallback((playerIndex: number) => {
    const player = gameState.players[playerIndex];
    if (!player || player.color === 'red') return; // 只处理 AI

    const aiCreative = creativeState.creativePlayers.find(c => c.playerId === player.id);
    if (!aiCreative || aiCreative.itemCards.length === 0) return;

    const decision = aiDecideItemCard(
      aiCreative,
      gameState.players,
      creativeState.creativePlayers,
    );

    if (!decision) return;

    const card = aiCreative.itemCards[decision.cardIndex];
    const targetPlayer = decision.targetPlayerId
      ? gameState.players.find(p => p.id === decision.targetPlayerId) || null
      : null;
    const targetCreative = decision.targetPlayerId
      ? creativeState.creativePlayers.find(c => c.playerId === decision.targetPlayerId) || null
      : null;

    const itemResult = resolveItemCard(
      card.cardType, player, targetPlayer, aiCreative, targetCreative,
    );

    applyItemResult(itemResult, player.id, decision.targetPlayerId, decision.cardIndex);
  }, [gameState.players, creativeState.creativePlayers]);

  // ==================== 应用道具卡效果 ====================

  const applyItemResult = useCallback((
    result: ItemResult,
    selfId: string,
    targetId: string | null,
    cardIndex: number,
  ) => {
    // 移除使用的道具卡
    setCreativeState(prev => {
      const updated = { ...prev };
      updated.creativePlayers = prev.creativePlayers.map(cp => {
        if (cp.playerId === selfId) {
          const newCards = [...cp.itemCards];
          newCards.splice(cardIndex, 1);
          let newEffects = [...cp.statusEffects];
          if (result.selfStatusEffects) {
            newEffects = [...newEffects, ...result.selfStatusEffects];
          }
          // 嫁祸：移除自身一个负面状态
          if (result.transferDebuff) {
            const debuffIdx = newEffects.findIndex(e =>
              ['skip_turn', 'time_pressure', 'half_score', 'big_piece_ban'].includes(e.type)
            );
            if (debuffIdx >= 0) newEffects.splice(debuffIdx, 1);
          }
          return { ...cp, itemCards: newCards, statusEffects: newEffects };
        }
        if (targetId && cp.playerId === targetId) {
          let newEffects = [...cp.statusEffects];
          if (result.targetStatusEffects) {
            newEffects = [...newEffects, ...result.targetStatusEffects];
          }
          // 嫁祸：把负面状态转给目标
          if (result.transferDebuff) {
            const selfCp = prev.creativePlayers.find(c => c.playerId === selfId);
            const debuff = selfCp?.statusEffects.find(e =>
              ['skip_turn', 'time_pressure', 'half_score', 'big_piece_ban'].includes(e.type)
            );
            if (debuff) newEffects.push({ ...debuff });
          }
          return { ...cp, statusEffects: newEffects };
        }
        return cp;
      });
      return updated;
    });

    // 应用分数变化 + 同步 bonusScore
    if (result.selfScoreChange || result.targetScoreChange) {
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => {
          if (p.id === selfId && result.selfScoreChange) {
            return { ...p, score: Math.max(0, p.score + result.selfScoreChange) };
          }
          if (targetId && p.id === targetId && result.targetScoreChange) {
            return { ...p, score: Math.max(0, p.score + result.targetScoreChange) };
          }
          return p;
        }),
      }));
      setCreativeState(prev => ({
        ...prev,
        creativePlayers: prev.creativePlayers.map(cp => {
          if (cp.playerId === selfId && result.selfScoreChange) {
            return { ...cp, bonusScore: cp.bonusScore + result.selfScoreChange };
          }
          if (targetId && cp.playerId === targetId && result.targetScoreChange) {
            return { ...cp, bonusScore: cp.bonusScore + result.targetScoreChange };
          }
          return cp;
        }),
      }));
    }

    // 回收最近棋子（黑洞）— 回收减少 baseScore，bonusScore 不变
    if (result.targetUndoLastMove && targetId) {
      undoLastMoveForPlayer(targetId);
    }

    // 移除最大棋子（缩减）
    if (result.targetRemovePiece === 'largest' && targetId) {
      removeLargestPiece(targetId);
    }
  }, []);

  // ==================== 辅助：移除棋子 ====================

  const undoLastMoveForPlayer = useCallback((playerId: string) => {
    setGameState(prev => {
      const playerMoves = prev.moves.filter(m => {
        const colorMap: Record<string, PlayerColor> = {
          red: 'red', yellow: 'yellow', blue: 'blue', green: 'green'
        };
        const player = prev.players.find(p => p.id === playerId);
        return player && m.playerColor === player.color;
      });
      if (playerMoves.length === 0) return prev;

      const lastMove = playerMoves[playerMoves.length - 1];
      const newBoard = prev.board.map(row => [...row]);
      let removedCount = 0;
      lastMove.boardChanges.forEach(c => {
        if (c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE) {
          newBoard[c.y][c.x] = 0;
          removedCount++;
        }
      });

      return {
        ...prev,
        board: newBoard,
        players: prev.players.map(p =>
          p.id === playerId
            ? { ...p, score: Math.max(0, p.score - removedCount) }
            : p
        ),
      };
    });
  }, []);

  const removeLargestPiece = useCallback((playerId: string) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id !== playerId) return p;
        const available = p.pieces.filter(pc => !pc.isUsed);
        if (available.length === 0) return p;
        const largest = available.reduce((a, b) => a.type > b.type ? a : b);
        return {
          ...p,
          pieces: p.pieces.map(pc => pc.id === largest.id ? { ...pc, isUsed: true } : pc),
        };
      }),
    }));
  }, []);

  const removeRandomPiece = useCallback((playerId: string) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id !== playerId) return p;
        const available = p.pieces.filter(pc => !pc.isUsed);
        if (available.length === 0) return p;
        const randPiece = available[Math.floor(Math.random() * available.length)];
        return {
          ...p,
          pieces: p.pieces.map(pc => pc.id === randPiece.id ? { ...pc, isUsed: true } : pc),
        };
      }),
    }));
  }, []);

  // ==================== 核心：放置棋子 ====================

  const placePieceOnBoard = useCallback((position: Position) => {
    if (!gameState.selectedPiece) return false;
    if (creativeState.itemPhase) return false; // 道具阶段不能放棋子

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const colorIndex = gameState.currentPlayerIndex + 1;
    if (!currentPlayer.isCurrentTurn) return false;

    // 检查大棋子限制
    const playerCreative = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id);
    const hasBigPieceBan = playerCreative?.statusEffects.some(
      e => e.type === 'big_piece_ban' && e.remainingTurns > 0
    );
    if (hasBigPieceBan && gameState.selectedPiece.type >= 4) {
      soundManager.invalidMove();
      return false;
    }

    // 检查屏障方格
    const shape = gameState.selectedPiece.shape;
    for (let dy = 0; dy < shape.length; dy++) {
      for (let dx = 0; dx < shape[dy].length; dx++) {
        if (shape[dy][dx] !== 1) continue;
        const bx = position.x + dx;
        const by = position.y + dy;
        const isBarrier = creativeState.specialTiles.some(
          t => t.x === bx && t.y === by && t.type === 'barrier' && !t.used
        );
        if (isBarrier) {
          soundManager.invalidMove();
          return false;
        }
      }
    }

    if (!canPlacePiece(gameState.board, gameState.selectedPiece, position, colorIndex)) {
      soundManager.invalidMove();
      return false;
    }

    soundManager.placePiece();

    const newBoard = placePiece(gameState.board, gameState.selectedPiece, position, colorIndex);
    const boardChanges: Array<{ x: number; y: number; color: number }> = [];
    for (let dy = 0; dy < shape.length; dy++) {
      for (let dx = 0; dx < shape[dy].length; dx++) {
        if (shape[dy][dx] === 1) {
          const bx = position.x + dx;
          const by = position.y + dy;
          if (bx >= 0 && bx < BOARD_SIZE && by >= 0 && by < BOARD_SIZE) {
            boardChanges.push({ x: bx, y: by, color: colorIndex });
          }
        }
      }
    }

    const newPlayers = gameState.players.map(player => {
      if (player.id === currentPlayer.id) {
        const newPieces = player.pieces.map(p =>
          p.id === gameState.selectedPiece!.id ? { ...p, isUsed: true } : p
        );
        return { ...player, pieces: newPieces };
      }
      return player;
    });

    // 计算基础分数（棋盘格子数）+ 累计 bonusScore
    const baseScore = calculateScore(newBoard, colorIndex);
    const currentBonus = playerCreative?.bonusScore ?? 0;
    let newScore = baseScore + currentBonus;

    const hasDouble = playerCreative?.statusEffects.some(
      e => e.type === 'next_double' && e.remainingTurns > 0
    );
    const hasHalf = playerCreative?.statusEffects.some(
      e => e.type === 'half_score' && e.remainingTurns > 0
    );

    const placedCount = boardChanges.length;
    if (hasDouble) {
      newScore += placedCount;
    }
    if (hasHalf) {
      newScore = Math.max(0, newScore - Math.floor(placedCount / 2));
    }

    const updatedPlayers = newPlayers.map(player =>
      player.id === currentPlayer.id ? { ...player, score: newScore } : player
    );

    // 检查特殊方格触发
    const triggered = findTriggeredTiles(shape, position, creativeState.specialTiles);

    // 标记方格为已使用
    if (triggered.length > 0) {
      setCreativeState(prev => ({
        ...prev,
        specialTiles: prev.specialTiles.map(t => {
          if (triggered.some(tr => tr.x === t.x && tr.y === t.y)) {
            return { ...t, used: true };
          }
          return t;
        }),
      }));
    }

    // 处理特殊方格效果
    let extraTurn = false;
    for (const tile of triggered) {
      if (tile.type === 'barrier') continue; // 屏障不应触发（前面已拦截）

      let effect: TileEffect;
      if (tile.type === 'gold') {
        effect = rollGoldEffect();
      } else if (tile.type === 'purple') {
        const hasPurpleUpgrade = playerCreative?.statusEffects.some(
          e => e.type === 'purple_upgrade' && e.remainingTurns > 0
        ) || false;
        effect = rollPurpleEffect(hasPurpleUpgrade);
      } else {
        effect = rollRedEffect();
      }

      const effectResult = resolveEffect(
        effect.id, currentPlayer, gameState.players,
        playerCreative || { playerId: currentPlayer.id, color: currentPlayer.color, itemCards: [], statusEffects: [], bonusScore: 0 },
      );

      // 应用即时分数变化，同步写入 bonusScore 保证累计
      if (effectResult.scoreChange !== 0) {
        const target = updatedPlayers.find(p => p.id === currentPlayer.id);
        if (target) {
          target.score = Math.max(0, target.score + effectResult.scoreChange);
        }
        setCreativeState(prev => ({
          ...prev,
          creativePlayers: prev.creativePlayers.map(cp =>
            cp.playerId === currentPlayer.id
              ? { ...cp, bonusScore: cp.bonusScore + effectResult.scoreChange }
              : cp
          ),
        }));
      }

      // 全局加分
      if (effectResult.globalBonus) {
        const usedPieces = currentPlayer.pieces.filter(p => p.isUsed).length;
        const target = updatedPlayers.find(p => p.id === currentPlayer.id);
        if (target) target.score += usedPieces;
        setCreativeState(prev => ({
          ...prev,
          creativePlayers: prev.creativePlayers.map(cp =>
            cp.playerId === currentPlayer.id
              ? { ...cp, bonusScore: cp.bonusScore + usedPieces }
              : cp
          ),
        }));
      }

      // 分数互换
      if (effectResult.swapScoreWithHighest) {
        const highest = updatedPlayers.reduce((a, b) =>
          a.id !== currentPlayer.id && a.score > b.score ? a : b
        );
        if (highest.id !== currentPlayer.id) {
          const myP = updatedPlayers.find(p => p.id === currentPlayer.id);
          if (myP) {
            const tmp = myP.score;
            myP.score = highest.score;
            highest.score = tmp;
            // 同步 bonusScore：差值写入双方
            const myBase = calculateScore(newBoard, colorIndex);
            const hIdx = gameState.players.findIndex(p => p.id === highest.id) + 1;
            const hBase = calculateScore(newBoard, hIdx);
            setCreativeState(prev => ({
              ...prev,
              creativePlayers: prev.creativePlayers.map(cp => {
                if (cp.playerId === currentPlayer.id) return { ...cp, bonusScore: myP.score - myBase };
                if (cp.playerId === highest.id) return { ...cp, bonusScore: highest.score - hBase };
                return cp;
              }),
            }));
          }
        }
      }

      // 均分
      if (effectResult.setAllScoresToAverage) {
        const avg = Math.floor(updatedPlayers.reduce((s, p) => s + p.score, 0) / updatedPlayers.length);
        updatedPlayers.forEach(p => { p.score = avg; });
        setCreativeState(prev => ({
          ...prev,
          creativePlayers: prev.creativePlayers.map(cp => {
            const pIdx = gameState.players.findIndex(p => p.id === cp.playerId) + 1;
            const pBase = calculateScore(newBoard, pIdx);
            return { ...cp, bonusScore: avg - pBase };
          }),
        }));
      }

      // 添加状态效果
      if (effectResult.newStatusEffects) {
        setCreativeState(prev => ({
          ...prev,
          creativePlayers: prev.creativePlayers.map(cp =>
            cp.playerId === currentPlayer.id
              ? { ...cp, statusEffects: [...cp.statusEffects, ...effectResult.newStatusEffects!] }
              : cp
          ),
        }));
      }

      // 发道具卡
      if (effectResult.grantItemCard) {
        const newCard = rollItemCard();
        setCreativeState(prev => ({
          ...prev,
          creativePlayers: prev.creativePlayers.map(cp =>
            cp.playerId === currentPlayer.id
              ? { ...cp, itemCards: addItemCard(cp.itemCards, newCard) }
              : cp
          ),
        }));
      }

      // 移除棋子
      if (effectResult.removePiece === 'largest') {
        removeLargestPiece(currentPlayer.id);
      } else if (effectResult.removePiece === 'random') {
        removeRandomPiece(currentPlayer.id);
      }

      // 回收最近放置
      if (effectResult.undoLastMove) {
        // 注意：这里回收的是上一步，不是当前步
      }

      // 额外回合
      if (effectResult.extraTurn) {
        extraTurn = true;
      }

      // 加入展示队列
      setEffectQueue(prev => [...prev, { effect, result: effectResult }]);
    }

    // 下一回合
    let nextPlayerIndex: number;
    if (extraTurn) {
      nextPlayerIndex = gameState.currentPlayerIndex; // 保持当前玩家
    } else {
      nextPlayerIndex = findNextActivePlayer(gameState.currentPlayerIndex, updatedPlayers);
    }

    const nextPlayers = updatedPlayers.map((player, index) => ({
      ...player,
      isCurrentTurn: index === nextPlayerIndex,
    }));

    // 递减当前玩家的状态效果（回合结束时）
    setCreativeState(prev => ({
      ...prev,
      creativePlayers: prev.creativePlayers.map(cp =>
        cp.playerId === currentPlayer.id
          ? { ...cp, statusEffects: tickStatusEffects(cp.statusEffects) }
          : cp
      ),
    }));

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      players: nextPlayers,
      currentPlayerIndex: nextPlayerIndex,
      selectedPiece: null,
      selectedPiecePosition: null,
      timeLeft: gameSettings.timeLimit,
      turnCount: prev.turnCount + 1,
      moves: [...prev.moves, {
        playerColor: currentPlayer.color,
        boardChanges,
        timestamp: Date.now(),
      }],
    }));

    return true;
  }, [gameState, creativeState, findNextActivePlayer, gameSettings.timeLimit, removeLargestPiece, removeRandomPiece]);

  // ==================== AI 回合 ====================

  const processAITurn = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.color === 'red' || currentPlayer.isSettled) return;

    // 检查是否被跳过
    const aiCreative = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id);
    const shouldSkip = aiCreative?.statusEffects.some(
      e => e.type === 'skip_turn' && e.remainingTurns > 0
    );

    if (shouldSkip) {
      // 递减状态并跳过
      setCreativeState(prev => ({
        ...prev,
        creativePlayers: prev.creativePlayers.map(cp =>
          cp.playerId === currentPlayer.id
            ? { ...cp, statusEffects: tickStatusEffects(cp.statusEffects) }
            : cp
        ),
      }));
      setTimeout(() => {
        const nextIdx = findNextActivePlayer(gameState.currentPlayerIndex, gameState.players);
        setGameState(prev => ({
          ...prev,
          players: prev.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx })),
          currentPlayerIndex: nextIdx,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1,
        }));
      }, 500);
      return;
    }

    setThinkingAI(currentPlayer.color);
    soundManager.aiTurn();

    // AI 道具使用（延迟一小段时间模拟思考）
    const itemDelay = aiCreative && aiCreative.itemCards.length > 0 ? 1000 : 0;
    setTimeout(() => {
      processItemPhaseForAI(gameState.currentPlayerIndex);
    }, 500);

    const thinkingTime = Math.random() * 1500 + 2000 + itemDelay;

    aiTimeoutRef.current = setTimeout(() => {
      const aiPlayer = aiPlayers.find(ai => ai.getColor() === currentPlayer.color);
      if (!aiPlayer) {
        setThinkingAI(null);
        const nextIdx = findNextActivePlayer(gameState.currentPlayerIndex, gameState.players);
        setGameState(prev => ({
          ...prev,
          players: prev.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx, isSettled: p.id === currentPlayer.id ? true : p.isSettled })),
          currentPlayerIndex: nextIdx,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1,
        }));
        return;
      }

      // 大棋子限制检查
      const hasBan = aiCreative?.statusEffects.some(
        e => e.type === 'big_piece_ban' && e.remainingTurns > 0
      );
      let availablePieces = currentPlayer.pieces;
      if (hasBan) {
        availablePieces = currentPlayer.pieces.map(p =>
          p.type >= 4 && !p.isUsed ? { ...p, isUsed: true } : p
        );
      }

      // AI 需要避开屏障方格 — 通过临时在棋盘上标记屏障为占用来实现
      const boardWithBarriers = gameState.board.map(row => [...row]);
      creativeState.specialTiles.forEach(t => {
        if (t.type === 'barrier' && !t.used) {
          boardWithBarriers[t.y][t.x] = -1; // 临时标记
        }
      });

      const move = aiPlayer.makeMove(boardWithBarriers, availablePieces);

      if (move) {
        const colorIndex = gameState.currentPlayerIndex + 1;
        const newBoard = placePiece(gameState.board, move.piece, move.position, colorIndex);

        const boardChanges: Array<{ x: number; y: number; color: number }> = [];
        for (let dy = 0; dy < move.piece.shape.length; dy++) {
          for (let dx = 0; dx < move.piece.shape[dy].length; dx++) {
            if (move.piece.shape[dy][dx] === 1) {
              const bx = move.position.x + dx;
              const by = move.position.y + dy;
              if (bx >= 0 && bx < BOARD_SIZE && by >= 0 && by < BOARD_SIZE) {
                boardChanges.push({ x: bx, y: by, color: colorIndex });
              }
            }
          }
        }

        const newPlayers = gameState.players.map(player => {
          if (player.id === currentPlayer.id) {
            const newPieces = player.pieces.map(p =>
              p.id === move.piece.id ? { ...p, isUsed: true } : p
            );
            const aiBonus = aiCreative?.bonusScore ?? 0;
            const newScore = calculateScore(newBoard, colorIndex) + aiBonus;
            return { ...player, pieces: newPieces, score: newScore };
          }
          return player;
        });

        // 检查特殊方格
        const triggered = findTriggeredTiles(move.piece.shape, move.position, creativeState.specialTiles);
        if (triggered.length > 0) {
          // 标记已使用
          setCreativeState(prev => ({
            ...prev,
            specialTiles: prev.specialTiles.map(t =>
              triggered.some(tr => tr.x === t.x && tr.y === t.y) ? { ...t, used: true } : t
            ),
          }));

          // 简化处理 AI 的特殊方格效果
          for (const tile of triggered) {
            if (tile.type === 'barrier') continue;
            let effect: TileEffect;
            if (tile.type === 'gold') effect = rollGoldEffect();
            else if (tile.type === 'purple') effect = rollPurpleEffect(false);
            else effect = rollRedEffect();

            const cp = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id) ||
              { playerId: currentPlayer.id, color: currentPlayer.color, itemCards: [], statusEffects: [], bonusScore: 0 };
            const effectResult = resolveEffect(effect.id, currentPlayer, gameState.players, cp);

            // 应用分数 + 同步 bonusScore
            const target = newPlayers.find(p => p.id === currentPlayer.id);
            if (target && effectResult.scoreChange) {
              target.score = Math.max(0, target.score + effectResult.scoreChange);
              setCreativeState(prev => ({
                ...prev,
                creativePlayers: prev.creativePlayers.map(c =>
                  c.playerId === currentPlayer.id
                    ? { ...c, bonusScore: c.bonusScore + effectResult.scoreChange }
                    : c
                ),
              }));
            }

            // 状态效果
            if (effectResult.newStatusEffects) {
              setCreativeState(prev => ({
                ...prev,
                creativePlayers: prev.creativePlayers.map(c =>
                  c.playerId === currentPlayer.id
                    ? { ...c, statusEffects: [...c.statusEffects, ...effectResult.newStatusEffects!] }
                    : c
                ),
              }));
            }

            // 道具卡
            if (effectResult.grantItemCard) {
              const newCard = rollItemCard();
              setCreativeState(prev => ({
                ...prev,
                creativePlayers: prev.creativePlayers.map(c =>
                  c.playerId === currentPlayer.id
                    ? { ...c, itemCards: addItemCard(c.itemCards, newCard) }
                    : c
                ),
              }));
            }

            setEffectQueue(prev => [...prev, { effect, result: effectResult }]);
          }
        }

        // 递减 AI 状态效果
        setCreativeState(prev => ({
          ...prev,
          creativePlayers: prev.creativePlayers.map(cp =>
            cp.playerId === currentPlayer.id
              ? { ...cp, statusEffects: tickStatusEffects(cp.statusEffects) }
              : cp
          ),
        }));

        soundManager.aiPlace();
        setLastAIMove(boardChanges.map(c => ({ x: c.x, y: c.y })));
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => setLastAIMove([]), 1200);

        const nextIdx = findNextActivePlayer(gameState.currentPlayerIndex, newPlayers);
        const nextPlayers = newPlayers.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx }));

        setGameState(prev => ({
          ...prev,
          board: newBoard,
          players: nextPlayers,
          currentPlayerIndex: nextIdx,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1,
          moves: [...prev.moves, { playerColor: currentPlayer.color, boardChanges, timestamp: Date.now() }],
        }));
      } else {
        // AI 无法放置
        const settledPlayers = gameState.players.map(p =>
          p.id === currentPlayer.id ? { ...p, isSettled: true } : p
        );
        const nextIdx = findNextActivePlayer(gameState.currentPlayerIndex, settledPlayers);
        setGameState(prev => ({
          ...prev,
          players: settledPlayers.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx })),
          currentPlayerIndex: nextIdx,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1,
        }));
      }

      setThinkingAI(null);
    }, thinkingTime);
  }, [gameState, aiPlayers, creativeState, findNextActivePlayer, gameSettings.timeLimit, processItemPhaseForAI]);

  // ==================== 道具阶段管理 ====================

  // 人类玩家回合开始时，检查是否有道具卡，进入道具阶段
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.color !== 'red' || currentPlayer.isSettled) return;

    // 检查是否被跳过
    const playerCreative = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id);
    const shouldSkip = playerCreative?.statusEffects.some(
      e => e.type === 'skip_turn' && e.remainingTurns > 0
    );
    if (shouldSkip) {
      // 递减状态并跳过
      setCreativeState(prev => ({
        ...prev,
        creativePlayers: prev.creativePlayers.map(cp =>
          cp.playerId === currentPlayer.id
            ? { ...cp, statusEffects: tickStatusEffects(cp.statusEffects) }
            : cp
        ),
      }));
      setTimeout(() => {
        const nextIdx = findNextActivePlayer(gameState.currentPlayerIndex, gameState.players);
        setGameState(prev => ({
          ...prev,
          players: prev.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx })),
          currentPlayerIndex: nextIdx,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1,
        }));
      }, 500);
      return;
    }

    // 有道具卡则进入道具阶段
    if (playerCreative && playerCreative.itemCards.length > 0 && !creativeState.itemPhase) {
      setCreativeState(prev => ({
        ...prev,
        itemPhase: true,
        itemPhaseTimeLeft: ITEM_PHASE_TIME,
      }));
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, gameState.players, creativeState.creativePlayers, creativeState.itemPhase, findNextActivePlayer, gameSettings.timeLimit]);

  // 道具阶段倒计时
  useEffect(() => {
    if (!creativeState.itemPhase) return;

    const timer = setInterval(() => {
      setCreativeState(prev => {
        if (prev.itemPhaseTimeLeft <= 1) {
          return { ...prev, itemPhase: false, itemPhaseTimeLeft: 0 };
        }
        return { ...prev, itemPhaseTimeLeft: prev.itemPhaseTimeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [creativeState.itemPhase]);

  // ==================== 使用道具卡（人类玩家） ====================

  const startUseItemCard = useCallback((cardIndex: number) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const playerCreative = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id);
    if (!playerCreative) return;

    const card = playerCreative.itemCards[cardIndex];
    if (!card) return;

    if (card.needsTarget) {
      setItemTargetSelection({ cardIndex, card });
    } else {
      // 不需要目标的道具（如钢铁）直接使用
      const result = resolveItemCard(card.cardType, currentPlayer, null, playerCreative, null);
      applyItemResult(result, currentPlayer.id, null, cardIndex);
      setCreativeState(prev => ({ ...prev, itemPhase: false, itemPhaseTimeLeft: 0 }));
    }
  }, [gameState, creativeState, applyItemResult]);

  const confirmItemTarget = useCallback((targetPlayerId: string) => {
    if (!itemTargetSelection) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const playerCreative = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id);
    const targetPlayer = gameState.players.find(p => p.id === targetPlayerId) || null;
    const targetCreative = creativeState.creativePlayers.find(c => c.playerId === targetPlayerId) || null;

    if (!playerCreative) return;

    const result = resolveItemCard(
      itemTargetSelection.card.cardType, currentPlayer, targetPlayer, playerCreative, targetCreative,
    );
    applyItemResult(result, currentPlayer.id, targetPlayerId, itemTargetSelection.cardIndex);
    setItemTargetSelection(null);
    setCreativeState(prev => ({ ...prev, itemPhase: false, itemPhaseTimeLeft: 0 }));
  }, [itemTargetSelection, gameState, creativeState, applyItemResult]);

  const skipItemPhase = useCallback(() => {
    setCreativeState(prev => ({ ...prev, itemPhase: false, itemPhaseTimeLeft: 0 }));
    setItemTargetSelection(null);
  }, []);

  // ==================== 结算玩家 ====================

  const settlePlayer = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.color !== 'red') return;
    soundManager.settle();

    const newPlayers = gameState.players.map(p =>
      p.id === currentPlayer.id ? { ...p, isSettled: true } : p
    );
    const nextIdx = findNextActivePlayer(gameState.currentPlayerIndex, newPlayers);
    setGameState(prev => ({
      ...prev,
      players: newPlayers.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx })),
      currentPlayerIndex: nextIdx,
      timeLeft: gameSettings.timeLimit,
      turnCount: prev.turnCount + 1,
    }));
  }, [gameState, findNextActivePlayer, gameSettings.timeLimit]);

  // ==================== 重置 ====================

  const resetGame = useCallback(() => {
    setGameState(initializeGameState());
    setCreativeState({
      specialTiles: generateSpecialTiles(),
      creativePlayers: [],
      itemPhase: false,
      itemPhaseTimeLeft: 0,
      pendingEffect: null,
      lastTriggeredTile: null,
    });
    setEffectQueue([]);
    setShowingEffect(null);
    setThinkingAI(null);
    timeoutCountRef.current = {};
  }, [gameSettings]);

  // ==================== 倒计时 ====================

  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    if (creativeState.itemPhase) return; // 道具阶段暂停放置倒计时

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.color !== 'red' || currentPlayer.isSettled) return;

    // 压迫效果：时间限制为 5 秒
    const playerCreative = creativeState.creativePlayers.find(c => c.playerId === currentPlayer.id);
    const hasPressure = playerCreative?.statusEffects.some(
      e => e.type === 'time_pressure' && e.remainingTurns > 0
    );

    const timer = setInterval(() => {
      setGameState(prev => {
        const currPlayer = prev.players[prev.currentPlayerIndex];
        if (!currPlayer || currPlayer.color !== 'red' || currPlayer.isSettled) return prev;

        if (prev.timeLeft <= 1) {
          const nextIdx = findNextActivePlayer(prev.currentPlayerIndex, prev.players);
          return {
            ...prev,
            players: prev.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIdx })),
            currentPlayerIndex: nextIdx,
            selectedPiece: null,
            selectedPiecePosition: null,
            timeLeft: gameSettings.timeLimit,
            turnCount: prev.turnCount + 1,
          };
        }

        if (prev.timeLeft <= 10) soundManager.timeWarning();
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    // 如果有压迫效果，强制设置时间为5秒
    if (hasPressure) {
      setGameState(prev => ({ ...prev, timeLeft: Math.min(prev.timeLeft, 5) }));
    }

    return () => clearInterval(timer);
  }, [gameState.gamePhase, gameState.currentPlayerIndex, gameState.players, creativeState.itemPhase, creativeState.creativePlayers, findNextActivePlayer, gameSettings.timeLimit]);

  // ==================== 自动处理 ====================

  // 检查游戏结束
  useEffect(() => {
    if (isGameFinished(gameState.players)) {
      setGameState(prev => ({ ...prev, gamePhase: 'finished' }));
    }
  }, [gameState.players]);

  // 自动处理AI回合
  useEffect(() => {
    if (gameState.gamePhase === 'playing' &&
        gameState.players[gameState.currentPlayerIndex].color !== 'red' &&
        !gameState.players[gameState.currentPlayerIndex].isSettled) {
      processAITurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, processAITurn, gameState.players]);

  // 人类玩家回合提示音
  useEffect(() => {
    if (gameState.gamePhase === 'playing' &&
        gameState.players[gameState.currentPlayerIndex].color === 'red' &&
        gameState.turnCount > 1) {
      soundManager.yourTurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, gameState.turnCount, gameState.players]);

  // 效果展示处理
  useEffect(() => {
    if (effectQueue.length > 0 && !showingEffect) {
      const next = effectQueue[0];
      setShowingEffect(next);
      setEffectQueue(prev => prev.slice(1));

      // 自动关闭效果展示
      setTimeout(() => setShowingEffect(null), 2500);
    }
  }, [effectQueue, showingEffect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // 检查是否可以继续
  const canPlayerContinue = useCallback((player: Player) => {
    if (player.isSettled) return false;
    const availablePieces = player.pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return false;

    const colorIndex = gameState.players.findIndex(p => p.id === player.id) + 1;
    for (const piece of availablePieces) {
      const variants = getUniqueTransformations(piece);
      for (const variant of variants) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          for (let x = 0; x < BOARD_SIZE; x++) {
            if (canPlacePiece(gameState.board, variant, { x, y }, colorIndex)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }, [gameState.board, gameState.players]);

  return {
    // 基础游戏
    gameState,
    selectPiece,
    placePieceOnBoard,
    settlePlayer,
    resetGame,
    rotateSelectedPiece,
    flipSelectedPiece,
    thinkingAI,
    lastAIMove,
    canPlayerContinue,
    gameSettings,
    currentTurnTime: gameState.timeLeft,

    // 创意模式特有
    creativeState,
    showingEffect,
    effectQueue,

    // 道具系统
    itemTargetSelection,
    startUseItemCard,
    confirmItemTarget,
    skipItemPhase,
  };
}
