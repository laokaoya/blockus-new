// 多人在线对战状态管理 Hook
// 监听服务器广播的游戏事件，同步更新本地 UI 状态

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameState, Player, Piece, Position, PlayerColor, GameMove } from '../types/game';
import { PIECE_SHAPES, PIECE_COUNTS } from '../constants/pieces';
import { canPlacePiece } from '../utils/gameEngine';
import { overlapsBarrier } from '../utils/creativeModeEngine';
import { rotatePiece, flipPiece, getUniqueTransformations } from '../utils/pieceTransformations';
import socketService, { ServerGameState, GameRanking } from '../services/socketService';
import soundManager from '../utils/soundManager';
import { useRoom } from '../contexts/RoomContext';
import { GOLD_EFFECTS, PURPLE_EFFECTS, RED_EFFECTS, ITEM_CARD_DEFS } from '../types/creative';
import type { TileEffect, TileEffectId } from '../types/creative';
import type { GameEvent } from '../types/creative';
import type { EffectResult } from '../utils/creativeModeEngine';

const BOARD_SIZE = 20;
const COLOR_ORDER: PlayerColor[] = ['red', 'yellow', 'blue', 'green'];

interface MultiplayerGameOptions {
  roomId: string;
  myUserId: string;
  myNickname: string;
  isSpectating?: boolean;
  /** 用户正在选择道具目标时暂停倒计时，避免提前 skip 导致无法使用 */
  isSelectingItemTarget?: boolean;
}

export function useMultiplayerGame(options: MultiplayerGameOptions) {
  const { roomId, myUserId, myNickname, isSpectating = false, isSelectingItemTarget = false } = options;
  const { joinRoom, spectateGame } = useRoom();
  
  const [gameState, setGameState] = useState<GameState>({
    board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)),
    players: [],
    currentPlayerIndex: 0,
    gamePhase: 'waiting',
    turnTimeLimit: 60,
    timeLeft: 60,
    selectedPiece: null,
    selectedPiecePosition: null,
    turnCount: 1,
    moves: [],
  });

  const [playerColorMap, setPlayerColorMap] = useState<Record<string, PlayerColor>>({});
  const [myColor, setMyColor] = useState<PlayerColor>('red');
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [thinkingAI, setThinkingAI] = useState<PlayerColor | null>(null);
  const [lastAIMove, setLastAIMove] = useState<Array<{ x: number; y: number }>>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [effectQueue, setEffectQueue] = useState<Array<{ effect: TileEffect; result: EffectResult; playerName?: string; playerColor?: PlayerColor }>>([]);
  const [showingEffect, setShowingEffect] = useState<{ effect: TileEffect; result: EffectResult; playerName?: string; playerColor?: PlayerColor } | null>(null);
  const [itemPhaseTimeLeft, setItemPhaseTimeLeft] = useState(0);
  const [eventLog, setEventLog] = useState<GameEvent[]>([]);
  const [itemUseBroadcast, setItemUseBroadcast] = useState<{ playerName: string; playerColor: PlayerColor; cardName: string; targetName?: string; effectText?: string } | null>(null);
  const eventIdRef = useRef(0);
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // 联机时服务端 Firebase 用户用 fb_${uid}，需用服务端 playerId 匹配
  const effectiveMyUserId = useMemo(() => {
    if (!myUserId) return '';
    const players = gameState.players;
    const creativePlayers = gameState.creativeState?.creativePlayers ?? [];
    const ids = [myUserId];
    if (myUserId && !myUserId.startsWith('fb_')) ids.push(`fb_${myUserId}`);
    return ids.find(id => players.some(p => p.id === id) || creativePlayers.some(c => c.playerId === id)) || myUserId;
  }, [myUserId, gameState.players, gameState.creativeState?.creativePlayers]);

  const addEvent = useCallback((
    type: GameEvent['type'],
    playerColor: PlayerColor,
    playerName: string,
    message: string,
    extra?: Partial<Pick<GameEvent, 'detail' | 'scoreChange' | 'icon'>>
  ) => {
    const id = ++eventIdRef.current;
    setEventLog(prev => [{ id, timestamp: Date.now(), type, playerColor, playerName, message, ...extra }, ...prev].slice(0, 100));
  }, []);

  // 根据服务端 playerColors 创建本地 Player 数组（重连时用 playerPieces 恢复 isUsed 状态）
  const createPlayersFromServerData = useCallback((
    serverState: ServerGameState,
    playerColors: Record<string, PlayerColor>,
    playerNames: Record<string, string>,
    playerPieces?: Record<string, Array<{ id: string; isUsed: boolean }>>
  ): Player[] => {
    // 按颜色顺序排列玩家
    const sortedEntries = Object.entries(playerColors).sort(([, colorA], [, colorB]) => {
      return COLOR_ORDER.indexOf(colorA) - COLOR_ORDER.indexOf(colorB);
    });

    return sortedEntries.map(([userId, color]) => {
      const colorIndex = COLOR_ORDER.indexOf(color);
      const pieces = createPiecesForColor(color);
      // 重连时用服务端 playerPieces 恢复 isUsed 状态
      if (playerPieces?.[userId]) {
        const serverPieces = playerPieces[userId];
        for (const p of pieces) {
          const sp = serverPieces.find(s => s.id === p.id);
          if (sp) p.isUsed = sp.isUsed;
        }
      }
      const score = serverState.playerScores[userId] || 0;
      const isSettled = serverState.settledPlayers.includes(userId);
      const isCurrentTurn = sortedEntries[serverState.currentPlayerIndex]?.[0] === userId;

      return {
        id: userId,
        name: playerNames[userId] || `Player ${colorIndex + 1}`,
        color,
        pieces,
        score,
        isSettled,
        isCurrentTurn,
        isAI: false // 多人游戏暂时不区分 AI 标识，或者需要服务端下发
      };
    });
  }, []);

  // 创建某颜色的拼图集
  const createPiecesForColor = (color: PlayerColor): Piece[] => {
    const pieces: Piece[] = [];
    let pieceIndex = 0;
    
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
        pieceIndex++;
      }
    });
    
    return pieces;
  };

  // 监听服务器游戏事件
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // 处理游戏状态初始化的通用函数
    const handleGameStateInit = (data: { roomId: string; gameState: ServerGameState; playerColors: Record<string, PlayerColor>; playerNames?: Record<string, string>; playerPieces?: Record<string, Array<{ id: string; isUsed: boolean }>>; isPaused?: boolean }, isStart: boolean) => {
      if (data.roomId !== roomId) return;

      // 联机时服务端 Firebase 用 fb_${uid}，需用服务端 id 匹配
      const effectiveId = data.playerColors[myUserId] !== undefined ? myUserId
        : (myUserId && !myUserId.startsWith('fb_') && data.playerColors[`fb_${myUserId}`] !== undefined ? `fb_${myUserId}` : myUserId);
      const myPlayerColor = data.playerColors[effectiveId];
      if (myPlayerColor) setMyColor(myPlayerColor);
      setPlayerColorMap(data.playerColors);

      const playerNames: Record<string, string> = {};
      Object.keys(data.playerColors).forEach(uid => {
        playerNames[uid] = data.playerNames?.[uid] || (uid === effectiveId ? myNickname : `Player ${uid.slice(-4)}`);
      });

      const players = createPlayersFromServerData(data.gameState, data.playerColors, playerNames, data.playerPieces);

      setGameState(prev => ({
        ...prev,
        board: data.gameState.board,
        players,
        currentPlayerIndex: data.gameState.currentPlayerIndex,
        gamePhase: isStart ? 'playing' : data.gameState.gamePhase,
        turnCount: data.gameState.turnCount,
        moves: isStart ? [] : (data.gameState.moves || []),
        selectedPiece: null,
        selectedPiecePosition: null,
        creativeState: data.gameState.creativeState as GameState['creativeState'],
      }));

      setIsMyTurn(players[data.gameState.currentPlayerIndex]?.id === effectiveId);
      setIsPaused(!!data.isPaused);
      if (data.gameState.creativeState?.itemPhase) {
        setItemPhaseTimeLeft(data.gameState.creativeState.itemPhaseTimeLeft ?? 30);
      } else {
        setItemPhaseTimeLeft(0);
      }
      if (isStart) {
        setIsGameOver(false);
        soundManager.yourTurn();
      }
    };

    // 游戏开始
    unsubscribers.push(
      socketService.on('game:started', (data) => handleGameStateInit(data, true))
    );

    // 监听游戏状态同步（断线重连 / 页面加载后获取状态）
    // 必须在 game:getState 请求之前注册，避免响应丢失
    unsubscribers.push(
      socketService.on('game:state', (data) => handleGameStateInit(data, false))
    );

    // 主动请求当前游戏状态（用于页面刚加载、断线重连等场景）
    const fetchState = () => socketService.emit('game:getState', { roomId });

    const doReconnect = async () => {
      try {
        if (isSpectating) {
          await spectateGame(roomId);
        } else {
          await joinRoom(roomId);
        }
        fetchState();
      } catch (e) {
        console.warn('[Multiplayer] Reconnect rejoin failed:', e);
        fetchState();
      }
    };

    if (socketService.isConnected) {
      doReconnect();
    } else {
      const connectHandler = (connected: boolean) => {
        if (connected) doReconnect();
      };
      unsubscribers.push(socketService.on('connectionChange', connectHandler));
    }

    // 根据 effectId 查找 TileEffect
    const findEffectById = (effectId: string): TileEffect | null => {
      const all = [...GOLD_EFFECTS, ...PURPLE_EFFECTS, ...RED_EFFECTS];
      return all.find(e => e.id === effectId) ?? null;
    };

    // 其他玩家落子
    unsubscribers.push(
      socketService.on('game:move', (data: { roomId: string; move: GameMove; gameState: ServerGameState; triggeredEffects?: Array<{ effectId: string; effectName: string; tileType: string; tileX?: number; tileY?: number; scoreChange: number; grantItemCard?: boolean; extraTurn?: boolean }>; undoLastMove?: boolean }) => {
        if (data.roomId !== roomId) return;

        const isUndo = !!data.undoLastMove;

        // 创意模式：将服务端下发的触发效果加入展示队列（在 setState 外执行，避免 setState 内副作用）
        if (data.triggeredEffects?.length) {
          const mover = gameStateRef.current.players.find(p => p.color === data.move!.playerColor);
          const newItems = data.triggeredEffects!.map(t => {
            const effect: TileEffect = findEffectById(t.effectId) ?? {
              id: t.effectId as TileEffectId,
              name: t.effectName,
              description: '',
              type: t.tileType as 'gold' | 'purple' | 'red',
            };
            const result: EffectResult = { scoreChange: t.scoreChange, grantItemCard: t.grantItemCard, extraTurn: t.extraTurn };
            return { effect, result, playerName: mover?.name, playerColor: mover?.color as PlayerColor };
          });
          setEffectQueue(q => [...q, ...newItems]);
        }

        // 应用落子到棋盘（创意模式领地扩张等效果在服务端修改了棋盘，需用 gameState.board 同步）
        setGameState(prev => {
          const newBoard = (data.gameState.board && data.gameState.board.length === BOARD_SIZE)
            ? data.gameState.board.map(row => [...row])
            : (() => {
                const b = prev.board.map(row => [...row]);
                data.move.boardChanges.forEach(change => {
                  if (change.x >= 0 && change.x < BOARD_SIZE && change.y >= 0 && change.y < BOARD_SIZE) {
                    b[change.y][change.x] = change.color;
                  }
                });
                return b;
              })();

          // 更新分数和棋子使用状态
          const newPlayers = prev.players.map(p => {
            const updated = {
              ...p,
              score: data.gameState.playerScores[p.id] || p.score,
              isSettled: data.gameState.settledPlayers.includes(p.id),
            };
            // 标记被使用的棋子（通过 pieceId 匹配）；undoLastMove 时显式恢复拼图为未使用
            if (data.move.pieceId && p.color === data.move.playerColor) {
              updated.pieces = p.pieces.map(piece =>
                piece.id === data.move.pieceId ? { ...piece, isUsed: !isUndo } : piece
              );
            }
            return updated;
          });

          // 历史记录：落子（undo 时记录「回收」）
          const mover = prev.players.find(p => p.color === data.move.playerColor);
          if (mover) {
            if (isUndo) {
              addEvent('tile_effect', mover.color, mover.name, '踩到红色方格，触发回收', { icon: '↩' });
            } else {
              addEvent('place', mover.color, mover.name,
                `放置了 ${data.move.boardChanges.length} 格拼图`,
                { icon: '🧩' });
              data.triggeredEffects?.forEach(t => {
                const posStr = t.tileX != null && t.tileY != null ? `(${t.tileX},${t.tileY})` : '';
                const tileName = t.tileType === 'gold' ? '金色' : t.tileType === 'purple' ? '紫色' : '红色';
                const extra: string[] = [t.effectName].filter(Boolean);
                if (t.scoreChange !== 0) extra.push(`${t.scoreChange > 0 ? '+' : ''}${t.scoreChange}分`);
                if (t.grantItemCard) extra.push('获得道具卡');
                if (t.extraTurn) extra.push('额外回合');
                addEvent('tile_effect', mover.color, mover.name,
                  `踩到${tileName}方格${posStr}，${extra.join('、')}`,
                  { scoreChange: t.scoreChange, icon: t.tileType === 'gold' ? '★' : t.tileType === 'purple' ? '?' : '!' });
              });
            }
          }

          const serverCreative = data.gameState.creativeState;
          const nextCreative = serverCreative
            ? { ...serverCreative, specialTiles: serverCreative.specialTiles ?? prev.creativeState?.specialTiles ?? [] }
            : prev.creativeState;
          // undo 时 moves 不包含本次落子，用服务端 moves；否则追加
          const newMoves = isUndo && data.gameState.moves
            ? data.gameState.moves
            : [...prev.moves, data.move];
          return {
            ...prev,
            board: newBoard,
            players: newPlayers,
            currentPlayerIndex: data.gameState.currentPlayerIndex,
            moves: newMoves,
            turnCount: data.gameState.turnCount,
            creativeState: nextCreative as GameState['creativeState'],
          };
        });

        // 创意模式：落子触发道具阶段时同步倒计时（避免从 0 开始导致立即 skip）
        if (data.gameState.creativeState?.itemPhase) {
          setItemPhaseTimeLeft(data.gameState.creativeState.itemPhaseTimeLeft ?? 30);
        }

        // 如果不是自己的落子，播放其他玩家落子音效并显示高亮
        const moveColorIndex = data.move.boardChanges[0]?.color;
        const moveColor = moveColorIndex ? COLOR_ORDER[moveColorIndex - 1] : null;
        
        if (moveColor && moveColor !== myColor) {
          soundManager.aiPlace();
          setLastAIMove(data.move.boardChanges.map(c => ({ x: c.x, y: c.y })));
          setTimeout(() => setLastAIMove([]), 1200);
        }
      })
    );

    // 回合切换（创意模式含 creativeState 时同步道具阶段）
    unsubscribers.push(
      socketService.on('game:turnChanged', (data: { roomId: string; currentPlayerIndex: number; timeLeft: number; creativeState?: any }) => {
        if (data.roomId !== roomId) return;
        const safeTimeLeft = Number.isFinite(data.timeLeft) && data.timeLeft >= 0 ? data.timeLeft : 60;

        setGameState(prev => {
          const newPlayers = prev.players.map((p, idx) => ({
            ...p,
            isCurrentTurn: idx === data.currentPlayerIndex,
          }));

          const next: any = {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: data.currentPlayerIndex,
            timeLeft: safeTimeLeft,
          };
          if (data.creativeState) {
            // 深合并：保留 specialTiles（含 used 状态），避免被不完整 payload 覆盖导致发光失效
            next.creativeState = {
              ...prev.creativeState,
              ...data.creativeState,
              specialTiles: data.creativeState.specialTiles ?? prev.creativeState?.specialTiles ?? [],
            };
          }
          return next;
        });
        if (data.creativeState?.itemPhase) {
          setItemPhaseTimeLeft(data.creativeState.itemPhaseTimeLeft ?? 30);
        }

        // 检查是否轮到自己
        setGameState(prev => {
          const currentPlayer = prev.players[data.currentPlayerIndex];
          const turnIsMe = currentPlayer?.id === effectiveMyUserId;
          setIsMyTurn(turnIsMe);
          if (turnIsMe) {
            soundManager.yourTurn();
          }
          return prev;
        });
      })
    );

    // 创意模式：creativeState 单独同步（如跳过道具阶段）
    unsubscribers.push(
      socketService.on('game:creativeState', (data: { roomId: string; creativeState: any }) => {
        if (data.roomId !== roomId) return;
        setGameState(prev => ({
          ...prev,
          creativeState: prev.creativeState
            ? {
                ...prev.creativeState,
                ...data.creativeState,
                specialTiles: data.creativeState.specialTiles ?? prev.creativeState.specialTiles ?? [],
              }
            : data.creativeState,
        }));
        if (data.creativeState?.itemPhase) {
          setItemPhaseTimeLeft(data.creativeState.itemPhaseTimeLeft ?? 30);
        }
      })
    );

    // 时间更新（忽略过期值，避免回合切换时旧计时覆盖新回合导致闪回）
    unsubscribers.push(
      socketService.on('game:timeUpdate', (data: { roomId: string; timeLeft: number }) => {
        if (data.roomId !== roomId) return;
        const safeTimeLeft = Number.isFinite(data.timeLeft) && data.timeLeft >= 0 ? data.timeLeft : 0;
        setGameState(prev => {
          // 忽略过期更新：若新值比当前值小很多（>2），说明是旧回合的过期 tick，避免闪回
          if (safeTimeLeft < prev.timeLeft - 2) return prev;
          return { ...prev, timeLeft: safeTimeLeft };
        });
        if (safeTimeLeft <= 10 && safeTimeLeft > 0) {
          soundManager.timeWarning();
        }
      })
    );

    // 玩家结算
    unsubscribers.push(
      socketService.on('game:playerSettled', (data: { roomId: string; playerId: string }) => {
        if (data.roomId !== roomId) return;
        setGameState(prev => {
          const p = prev.players.find(pl => pl.id === data.playerId);
          if (p) addEvent('settle', p.color, p.name, '选择结算', { icon: '🏁' });
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id === data.playerId ? { ...p, isSettled: true } : p
            ),
          };
        });
        if (data.playerId !== effectiveMyUserId) soundManager.settle();
      })
    );

    // 游戏结束
    unsubscribers.push(
      socketService.on('game:finished', (data: { roomId: string; gameState: ServerGameState; rankings: GameRanking[] }) => {
        if (data.roomId !== roomId) return;

        setRankings(data.rankings);
        setIsGameOver(true);
        setIsMyTurn(false);

        setGameState(prev => ({
          ...prev,
          gamePhase: 'finished',
          board: data.gameState.board,
          players: prev.players.map(p => ({
            ...p,
            score: data.gameState.playerScores[p.id] || p.score,
            isSettled: true,
            isCurrentTurn: false,
          })),
        }));

        // 判断胜负播放音效
        const myRank = data.rankings.find(r => r.playerId === effectiveMyUserId);
        if (myRank && myRank.rank === 1) {
          soundManager.gameWin();
        } else {
          soundManager.gameLose();
        }
      })
    );

    // 创意模式：道具使用
    unsubscribers.push(
      socketService.on('game:itemUsed', (data: {
        roomId: string; gameState: ServerGameState;
        pieceIdUnused?: string; pieceIdRemoved?: string; targetPlayerId?: string;
        cardType?: string; usedByPlayerId?: string; effectDetail?: string;
        playerPieces?: Record<string, Array<{ id: string; isUsed: boolean }>>;
      }) => {
        if (data.roomId !== roomId) return;
        const newCreativeState = data.gameState.creativeState;
        if (newCreativeState && !newCreativeState.itemPhase) setItemPhaseTimeLeft(0);

        // 道具使用广播特效与历史记录
        const usedBy = data.usedByPlayerId;
        const cardDef = data.cardType ? ITEM_CARD_DEFS.find(c => c.cardType === data.cardType) : null;
        const cardName = cardDef?.name || '道具卡';
        const effectTextMap: Record<string, string> = {
          item_blame: '获得了负面状态',
          item_shrink: '的棋子被缩减',
          item_curse: '被诅咒',
          item_steel: '获得了免疫',
          item_freeze: '被冰冻',
          item_pressure: '获得了时间压力',
          item_plunder: '的分数被掠夺',
          item_blackhole: '的棋子被清除',
        };
        // 优先用服务端 effectDetail（含嫁祸转移类型、掠夺分数等），替换 USER 为使用者名
        const fallbackEffectText = data.cardType ? effectTextMap[data.cardType] : undefined;

        setGameState(prev => {
          const user = prev.players.find(p => p.id === usedBy);
          const target = data.targetPlayerId ? prev.players.find(p => p.id === data.targetPlayerId) : null;
          if (user) {
            const effectText = data.effectDetail?.replace(/USER/g, user.name) || fallbackEffectText;
            const who = target?.name || user.name;
            const msg = effectText
              ? (target ? `对 ${target.name} 使用了「${cardName}」— ${who} ${effectText}` : `使用了「${cardName}」— ${who} ${effectText}`)
              : (target ? `对 ${target.name} 使用道具「${cardName}」` : `使用道具「${cardName}」`);
            addEvent('item_use', user.color, user.name, msg, { icon: '🃏' });
            setItemUseBroadcast({ playerName: user.name, playerColor: user.color, cardName, targetName: target?.name, effectText });
          }

          let newPlayers = prev.players.map(p => ({
            ...p,
            score: data.gameState.playerScores[p.id] ?? p.score,
          }));
          // 同步 targetUndoLastMove：目标玩家的棋子恢复未使用
          if (data.pieceIdUnused && data.targetPlayerId) {
            newPlayers = newPlayers.map(p =>
              p.id === data.targetPlayerId
                ? { ...p, pieces: p.pieces.map(pc => pc.id === data.pieceIdUnused ? { ...pc, isUsed: false } : pc) }
                : p
            );
          }
          // 同步 targetRemovePiece：目标玩家的棋子标记为已使用（缩减卡等）
          // 优先用服务端 playerPieces 同步（最可靠），否则用 pieceIdRemoved + targetPlayerId 匹配
          if (data.playerPieces) {
            newPlayers = newPlayers.map(p => {
              const serverPieces = data.playerPieces![p.id];
              if (!serverPieces) return p;
              return {
                ...p,
                pieces: p.pieces.map(pc => {
                  const sp = serverPieces.find(s => s.id === pc.id);
                  return sp ? { ...pc, isUsed: sp.isUsed } : pc;
                }),
              };
            });
          } else if (data.pieceIdRemoved && data.targetPlayerId) {
            newPlayers = newPlayers.map(p =>
              p.id === data.targetPlayerId
                ? {
                    ...p,
                    pieces: p.pieces.map(pc =>
                      pc.id === data.pieceIdRemoved ? { ...pc, isUsed: true } : pc
                    ),
                  }
                : p
            );
          }
          return {
            ...prev,
            creativeState: (data.gameState.creativeState ?? prev.creativeState) as GameState['creativeState'],
            board: data.gameState.board,
            players: newPlayers,
          };
        });
      })
    );

    // 单机模式暂停/恢复
    unsubscribers.push(
      socketService.on('game:paused', (data: { roomId: string }) => {
        if (data.roomId === roomId) setIsPaused(true);
      })
    );
    unsubscribers.push(
      socketService.on('game:resumed', (data: { roomId: string }) => {
        if (data.roomId === roomId) setIsPaused(false);
      })
    );

    // 多人模式：玩家离线/上线（托管 AI 代打 / 移除托管）
    unsubscribers.push(
      socketService.on('room:playerOffline', (data: { roomId: string; playerId: string }) => {
        if (data.roomId !== roomId) return;
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id === data.playerId ? { ...p, isOffline: true } : p
          ),
        }));
      })
    );
    unsubscribers.push(
      socketService.on('room:playerOnline', (data: { roomId: string; playerId: string }) => {
        if (data.roomId !== roomId) return;
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id === data.playerId ? { ...p, isOffline: false } : p
          ),
        }));
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [roomId, myUserId, myNickname, myColor, isSpectating, joinRoom, spectateGame, createPlayersFromServerData, addEvent]);

  // 创意模式：效果展示队列（2.5秒期间游戏暂停）
  useEffect(() => {
    if (effectQueue.length > 0 && !showingEffect) {
      const next = effectQueue[0];
      setShowingEffect(next);
      setEffectQueue(prev => prev.slice(1));
      setTimeout(() => setShowingEffect(null), 2500);
    }
  }, [effectQueue, showingEffect]);

  // 创意模式：道具阶段倒计时，结束时自动调用 skipItemPhase（选择目标时暂停，避免提前 skip 导致无法使用）
  const isItemPhase = !!gameState.creativeState?.itemPhase;
  useEffect(() => {
    if (!isItemPhase) {
      setItemPhaseTimeLeft(0);
      return;
    }
    if (isSelectingItemTarget) return; // 用户正在选择目标，不自动 skip
    const t = setInterval(() => {
      setItemPhaseTimeLeft(prev => {
        if (prev <= 1) {
          socketService.skipItemPhase(roomId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isItemPhase, isSelectingItemTarget, roomId]);

  // 选择拼图（本地操作）
  const selectPiece = useCallback((piece: Piece | null) => {
    if (piece) soundManager.selectPiece();
    setGameState(prev => ({ ...prev, selectedPiece: piece }));
  }, []);

  // 旋转拼图（本地操作）
  const rotateSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      soundManager.rotatePiece();
      return { ...prev, selectedPiece: rotatePiece(prev.selectedPiece) };
    });
  }, []);

  // 翻转拼图（本地操作）
  const flipSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      soundManager.flipPiece();
      return { ...prev, selectedPiece: flipPiece(prev.selectedPiece) };
    });
  }, []);

  // 放置拼图（发送到服务器）
  const placePieceOnBoard = useCallback((position: Position): boolean => {
    if (!gameState.selectedPiece || !isMyTurn || isPaused) return false;
    if (showingEffect || itemUseBroadcast) return false; // 效果/道具广播期间暂停
    if (gameState.creativeState?.itemPhase) return false; // 道具阶段不能落子

    const myPlayerIndex = gameState.players.findIndex(p => p.id === effectiveMyUserId);
    if (myPlayerIndex < 0) return false;
    
    const colorIndex = COLOR_ORDER.indexOf(myColor) + 1;

    if (!canPlacePiece(gameState.board, gameState.selectedPiece, position, colorIndex)) {
      soundManager.invalidMove();
      return false;
    }
    // 创意模式：禁止放置到屏障格
    const specialTiles = gameState.creativeState?.specialTiles;
    if (specialTiles?.length && overlapsBarrier(gameState.selectedPiece.shape, position, specialTiles)) {
      soundManager.invalidMove();
      return false;
    }

    // 计算 boardChanges
    const boardChanges: Array<{ x: number; y: number; color: number }> = [];
    const shape = gameState.selectedPiece.shape;
    for (let dy = 0; dy < shape.length; dy++) {
      for (let dx = 0; dx < shape[dy].length; dx++) {
        if (shape[dy][dx] === 1) {
          boardChanges.push({
            x: position.x + dx,
            y: position.y + dy,
            color: colorIndex,
          });
        }
      }
    }

    const move: GameMove = {
      playerColor: myColor,
      pieceId: gameState.selectedPiece.id,
      position,
      boardChanges,
      timestamp: Date.now(),
    };

    soundManager.placePiece();

    const prevState = gameState;
    // 乐观更新：立即应用到本地
    setGameState(prev => {
      const newBoard = prev.board.map(row => [...row]);
      boardChanges.forEach(change => {
        newBoard[change.y][change.x] = change.color;
      });

      // 标记拼图已使用
      const newPlayers = prev.players.map(p => {
        if (p.id === effectiveMyUserId) {
          return {
            ...p,
            pieces: p.pieces.map(piece =>
              piece.id === prev.selectedPiece?.id ? { ...piece, isUsed: true } : piece
            ),
            score: p.score + boardChanges.length,
          };
        }
        return p;
      });

      return {
        ...prev,
        board: newBoard,
        players: newPlayers,
        selectedPiece: null,
        selectedPiecePosition: null,
        moves: [...prev.moves, move],
      };
    });

    // 发送到服务器，失败时回滚
    socketService.sendMove(roomId, move).then(result => {
      if (!result.success) {
        console.error('Move rejected by server:', result.error);
        soundManager.invalidMove();
        setGameState(prevState);
      }
    });

    return true;
  }, [gameState, isMyTurn, isPaused, showingEffect, itemUseBroadcast, effectiveMyUserId, myColor, roomId]);

  // 结算（发送到服务器）
  const settlePlayer = useCallback(() => {
    soundManager.settle();
    socketService.settlePlayer(roomId);
  }, [roomId]);

  const doUseItemCard = useCallback(async (cardIndex: number, targetPlayerId?: string) => {
    if (showingEffect || itemUseBroadcast) return { success: false, error: 'BROADCAST_ACTIVE' };
    const result = await socketService.useItemCard(roomId, cardIndex, targetPlayerId);
    if (result.success) {
      soundManager.placePiece(); // 使用道具音效
    } else {
      soundManager.invalidMove();
    }
    return result;
  }, [roomId, showingEffect, itemUseBroadcast]);

  const skipItemPhase = useCallback(async () => {
    if (showingEffect || itemUseBroadcast) return false;
    setGameState(prev => prev.creativeState ? {
      ...prev,
      creativeState: { ...prev.creativeState, itemPhase: false, itemPhaseTimeLeft: 0 },
    } : prev);
    try {
      const result = await socketService.skipItemPhase(roomId);
      if (!result.success) {
        setGameState(prev => prev.creativeState ? {
          ...prev,
          creativeState: { ...prev.creativeState, itemPhase: true, itemPhaseTimeLeft: prev.creativeState.itemPhaseTimeLeft || 30 },
        } : prev);
        return false;
      }
      return true;
    } catch (err) {
      // 网络错误、超时、未连接等：回滚乐观更新
      setGameState(prev => prev.creativeState ? {
        ...prev,
        creativeState: { ...prev.creativeState, itemPhase: true, itemPhaseTimeLeft: prev.creativeState.itemPhaseTimeLeft || 30 },
      } : prev);
      return false;
    }
  }, [roomId, showingEffect, itemUseBroadcast]);

  // 判断当前玩家是否可以继续
  const canPlayerContinue = useCallback((): boolean => {
    const myPlayerIndex = gameState.players.findIndex(p => p.id === effectiveMyUserId);
    if (myPlayerIndex < 0) return false;
    
    const myPlayer = gameState.players[myPlayerIndex];
    if (myPlayer.isSettled) return false;

    const colorIndex = COLOR_ORDER.indexOf(myColor) + 1;
    
    const specialTiles = gameState.creativeState?.specialTiles;
    return myPlayer.pieces
      .filter(p => !p.isUsed)
      .some(piece => {
        const variants = getUniqueTransformations(piece);
        for (const variant of variants) {
          for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
              if (canPlacePiece(gameState.board, variant, { x, y }, colorIndex)) {
                if (!specialTiles?.length || !overlapsBarrier(variant.shape, { x, y }, specialTiles)) return true;
              }
            }
          }
        }
        return false;
      });
  }, [gameState.board, gameState.players, gameState.creativeState?.specialTiles, effectiveMyUserId, myColor]);

  // 自动检测当前玩家是否可以继续，如果不能则自动结算
  useEffect(() => {
    if (gameState.gamePhase !== 'playing' || !isMyTurn) return;
    
    const myPlayer = gameState.players.find(p => p.id === effectiveMyUserId);
    if (!myPlayer || myPlayer.isSettled) return;

    // 使用 setTimeout 避免在渲染过程中更新状态
    const timer = setTimeout(() => {
      // 检查是否还有可放置的棋子
      // 注意：canPlayerContinue 是一个开销较大的操作，只在轮到自己时检查一次
      const myPlayer = gameState.players.find(p => p.id === effectiveMyUserId);
      if (!myPlayer) return;

      const colorIndex = COLOR_ORDER.indexOf(myColor) + 1;
      const specialTiles = gameState.creativeState?.specialTiles;
      const canContinue = myPlayer.pieces
        .filter(p => !p.isUsed)
        .some(piece => {
          const variants = getUniqueTransformations(piece);
          for (const variant of variants) {
            for (let y = 0; y < BOARD_SIZE; y++) {
              for (let x = 0; x < BOARD_SIZE; x++) {
                if (canPlacePiece(gameState.board, variant, { x, y }, colorIndex)) {
                  if (!specialTiles?.length || !overlapsBarrier(variant.shape, { x, y }, specialTiles)) return true;
                }
              }
            }
          }
          return false;
        });

      if (!canContinue) {
        // 播放提示音
        soundManager.invalidMove(); 
        // 自动结算
        settlePlayer();
      }
    }, 1000); // 给一点延迟，让玩家看清局面
    
    return () => clearTimeout(timer);
  }, [isMyTurn, gameState.gamePhase, gameState.board, gameState.players, effectiveMyUserId, myColor, settlePlayer]);

  // 超时由服务端处理（skip/settle），客户端不主动结算，避免 60 秒首次超时即被错误结算

  // 监听当前玩家变化，设置 AI 思考状态
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') {
      setThinkingAI(null);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer && currentPlayer.id !== effectiveMyUserId && !currentPlayer.isSettled) {
      // 如果不是我，且未结算，显示思考状态
      setThinkingAI(currentPlayer.color);
    } else {
      setThinkingAI(null);
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, gameState.players, effectiveMyUserId]);

  return {
    gameState,
    selectPiece,
    placePieceOnBoard,
    settlePlayer,
    doUseItemCard,
    skipItemPhase,
    rotateSelectedPiece,
    flipSelectedPiece,
    thinkingAI,
    lastAIMove,
    canPlayerContinue,
    isMyTurn,
    isGameOver,
    isPaused,
    rankings,
    myColor,
    playerColorMap,
    currentTurnTime: gameState.timeLeft,
    showingEffect,
    isItemPhase,
    itemPhaseTimeLeft,
    eventLog,
    itemUseBroadcast,
    setItemUseBroadcast,
  };
}
