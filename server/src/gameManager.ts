import { GameState, GameMove, PlayerColor, RoomPlayer, Piece } from './types';
import { GameMode } from './types';
import { AIPlayer } from './utils/aiPlayer';
import { PIECE_SHAPES, PIECE_COUNTS } from './constants/pieces';
import {
  generateSpecialTiles, initCreativePlayerStates, findTriggeredTiles,
  resolveEffect, rollGoldEffect, rollPurpleEffect, rollRedEffect,
  rollItemCard, addItemCard, tickStatusEffects, overlapsBarrier, pieceCellCount,
  findTerritoryExpansionCell, resolveItemCard, aiDecideItemCard,
} from './utils/creativeModeEngine';
import type { CreativeGameState, CreativePlayerState, SpecialTile } from './utils/creativeTypes';

const BOARD_SIZE = 20;
const PLAYER_COLORS: PlayerColor[] = ['red', 'yellow', 'blue', 'green'];

interface ActiveGame {
  roomId: string;
  state: GameState;
  players: RoomPlayer[];
  playerColorMap: Record<string, PlayerColor>;
  colorPlayerMap: Record<string, string>;
  playerPieces: Record<string, Piece[]>;
  aiPlayers: Map<string, AIPlayer>;
  hostedAIPlayers: Map<string, AIPlayer>;
  turnTimer: NodeJS.Timeout | null;
  turnTimeLimit: number;
  /** 当前回合剩余秒数，暂停时保留用于恢复 */
  timeLeft: number;
  isPaused: boolean;
  onTurnTimeout: (roomId: string) => void;
  onTimeUpdate: (roomId: string, timeLeft: number) => void;
  onAIMove: (roomId: string, move: GameMove, gameState: GameState, triggeredEffects?: Array<{ effectId: string; effectName: string; tileType: string; scoreChange: number; grantItemCard?: boolean; extraTurn?: boolean }>) => void;
  onAISettle: (roomId: string, playerId: string) => void;
  onAIItemUsed?: (roomId: string, result: { gameState: GameState; pieceIdUnused?: string; pieceIdRemoved?: string; targetPlayerId?: string; cardType?: string; usedByPlayerId?: string }) => void;
  timeoutCounts: Record<string, number>;
  gameMode: GameMode;
}

export class GameManager {
  private games: Map<string, ActiveGame> = new Map();

  // 初始化游戏
  startGame(
    roomId: string,
    players: RoomPlayer[],
    turnTimeLimit: number,
    onTurnTimeout: (roomId: string) => void,
    onTimeUpdate: (roomId: string, timeLeft: number) => void,
    onAIMove: (roomId: string, move: GameMove, gameState: GameState, triggeredEffects?: Array<{ effectId: string; effectName: string; tileType: string; scoreChange: number; grantItemCard?: boolean; extraTurn?: boolean }>) => void,
    onAISettle: (roomId: string, playerId: string) => void,
    gameMode: GameMode = 'classic',
    onAIItemUsed?: (roomId: string, result: { gameState: GameState; pieceIdUnused?: string; pieceIdRemoved?: string; targetPlayerId?: string; cardType?: string; usedByPlayerId?: string }) => void,
  ): { gameState: GameState; playerColors: Record<string, PlayerColor> } {
    const normalizedTurnTimeLimit =
      Number.isFinite(turnTimeLimit) && turnTimeLimit > 0 ? turnTimeLimit : 60;

    // 创建空棋盘
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));

    // 分配颜色和初始化拼图
    const playerColorMap: Record<string, PlayerColor> = {};
    const colorPlayerMap: Record<string, string> = {};
    const playerPieces: Record<string, Piece[]> = {};
    const aiPlayers = new Map<string, AIPlayer>();
    const timeoutCounts: Record<string, number> = {};

    players.forEach((player, index) => {
      const color = player.color || PLAYER_COLORS[index];
      playerColorMap[player.id] = color;
      colorPlayerMap[color] = player.id;
      
      // 初始化拼图
      playerPieces[player.id] = this.createPiecesForColor(color);

      // 初始化 AI
      if (player.isAI) {
        aiPlayers.set(player.id, new AIPlayer(color, player.aiDifficulty || 'medium'));
      }
      timeoutCounts[player.id] = 0;
    });

    const gameState: GameState = {
      board,
      currentPlayerIndex: 0,
      gamePhase: 'playing',
      turnCount: 1,
      moves: [],
      playerScores: {},
      settledPlayers: [],
    };

    players.forEach(p => {
      gameState.playerScores[p.id] = 0;
    });

    // 创意模式：生成特殊格、初始化创意玩家状态
    if (gameMode === 'creative') {
      const specialTiles = generateSpecialTiles();
      const creativePlayers = initCreativePlayerStates(
        players.map(p => ({ id: p.id, color: playerColorMap[p.id] }))
      );
      gameState.creativeState = {
        specialTiles,
        creativePlayers,
        itemPhase: false,
        itemPhaseTimeLeft: 0,
        pendingEffect: null,
        lastTriggeredTile: null,
      };
    }

    const game: ActiveGame = {
      roomId,
      state: gameState,
      players,
      playerColorMap,
      colorPlayerMap,
      playerPieces,
      aiPlayers,
      hostedAIPlayers: new Map(),
      turnTimer: null,
      turnTimeLimit: normalizedTurnTimeLimit,
      timeLeft: 0,
      isPaused: false,
      onTurnTimeout,
      onTimeUpdate,
      onAIMove,
      onAISettle,
      onAIItemUsed,
      timeoutCounts,
      gameMode,
    };

    this.games.set(roomId, game);

    // 启动第一个玩家的回合（仅人类回合启动计时器，与 advanceTurn 一致）
    this.checkAndProcessAITurn(roomId);
    const firstPlayer = game.players[game.state.currentPlayerIndex];
    const firstIsHuman = !firstPlayer.isAI;
    if (firstIsHuman) this.startTurnTimer(roomId);

    return { gameState, playerColors: playerColorMap };
  }

  // 创建某颜色的拼图集
  private createPiecesForColor(color: PlayerColor): Piece[] {
    const pieces: Piece[] = [];
    
    Object.entries(PIECE_SHAPES).forEach(([type, shapes]) => {
      const pieceType = parseInt(type);
      const count = (PIECE_COUNTS as Record<number, number>)[pieceType] || 0;
      for (let i = 0; i < count; i++) {
        pieces.push({
          id: `${color}_${pieceType}_${i}`,
          type: pieceType as any,
          shape: shapes[i % shapes.length],
          color,
          isUsed: false,
        });
      }
    });
    
    return pieces;
  }

  // 处理玩家落子
  processMove(roomId: string, playerId: string, move: GameMove): {
    success: boolean;
    error?: string;
    gameState?: GameState;
    triggeredEffects?: Array<{ effectId: string; effectName: string; tileType: string; scoreChange: number; grantItemCard?: boolean; extraTurn?: boolean }>;
  } {
    const game = this.games.get(roomId);
    if (!game) return { success: false, error: 'GAME_NOT_FOUND' };
    if (game.state.gamePhase !== 'playing') return { success: false, error: 'GAME_NOT_PLAYING' };
    if (game.isPaused) return { success: false, error: 'GAME_PAUSED' };
    // 创意模式：道具阶段不能落子
    const cs = game.state.creativeState;
    if (cs?.itemPhase) return { success: false, error: 'IN_ITEM_PHASE' };

    const currentPlayer = game.players[game.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return { success: false, error: 'NOT_YOUR_TURN' };

    const pieces = game.playerPieces[playerId];
    const piece = pieces?.find(p => p.id === move.pieceId);
    if (!piece) return { success: false, error: 'INVALID_PIECE' };

    // 创意模式：屏障、big_piece_ban 校验
    if (cs) {
      if (overlapsBarrier(piece.shape, move.position, cs.specialTiles)) {
        return { success: false, error: 'BARRIER_BLOCKED' };
      }
      const cp = cs.creativePlayers.find(p => p.playerId === playerId);
      const hasBigBan = cp?.statusEffects.some(e => e.type === 'big_piece_ban' && e.remainingTurns > 0);
      if (hasBigBan && pieceCellCount(piece.shape) > 4) {
        return { success: false, error: 'BIG_PIECE_BANNED' };
      }
    }

    const pieceIndex = pieces!.findIndex(p => p.id === move.pieceId);
    if (pieceIndex !== -1) pieces![pieceIndex].isUsed = true;

    // 应用落子
    move.boardChanges.forEach(change => {
      game.state.board[change.y][change.x] = change.color;
    });

    let baseScore = move.boardChanges.length;
    if (cs) {
      const curCp = cs.creativePlayers.find(p => p.playerId === playerId);
      if (curCp?.statusEffects.some(e => e.type === 'next_double' && e.remainingTurns > 0)) {
        baseScore *= 2;
      }
      if (curCp?.statusEffects.some(e => e.type === 'half_score' && e.remainingTurns > 0)) {
        baseScore = Math.floor(baseScore / 2);
      }
    }
    game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) + baseScore;
    game.state.moves.push(move);

    // 创意模式：处理触发格效果
    let extraTurn = false;
    const triggeredEffects: Array<{ effectId: string; effectName: string; tileType: string; scoreChange: number; grantItemCard?: boolean; extraTurn?: boolean }> = [];
    if (cs) {
      const triggered = findTriggeredTiles(piece.shape, move.position, cs.specialTiles);
      const allPlayers: { id: string; color: PlayerColor; score: number }[] = game.players.map(p => ({
        id: p.id,
        color: game.playerColorMap[p.id]!,
        score: game.state.playerScores[p.id] || 0,
      }));

      const curCp = cs.creativePlayers.find(p => p.playerId === playerId)!;
      for (const tile of triggered) {
        tile.used = true;
        const hasPurpleUpgrade = curCp.statusEffects.some((e: { type: string; remainingTurns: number }) => e.type === 'purple_upgrade' && e.remainingTurns > 0);
        const effect = tile.type === 'gold' ? rollGoldEffect()
          : tile.type === 'purple' ? rollPurpleEffect(!!hasPurpleUpgrade)
          : tile.type === 'red' ? rollRedEffect() : null;
        if (!effect) continue;

        triggeredEffects.push({
          effectId: effect.id,
          effectName: effect.name,
          tileType: tile.type,
          scoreChange: 0, // 下面 resolve 后会更新
          grantItemCard: false,
          extraTurn: false,
        });

        const result = resolveEffect(effect.id, {
          id: playerId,
          color: currentPlayer.color!,
          score: game.state.playerScores[playerId] || 0,
        }, allPlayers, curCp);

        const lastTriggered = triggeredEffects[triggeredEffects.length - 1];
        if (lastTriggered) {
          lastTriggered.scoreChange = result.scoreChange ?? 0;
          lastTriggered.grantItemCard = result.grantItemCard ?? false;
          lastTriggered.extraTurn = result.extraTurn ?? false;
        }

        if (result.scoreChange) {
          game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) + result.scoreChange;
        }
        if (result.grantItemCard) {
          const card = rollItemCard();
          curCp.itemCards = addItemCard(curCp.itemCards, card);
        }
        if (result.extraTurn) extraTurn = true;
        if (result.newStatusEffects) {
          curCp.statusEffects.push(...result.newStatusEffects);
        }
        if (result.undoLastMove) {
          move.boardChanges.forEach(c => { game.state.board[c.y][c.x] = 0; });
          game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) - baseScore;
          if (pieceIndex !== -1) pieces![pieceIndex].isUsed = false;
          game.state.moves.pop();
          return { success: true, gameState: game.state };
        }
        if (result.territoryExpand) {
          const colorIdx = PLAYER_COLORS.indexOf(currentPlayer.color!) + 1;
          const cell = findTerritoryExpansionCell(game.state.board, colorIdx);
          if (cell) {
            game.state.board[cell.y][cell.x] = colorIdx;
            game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) + 1;
            const lastT = triggeredEffects[triggeredEffects.length - 1];
            if (lastT) lastT.scoreChange = (lastT.scoreChange || 0) + 1;
          }
        }
        if (result.removePiece === 'largest' || result.removePiece === 'random') {
          const unused = pieces!.filter(p => !p.isUsed);
          if (unused.length > 0) {
            const toRemove = result.removePiece === 'largest'
              ? unused.reduce((a, b) => pieceCellCount(a.shape) >= pieceCellCount(b.shape) ? a : b)
              : unused[Math.floor(Math.random() * unused.length)];
            toRemove.isUsed = true;
          }
        }
        if (result.setAllScoresToAverage) {
          const scores = game.players.map(p => game.state.playerScores[p.id] || 0);
          const avg = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);
          game.players.forEach(p => { game.state.playerScores[p.id] = avg; });
        }
        if (result.swapScoreWithHighest) {
          const sorted = [...game.players].sort((a, b) =>
            (game.state.playerScores[b.id] || 0) - (game.state.playerScores[a.id] || 0));
          const highest = sorted[0];
          if (highest && highest.id !== playerId) {
            const myScore = game.state.playerScores[playerId] || 0;
            const hisScore = game.state.playerScores[highest.id] || 0;
            game.state.playerScores[playerId] = hisScore;
            game.state.playerScores[highest.id] = myScore;
          }
        }
        if (result.globalBonus) {
          const placedCount = game.state.board.flat().filter(c => c === PLAYER_COLORS.indexOf(currentPlayer.color!) + 1).length;
          game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) + placedCount;
        }
      }

      // tick 状态效果：仅 tick 当前落子玩家（他人 time_pressure/steel 等应在自己回合时 tick）
      const curCpForTick = cs.creativePlayers.find(p => p.playerId === playerId);
      if (curCpForTick) {
        curCpForTick.statusEffects = tickStatusEffects(curCpForTick.statusEffects);
      }

      if (extraTurn) {
        // 额外回合：重置计时器，给满额时间
        this.clearTurnTimer(roomId);
        game.timeLeft = 0;
        this.startTurnTimer(roomId);
      } else {
        this.advanceTurn(roomId);
      }
    } else {
      this.advanceTurn(roomId);
    }

    return { success: true, gameState: game.state, triggeredEffects: triggeredEffects.length > 0 ? triggeredEffects : undefined };
  }


  // 玩家结算（放弃继续）
  settlePlayer(roomId: string, playerId: string): { success: boolean; gameState?: GameState; isGameOver: boolean } {
    const game = this.games.get(roomId);
    if (!game) return { success: false, isGameOver: false };
    if (game.isPaused) return { success: false, isGameOver: false };

    if (!game.state.settledPlayers.includes(playerId)) {
      game.state.settledPlayers.push(playerId);
    }

    // 检查是否所有玩家都已结算
    const allSettled = game.players.every(p => 
      game.state.settledPlayers.includes(p.id)
    );

    if (allSettled) {
      game.state.gamePhase = 'finished';
      this.clearTurnTimer(roomId);
      return { success: true, gameState: game.state, isGameOver: true };
    }

    // 如果当前玩家结算了，跳到下一个
    const currentPlayer = game.players[game.state.currentPlayerIndex];
    if (currentPlayer.id === playerId) {
      this.advanceTurn(roomId);
    }

    return { success: true, gameState: game.state, isGameOver: false };
  }

  // 创意模式：使用道具卡
  useItemCard(
    roomId: string,
    playerId: string,
    cardIndex: number,
    targetPlayerId?: string
  ): { success: boolean; error?: string; gameState?: GameState; pieceIdUnused?: string; pieceIdRemoved?: string; targetPlayerId?: string; cardType?: string; usedByPlayerId?: string } {
    const game = this.games.get(roomId);
    if (!game) return { success: false, error: 'GAME_NOT_FOUND' };
    if (game.state.gamePhase !== 'playing') return { success: false, error: 'GAME_NOT_PLAYING' };
    if (game.isPaused) return { success: false, error: 'GAME_PAUSED' };
    if (game.gameMode !== 'creative') return { success: false, error: 'NOT_CREATIVE' };

    const cs = game.state.creativeState;
    if (!cs) return { success: false, error: 'NO_CREATIVE_STATE' };
    if (!cs.itemPhase) return { success: false, error: 'NOT_IN_ITEM_PHASE' };

    const currentPlayer = game.players[game.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return { success: false, error: 'NOT_YOUR_TURN' };

    const selfCp = cs.creativePlayers.find(p => p.playerId === playerId);
    if (!selfCp) return { success: false, error: 'INVALID_PLAYER' };

    const card = selfCp.itemCards[cardIndex];
    if (!card) return { success: false, error: 'INVALID_CARD' };

    if (card.cardType === 'item_blame') {
      const hasDebuff = selfCp.statusEffects.some(e =>
        ['skip_turn', 'time_pressure', 'half_score', 'big_piece_ban'].includes(e.type)
      );
      if (!hasDebuff) return { success: false, error: 'NO_DEBUFF_TO_TRANSFER' };
    }

    if (card.needsTarget) {
      if (!targetPlayerId || targetPlayerId === playerId) return { success: false, error: 'INVALID_TARGET' };
      if (game.state.settledPlayers.includes(targetPlayerId)) return { success: false, error: 'TARGET_SETTLED' };
      if (!game.players.some(p => p.id === targetPlayerId)) return { success: false, error: 'TARGET_NOT_FOUND' };
    }

    const selfPlayerLike = { id: playerId, color: currentPlayer.color!, score: game.state.playerScores[playerId] || 0 };
    const targetPlayer = game.players.find(p => p.id === targetPlayerId);
    const targetCp = targetPlayerId ? cs.creativePlayers.find(p => p.playerId === targetPlayerId) : null;
    const targetPlayerLike = targetPlayer
      ? { id: targetPlayer.id, color: targetPlayer.color!, score: game.state.playerScores[targetPlayer.id] || 0 }
      : null;

    const result = resolveItemCard(card.cardType, selfPlayerLike, targetPlayerLike, selfCp, targetCp ?? null);

    // 目标有钢铁护盾时：消耗卡牌但不产生效果（不返回错误）
    // 移除使用的道具卡
    selfCp.itemCards = selfCp.itemCards.filter((_, i) => i !== cardIndex);

    // 应用效果（扣分允许到负数）
    if (result.selfScoreChange) {
      game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) + result.selfScoreChange;
    }
    if (result.targetScoreChange && targetPlayerId) {
      game.state.playerScores[targetPlayerId] = (game.state.playerScores[targetPlayerId] || 0) + result.targetScoreChange;
    }
    if (result.selfStatusEffects?.length) {
      selfCp.statusEffects.push(...result.selfStatusEffects);
    }
    if (result.targetStatusEffects?.length && targetCp) {
      targetCp.statusEffects.push(...result.targetStatusEffects);
    }

    let pieceIdUnused: string | undefined;
    let pieceIdRemoved: string | undefined;

    if (result.targetRemovePiece === 'largest' && targetPlayerId) {
      const pieces = game.playerPieces[targetPlayerId];
      if (pieces) {
        const unused = pieces.filter(p => !p.isUsed);
        if (unused.length > 0) {
          const largest = unused.reduce((a, b) => pieceCellCount(a.shape) >= pieceCellCount(b.shape) ? a : b);
          pieceIdRemoved = largest.id;
          const idx = pieces.findIndex(p => p.id === largest.id);
          if (idx !== -1) pieces[idx].isUsed = true;
        }
      }
    }

    if (result.targetUndoLastMove && targetPlayerId) {
      const moves = game.state.moves;
      for (let i = moves.length - 1; i >= 0; i--) {
        if (moves[i].playerColor === game.playerColorMap[targetPlayerId]) {
          const m = moves[i];
          pieceIdUnused = m.pieceId;
          m.boardChanges.forEach(c => { game.state.board[c.y][c.x] = 0; });
          const piece = game.playerPieces[targetPlayerId]?.find(p => p.id === m.pieceId);
          if (piece) {
            const pieceIdx = game.playerPieces[targetPlayerId]!.findIndex(p => p.id === m.pieceId);
            if (pieceIdx !== -1) game.playerPieces[targetPlayerId]![pieceIdx].isUsed = false;
          }
          game.state.playerScores[targetPlayerId] = (game.state.playerScores[targetPlayerId] || 0) - m.boardChanges.length;
          game.state.moves.splice(i, 1);
          break;
        }
      }
    }

    if (result.transferDebuff && targetPlayerId && targetCp) {
      const negTypes = ['half_score', 'skip_turn', 'time_pressure', 'big_piece_ban'];
      const toTransfer = selfCp.statusEffects.find(e => negTypes.includes(e.type));
      if (toTransfer) {
        selfCp.statusEffects = selfCp.statusEffects.filter(e => e !== toTransfer);
        targetCp.statusEffects.push({ ...toTransfer });
      }
    }

    // 道具阶段结束，启动主计时器（AI 不启动，由 checkAndProcessAITurn 继续落子）
    if (cs.itemPhase) {
      cs.itemPhase = false;
      cs.itemPhaseTimeLeft = 0;
      const stillCurrent = game.players[game.state.currentPlayerIndex];
      const isAI = stillCurrent?.isAI || (stillCurrent && game.hostedAIPlayers.has(stillCurrent.id));
      if (!isAI) this.startTurnTimer(roomId);
    }

    return {
      success: true,
      gameState: game.state,
      pieceIdUnused,
      pieceIdRemoved,
      targetPlayerId,
      cardType: card.cardType,
      usedByPlayerId: playerId,
    };
  }

  // 创意模式：跳过道具阶段
  skipItemPhase(roomId: string, playerId: string): { success: boolean; error?: string } {
    const game = this.games.get(roomId);
    if (!game) return { success: false, error: 'GAME_NOT_FOUND' };
    if (game.state.gamePhase !== 'playing') return { success: false, error: 'GAME_NOT_PLAYING' };
    const cs = game.state.creativeState;
    if (!cs || !cs.itemPhase) return { success: false, error: 'NOT_IN_ITEM_PHASE' };
    const currentPlayer = game.players[game.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return { success: false, error: 'NOT_YOUR_TURN' };

    cs.itemPhase = false;
    cs.itemPhaseTimeLeft = 0;
    this.startTurnTimer(roomId);
    return { success: true };
  }

  // 切换到下一个活跃玩家
  private advanceTurn(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    this.clearTurnTimer(roomId);
    game.timeLeft = 0; // 新回合使用满额时间

    let nextIndex = (game.state.currentPlayerIndex + 1) % game.players.length;
    let attempts = 0;

    while (attempts < game.players.length) {
      const nextPlayer = game.players[nextIndex];
      if (!game.state.settledPlayers.includes(nextPlayer.id)) {
        // 创意模式：检查 skip_turn
        const cs = game.state.creativeState;
        if (cs) {
          const cp = cs.creativePlayers.find(p => p.playerId === nextPlayer.id);
          const skipEffect = cp?.statusEffects.find(e => e.type === 'skip_turn' && e.remainingTurns > 0);
          if (skipEffect && cp) {
            cp.statusEffects = tickStatusEffects(cp.statusEffects);
            nextIndex = (nextIndex + 1) % game.players.length;
            attempts++;
            continue;
          }
        }
        break;
      }
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }

    if (attempts >= game.players.length) {
      game.state.gamePhase = 'finished';
      return;
    }

    game.state.currentPlayerIndex = nextIndex;
    game.state.turnCount++;

    this.checkAndProcessAITurn(roomId);
    // 仅人类回合启动主计时器；AI 回合不启动，避免倒计时连续不重置
    const currentPlayer = game.players[game.state.currentPlayerIndex];
    const hasHostedAI = !currentPlayer.isAI && currentPlayer.isOffline && game.hostedAIPlayers.has(currentPlayer.id);
    if (!currentPlayer.isAI && !hasHostedAI) {
      // 创意模式：人类有道具卡则先进入道具阶段，不启动主计时器
      const cs = game.state.creativeState;
      const cp = cs?.creativePlayers.find(p => p.playerId === currentPlayer.id);
      const hasItemCards = cp && cp.itemCards && cp.itemCards.length > 0;
      if (cs && hasItemCards) {
        cs.itemPhase = true;
        cs.itemPhaseTimeLeft = 30;
        // 道具阶段由客户端计时，服务端不启动主计时器
      } else {
        this.startTurnTimer(roomId);
      }
    }
  }

  // 当前玩家超时，跳过本回合（不结算）
  skipCurrentTurn(roomId: string): { success: boolean; gameState?: GameState } {
    const game = this.games.get(roomId);
    if (!game || game.state.gamePhase !== 'playing') {
      return { success: false };
    }
    // 超时也消耗当前玩家状态效果（如 time_pressure）
    const cs = game.state.creativeState;
    const currentPlayer = game.players[game.state.currentPlayerIndex];
    const curCp = cs?.creativePlayers.find(p => p.playerId === currentPlayer.id);
    if (curCp) {
      curCp.statusEffects = tickStatusEffects(curCp.statusEffects);
    }
    this.advanceTurn(roomId);
    return { success: true, gameState: game.state };
  }

  // 检查并处理 AI 回合
  private checkAndProcessAITurn(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.state.gamePhase !== 'playing') return;
    if (game.isPaused) return; // 单机暂停时不处理

    const currentPlayer = game.players[game.state.currentPlayerIndex];
    // 真人离线且有托管 AI，或原生 AI
    const hasHostedAI = !currentPlayer.isAI && currentPlayer.isOffline && game.hostedAIPlayers.has(currentPlayer.id);
    const isAITurn = currentPlayer.isAI || hasHostedAI;
    if (isAITurn) {
      const aiPlayer = game.aiPlayers.get(currentPlayer.id) ?? game.hostedAIPlayers.get(currentPlayer.id);
      if (aiPlayer) {
        // 模拟 AI 思考时间
        const thinkingTime = Math.random() * 1000 + 1000; // 1-2秒
        setTimeout(() => {
          // 再次检查游戏状态（防止思考期间游戏结束或玩家断线）
          if (game.state.gamePhase !== 'playing' || game.players[game.state.currentPlayerIndex].id !== currentPlayer.id) return;

          // 创意模式：AI 有道具卡则先尝试使用
          const cs = game.state.creativeState;
          const aiCp = cs?.creativePlayers.find(p => p.playerId === currentPlayer.id);
          if (cs && aiCp?.itemCards?.length) {
            cs.itemPhase = true;
            const allPlayers = game.players
              .filter(p => !game.state.settledPlayers.includes(p.id))
              .map(p => ({
                id: p.id,
                color: game.playerColorMap[p.id]!,
                score: game.state.playerScores[p.id] || 0,
              }));
            const decision = aiDecideItemCard(aiCp, allPlayers, cs.creativePlayers, currentPlayer.aiDifficulty || 'medium', cs.specialTiles);
            if (decision) {
              const itemResult = this.useItemCard(roomId, currentPlayer.id, decision.cardIndex, decision.targetPlayerId ?? undefined);
              if (itemResult.success && game.onAIItemUsed) {
                game.onAIItemUsed(roomId, {
                  gameState: itemResult.gameState!,
                  pieceIdUnused: itemResult.pieceIdUnused,
                  pieceIdRemoved: itemResult.pieceIdRemoved,
                  targetPlayerId: itemResult.targetPlayerId,
                  cardType: itemResult.cardType,
                  usedByPlayerId: itemResult.usedByPlayerId,
                });
              }
            } else {
              cs.itemPhase = false;
              cs.itemPhaseTimeLeft = 0;
            }
          }

          const pieces = game.playerPieces[currentPlayer.id];
          const moveResult = game.gameMode === 'creative' && game.state.creativeState
            ? aiPlayer.makeMoveCreative(
                game.state.board,
                pieces,
                game.state.creativeState.specialTiles,
                game.state.creativeState.creativePlayers
                  .find(p => p.playerId === currentPlayer.id)
                  ?.statusEffects.some(e => e.type === 'big_piece_ban' && e.remainingTurns > 0) ?? false,
              )
            : aiPlayer.makeMove(game.state.board, pieces);

          if (moveResult) {
            // 构建 GameMove
            const colorIndex = PLAYER_COLORS.indexOf(currentPlayer.color!) + 1;
            const boardChanges = [];
            const { shape } = moveResult.piece;
            const { x, y } = moveResult.position;

            for (let r = 0; r < shape.length; r++) {
              for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                  boardChanges.push({
                    x: x + c,
                    y: y + r,
                    color: colorIndex
                  });
                }
              }
            }

            const move: GameMove = {
              playerColor: currentPlayer.color!,
              pieceId: moveResult.piece.id,
              position: moveResult.position,
              boardChanges,
              timestamp: Date.now()
            };

            // 应用移动
            const procResult = this.processMove(roomId, currentPlayer.id, move);
            
            // 通知外部
            game.onAIMove(roomId, move, game.state, procResult.triggeredEffects);
          } else {
            // AI 无法移动，结算
            this.settlePlayer(roomId, currentPlayer.id);
            game.onAISettle(roomId, currentPlayer.id);
          }
        }, thinkingTime);
      }
    }
  }

  // 启动回合计时器（恢复时使用暂停前保留的 timeLeft，否则每回合满额重置；压迫效果仅5秒）
  private startTurnTimer(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;
    this.clearTurnTimer(roomId); // 先清除旧计时器，避免多计时器叠加
    let safeTurnTimeLimit =
      Number.isFinite(game.turnTimeLimit) && game.turnTimeLimit > 0 ? game.turnTimeLimit : 60;
    const currentPlayer = game.players[game.state.currentPlayerIndex];
    const cp = game.state.creativeState?.creativePlayers.find(p => p.playerId === currentPlayer?.id);
    if (cp?.statusEffects.some(e => e.type === 'time_pressure' && e.remainingTurns > 0)) {
      safeTurnTimeLimit = 5;
    }

    // 仅恢复时使用暂停前保留的 timeLeft，新回合一律用满额时间（显式重置避免后台时钟连续不重置）
    const isResuming = game.timeLeft !== undefined && game.timeLeft > 0;
    const startTime = isResuming ? game.timeLeft : safeTurnTimeLimit;
    if (!isResuming) game.timeLeft = 0; // 新回合先置零，确保下一轮 advanceTurn 时逻辑正确
    let timeLeft = startTime;
    game.onTimeUpdate(roomId, timeLeft); // 立即同步，避免恢复后闪回

    game.turnTimer = setInterval(() => {
      timeLeft--;
      game.timeLeft = timeLeft;
      game.onTimeUpdate(roomId, timeLeft);

      if (timeLeft <= 0) {
        this.clearTurnTimer(roomId);

        const currentPlayer = game.players[game.state.currentPlayerIndex];
        const timeoutPlayerId = currentPlayer?.id;

        if (timeoutPlayerId) {
          game.timeoutCounts[timeoutPlayerId] = (game.timeoutCounts[timeoutPlayerId] || 0) + 1;

          // 同一玩家累计超时 3 次，直接结算
          if (game.timeoutCounts[timeoutPlayerId] >= 3) {
            this.settlePlayer(roomId, timeoutPlayerId);
          } else {
            // 由 GameManager 自身推进回合，避免仅广播但未真正切人的问题
            this.skipCurrentTurn(roomId);
          }
        } else {
          this.skipCurrentTurn(roomId);
        }

        game.onTurnTimeout(roomId);
      }
    }, 1000);
  }

  // 清除回合计时器
  private clearTurnTimer(roomId: string): void {
    const game = this.games.get(roomId);
    if (game?.turnTimer) {
      clearInterval(game.turnTimer);
      game.turnTimer = null;
    }
  }

  // 获取游戏状态
  getGameState(roomId: string): GameState | undefined {
    return this.games.get(roomId)?.state;
  }

  /** 获取各玩家棋子使用状态（用于重连时恢复） */
  getPlayerPieces(roomId: string): Record<string, Array<{ id: string; isUsed: boolean }>> | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    const out: Record<string, Array<{ id: string; isUsed: boolean }>> = {};
    for (const [playerId, pieces] of Object.entries(game.playerPieces)) {
      out[playerId] = pieces.map(p => ({ id: p.id, isUsed: p.isUsed }));
    }
    return out;
  }

  /** 获取当前回合有效时间限制（压迫效果为5秒） */
  getEffectiveTurnTimeLimit(roomId: string, fallback: number = 60): number {
    const game = this.games.get(roomId);
    if (!game) return fallback;
    const cur = game.players[game.state.currentPlayerIndex];
    const cp = game.state.creativeState?.creativePlayers.find(p => p.playerId === cur?.id);
    if (cp?.statusEffects.some(e => e.type === 'time_pressure' && e.remainingTurns > 0)) return 5;
    return Number.isFinite(game.turnTimeLimit) && game.turnTimeLimit > 0 ? game.turnTimeLimit : fallback;
  }

  // 获取当前回合玩家
  getCurrentPlayer(roomId: string): RoomPlayer | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    return game.players[game.state.currentPlayerIndex];
  }

  // 获取颜色映射
  getPlayerColorMap(roomId: string): Record<string, PlayerColor> | undefined {
    return this.games.get(roomId)?.playerColorMap;
  }

  // 获取玩家昵称映射 (userId -> nickname)
  getPlayerNameMap(roomId: string): Record<string, string> | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    const nameMap: Record<string, string> = {};
    game.players.forEach(p => {
      nameMap[p.id] = p.nickname;
    });
    return nameMap;
  }

  // 获取玩家列表
  getPlayers(roomId: string): RoomPlayer[] | undefined {
    return this.games.get(roomId)?.players;
  }

  // 获取排名
  getRankings(roomId: string): Array<{ playerId: string; nickname: string; color: PlayerColor; score: number; rank: number }> | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;

    const rankings = game.players
      .map(p => ({
        playerId: p.id,
        nickname: p.nickname,
        color: game.playerColorMap[p.id],
        score: game.state.playerScores[p.id] || 0,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score);

    rankings.forEach((r, i) => { r.rank = i + 1; });
    return rankings;
  }

  // 清理游戏
  removeGame(roomId: string): void {
    this.clearTurnTimer(roomId);
    this.games.delete(roomId);
  }

  // 检查玩家是否在游戏中
  isPlayerInGame(roomId: string, playerId: string): boolean {
    const game = this.games.get(roomId);
    return game ? game.players.some(p => p.id === playerId) : false;
  }

  // 处理玩家断线（已弃用，改用 setPlayerOffline）
  handleDisconnect(roomId: string, playerId: string): { shouldSettle: boolean } {
    return { shouldSettle: false };
  }

  // 玩家断线：单机暂停，多人托管 AI
  setPlayerOffline(roomId: string, playerId: string, isSinglePlayer: boolean): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId && !p.isAI);
    if (!player) return;

    player.isOffline = true;

    if (isSinglePlayer) {
      game.isPaused = true;
      this.clearTurnTimer(roomId);
    } else {
      // 多人：添加托管 AI
      const color = game.playerColorMap[playerId];
      if (color && !game.hostedAIPlayers.has(playerId)) {
        const aiDifficulty = player.aiDifficulty || 'medium';
        game.hostedAIPlayers.set(playerId, new AIPlayer(color, aiDifficulty));
      }
    }
  }

  // 玩家重连：单机恢复，多人移除托管 AI
  setPlayerOnline(roomId: string, playerId: string, isSinglePlayer: boolean): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    player.isOffline = false;

    if (isSinglePlayer) {
      game.isPaused = false;
      this.startTurnTimer(roomId);
      // 若当前是 AI 回合，需触发 AI 落子
      this.checkAndProcessAITurn(roomId);
    } else {
      game.hostedAIPlayers.delete(playerId);
    }
  }

  isGamePaused(roomId: string): boolean {
    return this.games.get(roomId)?.isPaused ?? false;
  }
}
