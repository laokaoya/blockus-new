// AI玩家算法

import { Piece, Position, PlayerColor } from '../types';
import { canPlacePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';

export class AIPlayer {
  private color: PlayerColor;
  private colorIndex: number;
  private difficulty: 'easy' | 'medium' | 'hard';
  
  constructor(color: PlayerColor, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.color = color;
    this.colorIndex = this.getColorIndex(color);
    this.difficulty = difficulty;
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
  
  // AI的主要决策函数
  public makeMove(board: number[][], pieces: Piece[]): { piece: Piece; position: Position } | null {
    const availablePieces = pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return null;
    
    // 按块数分组：5格、4格、3格、2格、1格
    const piecesByType: { [key: number]: Piece[] } = {};
    availablePieces.forEach(piece => {
      if (!piecesByType[piece.type]) {
        piecesByType[piece.type] = [];
      }
      piecesByType[piece.type].push(piece);
    });
    
    // 按块数递减顺序尝试，每个块数级别内随机选择
    const pieceTypes = Object.keys(piecesByType).map(Number).sort((a, b) => b - a);
    
    for (const pieceType of pieceTypes) {
      const piecesOfType = piecesByType[pieceType];
      
      // 为当前块数级别的所有拼图评分，选择最佳的几个
      const scoredPieces = piecesOfType.map(piece => {
        const transformations = getUniqueTransformations(piece);
        let bestScore = -Infinity;
        let bestMove: { piece: Piece; position: Position } | null = null;
        
        for (const transformedPiece of transformations) {
          const position = this.findBestPosition(board, transformedPiece);
          if (position) {
            const score = this.evaluatePosition(board, transformedPiece, position);
            if (score > bestScore) {
              bestScore = score;
              bestMove = { piece: transformedPiece, position };
            }
          }
        }
        
        return { piece: piece, score: bestScore, bestMove };
      }).filter(item => item.bestMove !== null);
      
      if (scoredPieces.length === 0) continue;
      
      // 按分数排序，根据难度选择不同数量的选项
      scoredPieces.sort((a, b) => b.score - a.score);
      
      let topChoices: typeof scoredPieces;
      switch (this.difficulty) {
        case 'easy':
          // 简单模式：随机选择前5个选项中的任意一个
          topChoices = scoredPieces.slice(0, Math.min(5, scoredPieces.length));
          const randomIndex = Math.floor(Math.random() * topChoices.length);
          return topChoices[randomIndex].bestMove;
        case 'medium':
          // 中等模式：选择前3个最佳选项中的一个，偏向分数更高的
          topChoices = scoredPieces.slice(0, Math.min(3, scoredPieces.length));
          const weightedIndex = this.getWeightedRandomIndex(topChoices.map(item => item.score));
          return topChoices[weightedIndex].bestMove;
        case 'hard':
          // 困难模式：总是选择最高分的选项
          return scoredPieces[0].bestMove;
        default:
          topChoices = scoredPieces.slice(0, Math.min(3, scoredPieces.length));
          const defaultIndex = this.getWeightedRandomIndex(topChoices.map(item => item.score));
          return topChoices[defaultIndex].bestMove;
      }
    }
    
    return null;
  }
  
  // 寻找最佳放置位置
  private findBestPosition(board: number[][], piece: Piece): Position | null {
    const positions: Position[] = [];
    
    // 遍历棋盘寻找所有可能的位置
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (canPlacePiece(board, piece, { x, y }, this.colorIndex)) {
          positions.push({ x, y });
        }
      }
    }
    
    if (positions.length === 0) return null;
    
    // 评分并选择最佳位置
    const scoredPositions = positions.map(pos => ({
      position: pos,
      score: this.evaluatePosition(board, piece, pos)
    }));
    
    // 按分数排序，选择最高分的位置
    scoredPositions.sort((a, b) => b.score - a.score);
    return scoredPositions[0].position;
  }
  
  // 评估位置分数
  private evaluatePosition(board: number[][], piece: Piece, position: Position): number {
    let score = 0;
    const { x, y } = position;
    const { shape } = piece;
    
    // 根据难度调整评分权重
    const weights = this.getDifficultyWeights();
    
    // 优先选择靠近中心的位置
    score += this.getCenterDistanceScore(x, y, board.length) * weights.centerWeight;
    
    // 避免被对手包围
    score += this.getSurroundingScore(board, x, y, shape) * weights.surroundingWeight;
    
    // 优先选择能连接更多己方拼图的位置
    score += this.getConnectionScore(board, x, y, shape) * weights.connectionWeight;
    
    return score;
  }
  
  // 根据难度获取评分权重
  private getDifficultyWeights() {
    switch (this.difficulty) {
      case 'easy':
        return {
          centerWeight: 0.5,    // 简单模式不太重视中心位置
          surroundingWeight: 0.3, // 不太重视周围环境
          connectionWeight: 0.2   // 不太重视连接性
        };
      case 'medium':
        return {
          centerWeight: 1.0,    // 中等模式正常权重
          surroundingWeight: 1.0,
          connectionWeight: 1.0
        };
      case 'hard':
        return {
          centerWeight: 1.5,    // 困难模式更重视策略
          surroundingWeight: 1.3,
          connectionWeight: 1.2
        };
      default:
        return {
          centerWeight: 1.0,
          surroundingWeight: 1.0,
          connectionWeight: 1.0
        };
    }
  }
  
  // 计算到中心的距离分数
  private getCenterDistanceScore(x: number, y: number, boardSize: number): number {
    const centerX = Math.floor(boardSize / 2);
    const centerY = Math.floor(boardSize / 2);
    
    // 计算到中心的欧几里得距离
    const distanceToCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    
    // 越靠近中心分数越高，最大距离为对角线的一半
    const maxDistance = Math.sqrt(Math.pow(boardSize / 2, 2) + Math.pow(boardSize / 2, 2));
    return Math.max(0, (maxDistance - distanceToCenter)) * 15; // 越靠近中心分数越高
  }
  
  // 计算周围环境分数
  private getSurroundingScore(board: number[][], x: number, y: number, shape: number[][]): number {
    let score = 0;
    
    // 检查拼图周围8个方向
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const checkX = x + dx;
        const checkY = y + dy;
        
        if (checkX >= 0 && checkX < board.length && checkY >= 0 && checkY < board[0].length) {
          const cell = board[checkY][checkX];
          
          if (cell === 0) {
            score += 5; // 空位加分
          } else if (cell === this.colorIndex) {
            score += 2; // 己方拼图加分
          } else {
            score -= 3; // 对手拼图减分
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
