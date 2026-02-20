// AI玩家算法

import { Piece, Position, PlayerColor } from '../types/game';
import { SpecialTile, ItemCard, CreativePlayerState } from '../types/creative';
import { canPlacePiece } from './gameEngine';
import { getUniqueTransformations } from './pieceTransformations';

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
  
  constructor(color: PlayerColor, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.color = color;
    this.colorIndex = this.getColorIndex(color);
    this.difficulty = difficulty;
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
  
  public makeMove(board: number[][], pieces: Piece[]): { piece: Piece; position: Position } | null {
    const totalPieces = pieces.length;
    const remaining = pieces.filter(p => !p.isUsed).length;
    const classicPhase = determineGamePhase(totalPieces - remaining, remaining, totalPieces);
    return this.makeMoveInternal(board, pieces, null, classicPhase);
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
  ): { piece: Piece; position: Position } | null {
    const availablePieces = pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return null;
    
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
    
    score += this.getCenterDistanceScore(x, y, board.length) * weights.centerWeight;
    score += this.getSurroundingScore(board, x, y, shape) * weights.surroundingWeight;
    score += this.getConnectionScore(board, x, y, shape) * weights.connectionWeight;
    score += this.getExpansionScore(board, x, y, shape) * weights.expansionWeight;
    score += this.getPieceSizeBonus(piece, gamePhase) * weights.pieceSizeWeight;
    score += this.getBlockingScore(board, x, y, shape) * weights.blockingWeight;
    score += this.getEdgeControlScore(board, x, y, shape, gamePhase) * weights.edgeControlWeight;

    if (creativeCtx) {
      score += this.getSpecialTileScore(shape, position, creativeCtx) * weights.specialTileWeight;
      score += this.getBarrierProximityPenalty(board, x, y, shape, creativeCtx) * weights.barrierPenaltyWeight;
    }
    
    return score;
  }

  private getDifficultyWeights(gamePhase: GamePhase) {
    const phaseMultipliers = this.getPhaseMultipliers(gamePhase);

    switch (this.difficulty) {
      case 'easy':
        return {
          centerWeight: 0.5 * phaseMultipliers.center,
          surroundingWeight: 0.3,
          connectionWeight: 0.2,
          expansionWeight: 0.1 * phaseMultipliers.expansion,
          pieceSizeWeight: 0.3 * phaseMultipliers.pieceSize,
          blockingWeight: 0.0,
          specialTileWeight: 0.3,
          edgeControlWeight: 0.0,
          barrierPenaltyWeight: 0.2,
        };
      case 'medium':
        return {
          centerWeight: 1.0 * phaseMultipliers.center,
          surroundingWeight: 1.0,
          connectionWeight: 1.0,
          expansionWeight: 0.8 * phaseMultipliers.expansion,
          pieceSizeWeight: 0.6 * phaseMultipliers.pieceSize,
          blockingWeight: 0.5 * phaseMultipliers.blocking,
          specialTileWeight: 1.0,
          edgeControlWeight: 0.4,
          barrierPenaltyWeight: 0.5,
        };
      case 'hard':
        return {
          centerWeight: 1.2 * phaseMultipliers.center,
          surroundingWeight: 1.3,
          connectionWeight: 1.2,
          expansionWeight: 1.5 * phaseMultipliers.expansion,
          pieceSizeWeight: 0.8 * phaseMultipliers.pieceSize,
          blockingWeight: 1.0 * phaseMultipliers.blocking,
          specialTileWeight: 1.8,
          edgeControlWeight: 0.7,
          barrierPenaltyWeight: 0.8,
        };
      default:
        return {
          centerWeight: 1.0,
          surroundingWeight: 1.0,
          connectionWeight: 1.0,
          expansionWeight: 0.8,
          pieceSizeWeight: 0.6,
          blockingWeight: 0.5,
          specialTileWeight: 1.0,
          edgeControlWeight: 0.4,
          barrierPenaltyWeight: 0.5,
        };
    }
  }

  private getPhaseMultipliers(gamePhase: GamePhase) {
    switch (gamePhase) {
      case 'early':
        return { center: 1.3, expansion: 1.5, pieceSize: 1.3, blocking: 0.3 };
      case 'mid':
        return { center: 1.0, expansion: 1.0, pieceSize: 1.0, blocking: 1.2 };
      case 'late':
        return { center: 0.5, expansion: 0.6, pieceSize: 0.5, blocking: 1.5 };
    }
  }
  
  private getCenterDistanceScore(x: number, y: number, boardSize: number): number {
    const centerX = Math.floor(boardSize / 2);
    const centerY = Math.floor(boardSize / 2);
    const distanceToCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(boardSize / 2, 2) * 2);
    return Math.max(0, (maxDistance - distanceToCenter)) * 15;
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

    return newCornerSpots * 6;
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
