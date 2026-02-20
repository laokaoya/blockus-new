// 创意模式引擎 - 服务端版本，与前端逻辑一致

import {
  SpecialTile, SpecialTileType, CreativePlayerState, CreativeGameState,
  TileEffect, TileEffectId, ItemCard, ItemCardId, StatusEffect,
  GOLD_EFFECTS, PURPLE_EFFECTS, RED_EFFECTS, ITEM_CARD_DEFS,
} from './creativeTypes';
import { PlayerColor, Piece } from '../types';

const BOARD_SIZE = 20;
const SAFE_ZONE_RADIUS = 3;
const MIN_TILE_DISTANCE = 2;

const STARTING_CORNERS = [
  { x: 0, y: 0 },
  { x: BOARD_SIZE - 1, y: 0 },
  { x: 0, y: BOARD_SIZE - 1 },
  { x: BOARD_SIZE - 1, y: BOARD_SIZE - 1 },
];

function isInSafeZone(x: number, y: number): boolean {
  return STARTING_CORNERS.some(
    c => Math.abs(x - c.x) < SAFE_ZONE_RADIUS && Math.abs(y - c.y) < SAFE_ZONE_RADIUS
  );
}

function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function isFarEnoughFromExisting(x: number, y: number, existing: SpecialTile[]): boolean {
  return existing.every(t => manhattanDistance(x, y, t.x, t.y) >= MIN_TILE_DISTANCE);
}

function rollTileType(barrierCapped: boolean): SpecialTileType {
  const r = Math.random();
  if (barrierCapped) {
    if (r < 0.235) return 'gold';
    if (r < 0.705) return 'purple';
    return 'red';
  }
  if (r < 0.20) return 'gold';
  if (r < 0.60) return 'purple';
  if (r < 0.85) return 'red';
  return 'barrier';
}

export function generateSpecialTiles(): SpecialTile[] {
  const count = 10 + Math.floor(Math.random() * 5);
  const tiles: SpecialTile[] = [];
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!isInSafeZone(x, y)) candidates.push({ x, y });
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  let barrierCount = 0;
  const MAX_BARRIERS = 3;
  for (const pos of candidates) {
    if (tiles.length >= count) break;
    if (!isFarEnoughFromExisting(pos.x, pos.y, tiles)) continue;
    const tileType = rollTileType(barrierCount >= MAX_BARRIERS);
    if (tileType === 'barrier') barrierCount++;
    tiles.push({ x: pos.x, y: pos.y, type: tileType, used: false });
  }
  return tiles;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollGoldEffect(): TileEffect {
  return pickRandom(GOLD_EFFECTS);
}

export function rollPurpleEffect(hasPurpleUpgrade: boolean): TileEffect {
  return hasPurpleUpgrade ? pickRandom(GOLD_EFFECTS) : pickRandom(PURPLE_EFFECTS);
}

export function rollRedEffect(): TileEffect {
  return pickRandom(RED_EFFECTS);
}

export function rollItemCard(): ItemCard {
  const def = pickRandom(ITEM_CARD_DEFS);
  return {
    ...def,
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

// 服务端用简化 Player 接口（id, color, score）
export interface PlayerLike {
  id: string;
  color: PlayerColor;
  score: number;
  pieces?: Piece[];
}

export interface EffectResult {
  scoreChange: number;
  allPlayersScoreChange?: Record<string, number>;
  newStatusEffects?: StatusEffect[];
  grantItemCard?: boolean;
  extraTurn?: boolean;
  removePiece?: 'largest' | 'random';
  undoLastMove?: boolean;
  territoryExpand?: boolean;
  globalBonus?: boolean;
  setAllScoresToAverage?: boolean;
  swapScoreWithHighest?: boolean;
}

export function resolveEffect(
  effectId: TileEffectId,
  currentPlayer: PlayerLike,
  _allPlayers: PlayerLike[],
  creativeState: CreativePlayerState,
): EffectResult {
  const result: EffectResult = { scoreChange: 0 };
  const hasShield = creativeState.statusEffects.some(e => e.type === 'score_shield' && e.remainingTurns > 0);
  const hasSteel = creativeState.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0);

  switch (effectId) {
    case 'gold_plus3': result.scoreChange = 3; break;
    case 'gold_plus6': result.scoreChange = 6; break;
    case 'gold_plus10': result.scoreChange = 10; break;
    case 'gold_next_double':
      result.newStatusEffects = [{ type: 'next_double', remainingTurns: 1, isNew: true }];
      break;
    case 'gold_free_card': result.grantItemCard = true; break;
    case 'gold_extra_turn': result.extraTurn = true; break;
    case 'gold_score_shield':
      result.newStatusEffects = [{ type: 'score_shield', remainingTurns: 2, isNew: true }];
      break;
    case 'gold_global_bonus': result.globalBonus = true; break;
    case 'gold_purple_upgrade':
      result.newStatusEffects = [{ type: 'purple_upgrade', remainingTurns: 2, isNew: true }];
      break;
    case 'gold_territory': result.territoryExpand = true; break;

    case 'purple_plus5': result.scoreChange = 5; break;
    case 'purple_plus2': result.scoreChange = 2; break;
    case 'purple_minus3': result.scoreChange = hasShield || hasSteel ? 0 : -3; break;
    case 'purple_minus1': result.scoreChange = hasShield || hasSteel ? 0 : -1; break;
    case 'purple_minus10': result.scoreChange = hasShield || hasSteel ? 0 : -10; break;
    case 'purple_next_double':
      result.newStatusEffects = [{ type: 'next_double', remainingTurns: 1, isNew: true }];
      break;
    case 'purple_skip':
      if (!hasSteel) result.newStatusEffects = [{ type: 'skip_turn', remainingTurns: 1, isNew: true }];
      break;
    case 'purple_free_card': result.grantItemCard = true; break;
    case 'purple_time5s':
      if (!hasSteel) result.newStatusEffects = [{ type: 'time_pressure', remainingTurns: 1, isNew: true }];
      break;
    case 'purple_nothing': break;
    case 'purple_score_swap': result.swapScoreWithHighest = true; break;
    case 'purple_score_average': result.setAllScoresToAverage = true; break;
    case 'purple_remove_piece':
      if (!hasSteel) result.removePiece = 'random';
      break;

    case 'red_minus3':
      result.scoreChange = hasShield || hasSteel ? 0 : -3;
      result.grantItemCard = true;
      break;
    case 'red_minus5':
      result.scoreChange = hasShield || hasSteel ? 0 : -5;
      result.grantItemCard = true;
      break;
    case 'red_minus10':
      result.scoreChange = hasShield || hasSteel ? 0 : -10;
      result.grantItemCard = true;
      break;
    case 'red_skip':
      if (!hasSteel) result.newStatusEffects = [{ type: 'skip_turn', remainingTurns: 1, isNew: true }];
      result.grantItemCard = true;
      break;
    case 'red_time5s':
      if (!hasSteel) result.newStatusEffects = [{ type: 'time_pressure', remainingTurns: 1, isNew: true }];
      result.grantItemCard = true;
      break;
    case 'red_remove_piece':
      if (!hasSteel) result.removePiece = 'largest';
      result.grantItemCard = true;
      break;
    case 'red_half_score':
      if (!hasSteel) result.newStatusEffects = [{ type: 'half_score', remainingTurns: 1, isNew: true }];
      result.grantItemCard = true;
      break;
    case 'red_undo_last':
      if (!hasSteel) result.undoLastMove = true;
      result.grantItemCard = true;
      break;
    case 'red_big_piece_ban':
      if (!hasSteel) result.newStatusEffects = [{ type: 'big_piece_ban', remainingTurns: 2, isNew: true }];
      result.grantItemCard = true;
      break;
    case 'red_total_08':
      if (!hasSteel && !hasShield) result.scoreChange = -Math.floor(currentPlayer.score * 0.2);
      result.grantItemCard = true;
      break;
  }
  return result;
}

export interface ItemResult {
  targetScoreChange?: number;
  selfScoreChange?: number;
  targetStatusEffects?: StatusEffect[];
  selfStatusEffects?: StatusEffect[];
  targetRemovePiece?: 'largest';
  targetUndoLastMove?: boolean;
  transferDebuff?: boolean;
}

export function resolveItemCard(
  cardType: ItemCardId,
  _selfPlayer: PlayerLike,
  targetPlayer: PlayerLike | null,
  selfCreative: CreativePlayerState,
  targetCreative: CreativePlayerState | null,
): ItemResult {
  const result: ItemResult = {};
  const targetHasSteel = targetCreative?.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0);

  switch (cardType) {
    case 'item_blackhole':
      if (!targetHasSteel) result.targetUndoLastMove = true;
      break;
    case 'item_shrink':
      if (!targetHasSteel) result.targetRemovePiece = 'largest';
      break;
    case 'item_curse':
      if (!targetHasSteel) result.targetStatusEffects = [{ type: 'half_score', remainingTurns: 1 }];
      break;
    case 'item_steel':
      result.selfStatusEffects = [{ type: 'steel', remainingTurns: 2 }];
      break;
    case 'item_freeze':
      if (!targetHasSteel) result.targetStatusEffects = [{ type: 'skip_turn', remainingTurns: 1 }];
      break;
    case 'item_pressure':
      if (!targetHasSteel) result.targetStatusEffects = [{ type: 'time_pressure', remainingTurns: 1 }];
      break;
    case 'item_plunder':
      if (!targetHasSteel && targetPlayer) {
        const stealAmount = Math.min(3, targetPlayer.score);
        result.targetScoreChange = -stealAmount;
        result.selfScoreChange = stealAmount;
      }
      break;
    case 'item_blame':
      if (!targetHasSteel) result.transferDebuff = true;
      break;
  }
  return result;
}

export function tickStatusEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map(e => (e.isNew ? { ...e, isNew: false } : { ...e, remainingTurns: e.remainingTurns - 1 }))
    .filter(e => e.remainingTurns > 0);
}

export function addItemCard(cards: ItemCard[], newCard: ItemCard): ItemCard[] {
  const updated = [...cards, newCard];
  return updated.length > 3 ? updated.slice(updated.length - 3) : updated;
}

/** 检查落子是否与屏障格重叠 */
export function overlapsBarrier(
  shape: number[][],
  position: { x: number; y: number },
  specialTiles: SpecialTile[],
): boolean {
  const barriers = specialTiles.filter(t => t.type === 'barrier');
  for (let dy = 0; dy < shape.length; dy++) {
    for (let dx = 0; dx < shape[dy].length; dx++) {
      if (shape[dy][dx] !== 1) continue;
      const bx = position.x + dx;
      const by = position.y + dy;
      if (barriers.some(t => t.x === bx && t.y === by)) return true;
    }
  }
  return false;
}

/** 计算棋子格数 */
export function pieceCellCount(shape: number[][]): number {
  return shape.reduce((s, row) => s + row.reduce((a, c) => a + (c === 1 ? 1 : 0), 0), 0);
}

export function findTriggeredTiles(
  shape: number[][],
  position: { x: number; y: number },
  specialTiles: SpecialTile[],
): SpecialTile[] {
  const triggered: SpecialTile[] = [];
  for (let dy = 0; dy < shape.length; dy++) {
    for (let dx = 0; dx < shape[dy].length; dx++) {
      if (shape[dy][dx] !== 1) continue;
      const bx = position.x + dx;
      const by = position.y + dy;
      const tile = specialTiles.find(t => t.x === bx && t.y === by && !t.used);
      if (tile) triggered.push(tile);
    }
  }
  return triggered;
}

export function findTerritoryExpansionCell(board: number[][], colorIndex: number): { x: number; y: number } | null {
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const adjacents = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const candidates: { x: number; y: number }[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== 0) continue;
      const hasDiag = diagonals.some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === colorIndex;
      });
      if (!hasDiag) continue;
      const hasEdge = adjacents.some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === colorIndex;
      });
      if (hasEdge) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function initCreativePlayerStates(players: { id: string; color?: PlayerColor }[]): CreativePlayerState[] {
  const colors: PlayerColor[] = ['red', 'yellow', 'blue', 'green'];
  return players.map((p, i) => ({
    playerId: p.id,
    color: p.color || colors[i],
    itemCards: [],
    statusEffects: [],
    bonusScore: 0,
  }));
}

export function aiDecideItemCard(
  aiCreative: CreativePlayerState,
  allPlayers: PlayerLike[],
  allCreative: CreativePlayerState[],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  specialTiles: SpecialTile[] = [],
): { cardIndex: number; targetPlayerId: string | null } | null {
  if (aiCreative.itemCards.length === 0) return null;
  const opponents = allPlayers.filter(p => p.id !== aiCreative.playerId);
  if (opponents.length === 0) return null;

  const myScore = (allPlayers.find(p => p.id === aiCreative.playerId)?.score ?? 0) + aiCreative.bonusScore;
  const hasDebuff = aiCreative.statusEffects.some(e =>
    ['skip_turn', 'time_pressure', 'half_score', 'big_piece_ban'].includes(e.type)
  );
  const hasSteel = aiCreative.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0);

  if (difficulty === 'easy') {
    if (Math.random() < 0.5) return null;
    const idx = Math.floor(Math.random() * aiCreative.itemCards.length);
    const card = aiCreative.itemCards[idx];
    if (!card.needsTarget) return { cardIndex: idx, targetPlayerId: null };
    if (card.cardType === 'item_blame' && !hasDebuff) return null;
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    return { cardIndex: idx, targetPlayerId: target.id };
  }

  let bestCardIndex = -1;
  let bestCardScore = -Infinity;
  let bestTarget: string | null = null;

  for (let i = 0; i < aiCreative.itemCards.length; i++) {
    const card = aiCreative.itemCards[i];
    const topOpponent = opponents.reduce((a, b) => a.score > b.score ? a : b);
    const topScore = topOpponent.score + (allCreative.find(c => c.playerId === topOpponent.id)?.bonusScore ?? 0);
    const scoreDiff = myScore - topScore;

    let cardScore = 5;
    let targetId: string | null = topOpponent.id;

    switch (card.cardType) {
      case 'item_steel':
        if (hasSteel) cardScore = -1;
        else cardScore = 10 + (hasDebuff ? 20 : 0);
        targetId = null;
        break;
      case 'item_blame':
        if (!hasDebuff) cardScore = -1;
        else cardScore = 35;
        break;
      case 'item_plunder': {
        const closest = opponents.find(p => p.score > 0) ?? topOpponent;
        const stealAmount = Math.min(3, closest.score);
        const targetCreative = allCreative.find(c => c.playerId === closest.id);
        if (targetCreative?.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0)) cardScore = -1;
        else cardScore = stealAmount * 2 + 5 + (scoreDiff < -5 ? 10 : 0);
        targetId = closest.id;
        break;
      }
      case 'item_freeze':
      case 'item_curse':
      case 'item_blackhole':
      case 'item_pressure':
        cardScore = card.cardType === 'item_freeze' ? 25 : card.cardType === 'item_curse' ? 20 : card.cardType === 'item_blackhole' ? 22 : 15;
        break;
      case 'item_shrink':
        cardScore = 15;
        break;
    }

    if (cardScore > bestCardScore) {
      bestCardScore = cardScore;
      bestCardIndex = i;
      bestTarget = targetId;
    }
  }

  if (difficulty === 'medium' && Math.random() < 0.15) return null;
  if (bestCardScore <= 0 || bestCardIndex < 0) return null;

  return { cardIndex: bestCardIndex, targetPlayerId: bestTarget };
}
