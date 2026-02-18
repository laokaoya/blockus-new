// 游戏引擎核心逻辑

import { GameState, Piece, Position, PlayerColor } from '../types';

// 检查拼图是否可以放置在指定位置
export function canPlacePiece(
  board: number[][],
  piece: Piece,
  position: Position,
  playerColorIndex: number
): boolean {
  const { shape } = piece;
  const { x, y } = position;
  
  // 检查是否超出边界
  if (x < 0 || y < 0 || x + shape[0].length > board.length || y + shape.length > board[0].length) {
    return false;
  }
  
  let hasCornerConnection = false;
  let hasEdgeConnection = false;
  
  // 检查每个格子
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 0) continue;
      
      const boardX = x + col;
      const boardY = y + row;
      
      // 检查是否与已有拼图重叠
      if (board[boardY][boardX] !== 0) {
        return false;
      }
      
      // 检查四个方向的连接情况
      const directions = [
        { dx: -1, dy: 0 }, // 左
        { dx: 1, dy: 0 },  // 右
        { dx: 0, dy: -1 }, // 上
        { dx: 0, dy: 1 }   // 下
      ];
      
      for (const dir of directions) {
        const checkX = boardX + dir.dx;
        const checkY = boardY + dir.dy;
        
        if (checkX >= 0 && checkX < board.length && checkY >= 0 && checkY < board[0].length) {
          const cell = board[checkY][checkX];
          
          if (cell === playerColorIndex) {
            // 与己方拼图边相连，不允许
            return false;
          } else if (cell !== 0) {
            // 与对手拼图相连
            hasEdgeConnection = true;
          }
        }
      }
      
      // 检查四个角落的连接情况
      const corners = [
        { dx: -1, dy: -1 }, // 左上
        { dx: 1, dy: -1 },  // 右上
        { dx: -1, dy: 1 },  // 左下
        { dx: 1, dy: 1 }    // 右下
      ];
      
      for (const corner of corners) {
        const checkX = boardX + corner.dx;
        const checkY = boardY + corner.dy;
        
        if (checkX >= 0 && checkX < board.length && checkY >= 0 && checkY < board[0].length) {
          const cell = board[checkY][checkX];
          
          if (cell === playerColorIndex) {
            hasCornerConnection = true;
          }
        }
      }
    }
  }
  
  // 首次放置必须在角落
  if (isFirstMove(board, playerColorIndex)) {
    return isPieceInCorner(board, piece, position, playerColorIndex);
  }
  
  // 后续放置必须有角落连接
  return hasCornerConnection;
}

// 检查是否是首次移动
function isFirstMove(board: number[][], playerColorIndex: number): boolean {
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === playerColorIndex) {
        return false;
      }
    }
  }
  return true;
}

// 检查是否在指定玩家的起始角落
function isInCorner(position: Position, boardSize: number, playerColorIndex: number): boolean {
  const { x, y } = position;
  
  // 为每个玩家分配不同的起始角落
  switch (playerColorIndex) {
    case 1: // 红色玩家 - 左上角
      return x === 0 && y === 0;
    case 2: // 黄色玩家 - 右上角
      return x === boardSize - 1 && y === 0;
    case 3: // 蓝色玩家 - 右下角
      return x === boardSize - 1 && y === boardSize - 1;
    case 4: // 绿色玩家 - 左下角
      return x === 0 && y === boardSize - 1;
    default:
      return false;
  }
}

// 检查拼图是否覆盖指定玩家的起始角落
function isPieceInCorner(
  board: number[][],
  piece: Piece,
  position: Position,
  playerColorIndex: number
): boolean {
  const { shape } = piece;
  const { x, y } = position;
  const boardSize = board.length;
  
  // 检查拼图的每个格子是否在指定角落
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 1) {
        const boardX = x + col;
        const boardY = y + row;
        
        // 检查这个格子是否在指定玩家的起始角落
        switch (playerColorIndex) {
          case 1: // 红色玩家 - 左上角 (0,0)
            if (boardX === 0 && boardY === 0) return true;
            break;
          case 2: // 黄色玩家 - 右上角 (19,0)
            if (boardX === boardSize - 1 && boardY === 0) return true;
            break;
          case 3: // 蓝色玩家 - 右下角 (19,19)
            if (boardX === boardSize - 1 && boardY === boardSize - 1) return true;
            break;
          case 4: // 绿色玩家 - 左下角 (0,19)
            if (boardX === 0 && boardY === boardSize - 1) return true;
            break;
        }
      }
    }
  }
  
  return false;
}

// 放置拼图到棋盘
export function placePiece(
  board: number[][],
  piece: Piece,
  position: Position,
  playerColorIndex: number
): number[][] {
  const newBoard = board.map(row => [...row]);
  const { shape } = piece;
  const { x, y } = position;
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 1) {
        newBoard[y + row][x + col] = playerColorIndex;
      }
    }
  }
  
  return newBoard;
}

// 计算玩家得分
export function calculateScore(board: number[][], playerColorIndex: number): number {
  let score = 0;
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === playerColorIndex) {
        score++;
      }
    }
  }
  return score;
}

// 检查游戏是否结束
export function isGameFinished(players: any[]): boolean {
  return players.every(player => player.isSettled);
}

// 获取获胜者
export function getWinner(players: any[]): any {
  if (!isGameFinished(players)) return null;
  
  return players.reduce((winner, player) => {
    return player.score > winner.score ? player : winner;
  }, players[0]);
}

// 检查玩家是否可以继续放置拼图
export function canPlayerContinue(board: number[][], pieces: Piece[], playerColorIndex: number): boolean {
  for (const piece of pieces) {
    if (piece.isUsed) continue;
    
    // 尝试在棋盘的每个位置放置拼图
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (canPlacePiece(board, piece, { x, y }, playerColorIndex)) {
          return true;
        }
      }
    }
  }
  return false;
}
