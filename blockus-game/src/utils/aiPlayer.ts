// AI玩家算法

import { Piece, Position, PlayerColor } from '../types/game';
import { canPlacePiece, placePiece } from './gameEngine';

export class AIPlayer {
  private color: PlayerColor;
  private colorIndex: number;
  
  constructor(color: PlayerColor) {
    this.color = color;
    this.colorIndex = this.getColorIndex(color);
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
    
    // 按优先级排序拼图：5格 > 4格 > 3格 > 2格 > 1格
    const sortedPieces = availablePieces.sort((a, b) => b.type - a.type);
    
    // 尝试放置每个拼图
    for (const piece of sortedPieces) {
      const position = this.findBestPosition(board, piece);
      if (position) {
        return { piece, position };
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
    
    // 优先选择靠近边缘的位置（向外拓展）
    score += this.getEdgeDistanceScore(x, y, board.length);
    
    // 优先选择靠近角落的位置
    score += this.getCornerDistanceScore(x, y, board.length);
    
    // 避免被对手包围
    score += this.getSurroundingScore(board, x, y, shape);
    
    // 优先选择能连接更多己方拼图的位置
    score += this.getConnectionScore(board, x, y, shape);
    
    return score;
  }
  
  // 计算到边缘的距离分数
  private getEdgeDistanceScore(x: number, y: number, boardSize: number): number {
    const distanceToEdge = Math.min(x, y, boardSize - 1 - x, boardSize - 1 - y);
    return (boardSize - distanceToEdge) * 10; // 越靠近边缘分数越高
  }
  
  // 计算到角落的距离分数
  private getCornerDistanceScore(x: number, y: number, boardSize: number): number {
    const distanceToCorner = Math.min(
      Math.sqrt(x * x + y * y),
      Math.sqrt((boardSize - 1 - x) * (boardSize - 1 - x) + y * y),
      Math.sqrt(x * x + (boardSize - 1 - y) * (boardSize - 1 - y)),
      Math.sqrt((boardSize - 1 - x) * (boardSize - 1 - x) + (boardSize - 1 - y) * (boardSize - 1 - y))
    );
    return (boardSize - distanceToCorner) * 5; // 越靠近角落分数越高
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
}
