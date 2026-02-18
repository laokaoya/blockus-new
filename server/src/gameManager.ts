import { GameState, GameMove, PlayerColor, RoomPlayer, Piece } from './types';
import { AIPlayer } from './utils/aiPlayer';
import { PIECE_SHAPES, PIECE_COUNTS } from './constants/pieces';

const BOARD_SIZE = 20;
const PLAYER_COLORS: PlayerColor[] = ['red', 'yellow', 'blue', 'green'];

interface ActiveGame {
  roomId: string;
  state: GameState;
  players: RoomPlayer[];
  playerColorMap: Record<string, PlayerColor>; // userId -> color
  colorPlayerMap: Record<string, string>;       // color -> userId
  playerPieces: Record<string, Piece[]>;        // userId -> pieces
  aiPlayers: Map<string, AIPlayer>;             // userId -> AIPlayer instance
  turnTimer: NodeJS.Timeout | null;
  turnTimeLimit: number;
  onTurnTimeout: (roomId: string) => void;
  onTimeUpdate: (roomId: string, timeLeft: number) => void;
  onAIMove: (roomId: string, move: GameMove, gameState: GameState) => void;
  onAISettle: (roomId: string, playerId: string) => void;
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
    onAIMove: (roomId: string, move: GameMove, gameState: GameState) => void,
    onAISettle: (roomId: string, playerId: string) => void
  ): { gameState: GameState; playerColors: Record<string, PlayerColor> } {
    // 创建空棋盘
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));

    // 分配颜色和初始化拼图
    const playerColorMap: Record<string, PlayerColor> = {};
    const colorPlayerMap: Record<string, string> = {};
    const playerPieces: Record<string, Piece[]> = {};
    const aiPlayers = new Map<string, AIPlayer>();

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

    // 初始化分数
    players.forEach(p => {
      gameState.playerScores[p.id] = 0;
    });

    const game: ActiveGame = {
      roomId,
      state: gameState,
      players,
      playerColorMap,
      colorPlayerMap,
      playerPieces,
      aiPlayers,
      turnTimer: null,
      turnTimeLimit,
      onTurnTimeout,
      onTimeUpdate,
      onAIMove,
      onAISettle,
    };

    this.games.set(roomId, game);

    // 启动第一个玩家的回合
    this.checkAndProcessAITurn(roomId);
    this.startTurnTimer(roomId);

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
  processMove(roomId: string, playerId: string, move: GameMove): { success: boolean; error?: string; gameState?: GameState } {
    const game = this.games.get(roomId);
    if (!game) return { success: false, error: 'GAME_NOT_FOUND' };
    if (game.state.gamePhase !== 'playing') return { success: false, error: 'GAME_NOT_PLAYING' };

    // 验证是否轮到该玩家
    const currentPlayer = game.players[game.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return { success: false, error: 'NOT_YOUR_TURN' };

    // 标记拼图为已使用
    // 注意：如果是 AI 移动，move.pieceId 应该是有效的
    // 如果是客户端移动，我们需要根据 move 中的信息找到对应的拼图并标记
    // 这里简化处理：假设 move 中包含 pieceId，或者我们信任客户端
    // 为了更严谨，我们应该在 GameMove 中包含 pieceId（已添加）
    
    const pieces = game.playerPieces[playerId];
    if (pieces) {
      // 这里的 pieceId 匹配逻辑需要确保客户端发送正确的 ID
      // 客户端发送的 move 应该包含 pieceId
      // 让我们检查 types.ts 中的 GameMove 定义... 包含了 pieceId
      const pieceIndex = pieces.findIndex(p => p.id === move.pieceId);
      if (pieceIndex !== -1) {
        pieces[pieceIndex].isUsed = true;
      }
    }

    // 应用落子
    move.boardChanges.forEach(change => {
      game.state.board[change.y][change.x] = change.color;
    });

    // 更新分数
    game.state.playerScores[playerId] = (game.state.playerScores[playerId] || 0) + move.boardChanges.length;

    // 记录移动
    game.state.moves.push(move);

    // 切换到下一个玩家
    this.advanceTurn(roomId);

    return { success: true, gameState: game.state };
  }


  // 玩家结算（放弃继续）
  settlePlayer(roomId: string, playerId: string): { success: boolean; gameState?: GameState; isGameOver: boolean } {
    const game = this.games.get(roomId);
    if (!game) return { success: false, isGameOver: false };

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

  // 切换到下一个活跃玩家
  private advanceTurn(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    this.clearTurnTimer(roomId);

    let nextIndex = (game.state.currentPlayerIndex + 1) % game.players.length;
    let attempts = 0;

    // 跳过已结算的玩家
    while (attempts < game.players.length) {
      const nextPlayer = game.players[nextIndex];
      if (!game.state.settledPlayers.includes(nextPlayer.id)) {
        break;
      }
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }

    // 如果所有玩家都结算了
    if (attempts >= game.players.length) {
      game.state.gamePhase = 'finished';
      return;
    }

    game.state.currentPlayerIndex = nextIndex;
    game.state.turnCount++;

    // 检查是否是 AI 回合
    this.checkAndProcessAITurn(roomId);

    // 启动下一个玩家的回合计时
    this.startTurnTimer(roomId);
  }

  // 检查并处理 AI 回合
  private checkAndProcessAITurn(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.state.gamePhase !== 'playing') return;

    const currentPlayer = game.players[game.state.currentPlayerIndex];
    if (currentPlayer.isAI) {
      const aiPlayer = game.aiPlayers.get(currentPlayer.id);
      if (aiPlayer) {
        // 模拟 AI 思考时间
        const thinkingTime = Math.random() * 1000 + 1000; // 1-2秒
        setTimeout(() => {
          // 再次检查游戏状态（防止思考期间游戏结束或玩家断线）
          if (game.state.gamePhase !== 'playing' || game.players[game.state.currentPlayerIndex].id !== currentPlayer.id) return;

          const pieces = game.playerPieces[currentPlayer.id];
          const moveResult = aiPlayer.makeMove(game.state.board, pieces);

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
            this.processMove(roomId, currentPlayer.id, move);
            
            // 通知外部
            game.onAIMove(roomId, move, game.state);
          } else {
            // AI 无法移动，结算
            this.settlePlayer(roomId, currentPlayer.id);
            game.onAISettle(roomId, currentPlayer.id);
          }
        }, thinkingTime);
      }
    }
  }

  // 启动回合计时器
  private startTurnTimer(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.turnTimeLimit <= 0) return;

    let timeLeft = game.turnTimeLimit;
    
    game.turnTimer = setInterval(() => {
      timeLeft--;
      game.onTimeUpdate(roomId, timeLeft);

      if (timeLeft <= 0) {
        this.clearTurnTimer(roomId);
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

  // 处理玩家断线
  handleDisconnect(roomId: string, playerId: string): { shouldSettle: boolean } {
    const game = this.games.get(roomId);
    if (!game) return { shouldSettle: false };

    // AI 玩家不会断线
    const player = game.players.find(p => p.id === playerId);
    if (!player || player.isAI) return { shouldSettle: false };

    // 将断线玩家标记为已结算
    if (!game.state.settledPlayers.includes(playerId)) {
      return { shouldSettle: true };
    }

    return { shouldSettle: false };
  }
}
