// AI玩家算法

import { Piece, Position, PlayerColor, AIStrategy } from '../types';
import { canPlacePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';
import { overlapsBarrier, pieceCellCount, findTriggeredTiles } from './creativeModeEngine';
import type { SpecialTile } from './creativeTypes';

export type GamePhase = 'early' | 'mid' | 'late';

export class AIPlayer {
  private color: PlayerColor;
  private colorIndex: number;
  private difficulty: 'easy' | 'medium' | 'hard';
  private strategy: AIStrategy;
  private priorityOpponentColorIndex: number | null;

  constructor(color: PlayerColor, difficulty: 'easy' | 'medium' | 'hard' = 'medium', priorityOpponentColor?: PlayerColor, strategy: AIStrategy = 'balanced') {
    this.color = color;
    this.colorIndex = this.getColorIndex(color);
    this.difficulty = difficulty;
    this.strategy = strategy;
    this.priorityOpponentColorIndex = priorityOpponentColor ? this.getColorIndex(priorityOpponentColor) : null;
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
      const idx = this.difficulty === 'hard' ? 0 : this.getWeightedRandomIndex(topChoices.map(c => c.score));
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

    const allCandidates: Array<{ piece: Piece; score: number; bestMove: { piece: Piece; position: Position } }> = [];

    for (const piece of availablePieces) {
      const transformations = getUniqueTransformations(piece);
      let bestScore = -Infinity;
      let bestMove: { piece: Piece; position: Position } | null = null;

      for (const transformedPiece of transformations) {
        const positions = this.findAllPositions(board, transformedPiece);
        for (const pos of positions) {
          const score = this.evaluatePosition(board, transformedPiece, pos, gamePhase);
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
      case 'hard':
        return allCandidates[0].bestMove;
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
  private evaluatePosition(board: number[][], piece: Piece, position: Position, gamePhase: GamePhase): number {
    let score = 0;
    const { x, y } = position;
    const { shape } = piece;
    const weights = this.getDifficultyWeights(gamePhase);

    score += this.getCenterDistanceScore(x, y, board.length, shape) * weights.centerWeight;
    score += this.getSurroundingScore(board, x, y, shape) * weights.surroundingWeight;
    score += this.getConnectionScore(board, x, y, shape) * weights.connectionWeight;
    score += this.getInvasionScore(board, piece, x, y, shape) * weights.invasionWeight;
    score += this.getTerritoryConservationPenalty(board, x, y, shape, gamePhase) * weights.territoryWeight;
    score += this.getCompleteBlockScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getGapMinimizationPenalty(board, x, y, shape) * weights.gapWeight;

    return score;
  }

  private getStrategyModifiers(): Record<string, number> {
    switch (this.strategy) {
      case 'aggressive':
        return { center: 1.3, invasion: 1.8, blocking: 0.5, territory: 0.4, gap: 0.7 };
      case 'defensive':
        return { center: 0.7, invasion: 0.4, blocking: 1.6, territory: 1.5, gap: 1.4 };
      default:
        return { center: 1.0, invasion: 1.0, blocking: 1.0, territory: 1.0, gap: 1.0 };
    }
  }

  private getDifficultyWeights(gamePhase: GamePhase) {
    const centerMult = gamePhase === 'early' ? 1.8 : gamePhase === 'late' ? 0.4 : 1.0;
    const blockingMult = gamePhase === 'early' ? 0.3 : gamePhase === 'late' ? 1.5 : 1.2;
    const mod = this.getStrategyModifiers();
    switch (this.difficulty) {
      case 'easy':
        return {
          centerWeight: 0.5 * centerMult * mod.center,
          surroundingWeight: 0.3,
          connectionWeight: 0.2,
          invasionWeight: 0 * mod.invasion,
          territoryWeight: 0 * mod.territory,
          blockingWeight: 0 * mod.blocking,
          gapWeight: 0 * mod.gap,
        };
      case 'medium':
        return {
          centerWeight: 1.0 * centerMult * mod.center,
          surroundingWeight: 1.0,
          connectionWeight: 1.0,
          invasionWeight: 0.8 * mod.invasion,
          territoryWeight: 0.6 * mod.territory,
          blockingWeight: 0.5 * blockingMult * mod.blocking,
          gapWeight: 0.7 * mod.gap,
        };
      case 'hard':
        return {
          centerWeight: 1.2 * centerMult * mod.center,
          surroundingWeight: 1.3,
          connectionWeight: 1.2,
          invasionWeight: 1.5 * mod.invasion,
          territoryWeight: 1.2 * mod.territory,
          blockingWeight: 1.0 * blockingMult * mod.blocking,
          gapWeight: 1.2 * mod.gap,
        };
      default:
        return {
          centerWeight: 1.0 * mod.center,
          surroundingWeight: 1.0,
          connectionWeight: 1.0,
          invasionWeight: 0.8 * mod.invasion,
          territoryWeight: 0.6 * mod.territory,
          blockingWeight: 0.5 * mod.blocking,
          gapWeight: 0.7 * mod.gap,
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

  /** 侵入对手领地：对角接触对手即加分，不区分大小块；优先侵入玩家领地 */
  private getInvasionScore(board: number[][], piece: Piece, x: number, y: number, shape: number[][]): number {
    let totalInvasion = 0;
    let priorityInvasion = 0;
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
          if (this.priorityOpponentColorIndex !== null && cell === this.priorityOpponentColorIndex) {
            priorityInvasion += 15;
          }
        }
      }
    }
    return totalInvasion + priorityInvasion;
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
        if (distToCorner <= 6) inOwnTerritory++;
      }
    }
    if (inOwnTerritory === 0) return 0;
    const totalCells = shape.flat().filter((c: number) => c === 1).length;
    if (inOwnTerritory < totalCells) return 0;
    return -20 * (gamePhase === 'early' ? 1.5 : gamePhase === 'mid' ? 1.0 : 0.5);
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
