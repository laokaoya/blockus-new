// AI玩家算法

import { Piece, Position, PlayerColor, AIStrategy } from '../types';
import { canPlacePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';
import { overlapsBarrier, pieceCellCount, findTriggeredTiles } from './creativeModeEngine';
import type { SpecialTile } from './creativeTypes';

export type GamePhase = 'early' | 'mid' | 'late';

interface BoardAnalysis {
  opponentExpansionSpots: Map<number, Set<string>>;
  opponentCenters: Map<number, { cx: number; cy: number; count: number }>;
  leadingOpponent: number;
  ourExpansionSpots: number;
  ourCellCount: number;
  ourClusterCount: number;
  opponentCellCounts: Map<number, number>;
  threatLevel: number;
}

export class AIPlayer {
  private color: PlayerColor;
  private colorIndex: number;
  private difficulty: 'easy' | 'medium' | 'hard';
  private strategy: AIStrategy;
  private humanColorIndices: Set<number>;

  constructor(color: PlayerColor, difficulty: 'easy' | 'medium' | 'hard' = 'medium', humanColors: PlayerColor[] = [], strategy: AIStrategy = 'balanced') {
    this.color = color;
    this.colorIndex = this.getColorIndex(color);
    this.difficulty = difficulty;
    this.strategy = strategy;
    this.humanColorIndices = new Set((humanColors || []).map(c => this.getColorIndex(c)));
  }
  
  // 公共方法：获取颜色
  public getColor(): PlayerColor {
    return this.color;
  }
  
  // 获取颜色对应的索引
  private getColorIndex(color: PlayerColor): number {
    const colorMap: { [key in PlayerColor]: number } = {
      red: 1,
      yellow: 2,
      blue: 3,
      green: 4
    };
    return colorMap[color];
  }
  
  /** 创意模式落子：过滤屏障格、big_piece_ban 限制
   * @param excludeMoves 排除的落子列表（重试时传入所有已失败的落子） */
  public makeMoveCreative(
    board: number[][],
    pieces: Piece[],
    specialTiles: SpecialTile[],
    hasBigPieceBan: boolean,
    excludeMoves?: Array<{ pieceId: string; position: Position }>,
  ): { piece: Piece; position: Position } | null {
    let availablePieces = pieces.filter(p => !p.isUsed);
    if (hasBigPieceBan) {
      availablePieces = availablePieces.filter(p => pieceCellCount(p.shape) <= 4);
    }
    if (availablePieces.length === 0) return null;

    const pieceTypes = [...new Set(availablePieces.map(p => p.type))].sort((a, b) => b - a);
    for (const pieceType of pieceTypes) {
      const piecesOfType = availablePieces.filter(p => p.type === pieceType);
      const scoredPieces = piecesOfType.map(piece => {
        const transformations = getUniqueTransformations(piece);
        let bestScore = -Infinity;
        let bestMove: { piece: Piece; position: Position } | null = null;
        for (const transformedPiece of transformations) {
          const position = this.findBestPositionCreative(board, transformedPiece, specialTiles);
          if (position) {
            const score = this.evaluatePositionCreative(board, transformedPiece, position, specialTiles);
            if (score > bestScore) {
              bestScore = score;
              bestMove = { piece: transformedPiece, position };
            }
          }
        }
        return { piece, score: bestScore, bestMove };
      }).filter(item => item.bestMove !== null);

      if (scoredPieces.length === 0) continue;
      scoredPieces.sort((a, b) => b.score - a.score);
      for (let si = 0; si < scoredPieces.length; ) {
        let sj = si + 1;
        while (sj < scoredPieces.length && scoredPieces[sj].score === scoredPieces[si].score) sj++;
        if (sj - si > 1) {
          for (let k = sj - 1; k > si; k--) {
            const r = si + Math.floor(Math.random() * (k - si + 1));
            [scoredPieces[k], scoredPieces[r]] = [scoredPieces[r], scoredPieces[k]];
          }
        }
        si = sj;
      }
      let topChoices = scoredPieces.slice(0, Math.min(5, scoredPieces.length));
      if (excludeMoves?.length) {
        topChoices = topChoices.filter(c =>
          !excludeMoves!.some(ex =>
            c.bestMove!.piece.id === ex.pieceId &&
            c.bestMove!.position.x === ex.position.x &&
            c.bestMove!.position.y === ex.position.y
          )
        );
      }
      if (topChoices.length === 0) continue;
      const weights = this.difficulty === 'hard'
        ? topChoices.slice(0, 3).map((_, i) => [7, 2, 1][i] ?? 1) // 70% 20% 10%
        : topChoices.map(c => c.score);
      const idx = this.getWeightedRandomIndex(weights);
      return topChoices[idx].bestMove;
    }
    return null;
  }

  private findBestPositionCreative(
    board: number[][],
    piece: Piece,
    specialTiles: SpecialTile[],
  ): Position | null {
    const positions: Position[] = [];
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (canPlacePiece(board, piece, { x, y }, this.colorIndex) &&
            !overlapsBarrier(piece.shape, { x, y }, specialTiles)) {
          positions.push({ x, y });
        }
      }
    }
    if (positions.length === 0) return null;
    const scored = positions.map(pos => ({
      position: pos,
      score: this.evaluatePositionCreative(board, piece, pos, specialTiles),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].position;
  }

  /** 创意模式：评估位置，含特殊格触发加分（金+20 紫+10 红+5） */
  private evaluatePositionCreative(board: number[][], piece: Piece, position: Position, specialTiles: SpecialTile[]): number {
    let score = this.evaluatePosition(board, piece, position, 'mid');
    const triggered = findTriggeredTiles(piece.shape, position, specialTiles);
    for (const t of triggered) {
      if (t.type === 'gold') score += 20;
      else if (t.type === 'purple') score += 10;
      else if (t.type === 'red') score += 5;
    }
    return score;
  }

  // AI的主要决策函数：综合评分所有可放置位置，选择最优
  public makeMove(board: number[][], pieces: Piece[]): { piece: Piece; position: Position } | null {
    const availablePieces = pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return null;

    const totalPieces = pieces.length;
    const remaining = availablePieces.length;
    const usedRatio = 1 - remaining / totalPieces;
    const gamePhase: 'early' | 'mid' | 'late' = usedRatio < 0.2 ? 'early' : usedRatio > 0.65 ? 'late' : 'mid';

    const boardAnalysis = (this.difficulty === 'medium' || this.difficulty === 'hard')
      ? this.computeBoardAnalysis(board)
      : null;

    const allCandidates: Array<{ piece: Piece; score: number; bestMove: { piece: Piece; position: Position } }> = [];

    for (const piece of availablePieces) {
      const transformations = getUniqueTransformations(piece);
      let bestScore = -Infinity;
      let bestMove: { piece: Piece; position: Position } | null = null;

      for (const transformedPiece of transformations) {
        const positions = this.findAllPositions(board, transformedPiece);
        for (const pos of positions) {
          const score = this.evaluatePosition(board, transformedPiece, pos, gamePhase, boardAnalysis);
          if (score > bestScore) {
            bestScore = score;
            bestMove = { piece: transformedPiece, position: pos };
          }
        }
      }

      if (bestMove) allCandidates.push({ piece, score: bestScore, bestMove });
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
  
  // 寻找最佳放置位置（创意模式等仍可能调用）
  private findBestPosition(board: number[][], piece: Piece): Position | null {
    const positions = this.findAllPositions(board, piece);
    if (positions.length === 0) return null;
    const gamePhase: 'early' | 'mid' | 'late' = 'mid';
    const scored = positions.map(pos => ({
      position: pos,
      score: this.evaluatePosition(board, piece, pos, gamePhase),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].position;
  }

  // 评估位置分数
  private evaluatePosition(board: number[][], piece: Piece, position: Position, gamePhase: GamePhase, boardAnalysis: BoardAnalysis | null = null): number {
    let score = 0;
    const { x, y } = position;
    const { shape } = piece;
    const weights = this.getDifficultyWeights(gamePhase, boardAnalysis);

    score += this.getCenterDistanceScore(x, y, board.length, shape) * weights.centerWeight;
    score += this.getTowardCenterProgressScore(x, y, shape, board.length) * weights.towardCenterProgressWeight;
    score += this.getTowardLeaderScore(x, y, shape, boardAnalysis) * weights.towardLeaderWeight;
    score += this.getSurroundingScore(board, x, y, shape) * weights.surroundingWeight;
    score += this.getConnectionScore(board, x, y, shape) * weights.connectionWeight;
    score += this.getPieceSizeBonus(piece, gamePhase) * weights.pieceSizeWeight;
    score += this.getBlockHumanScore(board, x, y, shape) * weights.blockHumanWeight;
    score += this.getBlockOpponentExpansionScore(board, x, y, shape, boardAnalysis) * weights.blockOpponentWeight;
    const expansionScore = this.getExpansionScore(board, x, y, shape);
    score += expansionScore * weights.expansionWeight;
    if (gamePhase === 'mid' && expansionScore < 4 && boardAnalysis) score -= 25;
    score += this.getInvasionScore(board, piece, x, y, shape, boardAnalysis) * weights.invasionWeight;
    score += this.getTerritoryConservationPenalty(board, x, y, shape, gamePhase) * weights.territoryWeight;
    score += this.getCompleteBlockScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getGapMinimizationPenalty(board, x, y, shape) * weights.gapWeight;

    // 阶段化：早期/中期避免过早用小块，优先大块扩张；残局允许小块填隙
    if (gamePhase !== 'late') {
      const cellCount = shape.reduce((sum, row) => sum + row.filter(c => c === 1).length, 0);
      if (cellCount <= 2) score -= 35;
      else if (cellCount <= 3) score -= 12;
    }

    return score;
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
    let expandBoost = 1, blockBoost = 1, invadeBoost = 1, connectionBoost = 1;
    if (boardAnalysis && this.difficulty !== 'easy') {
      const totalOppSpots = Array.from(boardAnalysis.opponentExpansionSpots.values()).reduce((s, set) => s + set.size, 0);
      if (boardAnalysis.ourExpansionSpots < totalOppSpots * 0.7) expandBoost = 1.3;
      if (boardAnalysis.threatLevel > 3) blockBoost = 1.4;
      if (boardAnalysis.threatLevel > 6) {
        blockBoost = 1.7;
        connectionBoost = 1.4;
      }
      if (boardAnalysis.ourClusterCount > 1) {
        connectionBoost = Math.max(connectionBoost, 1.3 + 0.2 * (boardAnalysis.ourClusterCount - 1));
      }
      const maxOppCells = Math.max(0, ...Array.from(boardAnalysis.opponentCellCounts.values()));
      if (maxOppCells > boardAnalysis.ourCellCount) invadeBoost = 1.25;
    }
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
          invasionWeight: 0.1 * pm.invasion,
          territoryWeight: 0,
          blockingWeight: 0.05 * pm.blocking,
          gapWeight: 0,
        };
      case 'medium':
        return {
          centerWeight: 0.5 * pm.center,
          towardCenterProgressWeight: 1.2 * pm.towardCenter,
          towardLeaderWeight: 0.4 * invadeBoost,
          surroundingWeight: 0.8,
          connectionWeight: 1.0 * connectionBoost,
          expansionWeight: base(2.8 * pm.expansion, expandBoost),
          pieceSizeWeight: 0.6 * pm.pieceSize,
          blockHumanWeight: 1.4 * pm.blockHuman,
          blockOpponentWeight: 1.2,
          invasionWeight: base(1.0 * pm.invasion, invadeBoost),
          territoryWeight: 0.4,
          blockingWeight: base(0.5 * pm.blocking, blockBoost),
          gapWeight: 0.5,
        };
      case 'hard':
        return {
          centerWeight: 0.7 * pm.center,
          towardCenterProgressWeight: 2.0 * pm.towardCenter,
          towardLeaderWeight: 0.7 * invadeBoost,
          surroundingWeight: 1.0,
          connectionWeight: 1.2 * connectionBoost,
          expansionWeight: base(3.8 * pm.expansion, expandBoost),
          pieceSizeWeight: 0.8 * pm.pieceSize,
          blockHumanWeight: 2.0 * pm.blockHuman,
          blockOpponentWeight: 1.6,
          invasionWeight: base(2.0 * pm.invasion, invadeBoost),
          territoryWeight: 0.8,
          blockingWeight: base(0.9 * pm.blocking, blockBoost),
          gapWeight: 0.8,
        };
      default:
        return {
          centerWeight: 0.5 * pm.center,
          towardCenterProgressWeight: 1.2 * pm.towardCenter,
          towardLeaderWeight: 0.4,
          surroundingWeight: 0.8,
          connectionWeight: 1.0 * connectionBoost,
          expansionWeight: 2.8 * pm.expansion,
          pieceSizeWeight: 0.6 * pm.pieceSize,
          blockHumanWeight: 1.4 * pm.blockHuman,
          blockOpponentWeight: 1.2,
          invasionWeight: 1.0 * pm.invasion,
          territoryWeight: 0.4,
          blockingWeight: 0.5 * pm.blocking,
          gapWeight: 0.5,
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

  private getMyCorner(boardSize: number): { x: number; y: number } {
    switch (this.colorIndex) {
      case 1: return { x: 0, y: 0 };
      case 2: return { x: boardSize - 1, y: 0 };
      case 3: return { x: boardSize - 1, y: boardSize - 1 };
      case 4: return { x: 0, y: boardSize - 1 };
      default: return { x: 0, y: 0 };
    }
  }

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
    for (const [c, s] of opponentSums) {
      if (s.count > 0) opponentCenters.set(c, { cx: s.sx / s.count, cy: s.sy / s.count, count: s.count });
    }
    let leadingOpponent = 0;
    let maxCount = 0;
    for (const [c, n] of opponentCellCounts) {
      if (n > maxCount) { maxCount = n; leadingOpponent = c; }
    }
    return { opponentExpansionSpots, opponentCenters, leadingOpponent, ourExpansionSpots, ourCellCount, ourClusterCount, opponentCellCounts, threatLevel };
  }

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
      for (const [dx, dy] of edges) dfs(x + dx, y + dy);
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

  private getBlockOpponentExpansionScore(board: number[][], x: number, y: number, shape: number[][], analysis: BoardAnalysis | null): number {
    if (!analysis || this.difficulty === 'easy') return 0;
    const bs = board.length;
    const boardCenter = (bs - 1) / 2;
    let blockValue = 0;
    for (const [colorIdx, spots] of analysis.opponentExpansionSpots) {
      if (spots.size === 0) continue;
      const humanBonus = this.humanColorIndices.has(colorIdx) ? 1.4 : 1.0;
      const gatewayBonus = spots.size <= 5 ? 1 + 0.6 * (1 - spots.size / 6) : 1;
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
              spotValue *= (1 + 0.4 * proximityBonus);
            }
            const distToCenter = Math.hypot(bx - boardCenter, by - boardCenter);
            const centerControlBonus = Math.max(0, 1 - distToCenter / (bs * 0.6));
            spotValue *= (1 + 0.25 * centerControlBonus);
            blockValue += Math.round(spotValue);
          }
        }
      }
    }
    return blockValue;
  }

  private getTowardLeaderScore(x: number, y: number, shape: number[][], analysis: BoardAnalysis | null): number {
    if (!analysis || !analysis.leadingOpponent) return 0;
    const center = analysis.opponentCenters.get(analysis.leadingOpponent);
    if (!center) return 0;
    let sumDist = 0, count = 0;
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
    return Math.max(0, (30 - avgDist) * 2);
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
            leaderInvasion += 15;
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
    const totalCells = shape.flat().filter((c: number) => c === 1).length;
    if (inOwnTerritory < totalCells) return 0;
    return -50 * (gamePhase === 'early' ? 1.5 : gamePhase === 'mid' ? 1.0 : 0.5);
  }

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
  
  // 计算周围环境分数（遍历拼图所有格子的邻格，去重）
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
              else score -= 2;
            }
          }
        }
      }
    }
    return score;
  }
  
  // 计算连接性分数
  private getConnectionScore(board: number[][], x: number, y: number, shape: number[][]): number {
    let score = 0;
    
    // 检查拼图每个格子周围的连接情况
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue;
        
        const boardX = x + col;
        const boardY = y + row;
        
        // 检查四个角落
        const corners = [
          { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
          { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
        ];
        
        for (const corner of corners) {
          const checkX = boardX + corner.dx;
          const checkY = boardY + corner.dy;
          
          if (checkX >= 0 && checkX < board.length && checkY >= 0 && checkY < board[0].length) {
            if (board[checkY][checkX] === this.colorIndex) {
              score += 8; // 角落连接加分
            }
          }
        }
      }
    }
    
    return score;
  }

  /** 扩张分数：放置后新增的可落子角位数量，核心指标避免被堵死 */
  private getExpansionScore(board: number[][], x: number, y: number, shape: number[][]): number {
    const tempBoard = board.map(r => [...r]);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) tempBoard[y + row][x + col] = this.colorIndex;
      }
    }
    let newCornerSpots = 0;
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

  /** 拼图大小奖励：早期优先大块，避免后期大块放不下 */
  private getPieceSizeBonus(piece: Piece, gamePhase: GamePhase): number {
    let cellCount = 0;
    for (const row of piece.shape) {
      for (const cell of row) {
        if (cell === 1) cellCount++;
      }
    }
    const phaseBonus = gamePhase === 'early' ? 10 : gamePhase === 'mid' ? 6 : 4;
    return cellCount * phaseBonus;
  }
  
  // 检查是否需要结算（无法放置任何拼图）
  public shouldSettle(board: number[][], pieces: Piece[]): boolean {
    const availablePieces = pieces.filter(p => !p.isUsed);
    
    for (const piece of availablePieces) {
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          if (canPlacePiece(board, piece, { x, y }, this.colorIndex)) {
            return false; // 还能放置拼图
          }
        }
      }
    }
    
    return true; // 无法放置任何拼图，需要结算
  }
  
  // 加权随机选择索引，分数越高的选项被选中的概率越大
  private getWeightedRandomIndex(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    // 计算总权重（所有分数的和）
    const totalWeight = scores.reduce((sum, score) => sum + Math.max(0, score), 0);
    
    if (totalWeight <= 0) {
      // 如果所有分数都是负数或0，则均匀随机选择
      return Math.floor(Math.random() * scores.length);
    }
    
    // 生成随机数
    const random = Math.random() * totalWeight;
    
    // 按权重选择
    let currentWeight = 0;
    for (let i = 0; i < scores.length; i++) {
      currentWeight += Math.max(0, scores[i]);
      if (random <= currentWeight) {
        return i;
      }
    }
    
    // 兜底返回最后一个索引
    return scores.length - 1;
  }
}
