/**
 * 游戏引擎核心逻辑单元测试
 */
import { canPlacePiece, placePiece, calculateScore, isGameFinished, getWinner } from './gameEngine';
import type { Piece, Position } from '../types/game';

const createEmptyBoard = (size = 20): number[][] =>
  Array(size).fill(null).map(() => Array(size).fill(0));

// 1x1 拼图
const piece1: Piece = {
  id: 'test_1',
  type: 1,
  shape: [[1]],
  color: 'red',
  isUsed: false,
};

// 2x1 拼图
const piece2: Piece = {
  id: 'test_2',
  type: 2,
  shape: [[1, 1]],
  color: 'red',
  isUsed: false,
};

describe('gameEngine', () => {
  describe('canPlacePiece', () => {
    it('首次放置红色必须在左上角 (0,0)', () => {
      const board = createEmptyBoard();
      expect(canPlacePiece(board, piece1, { x: 0, y: 0 }, 1)).toBe(true);
      expect(canPlacePiece(board, piece1, { x: 1, y: 0 }, 1)).toBe(false);
      expect(canPlacePiece(board, piece1, { x: 0, y: 1 }, 1)).toBe(false);
    });

    it('首次放置黄色必须在右上角 (19,0)', () => {
      const board = createEmptyBoard();
      expect(canPlacePiece(board, piece1, { x: 19, y: 0 }, 2)).toBe(true);
      expect(canPlacePiece(board, piece1, { x: 18, y: 0 }, 2)).toBe(false);
    });

    it('首次放置蓝色必须在右下角 (19,19)', () => {
      const board = createEmptyBoard();
      expect(canPlacePiece(board, piece1, { x: 19, y: 19 }, 3)).toBe(true);
    });

    it('首次放置绿色必须在左下角 (0,19)', () => {
      const board = createEmptyBoard();
      expect(canPlacePiece(board, piece1, { x: 0, y: 19 }, 4)).toBe(true);
    });

    it('放置后与己方边相连应拒绝', () => {
      const board = createEmptyBoard();
      board[0][0] = 1; // 红色已占 (0,0)
      // (1,0) 与 (0,0) 边相连，不允许
      expect(canPlacePiece(board, piece1, { x: 1, y: 0 }, 1)).toBe(false);
    });

    it('放置后与己方角相连应允许', () => {
      const board = createEmptyBoard();
      board[0][0] = 1; // 红色已占 (0,0)
      // (1,1) 与 (0,0) 角相连，允许
      expect(canPlacePiece(board, piece1, { x: 1, y: 1 }, 1)).toBe(true);
    });

    it('超出边界应拒绝', () => {
      const board = createEmptyBoard();
      expect(canPlacePiece(board, piece1, { x: -1, y: 0 }, 1)).toBe(false);
      expect(canPlacePiece(board, piece1, { x: 20, y: 0 }, 1)).toBe(false);
      expect(canPlacePiece(board, piece2, { x: 19, y: 0 }, 1)).toBe(false); // 2格会超出
    });

    it('与已有格子重叠应拒绝', () => {
      const board = createEmptyBoard();
      board[0][0] = 1;
      expect(canPlacePiece(board, piece1, { x: 0, y: 0 }, 2)).toBe(false);
    });
  });

  describe('placePiece', () => {
    it('正确放置拼图并更新棋盘', () => {
      const board = createEmptyBoard();
      const result = placePiece(board, piece1, { x: 0, y: 0 }, 1);
      expect(result[0][0]).toBe(1);
      expect(board[0][0]).toBe(0); // 原棋盘不变
    });

    it('放置 2x1 拼图覆盖两格', () => {
      const board = createEmptyBoard();
      board[0][0] = 1;
      const result = placePiece(board, piece2, { x: 1, y: 1 }, 1);
      expect(result[1][1]).toBe(1);
      expect(result[1][2]).toBe(1);
    });
  });

  describe('calculateScore', () => {
    it('空棋盘得分为 0', () => {
      const board = createEmptyBoard();
      expect(calculateScore(board, 1)).toBe(0);
    });

    it('正确计算占据格数', () => {
      const board = createEmptyBoard();
      board[0][0] = 1;
      board[0][1] = 1;
      board[1][0] = 1;
      expect(calculateScore(board, 1)).toBe(3);
    });
  });

  describe('isGameFinished', () => {
    it('全部结算时游戏结束', () => {
      const players = [
        { isSettled: true },
        { isSettled: true },
        { isSettled: true },
        { isSettled: true },
      ];
      expect(isGameFinished(players)).toBe(true);
    });

    it('有人未结算时游戏未结束', () => {
      const players = [
        { isSettled: true },
        { isSettled: false },
        { isSettled: true },
        { isSettled: true },
      ];
      expect(isGameFinished(players)).toBe(false);
    });
  });

  describe('getWinner', () => {
    it('返回得分最高的玩家', () => {
      const players = [
        { score: 10, name: 'A' },
        { score: 25, name: 'B' },
        { score: 15, name: 'C' },
        { score: 20, name: 'D' },
      ];
      expect(getWinner(players)).toEqual({ score: 25, name: 'B' });
    });
  });
});
