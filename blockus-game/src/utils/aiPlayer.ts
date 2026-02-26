// AI玩家算法

import { Piece, Position, PlayerColor, AIStrategy, Player } from '../types/game';
import { SpecialTile, ItemCard, CreativePlayerState } from '../types/creative';
import { canPlacePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';
import { iterativeDeepeningSearch, type SearchState, type MoveEvaluator } from './minimaxSearch';

export type GamePhase = 'early' | 'mid' | 'late';

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

    // hard 难度 + 经典模式 + 有完整状态：使用 Minimax+Alpha-Beta
    if (
      this.difficulty === 'hard' &&
      !creativeCtx &&
      fullState &&
      fullState.players.length === 4
    ) {
      const searchState: SearchState = {
        board: board.map(r => [...r]),
        piecesByPlayer: fullState.players.map(p => p.pieces.map(pi => ({ ...pi }))),
        currentPlayerIndex: fullState.currentPlayerIndex,
        turnNumber: fullState.turnCount,
      };
      const evaluator: MoveEvaluator = (b, piece, pos, colorIdx, phase) =>
        colorIdx === this.colorIndex ? this.evaluateMove(b, piece, pos, phase) : 0;
      const move = iterativeDeepeningSearch(searchState, this.colorIndex, evaluator, 2, 6);
      if (move) return move;
    }
    
    const piecesByType: { [key: number]: Piece[] } = {};
    availablePieces.forEach(piece => {
      if (!piecesByType[piece.type]) piecesByType[piece.type] = [];
      piecesByType[piece.type].push(piece);
    });
    
    const pieceTypes = Object.keys(piecesByType).map(Number).sort((a, b) => b - a);

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
            const score = this.evaluatePositionFull(board, transformedPiece, pos, creativeCtx, gamePhase);
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
        if (allCandidates.length > 1 && Math.random() < 0.1) {
          return allCandidates[1].bestMove;
        }
        return allCandidates[0].bestMove;
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
  
  private evaluatePositionFull(
    board: number[][],
    piece: Piece,
    position: Position,
    creativeCtx: CreativeContext | null,
    gamePhase: GamePhase,
  ): number {
    let score = 0;
    const { x, y } = position;
    const { shape } = piece;
    const weights = this.getDifficultyWeights(gamePhase);
    
    score += this.getCenterDistanceScore(x, y, board.length, shape) * weights.centerWeight;
    score += this.getSurroundingScore(board, x, y, shape) * weights.surroundingWeight;
    score += this.getConnectionScore(board, x, y, shape) * weights.connectionWeight;
    score += this.getExpansionScore(board, x, y, shape) * weights.expansionWeight;
    score += this.getPieceSizeBonus(piece, gamePhase) * weights.pieceSizeWeight;
    score += this.getBlockHumanScore(board, x, y, shape) * weights.blockHumanWeight;
    score += this.getBlockingScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getEdgeControlScore(board, x, y, shape, gamePhase) * weights.edgeControlWeight;
    score += this.getInvasionScore(board, piece, x, y, shape) * weights.invasionWeight;
    score += this.getTerritoryConservationPenalty(board, x, y, shape, gamePhase) * weights.territoryWeight;
    score += this.getCompleteBlockScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getGapMinimizationPenalty(board, x, y, shape) * weights.gapWeight;

    // 填隙策略：避免过早使用 1～2 格的小块，应优先用大块填隙；残局时允许小块
    if (this.strategy === 'gapMinimizer' && gamePhase !== 'late') {
      const cellCount = shape.reduce((sum, row) => sum + row.filter(c => c === 1).length, 0);
      if (cellCount <= 2) score -= 40;
      else if (cellCount <= 3) score -= 15;
    }

    if (creativeCtx) {
      score += this.getSpecialTileScore(shape, position, creativeCtx) * weights.specialTileWeight;
      score += this.getBarrierProximityPenalty(board, x, y, shape, creativeCtx) * weights.barrierPenaltyWeight;
    }
    
    return score;
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

  /** 侵入对手领地：对角接触对手即加分；接触真人额外加分（阻挡真人） */
  private getInvasionScore(board: number[][], piece: Piece, x: number, y: number, shape: number[][]): number {
    let totalInvasion = 0;
    let humanInvasion = 0;
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
          totalInvasion += 12;
          if (this.humanColorIndices.has(cell)) {
            humanInvasion += this.strategy === 'hunter' ? 35 : 25;
          }
        }
      }
    }
    return totalInvasion + humanInvasion;
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

  /** 领地保守：己方领地未被侵犯时，不急于填充，保留拼图用于侵入/阻挡 */
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
    const totalCells = shape.flat().filter(c => c === 1).length;
    if (inOwnTerritory < totalCells) return 0;
    return -20 * (gamePhase === 'early' ? 1.5 : gamePhase === 'mid' ? 1.0 : 0.5);
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

  private getStrategyModifiers(): Record<string, number> {
    const base = { center: 1.0, invasion: 1.0, blocking: 1.0, territory: 1.0, gap: 1.0, expansion: 1.0, connection: 1.0, pieceSize: 1.0, blockHuman: 1.0 };
    switch (this.strategy) {
      case 'aggressive':
        return { ...base, center: 1.0, expansion: 1.2, invasion: 1.5, blocking: 0.5, territory: 0.4, gap: 0.6, blockHuman: 1.3 };
      case 'defensive':
        return { ...base, center: 0.6, expansion: 1.4, invasion: 0.3, blocking: 1.4, territory: 1.3, gap: 1.2, blockHuman: 1.2 };
      case 'expansionist':
        return { ...base, center: 1.0, expansion: 1.8, invasion: 1.0, blocking: 0.5, territory: 0.5, gap: 0.6, blockHuman: 0.8 };
      case 'blocker':
        return { ...base, center: 0.6, expansion: 1.2, invasion: 0.5, blocking: 1.6, connection: 1.3, territory: 1.0, gap: 0.8, blockHuman: 1.6 };
      case 'conservative':
        return { ...base, expansion: 1.3, invasion: 0.8, blocking: 1.0, territory: 1.1, pieceSize: 0.4, blockHuman: 1.0 };
      case 'gapMinimizer':
        return { ...base, center: 0.6, expansion: 1.5, invasion: 0.6, blocking: 0.9, territory: 1.4, gap: 1.6, blockHuman: 1.2 };
      case 'hunter':
        return { ...base, center: 1.0, expansion: 1.2, invasion: 1.8, blocking: 0.5, territory: 0.4, gap: 0.7, blockHuman: 1.5 };
      default:
        return base;
    }
  }

  private getDifficultyWeights(gamePhase: GamePhase) {
    const phaseMultipliers = this.getPhaseMultipliers(gamePhase);
    const mod = this.getStrategyModifiers();

    switch (this.difficulty) {
      case 'easy':
        return {
          centerWeight: 0.3 * phaseMultipliers.center * mod.center,
          surroundingWeight: 0.3,
          connectionWeight: 0.3 * mod.connection,
          expansionWeight: 0.2 * phaseMultipliers.expansion * mod.expansion,
          pieceSizeWeight: 0.3 * phaseMultipliers.pieceSize * mod.pieceSize,
          blockHumanWeight: 0.2 * mod.blockHuman,
          blockingWeight: 0.0 * mod.blocking,
          invasionWeight: 0.0 * mod.invasion,
          territoryWeight: 0.0 * mod.territory,
          gapWeight: 0.0 * mod.gap,
          specialTileWeight: 0.3,
          edgeControlWeight: 0.0,
          barrierPenaltyWeight: 0.2,
        };
      case 'medium':
        return {
          centerWeight: 0.5 * phaseMultipliers.center * mod.center,
          surroundingWeight: 0.8,
          connectionWeight: 1.0 * mod.connection,
          expansionWeight: 2.5 * phaseMultipliers.expansion * mod.expansion,
          pieceSizeWeight: 0.6 * phaseMultipliers.pieceSize * mod.pieceSize,
          blockHumanWeight: 1.2 * mod.blockHuman,
          blockingWeight: 0.4 * phaseMultipliers.blocking * mod.blocking,
          invasionWeight: 0.6 * mod.invasion,
          territoryWeight: 0.4 * mod.territory,
          gapWeight: 0.5 * mod.gap,
          specialTileWeight: 1.0,
          edgeControlWeight: 0.4,
          barrierPenaltyWeight: 0.5,
        };
      case 'hard':
        return {
          centerWeight: 0.4 * phaseMultipliers.center * mod.center,
          surroundingWeight: 1.0,
          connectionWeight: 1.2 * mod.connection,
          expansionWeight: 3.5 * phaseMultipliers.expansion * mod.expansion,
          pieceSizeWeight: 0.8 * phaseMultipliers.pieceSize * mod.pieceSize,
          blockHumanWeight: 1.8 * mod.blockHuman,
          blockingWeight: 0.6 * phaseMultipliers.blocking * mod.blocking,
          invasionWeight: 1.0 * mod.invasion,
          territoryWeight: 0.5 * mod.territory,
          gapWeight: 0.8 * mod.gap,
          specialTileWeight: 1.8,
          edgeControlWeight: 0.7,
          barrierPenaltyWeight: 0.8,
        };
      default:
        return {
          centerWeight: 0.5 * mod.center,
          surroundingWeight: 0.8,
          connectionWeight: 1.0 * mod.connection,
          expansionWeight: 2.5 * phaseMultipliers.expansion * mod.expansion,
          pieceSizeWeight: 0.6 * mod.pieceSize,
          blockHumanWeight: 1.2 * mod.blockHuman,
          blockingWeight: 0.4 * mod.blocking,
          invasionWeight: 0.6 * mod.invasion,
          territoryWeight: 0.4 * mod.territory,
          gapWeight: 0.5 * mod.gap,
          specialTileWeight: 1.0,
          edgeControlWeight: 0.4,
          barrierPenaltyWeight: 0.5,
        };
    }
  }

  private getPhaseMultipliers(gamePhase: GamePhase) {
    switch (gamePhase) {
      case 'early':
        return { center: 1.5, expansion: 1.8, pieceSize: 1.4, blocking: 0.3 };
      case 'mid':
        return { center: 1.0, expansion: 1.4, pieceSize: 1.0, blocking: 1.2 };
      case 'late':
        return { center: 0.4, expansion: 1.0, pieceSize: 0.5, blocking: 1.5 };
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
