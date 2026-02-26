/**
 * Minimax + Alpha-Beta 搜索
 * - 候选动作剪枝：最大块优先，按 heuristic 排序取 top-k
 * - Paranoid 对手模型：对手选择最小化我方评分的走法
 * - 逐步加深深度（1-2 层）
 */

import { Piece, Position } from '../types/game';
import { canPlacePiece, placePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';
import type { GamePhase } from './aiPlayer';

export interface SearchMove {
  piece: Piece;
  position: Position;
}

/** 搜索状态：棋盘、各玩家剩余拼图、当前玩家、回合数 */
export interface SearchState {
  board: number[][];
  piecesByPlayer: Piece[][]; // piecesByPlayer[playerIndex]
  currentPlayerIndex: number; // 0-3 对应 red,yellow,blue,green
  turnNumber: number;
}

export type MoveEvaluator = (
  board: number[][],
  piece: Piece,
  position: Position,
  playerColorIndex: number,
  gamePhase: GamePhase
) => number;

/** 对手落子排序用：块越大、扩张越多，优先尝试（Paranoid 下对我不利） */
function opponentMoveOrderScore(piece: Piece, board: number[][], position: Position): number {
  const cellCount = piece.shape.flat().filter(c => c === 1).length;
  let expansion = 0;
  const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col] === 0) continue;
      const bx = position.x + col;
      const by = position.y + row;
      for (const [dx, dy] of corners) {
        const cx = bx + dx;
        const cy = by + dy;
        if (cx >= 0 && cx < board.length && cy >= 0 && cy < board[0].length && board[cy][cx] === 0) {
          expansion++;
        }
      }
    }
  }
  return cellCount * 10 + expansion;
}

const COLOR_INDEX_TO_PLAYER = [1, 2, 3, 4] as const; // playerIndex 0 -> colorIndex 1 (red)

function getGamePhase(turnNumber: number, totalPieces: number, usedCount: number): GamePhase {
  const remaining = totalPieces - usedCount;
  const usedRatio = usedCount / totalPieces;
  if (turnNumber <= 5 && usedRatio < 0.2) return 'early';
  if (usedRatio > 0.65 || turnNumber > 30) return 'late';
  return 'mid';
}

/** 获取某玩家的所有合法落子（含变换），按块大小降序 */
function getAllLegalMoves(
  board: number[][],
  pieces: Piece[],
  colorIndex: number
): SearchMove[] {
  const moves: SearchMove[] = [];
  const available = pieces.filter(p => !p.isUsed);
  const byType = Array.from(new Set(available.map(p => p.type))).sort((a, b) => b - a);

  for (const pieceType of byType) {
    const piecesOfType = available.filter(p => p.type === pieceType);
    for (const piece of piecesOfType) {
      const transformations = getUniqueTransformations(piece);
      for (const transformed of transformations) {
        for (let y = 0; y < board.length; y++) {
          for (let x = 0; x < board[y].length; x++) {
            if (canPlacePiece(board, transformed, { x, y }, colorIndex)) {
              moves.push({ piece: transformed, position: { x, y } });
            }
          }
        }
      }
    }
  }
  return moves;
}

/** 打乱数组中 [start, end) 区间，用于同分落子随机化 */
function shuffleSegment<T>(arr: T[], start: number, end: number): void {
  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** 获取候选动作：按 heuristic 排序，取 top-k；同分时随机打乱，避免所有 AI 选同一块 */
export function getCandidateMoves(
  board: number[][],
  pieces: Piece[],
  colorIndex: number,
  evaluator: MoveEvaluator,
  gamePhase: GamePhase,
  limit: number,
  isOpponent: boolean = false
): Array<{ move: SearchMove; score: number }> {
  const all = getAllLegalMoves(board, pieces, colorIndex);
  if (all.length === 0) return [];

  const scored = all.map(m => ({
    move: m,
    score: isOpponent
      ? opponentMoveOrderScore(m.piece, board, m.position)
      : evaluator(board, m.piece, m.position, colorIndex, gamePhase),
  }));
  scored.sort((a, b) => b.score - a.score);
  // 同分落子随机打乱，增加开局多样性
  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (j < scored.length && scored[j].score === scored[i].score) j++;
    if (j - i > 1) shuffleSegment(scored, i, j);
    i = j;
  }
  return scored.slice(0, limit);
}

/** 克隆某玩家的 pieces 并标记指定 piece 为已用（按 id 匹配，同源变换共享 id） */
function clonePiecesAndMarkUsed(pieces: Piece[], placedPiece: Piece): Piece[] {
  let marked = false;
  return pieces.map(p => {
    if (!marked && p.id === placedPiece.id && !p.isUsed) {
      marked = true;
      return { ...p, isUsed: true };
    }
    return { ...p };
  });
}

/** 从当前状态评估「我方」局面：取我方最佳落子的 heuristic 分 */
function evaluateStateFromOurPerspective(
  state: SearchState,
  ourColorIndex: number,
  evaluator: MoveEvaluator,
  candidateLimit: number
): number {
  const ourPlayerIndex = ourColorIndex - 1;
  const ourPieces = state.piecesByPlayer[ourPlayerIndex];
  const totalPieces = 21; // 标准 Blokus
  const usedCount = ourPieces.filter(p => p.isUsed).length;
  const gamePhase = getGamePhase(state.turnNumber, totalPieces, usedCount);

  const candidates = getCandidateMoves(
    state.board,
    ourPieces,
    ourColorIndex,
    evaluator,
    gamePhase,
    candidateLimit
  );
  if (candidates.length === 0) return -1e6; // 无路可走
  return candidates[0].score;
}

/** 下一玩家索引（含跳过无步可走的玩家） */
function nextPlayerIndex(state: SearchState, colorIndexFromPlayer: (i: number) => number): number {
  const next = (state.currentPlayerIndex + 1) % 4;
  const colorIndex = colorIndexFromPlayer(next);
  const pieces = state.piecesByPlayer[next];
  const hasMoves = getAllLegalMoves(state.board, pieces, colorIndex).length > 0;
  if (hasMoves) return next;
  // 若下一玩家无步可走，继续往后找
  const tried = new Set<number>();
  let i = next;
  while (!tried.has(i)) {
    tried.add(i);
    const ci = colorIndexFromPlayer(i);
    const p = state.piecesByPlayer[i];
    if (getAllLegalMoves(state.board, p, ci).length > 0) return i;
    i = (i + 1) % 4;
  }
  return next; // 所有人无步可走，返回原下一玩家
}

/** Minimax + Alpha-Beta，Paranoid：我方 max，对手 min */
export function minimax(
  state: SearchState,
  ourColorIndex: number,
  evaluator: MoveEvaluator,
  depth: number,
  alpha: number,
  beta: number,
  candidateLimit: number
): { score: number; move: SearchMove | null } {
  const colorIndex = COLOR_INDEX_TO_PLAYER[state.currentPlayerIndex];
  const pieces = state.piecesByPlayer[state.currentPlayerIndex];
  const isOurTurn = colorIndex === ourColorIndex;

  if (depth <= 0) {
    const score = evaluateStateFromOurPerspective(state, ourColorIndex, evaluator, candidateLimit);
    return { score, move: null };
  }

  const gamePhase = getGamePhase(state.turnNumber, 21, pieces.filter(p => p.isUsed).length);
  const candidates = getCandidateMoves(
    state.board,
    pieces,
    colorIndex,
    evaluator,
    gamePhase,
    candidateLimit,
    !isOurTurn
  );

  // 无合法步：跳过到下一玩家（pass，不增加 turnNumber）
  if (candidates.length === 0) {
    const nextIdx = nextPlayerIndex(state, i => COLOR_INDEX_TO_PLAYER[i]);
    if (nextIdx === state.currentPlayerIndex) {
      return { score: evaluateStateFromOurPerspective(state, ourColorIndex, evaluator, candidateLimit), move: null };
    }
    const nextState: SearchState = {
      ...state,
      currentPlayerIndex: nextIdx,
      turnNumber: state.turnNumber,
    };
    return minimax(nextState, ourColorIndex, evaluator, depth - 1, alpha, beta, candidateLimit);
  }

  let bestMove: SearchMove | null = null;
  const nextIdxBase = nextPlayerIndex(state, i => COLOR_INDEX_TO_PLAYER[i]);

  if (isOurTurn) {
    let maxScore = -Infinity;
    for (const { move } of candidates) {
      const newBoard = placePiece(state.board, move.piece, move.position, colorIndex);
      const newPiecesByPlayer = state.piecesByPlayer.map((ps, i) =>
        i === state.currentPlayerIndex ? clonePiecesAndMarkUsed(ps, move.piece) : ps
      );
      const nextState: SearchState = {
        board: newBoard,
        piecesByPlayer: newPiecesByPlayer,
        currentPlayerIndex: nextIdxBase,
        turnNumber: state.turnNumber + 1,
      };
      const { score } = minimax(nextState, ourColorIndex, evaluator, depth - 1, alpha, beta, candidateLimit);
      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, maxScore);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const { move } of candidates) {
      const newBoard = placePiece(state.board, move.piece, move.position, colorIndex);
      const newPiecesByPlayer = state.piecesByPlayer.map((ps, i) =>
        i === state.currentPlayerIndex ? clonePiecesAndMarkUsed(ps, move.piece) : ps
      );
      const nextState: SearchState = {
        board: newBoard,
        piecesByPlayer: newPiecesByPlayer,
        currentPlayerIndex: nextIdxBase,
        turnNumber: state.turnNumber + 1,
      };
      const { score } = minimax(nextState, ourColorIndex, evaluator, depth - 1, alpha, beta, candidateLimit);
      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, minScore);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

/** 迭代加深：先深度 1，再深度 2，返回最佳着法 */
export function iterativeDeepeningSearch(
  state: SearchState,
  ourColorIndex: number,
  evaluator: MoveEvaluator,
  maxDepth: number,
  candidateLimit: number
): SearchMove | null {
  let bestMove: SearchMove | null = null;
  for (let d = 1; d <= maxDepth; d++) {
    const result = minimax(
      state,
      ourColorIndex,
      evaluator,
      d,
      -Infinity,
      Infinity,
      candidateLimit
    );
    if (result.move) bestMove = result.move;
  }
  return bestMove;
}
