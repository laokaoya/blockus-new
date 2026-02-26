// AI玩家算法

import { Piece, Position, PlayerColor, AIStrategy, Player } from '../types/game';
import { SpecialTile, ItemCard, CreativePlayerState } from '../types/creative';
import { canPlacePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';
import { iterativeDeepeningSearch, type SearchState, type MoveEvaluator } from './minimaxSearch';

export type GamePhase = 'early' | 'mid' | 'late';

/** 盘面分析：对手扩张点、己方扩张点、威胁度、对手重心、己方簇数，供 AI 读盘 */
export interface BoardAnalysis {
  opponentExpansionSpots: Map<number, Set<string>>;  // colorIndex -> Set of "x,y"
  opponentCenters: Map<number, { cx: number; cy: number; count: number }>;  // 对手重心
  leadingOpponent: number;  // 领先者 colorIndex，0 表示无
  ourExpansionSpots: number;
  ourCellCount: number;
  ourClusterCount: number;  // 己方连通块数，>1 表示碎片化
  opponentCellCounts: Map<number, number>;
  threatLevel: number;  // 己方与对手边相邻的格子数
  ourRank: number;  // 己方排名 1-4，用于避免多名 AI 同时挤入领先者领地
}

export interface CreativeContext {
  specialTiles: SpecialTile[];
  hasShield: boolean;
  hasSteel: boolean;
  hasPurpleUpgrade: boolean;
  bonusScore: number;
  opponentScores: number[];
  myScore: number;
  turnNumber: number;
  itemCards: ItemCard[];
  allPlayersCreative: CreativePlayerState[];
  gamePhase: GamePhase;
  remainingPieces: number;
}

function determineGamePhase(turnNumber: number, remainingPieces: number, totalPieces: number): GamePhase {
  const usedRatio = 1 - (remainingPieces / totalPieces);
  if (turnNumber <= 5 && usedRatio < 0.2) return 'early';
  if (usedRatio > 0.65 || turnNumber > 30) return 'late';
  return 'mid';
}

export class AIPlayer {
  private color: PlayerColor;
  private colorIndex: number;
  private difficulty: 'easy' | 'medium' | 'hard';
  private strategy: AIStrategy;
  private humanColorIndices: Set<number>;
  
  constructor(color: PlayerColor, difficulty: 'easy' | 'medium' | 'hard' = 'medium', humanColors: PlayerColor | PlayerColor[] = [], strategy: AIStrategy = 'balanced') {
    this.color = color;
    this.colorIndex = this.getColorIndex(color);
    this.difficulty = difficulty;
    this.strategy = strategy;
    const arr = Array.isArray(humanColors) ? humanColors : (humanColors ? [humanColors] : []);
    this.humanColorIndices = new Set(arr.map(c => this.getColorIndex(c)));
  }
  
  public getColor(): PlayerColor {
    return this.color;
  }
  
  private getColorIndex(color: PlayerColor): number {
    const colorMap: { [key in PlayerColor]: number } = {
      red: 1, yellow: 2, blue: 3, green: 4
    };
    return colorMap[color];
  }
  
  /** 供 Minimax 使用的落子评估（经典模式） */
  public evaluateMove(board: number[][], piece: Piece, position: Position, gamePhase: GamePhase): number {
    return this.evaluatePositionFull(board, piece, position, null, gamePhase);
  }

  public makeMove(
    board: number[][],
    pieces: Piece[],
    fullState?: { players: Player[]; currentPlayerIndex: number; turnCount: number }
  ): { piece: Piece; position: Position } | null {
    const totalPieces = pieces.length;
    const remaining = pieces.filter(p => !p.isUsed).length;
    const classicPhase = determineGamePhase(totalPieces - remaining, remaining, totalPieces);
    return this.makeMoveInternal(board, pieces, null, classicPhase, fullState);
  }

  public makeMoveCreative(
    board: number[][],
    pieces: Piece[],
    context: CreativeContext,
  ): { piece: Piece; position: Position } | null {
    return this.makeMoveInternal(board, pieces, context, context.gamePhase);
  }

  private makeMoveInternal(
    board: number[][],
    pieces: Piece[],
    creativeCtx: CreativeContext | null,
    gamePhase: GamePhase,
    fullState?: { players: Player[]; currentPlayerIndex: number; turnCount: number },
  ): { piece: Piece; position: Position } | null {
    const availablePieces = pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return null;
    const turnNum = fullState?.turnCount ?? 0;

    // 每个 AI 最开始的两块：从五格拼图随机抽，选最向中心拓展的摆放
    const usedCount = pieces.length - availablePieces.length;
    if (!creativeCtx && usedCount < 2 && (this.difficulty === 'medium' || this.difficulty === 'hard')) {
      const earlyMove = this.getEarlyBestCenterMove(board, availablePieces);
      if (earlyMove) return earlyMove;
    }

    // 开局 2-3 轮（第 3 块起）：仅用五块、向中心拓展，纯随机
    if (!creativeCtx && turnNum <= 10 && usedCount >= 2 && (this.difficulty === 'medium' || this.difficulty === 'hard')) {
      const earlyMove = this.getEarlyRandomMove(board, availablePieces);
      if (earlyMove) return earlyMove;
    }

    // hard 难度 + 经典模式 + 有完整状态：使用 Minimax+Alpha-Beta，自适应深度
    if (
      this.difficulty === 'hard' &&
      !creativeCtx &&
      fullState &&
      fullState.players.length === 4
    ) {
      const remaining = pieces.filter(p => !p.isUsed).length;
      const turnNum = fullState.turnCount;
      let maxDepth = 3;
      let candidateLimit = 8;
      let deadlineMs = 3500;
      if (turnNum <= 8 || remaining > 15) {
        maxDepth = 2;
        candidateLimit = 6;
        deadlineMs = 2000;
      } else if (remaining <= 8) {
        maxDepth = 4;
        candidateLimit = 10;
        deadlineMs = 5000;  // 后期放宽到 5 秒
      }
      const searchState: SearchState = {
        board: board.map(r => [...r]),
        piecesByPlayer: fullState.players.map(p => p.pieces.map(pi => ({ ...pi }))),
        currentPlayerIndex: fullState.currentPlayerIndex,
        turnNumber: fullState.turnCount,
      };
      const evaluator: MoveEvaluator = (b, piece, pos, colorIdx, phase) =>
        colorIdx === this.colorIndex ? this.evaluateMove(b, piece, pos, phase) : 0;
      const move = iterativeDeepeningSearch(searchState, this.colorIndex, evaluator, maxDepth, candidateLimit, deadlineMs);
      if (move) return move;
    }
    
    const piecesByType: { [key: number]: Piece[] } = {};
    availablePieces.forEach(piece => {
      if (!piecesByType[piece.type]) piecesByType[piece.type] = [];
      piecesByType[piece.type].push(piece);
    });
    
    const pieceTypes = Object.keys(piecesByType).map(Number).sort((a, b) => b - a);

    const boardAnalysis = (this.difficulty === 'medium' || this.difficulty === 'hard') && !creativeCtx
      ? this.computeBoardAnalysis(board)
      : null;

    const allCandidates: Array<{ piece: Piece; score: number; bestMove: { piece: Piece; position: Position } }> = [];
    
    for (const pieceType of pieceTypes) {
      const piecesOfType = piecesByType[pieceType];
      
      for (const piece of piecesOfType) {
        const transformations = getUniqueTransformations(piece);
        let bestScore = -Infinity;
        let bestMove: { piece: Piece; position: Position } | null = null;
        
        for (const transformedPiece of transformations) {
          const positions = this.findAllPositions(board, transformedPiece);
          for (const pos of positions) {
            const score = this.evaluatePositionFull(board, transformedPiece, pos, creativeCtx, gamePhase, boardAnalysis);
            if (score > bestScore) {
              bestScore = score;
              bestMove = { piece: transformedPiece, position: pos };
            }
          }
        }
        
        if (bestMove) {
          allCandidates.push({ piece, score: bestScore, bestMove });
        }
      }
    }

    if (allCandidates.length === 0) return null;

    allCandidates.sort((a, b) => b.score - a.score);
    // 同分随机打乱，避免所有 AI 选同一块
    let i = 0;
    while (i < allCandidates.length) {
      let j = i + 1;
      while (j < allCandidates.length && allCandidates[j].score === allCandidates[i].score) j++;
      if (j - i > 1) {
        for (let k = j - 1; k > i; k--) {
          const r = i + Math.floor(Math.random() * (k - i + 1));
          [allCandidates[k], allCandidates[r]] = [allCandidates[r], allCandidates[k]];
        }
      }
      i = j;
    }

    switch (this.difficulty) {
      case 'easy': {
        const top = allCandidates.slice(0, Math.min(8, allCandidates.length));
        return top[Math.floor(Math.random() * top.length)].bestMove;
      }
      case 'medium': {
        const top = allCandidates.slice(0, Math.min(5, allCandidates.length));
        const idx = this.getWeightedRandomIndex(top.map(c => c.score));
        return top[idx].bestMove;
      }
      case 'hard': {
        const isEarly = gamePhase === 'early';
        const topN = isEarly ? 6 : 3;
        const top = allCandidates.slice(0, Math.min(topN, allCandidates.length));
        const weights = isEarly
          ? top.map((_, i) => [22, 20, 18, 16, 14, 10][i] ?? 1) // 开局更随机，避免所有 AI 选同一块
          : top.map((_, i) => [7, 2, 1][i] ?? 1); // 中后期 70/20/10
        const idx = this.getWeightedRandomIndex(weights);
        return top[idx].bestMove;
      }
      default: {
        const top = allCandidates.slice(0, Math.min(5, allCandidates.length));
        const idx = this.getWeightedRandomIndex(top.map(c => c.score));
        return top[idx].bestMove;
      }
    }
  }

  private findAllPositions(board: number[][], piece: Piece): Position[] {
    const positions: Position[] = [];
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (canPlacePiece(board, piece, { x, y }, this.colorIndex)) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  }

  /** 最开始两块：从五格拼图随机抽一块，找最向中心拓展的摆放 */
  private getEarlyBestCenterMove(board: number[][], availablePieces: Piece[]): { piece: Piece; position: Position } | null {
    const fiveBlocks = availablePieces.filter(p => p.type === 5);
    if (fiveBlocks.length === 0) return null;
    const picked = fiveBlocks[Math.floor(Math.random() * fiveBlocks.length)];
    let bestMove: { piece: Piece; position: Position } | null = null;
    let bestScore = -Infinity;
    const transformations = getUniqueTransformations(picked);
    for (const transformed of transformations) {
      const positions = this.findAllPositions(board, transformed);
      for (const pos of positions) {
        if (!this.isTowardCenter(transformed, pos, board.length)) continue;
        const score = this.getTowardCenterProgressScore(pos.x, pos.y, transformed.shape, board.length);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { piece: transformed, position: pos };
        }
      }
    }
    return bestMove;
  }

  /** 开局 2-3 轮（第 3 块起）：仅五块、向中心拓展，纯随机选取 */
  private getEarlyRandomMove(board: number[][], availablePieces: Piece[]): { piece: Piece; position: Position } | null {
    const fiveBlocks = availablePieces.filter(p => p.type === 5);
    if (fiveBlocks.length === 0) return null;
    const candidates: Array<{ piece: Piece; position: Position }> = [];
    for (const piece of fiveBlocks) {
      const transformations = getUniqueTransformations(piece);
      for (const transformed of transformations) {
        const positions = this.findAllPositions(board, transformed);
        for (const pos of positions) {
          if (this.isTowardCenter(transformed, pos, board.length)) {
            candidates.push({ piece: transformed, position: pos });
          }
        }
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /** 是否向中心拓展：拼图质心在己方角朝向棋盘中心的方向 */
  private isTowardCenter(piece: Piece, position: Position, boardSize: number): boolean {
    let sx = 0; let sy = 0; let n = 0;
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col] === 1) {
          sx += position.x + col;
          sy += position.y + row;
          n++;
        }
      }
    }
    if (n === 0) return false;
    const cx = sx / n; const cy = sy / n;
    switch (this.colorIndex) {
      case 1: return cx + cy >= 2;           // Red (0,0) -> 向 (center,center)
      case 2: return (boardSize - 1 - cx) + cy >= 2;   // Yellow
      case 3: return (boardSize - 1 - cx) + (boardSize - 1 - cy) >= 2;  // Blue
      case 4: return cx + (boardSize - 1 - cy) >= 2;   // Green
      default: return true;
    }
  }
  
  private evaluatePositionFull(
    board: number[][],
    piece: Piece,
    position: Position,
    creativeCtx: CreativeContext | null,
    gamePhase: GamePhase,
    boardAnalysis: BoardAnalysis | null = null,
  ): number {
    let score = 0;
    const { x, y } = position;
    const { shape } = piece;
    const weights = this.getDifficultyWeights(gamePhase, boardAnalysis);
    
    score += this.getCenterDistanceScore(x, y, board.length, shape) * weights.centerWeight;
    score += this.getTowardCenterProgressScore(x, y, shape, board.length) * weights.towardCenterProgressWeight;
    score += this.getTowardLeaderScore(x, y, shape, boardAnalysis) * weights.towardLeaderWeight;
    score += this.getSurroundingScore(board, x, y, shape) * weights.surroundingWeight;
    score += this.getConnectionScore(board, x, y, shape) * weights.connectionWeight;
    const expansionScore = this.getExpansionScore(board, x, y, shape);
    score += expansionScore * weights.expansionWeight;
    if (gamePhase === 'mid' && expansionScore < 4 && boardAnalysis) {
      score -= 25;  // 中期扩张不足时惩罚，避免自堵
    }
    score += this.getPieceSizeBonus(piece, gamePhase) * weights.pieceSizeWeight;
    score += this.getBlockHumanScore(board, x, y, shape) * weights.blockHumanWeight;
    score += this.getBlockOpponentExpansionScore(board, x, y, shape, boardAnalysis) * weights.blockOpponentWeight;
    score += this.getBlockingScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getEdgeControlScore(board, x, y, shape, gamePhase) * weights.edgeControlWeight;
    score += this.getInvasionScore(board, piece, x, y, shape, boardAnalysis) * weights.invasionWeight;
    score += this.getTerritoryConservationPenalty(board, x, y, shape, gamePhase) * weights.territoryWeight;
    score += this.getCompleteBlockScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getGapMinimizationPenalty(board, x, y, shape) * weights.gapWeight;

    // 阶段化：早期/中期避免过早用小块，优先大块扩张；残局允许小块填隙
    const cellCount = shape.reduce((sum, row) => sum + row.filter(c => c === 1).length, 0);
    if (gamePhase !== 'late') {
      if (cellCount <= 2) score -= 35;
      else if (cellCount <= 3) score -= 12;
    }
    // 保留桥块（1格、2格、3格折角）到中后期，可救命
    if (this.isBridgePiece(piece) && gamePhase !== 'late') {
      score -= gamePhase === 'early' ? 55 : 40;  // 早期强保留，中期适度保留
    }

    if (creativeCtx) {
      score += this.getSpecialTileScore(shape, position, creativeCtx) * weights.specialTileWeight;
      score += this.getBarrierProximityPenalty(board, x, y, shape, creativeCtx) * weights.barrierPenaltyWeight;
    }
    
    return score;
  }

  /** 是否桥块：1格、2格、3格折角(L形)，可填隙救命 */
  private isBridgePiece(piece: Piece): boolean {
    if (piece.type === 1 || piece.type === 2) return true;
    if (piece.type === 3 && piece.shape.length === 2) return true;  // 3格折角 [[1,1],[1,0]]
    return false;
  }

  private getMyCorner(boardSize: number): { x: number; y: number } {
    switch (this.colorIndex) {
      case 1: return { x: 0, y: 0 };
      case 2: return { x: boardSize - 1, y: 0 };
      case 3: return { x: boardSize - 1, y: boardSize - 1 };
      case 4: return { x: 0, y: boardSize - 1 };
      default: return { x: 0, y: 0 };
    }
  }

  /** 读盘：分析对手扩张点、己方扩张点、威胁度、对手重心 */
  private computeBoardAnalysis(board: number[][]): BoardAnalysis {
    const opponentExpansionSpots = new Map<number, Set<string>>();
    const opponentSums = new Map<number, { sx: number; sy: number; count: number }>();
    for (let c = 1; c <= 4; c++) {
      if (c === this.colorIndex) continue;
      opponentExpansionSpots.set(c, new Set());
      opponentSums.set(c, { sx: 0, sy: 0, count: 0 });
    }
    let ourExpansionSpots = 0;
    let ourCellCount = 0;
    let ourClusterCount = 0;
    const opponentCellCounts = new Map<number, number>();
    for (let c = 1; c <= 4; c++) {
      if (c !== this.colorIndex) opponentCellCounts.set(c, 0);
    }
    let threatLevel = 0;

    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const bs = board.length;

    for (let y = 0; y < bs; y++) {
      for (let x = 0; x < bs; x++) {
        const cell = board[y][x];
        if (cell === 0) continue;
        if (cell === this.colorIndex) {
          ourCellCount++;
          for (const [dx, dy] of edges) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < bs && ny >= 0 && ny < bs && board[ny][nx] > 0 && board[ny][nx] !== this.colorIndex) {
              threatLevel++;
              break;
            }
          }
          const counted = new Set<string>();
          for (const [dx, dy] of corners) {
            const cx = x + dx, cy = y + dy;
            if (cx < 0 || cx >= bs || cy < 0 || cy >= bs) continue;
            if (board[cy][cx] !== 0) continue;
            const key = `${cx},${cy}`;
            if (counted.has(key)) continue;
            const hasOurCorner = corners.some(([odx, ody]) => {
              const ox = cx + odx, oy = cy + ody;
              return ox >= 0 && ox < bs && oy >= 0 && oy < bs && board[oy][ox] === this.colorIndex;
            });
            const noOurEdge = edges.every(([ex, ey]) => {
              const ox = cx + ex, oy = cy + ey;
              if (ox < 0 || ox >= bs || oy < 0 || oy >= bs) return true;
              return board[oy][ox] !== this.colorIndex;
            });
            if (hasOurCorner && noOurEdge) {
              counted.add(key);
              ourExpansionSpots++;
            }
          }
        } else if (cell > 0) {
          opponentCellCounts.set(cell, (opponentCellCounts.get(cell) ?? 0) + 1);
          const sum = opponentSums.get(cell)!;
          sum.sx += x;
          sum.sy += y;
          sum.count++;
          const spots = opponentExpansionSpots.get(cell)!;
          const counted = new Set<string>();
          for (const [dx, dy] of corners) {
            const cx = x + dx, cy = y + dy;
            if (cx < 0 || cx >= bs || cy < 0 || cy >= bs) continue;
            if (board[cy][cx] !== 0) continue;
            const key = `${cx},${cy}`;
            if (counted.has(key)) continue;
            const hasOppCorner = corners.some(([odx, ody]) => {
              const ox = cx + odx, oy = cy + ody;
              return ox >= 0 && ox < bs && oy >= 0 && oy < bs && board[oy][ox] === cell;
            });
            const noOppEdge = edges.every(([ex, ey]) => {
              const ox = cx + ex, oy = cy + ey;
              if (ox < 0 || ox >= bs || oy < 0 || oy >= bs) return true;
              return board[oy][ox] === 0 || board[oy][ox] === cell;
            });
            if (hasOppCorner && noOppEdge) {
              counted.add(key);
              spots.add(key);
            }
          }
        }
      }
    }
    ourClusterCount = this.countClusters(board, this.colorIndex);
    const opponentCenters = new Map<number, { cx: number; cy: number; count: number }>();
    Array.from(opponentSums.entries()).forEach(([c, s]) => {
      if (s.count > 0) {
        opponentCenters.set(c, { cx: s.sx / s.count, cy: s.sy / s.count, count: s.count });
      }
    });
    let leadingOpponent = 0;
    let maxCount = 0;
    Array.from(opponentCellCounts.entries()).forEach(([c, n]) => {
      if (n > maxCount) {
        maxCount = n;
        leadingOpponent = c;
      }
    });
    const ourRank = 1 + Array.from(opponentCellCounts.values()).filter(n => n > ourCellCount).length;
    return { opponentExpansionSpots, opponentCenters, leadingOpponent, ourExpansionSpots, ourCellCount, ourClusterCount, opponentCellCounts, threatLevel, ourRank };
  }

  /** 统计己方连通块数（边相邻） */
  private countClusters(board: number[][], colorIndex: number): number {
    const bs = board.length;
    const visited = new Set<string>();
    let clusters = 0;
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const dfs = (x: number, y: number) => {
      const key = `${x},${y}`;
      if (visited.has(key)) return;
      if (x < 0 || x >= bs || y < 0 || y >= bs || board[y][x] !== colorIndex) return;
      visited.add(key);
      for (const [dx, dy] of edges) {
        dfs(x + dx, y + dy);
      }
    };
    for (let y = 0; y < bs; y++) {
      for (let x = 0; x < bs; x++) {
        if (board[y][x] === colorIndex && !visited.has(`${x},${y}`)) {
          clusters++;
          dfs(x, y);
        }
      }
    }
    return clusters;
  }

  /** 阻挡对手扩张点：占据对手可落子的角位；关口/重心/中心加成 */
  private getBlockOpponentExpansionScore(
    board: number[][], x: number, y: number, shape: number[][],
    analysis: BoardAnalysis | null
  ): number {
    if (!analysis || this.difficulty === 'easy') return 0;
    const bs = board.length;
    const boardCenter = (bs - 1) / 2;
    let blockValue = 0;
    Array.from(analysis.opponentExpansionSpots.entries()).forEach(([colorIdx, spots]) => {
      if (spots.size === 0) return;
      const humanBonus = this.humanColorIndices.has(colorIdx) ? 1.4 : 1.0;
      const gatewayBonus = spots.size <= 5 ? 1 + 0.6 * (1 - spots.size / 6) : 1;  // 关口：对手扩张点少时阻挡更值
      const center = analysis.opponentCenters.get(colorIdx);
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] === 0) continue;
          const bx = x + col, by = y + row;
          const key = `${bx},${by}`;
          if (spots.has(key)) {
            let spotValue = 22 * humanBonus * gatewayBonus;
            if (center) {
              const dist = Math.hypot(bx - center.cx, by - center.cy);
              const proximityBonus = Math.max(0, 1 - dist / (bs * 0.7));
              spotValue *= (1 + 0.4 * proximityBonus);  // 靠近对手重心多 40% 加分
            }
            const distToCenter = Math.hypot(bx - boardCenter, by - boardCenter);
            const centerControlBonus = Math.max(0, 1 - distToCenter / (bs * 0.6));
            spotValue *= (1 + 0.25 * centerControlBonus);  // 靠近棋盘中心多 25% 加分
            blockValue += Math.round(spotValue);
          }
        }
      }
    });
    return blockValue;
  }

  private isUnderThreat(board: number[][]): boolean {
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x] !== this.colorIndex) continue;
        for (const [dx, dy] of edges) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < board.length && ny >= 0 && ny < board[0].length) {
            const cell = board[ny][nx];
            if (cell > 0 && cell !== this.colorIndex) return true;
          }
        }
      }
    }
    return false;
  }

  /** 侵入对手领地：对角接触对手即加分；接触真人/领先者额外加分 */
  private getInvasionScore(board: number[][], piece: Piece, x: number, y: number, shape: number[][], analysis: BoardAnalysis | null = null): number {
    let totalInvasion = 0;
    let humanInvasion = 0;
    let leaderInvasion = 0;
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const counted = new Set<string>();
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        for (const [dx, dy] of corners) {
          const cx = bx + dx, cy = by + dy;
          if (cx < 0 || cx >= board.length || cy < 0 || cy >= board[0].length) continue;
          const cell = board[cy][cx];
          if (cell <= 0 || cell === this.colorIndex) continue;
          const key = `${cx},${cy}`;
          if (counted.has(key)) continue;
          counted.add(key);
          totalInvasion += 18;
          if (this.humanColorIndices.has(cell)) {
            humanInvasion += 28;
          } else if (analysis && analysis.leadingOpponent === cell) {
            leaderInvasion += 15;  // 针对领先者侵入
          }
        }
      }
    }
    return totalInvasion + humanInvasion + leaderInvasion;
  }

  /** 阻挡真人：占据真人可落子的角位，使其无法扩张 */
  private getBlockHumanScore(board: number[][], x: number, y: number, shape: number[][]): number {
    if (this.humanColorIndices.size === 0) return 0;
    const tempBoard = board.map(r => [...r]);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) tempBoard[y + row][x + col] = this.colorIndex;
      }
    }
    let blockValue = 0;
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const counted = new Set<string>();
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        for (const [dx, dy] of corners) {
          const cx = bx + dx, cy = by + dy;
          const key = `${cx},${cy}`;
          if (counted.has(key)) continue;
          if (cx < 0 || cx >= board.length || cy < 0 || cy >= board[0].length) continue;
          if (tempBoard[cy][cx] !== 0) continue;
          const hasHumanCorner = corners.some(([odx, ody]) => {
            const ox = cx + odx, oy = cy + ody;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return false;
            return this.humanColorIndices.has(tempBoard[oy][ox]);
          });
          const noHumanEdge = edges.every(([ex, ey]) => {
            const ox = cx + ex, oy = cy + ey;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return true;
            return tempBoard[oy][ox] !== this.colorIndex;
          });
          if (hasHumanCorner && noHumanEdge) {
            counted.add(key);
            blockValue += 30;
          }
        }
      }
    }
    return blockValue;
  }

  /** 领地保守：己方领地未被侵犯时，不急于填充；强化惩罚鼓励向中心/对手方向扩张 */
  private getTerritoryConservationPenalty(board: number[][], x: number, y: number, shape: number[][], gamePhase: GamePhase): number {
    if (this.isUnderThreat(board)) return 0;
    const boardSize = board.length;
    const myCorner = this.getMyCorner(boardSize);
    let inOwnTerritory = 0;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        const distToCorner = Math.abs(bx - myCorner.x) + Math.abs(by - myCorner.y);
        if (distToCorner <= 8) inOwnTerritory++;
      }
    }
    if (inOwnTerritory === 0) return 0;
    const totalCells = shape.flat().filter(c => c === 1).length;
    if (inOwnTerritory < totalCells) return 0;
    return -50 * (gamePhase === 'early' ? 1.5 : gamePhase === 'mid' ? 1.0 : 0.5);
  }

  /** 向领先者推进：落子越靠近领先者重心，侵入意图越强 */
  private getTowardLeaderScore(x: number, y: number, shape: number[][], analysis: BoardAnalysis | null): number {
    if (!analysis || !analysis.leadingOpponent) return 0;
    const center = analysis.opponentCenters.get(analysis.leadingOpponent);
    if (!center) return 0;
    let sumDist = 0;
    let count = 0;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        sumDist += Math.hypot(bx - center.cx, by - center.cy);
        count++;
      }
    }
    if (count === 0) return 0;
    const avgDist = sumDist / count;
    const maxDist = 20 * 1.5;
    return Math.max(0, (maxDist - avgDist) * 2);  // 越近领先者重心分越高
  }

  /** 向中心推进：离己方角落越远加分越多，鼓励侵入和扩张 */
  private getTowardCenterProgressScore(x: number, y: number, shape: number[][], boardSize: number): number {
    const myCorner = this.getMyCorner(boardSize);
    let sumDist = 0, count = 0;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        sumDist += Math.abs(bx - myCorner.x) + Math.abs(by - myCorner.y);
        count++;
      }
    }
    if (count === 0) return 0;
    return (sumDist / count) * 4;
  }

  /** 完全阻挡：对手试图侵犯时，优先封死其所有入口 */
  private getCompleteBlockScore(board: number[][], x: number, y: number, shape: number[][]): number {
    if (!this.isUnderThreat(board)) return 0;
    let blockValue = 0;
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        for (const [dx, dy] of corners) {
          const cx = bx + dx, cy = by + dy;
          if (cx < 0 || cx >= board.length || cy < 0 || cy >= board[0].length) continue;
          if (board[cy][cx] !== 0) continue;
          const hasOpponentCorner = corners.some(([odx, ody]) => {
            const ox = cx + odx, oy = cy + ody;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return false;
            return board[oy][ox] > 0 && board[oy][ox] !== this.colorIndex;
          });
          const noOpponentEdge = edges.every(([ex, ey]) => {
            const ox = cx + ex, oy = cy + ey;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return true;
            return board[oy][ox] === 0 || board[oy][ox] === this.colorIndex;
          });
          if (hasOpponentCorner && noOpponentEdge) blockValue += 35;
        }
      }
    }
    return blockValue;
  }

  /** 减少留给对手的空隙：惩罚制造大量可被对手利用的角连接点 */
  private getGapMinimizationPenalty(board: number[][], x: number, y: number, shape: number[][]): number {
    const tempBoard = board.map(r => [...r]);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) tempBoard[y + row][x + col] = this.colorIndex;
      }
    }
    let dangerousGaps = 0;
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const counted = new Set<string>();
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col, by = y + row;
        for (const [dx, dy] of corners) {
          const cx = bx + dx, cy = by + dy;
          const key = `${cx},${cy}`;
          if (counted.has(key)) continue;
          if (cx < 0 || cx >= board.length || cy < 0 || cy >= board[0].length) continue;
          if (tempBoard[cy][cx] !== 0) continue;
          const hasOpponentCorner = corners.some(([odx, ody]) => {
            const ox = cx + odx, oy = cy + ody;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return false;
            return tempBoard[oy][ox] > 0 && tempBoard[oy][ox] !== this.colorIndex;
          });
          const noOurEdge = edges.every(([ex, ey]) => {
            const ox = cx + ex, oy = cy + ey;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return true;
            return tempBoard[oy][ox] !== this.colorIndex;
          });
          if (hasOpponentCorner && noOurEdge) {
            counted.add(key);
            dangerousGaps++;
          }
        }
      }
    }
    return -dangerousGaps * 8;
  }

  /** 阶段化策略：不区分策略类型，根据 gamePhase 动态调整
   * early: 扩张+针对真人；mid: 封堵+侵入；late: 平衡 */
  private getPhaseMultipliers(gamePhase: GamePhase) {
    switch (gamePhase) {
      case 'early':
        return { expansion: 2.2, blockHuman: 1.8, towardCenter: 1.6, invasion: 0.4, blocking: 0.2, pieceSize: 1.5, center: 1.2 };
      case 'mid':
        return { expansion: 1.2, blockHuman: 1.2, towardCenter: 1.8, invasion: 2.0, blocking: 1.6, pieceSize: 1.0, center: 1.0 };
      case 'late':
        return { expansion: 1.0, blockHuman: 1.0, towardCenter: 1.2, invasion: 1.2, blocking: 1.0, pieceSize: 0.6, center: 0.5 };
    }
  }

  private getDifficultyWeights(gamePhase: GamePhase, boardAnalysis: BoardAnalysis | null = null) {
    const pm = this.getPhaseMultipliers(gamePhase);

    let expandBoost = 1;
    let blockBoost = 1;
    let invadeBoost = 1;
    let connectionBoost = 1;
    if (boardAnalysis && this.difficulty !== 'easy') {
      const totalOppSpots = Array.from(boardAnalysis.opponentExpansionSpots.values()).reduce((s, set) => s + set.size, 0);
      if (boardAnalysis.ourExpansionSpots < totalOppSpots * 0.7) expandBoost = 1.3;
      if (boardAnalysis.threatLevel > 3) blockBoost = 1.4;
      if (boardAnalysis.threatLevel > 6) {
        blockBoost = 1.7;
        connectionBoost = 1.4;  // 威胁大时强化连接，避免被分割
      }
      if (boardAnalysis.ourClusterCount > 1) {
        connectionBoost = Math.max(connectionBoost, 1.3 + 0.2 * (boardAnalysis.ourClusterCount - 1));  // 碎片化时强化连接
      }
      const maxOppCells = Math.max(0, ...Array.from(boardAnalysis.opponentCellCounts.values()));
      if (maxOppCells > boardAnalysis.ourCellCount) invadeBoost = 1.25;
    }

    // 3、4 名 AI 不挤入领先者领地，避免多人围攻反而给领先者创造扩张机会
    const leaderCrowdFactor = boardAnalysis && boardAnalysis.ourRank >= 3 ? 0.25 : 1;

    const base = (w: number, boost: number) => w * boost;
    switch (this.difficulty) {
      case 'easy':
        return {
          centerWeight: 0.3 * pm.center,
          towardCenterProgressWeight: 0.3 * pm.towardCenter,
          towardLeaderWeight: 0,
          surroundingWeight: 0.3,
          connectionWeight: 0.3,
          expansionWeight: 0.25 * pm.expansion,
          pieceSizeWeight: 0.35 * pm.pieceSize,
          blockHumanWeight: 0.25 * pm.blockHuman,
          blockOpponentWeight: 0,
          blockingWeight: 0.05 * pm.blocking,
          invasionWeight: 0.1 * pm.invasion,
          territoryWeight: 0.0,
          gapWeight: 0.0,
          specialTileWeight: 0.3,
          edgeControlWeight: 0.0,
          barrierPenaltyWeight: 0.2,
        };
      case 'medium':
        return {
          centerWeight: 0.5 * pm.center,
          towardCenterProgressWeight: 1.2 * pm.towardCenter,
          towardLeaderWeight: 0.4 * invadeBoost * leaderCrowdFactor,
          surroundingWeight: 0.8,
          connectionWeight: 1.0 * connectionBoost,
          expansionWeight: base(2.8 * pm.expansion, expandBoost),
          pieceSizeWeight: 0.6 * pm.pieceSize,
          blockHumanWeight: 1.4 * pm.blockHuman,
          blockOpponentWeight: 1.2 * leaderCrowdFactor,
          blockingWeight: base(0.5 * pm.blocking, blockBoost),
          invasionWeight: base(1.0 * pm.invasion, invadeBoost) * leaderCrowdFactor,
          territoryWeight: 0.4,
          gapWeight: 0.5,
          specialTileWeight: 1.0,
          edgeControlWeight: 0.5,
          barrierPenaltyWeight: 0.5,
        };
      case 'hard':
        return {
          centerWeight: 0.7 * pm.center,
          towardCenterProgressWeight: 2.0 * pm.towardCenter,
          towardLeaderWeight: 0.7 * invadeBoost * leaderCrowdFactor,
          surroundingWeight: 1.0,
          connectionWeight: 1.2 * connectionBoost,
          expansionWeight: base(3.8 * pm.expansion, expandBoost),
          pieceSizeWeight: 0.8 * pm.pieceSize,
          blockHumanWeight: 2.0 * pm.blockHuman,
          blockOpponentWeight: 1.6 * leaderCrowdFactor,
          blockingWeight: base(0.9 * pm.blocking, blockBoost),
          invasionWeight: base(2.0 * pm.invasion, invadeBoost) * leaderCrowdFactor,
          territoryWeight: 0.8,
          gapWeight: 0.8,
          specialTileWeight: 1.8,
          edgeControlWeight: 0.7,
          barrierPenaltyWeight: 0.8,
        };
      default:
        return {
          centerWeight: 0.5 * pm.center,
          towardCenterProgressWeight: 1.2 * pm.towardCenter,
          towardLeaderWeight: 0.4,
          surroundingWeight: 0.8,
          connectionWeight: 1.0,
          expansionWeight: 2.8 * pm.expansion,
          pieceSizeWeight: 0.6 * pm.pieceSize,
          blockHumanWeight: 1.4 * pm.blockHuman,
          blockOpponentWeight: 1.2,
          blockingWeight: 0.5 * pm.blocking,
          invasionWeight: 1.0 * pm.invasion,
          territoryWeight: 0.4,
          gapWeight: 0.5,
          specialTileWeight: 1.0,
          edgeControlWeight: 0.5,
          barrierPenaltyWeight: 0.5,
        };
    }
  }

  private getCenterDistanceScore(x: number, y: number, boardSize: number, shape?: number[][]): number {
    let cx = x, cy = y;
    if (shape) {
      let sumX = 0, sumY = 0, count = 0;
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] === 1) {
            sumX += x + col;
            sumY += y + row;
            count++;
          }
        }
      }
      if (count > 0) {
        cx = sumX / count;
        cy = sumY / count;
      }
    }
    const centerX = (boardSize - 1) / 2;
    const centerY = (boardSize - 1) / 2;
    const distanceToCenter = Math.sqrt(Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2));
    const maxDistance = Math.sqrt(Math.pow(boardSize / 2, 2) * 2);
    return Math.max(0, (maxDistance - distanceToCenter)) * 20;
  }
  
  private getSurroundingScore(board: number[][], x: number, y: number, shape: number[][]): number {
    let score = 0;
    const checked = new Set<string>();

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const boardX = x + col;
        const boardY = y + row;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const cx = boardX + dx;
            const cy = boardY + dy;
            const key = `${cx},${cy}`;
            if (checked.has(key)) continue;
            checked.add(key);
            
            if (cx >= 0 && cx < board.length && cy >= 0 && cy < board[0].length) {
              const cell = board[cy][cx];
              if (cell === 0) score += 3;
              else if (cell === this.colorIndex) score += 1;
              else if (cell > 0) score -= 2;
            }
          }
        }
      }
    }
    
    return score;
  }
  
  private getConnectionScore(board: number[][], x: number, y: number, shape: number[][]): number {
    let score = 0;
    const corners = [
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ];
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const boardX = x + col;
        const boardY = y + row;
        
        for (const corner of corners) {
          const cx = boardX + corner.dx;
          const cy = boardY + corner.dy;
          if (cx >= 0 && cx < board.length && cy >= 0 && cy < board[0].length) {
            if (board[cy][cx] === this.colorIndex) {
              score += 8;
            }
          }
        }
      }
    }
    
    return score;
  }

  private getExpansionScore(board: number[][], x: number, y: number, shape: number[][]): number {
    const tempBoard = board.map(row => [...row]);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          tempBoard[y + row][x + col] = this.colorIndex;
        }
      }
    }

    let newCornerSpots = 0;
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const counted = new Set<string>();

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col;
        const by = y + row;

        for (const [dx, dy] of corners) {
          const cx = bx + dx;
          const cy = by + dy;
          const key = `${cx},${cy}`;
          if (counted.has(key)) continue;
          if (cx < 0 || cx >= board.length || cy < 0 || cy >= board[0].length) continue;
          if (tempBoard[cy][cx] !== 0) continue;

          // Barrier cells (marked -1) reduce expansion value
          if (board[cy]?.[cx] === -1) continue;

          const hasEdgeConflict = edges.some(([ex, ey]) => {
            const nx = cx + ex, ny = cy + ey;
            return nx >= 0 && nx < board.length && ny >= 0 && ny < board[0].length && tempBoard[ny][nx] === this.colorIndex;
          });
          if (hasEdgeConflict) continue;

          counted.add(key);
          newCornerSpots++;
        }
      }
    }

    return newCornerSpots * 8;
  }

  private getPieceSizeBonus(piece: Piece, gamePhase: GamePhase): number {
    let cellCount = 0;
    for (const row of piece.shape) {
      for (const cell of row) {
        if (cell === 1) cellCount++;
      }
    }
    // Early game: strongly prefer large pieces. Late game: small pieces are fine.
    const phaseBonus = gamePhase === 'early' ? 8 : gamePhase === 'mid' ? 5 : 3;
    return cellCount * phaseBonus;
  }

  private getBlockingScore(board: number[][], x: number, y: number, shape: number[][]): number {
    let blockCount = 0;
    const edges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col;
        const by = y + row;

        for (const [dx, dy] of edges) {
          const nx = bx + dx;
          const ny = by + dy;
          if (nx < 0 || nx >= board.length || ny < 0 || ny >= board[0].length) continue;
          const cell = board[ny][nx];
          if (cell > 0 && cell !== this.colorIndex) {
            blockCount++;
          }
        }

        // Also check if we're cutting off opponent corner connection points
        for (const [dx, dy] of corners) {
          const cx = bx + dx;
          const cy = by + dy;
          if (cx < 0 || cx >= board.length || cy < 0 || cy >= board[0].length) continue;
          if (board[cy][cx] !== 0) continue;
          // Check if this empty corner was reachable by an opponent
          const adjEdges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          const hasOpponentCorner = corners.some(([odx, ody]) => {
            const ox = cx + odx, oy = cy + ody;
            if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return false;
            return board[oy][ox] > 0 && board[oy][ox] !== this.colorIndex;
          });
          if (hasOpponentCorner) {
            const noOpponentEdge = adjEdges.every(([ex, ey]) => {
              const ox = cx + ex, oy = cy + ey;
              if (ox < 0 || ox >= board.length || oy < 0 || oy >= board[0].length) return true;
              return board[oy][ox] === 0 || board[oy][ox] === this.colorIndex;
            });
            if (noOpponentEdge) blockCount += 0.5;
          }
        }
      }
    }

    return blockCount * 4;
  }

  // Edge control: reward extending along board edges for efficient territory control
  private getEdgeControlScore(board: number[][], x: number, y: number, shape: number[][], gamePhase: GamePhase): number {
    if (gamePhase === 'early') return 0;
    
    let edgeCells = 0;
    const boardSize = board.length;
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col;
        const by = y + row;
        if (bx <= 1 || bx >= boardSize - 2 || by <= 1 || by >= boardSize - 2) {
          edgeCells++;
        }
      }
    }
    
    return edgeCells * 3;
  }

  // Barrier proximity: penalize placing near barriers to avoid fragmented territory
  private getBarrierProximityPenalty(
    board: number[][],
    x: number,
    y: number,
    shape: number[][],
    ctx: CreativeContext,
  ): number {
    let penalty = 0;
    const barriers = ctx.specialTiles.filter(t => t.type === 'barrier' && !t.used);
    if (barriers.length === 0) return 0;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = x + col;
        const by = y + row;
        
        for (const barrier of barriers) {
          const dist = Math.abs(bx - barrier.x) + Math.abs(by - barrier.y);
          if (dist === 1) penalty -= 5;
          else if (dist === 2) penalty -= 2;
        }
      }
    }
    
    return penalty;
  }

  private getSpecialTileScore(
    shape: number[][],
    position: Position,
    ctx: CreativeContext,
  ): number {
    let score = 0;
    const { specialTiles, hasShield, hasSteel, myScore, opponentScores, gamePhase, itemCards } = ctx;
    const maxOpponentScore = opponentScores.length > 0 ? Math.max(...opponentScores) : 0;
    const scoreDiff = myScore - maxOpponentScore;
    const isLeading = scoreDiff > 0;
    const isBehind = scoreDiff < -5;
    const isFarBehind = scoreDiff < -15;

    const hasRedNearby = this.hasNearbyTileType(shape, position, specialTiles, 'red', 3);
    const hasSteelCard = itemCards.some(c => c.cardType === 'item_steel');

    let tilesHit = 0;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = position.x + col;
        const by = position.y + row;

        const tile = specialTiles.find(t => t.x === bx && t.y === by && !t.used);
        if (!tile) continue;

        tilesHit++;

        switch (tile.type) {
          case 'gold': {
            let goldValue = 50;
            if (isFarBehind) goldValue = 100;
            else if (isBehind) goldValue = 80;
            if (ctx.hasPurpleUpgrade) goldValue += 10;
            if (gamePhase === 'late') goldValue += 15;
            score += goldValue;
            break;
          }
          case 'purple': {
            if (ctx.hasPurpleUpgrade) {
              score += isBehind ? 75 : 50;
            } else if (hasShield || hasSteel) {
              score += 35;
            } else {
              // Risk vs reward based on score position
              if (isFarBehind) score += 35;
              else if (isBehind) score += 25;
              else if (isLeading) score += 8;
              else score += 15;
            }
            break;
          }
          case 'red': {
            if (hasSteel) {
              score += 70;
            } else if (hasSteelCard) {
              // We have a steel card we can use next turn, so red is less scary
              score += 40;
            } else if (hasShield) {
              score += 35;
            } else {
              if (isLeading && scoreDiff > 10) score += 20;
              else if (isLeading) score += 10;
              else score -= 15;
            }
            break;
          }
          case 'barrier':
            score -= 1000;
            break;
        }
      }
    }

    // Combo bonus: hitting multiple special tiles in one move
    if (tilesHit >= 2) {
      score += tilesHit * 15;
    }

    // Proximity bonus: reward being near unclaimed special tiles (for future moves)
    if (this.difficulty !== 'easy') {
      const proximityRange = this.difficulty === 'hard' ? 4 : 3;
      const untouched = specialTiles.filter(t => !t.used && t.type !== 'barrier');
      const checkedTiles = new Set<string>();

      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] === 0) continue;
          const bx = position.x + col;
          const by = position.y + row;

          for (const tile of untouched) {
            const tileKey = `${tile.x},${tile.y}`;
            if (checkedTiles.has(tileKey)) continue;

            const dist = Math.abs(bx - tile.x) + Math.abs(by - tile.y);
            if (dist > 0 && dist <= proximityRange) {
              checkedTiles.add(tileKey);
              const proximityBase = (proximityRange + 1 - dist);
              
              if (tile.type === 'gold') {
                score += proximityBase * 4;
              } else if (tile.type === 'purple') {
                const purpleProx = ctx.hasPurpleUpgrade ? 3 : 1.5;
                score += proximityBase * purpleProx;
              } else if (tile.type === 'red' && (hasSteel || hasSteelCard)) {
                score += proximityBase * 2;
              }
            }
          }
        }
      }
    }

    return score;
  }

  private hasNearbyTileType(
    shape: number[][],
    position: Position,
    tiles: SpecialTile[],
    type: string,
    range: number,
  ): boolean {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        const bx = position.x + col;
        const by = position.y + row;
        for (const tile of tiles) {
          if (tile.type !== type || tile.used) continue;
          if (Math.abs(bx - tile.x) + Math.abs(by - tile.y) <= range) return true;
        }
      }
    }
    return false;
  }

  public shouldSettle(board: number[][], pieces: Piece[]): boolean {
    const availablePieces = pieces.filter(p => !p.isUsed);
    for (const piece of availablePieces) {
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          if (canPlacePiece(board, piece, { x, y }, this.colorIndex)) {
            return false;
          }
        }
      }
    }
    return true;
  }
  
  private getWeightedRandomIndex(scores: number[]): number {
    if (scores.length === 0) return 0;
    const minScore = Math.min(...scores);
    const shifted = scores.map(s => s - minScore + 1);
    const totalWeight = shifted.reduce((sum, s) => sum + s, 0);
    if (totalWeight <= 0) return Math.floor(Math.random() * scores.length);
    
    const random = Math.random() * totalWeight;
    let current = 0;
    for (let i = 0; i < shifted.length; i++) {
      current += shifted[i];
      if (random <= current) return i;
    }
    return scores.length - 1;
  }
}
