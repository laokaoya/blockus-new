// 创意模式引擎：方格生成、效果触发、道具逻辑

import {
  SpecialTile, SpecialTileType, CreativePlayerState, CreativeGameState,
  TileEffect, TileEffectId, ItemCard, ItemCardId, StatusEffect, StatusEffectType,
  GOLD_EFFECTS, PURPLE_EFFECTS, RED_EFFECTS, ITEM_CARD_DEFS,
  GoldEffectId, PurpleEffectId, RedEffectId,
} from '../types/creative';
import { Player, PlayerColor } from '../types/game';

const BOARD_SIZE = 20;
const SAFE_ZONE_RADIUS = 3; // 四角起始点附近不生成特殊方格
const MIN_TILE_DISTANCE = 2; // 特殊方格之间最小间隔（曼哈顿距离）

// ==================== 方格生成 ====================

const STARTING_CORNERS = [
  { x: 0, y: 0 },
  { x: BOARD_SIZE - 1, y: 0 },
  { x: 0, y: BOARD_SIZE - 1 },
  { x: BOARD_SIZE - 1, y: BOARD_SIZE - 1 },
];

function isInSafeZone(x: number, y: number): boolean {
  return STARTING_CORNERS.some(
    corner => Math.abs(x - corner.x) < SAFE_ZONE_RADIUS && Math.abs(y - corner.y) < SAFE_ZONE_RADIUS
  );
}

function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function isFarEnoughFromExisting(x: number, y: number, existing: SpecialTile[]): boolean {
  return existing.every(t => manhattanDistance(x, y, t.x, t.y) >= MIN_TILE_DISTANCE);
}

/**
 * 生成特殊方格（10-14个）
 * 权重: gold 20%, purple 40%, red 25%, barrier 15%
 */
export function generateSpecialTiles(): SpecialTile[] {
  const count = 10 + Math.floor(Math.random() * 5); // 10-14
  const tiles: SpecialTile[] = [];

  // 候选位置池
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!isInSafeZone(x, y)) {
        candidates.push({ x, y });
      }
    }
  }

  // 打乱候选位置
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 屏障最多 3 个
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

function rollTileType(barrierCapped: boolean): SpecialTileType {
  const r = Math.random();
  if (barrierCapped) {
    // 排除 barrier 后重新分配: gold 23.5%, purple 47%, red 29.5%
    if (r < 0.235) return 'gold';
    if (r < 0.705) return 'purple';
    return 'red';
  }
  if (r < 0.20) return 'gold';
  if (r < 0.60) return 'purple';
  if (r < 0.85) return 'red';
  return 'barrier';
}

// ==================== 效果抽取 ====================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollGoldEffect(): TileEffect {
  return pickRandom(GOLD_EFFECTS);
}

export function rollPurpleEffect(hasPurpleUpgrade: boolean): TileEffect {
  if (hasPurpleUpgrade) {
    return pickRandom(GOLD_EFFECTS); // 透视状态下紫色方格抽金色池
  }
  return pickRandom(PURPLE_EFFECTS);
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

// ==================== 效果执行 ====================

export interface EffectResult {
  scoreChange: number;                   // 当前玩家分数变化
  allPlayersScoreChange?: Record<string, number>; // 所有玩家分数变化（如均分）
  newStatusEffects?: StatusEffect[];     // 添加给当前玩家的状态
  grantItemCard?: boolean;               // 是否发道具卡
  extraTurn?: boolean;                   // 是否获得额外回合
  removePiece?: 'largest' | 'random';    // 移除棋子类型
  undoLastMove?: boolean;                // 回收最近放置
  territoryExpand?: boolean;             // 领地扩张
  globalBonus?: boolean;                 // 全局加分（已放棋子每块+1）
  setAllScoresToAverage?: boolean;       // 所有玩家分数变为平均
  swapScoreWithHighest?: boolean;        // 与最高分互换
}

export function resolveEffect(
  effectId: TileEffectId,
  currentPlayer: Player,
  allPlayers: Player[],
  creativeState: CreativePlayerState,
): EffectResult {
  const result: EffectResult = { scoreChange: 0 };
  const hasShield = creativeState.statusEffects.some(
    e => e.type === 'score_shield' && e.remainingTurns > 0
  );
  const hasSteel = creativeState.statusEffects.some(
    e => e.type === 'steel' && e.remainingTurns > 0
  );

  switch (effectId) {
    // ===== 金色效果 =====
    case 'gold_plus3':  result.scoreChange = 3; break;
    case 'gold_plus6':  result.scoreChange = 6; break;
    case 'gold_plus10': result.scoreChange = 10; break;
    case 'gold_next_double':
      result.newStatusEffects = [{ type: 'next_double', remainingTurns: 1, isNew: true }];
      break;
    case 'gold_free_card':
      result.grantItemCard = true;
      break;
    case 'gold_extra_turn':
      result.extraTurn = true;
      break;
    case 'gold_score_shield':
      result.newStatusEffects = [{ type: 'score_shield', remainingTurns: 2, isNew: true }];
      break;
    case 'gold_global_bonus':
      result.globalBonus = true;
      break;
    case 'gold_purple_upgrade':
      result.newStatusEffects = [{ type: 'purple_upgrade', remainingTurns: 2, isNew: true }];
      break;
    case 'gold_territory':
      result.territoryExpand = true;
      break;

    // ===== 紫色效果 =====
    case 'purple_plus5':  result.scoreChange = 5; break;
    case 'purple_plus2':  result.scoreChange = 2; break;
    case 'purple_minus3':
      result.scoreChange = hasShield || hasSteel ? 0 : -3;
      break;
    case 'purple_minus1':
      result.scoreChange = hasShield || hasSteel ? 0 : -1;
      break;
    case 'purple_minus10':
      result.scoreChange = hasShield || hasSteel ? 0 : -10;
      break;
    case 'purple_next_double':
      result.newStatusEffects = [{ type: 'next_double', remainingTurns: 1, isNew: true }];
      break;
    case 'purple_skip':
      if (!hasSteel) {
        result.newStatusEffects = [{ type: 'skip_turn', remainingTurns: 1, isNew: true }];
      }
      break;
    case 'purple_free_card':
      result.grantItemCard = true;
      break;
    case 'purple_time5s':
      if (!hasSteel) {
        result.newStatusEffects = [{ type: 'time_pressure', remainingTurns: 1, isNew: true }];
      }
      break;
    case 'purple_nothing':
      break;
    case 'purple_score_swap':
      result.swapScoreWithHighest = true;
      break;
    case 'purple_score_average':
      result.setAllScoresToAverage = true;
      break;
    case 'purple_remove_piece':
      if (!hasSteel) {
        result.removePiece = 'random';
      }
      break;

    // ===== 红色效果（负面 + 道具卡）=====
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
      if (!hasSteel) {
        result.newStatusEffects = [{ type: 'skip_turn', remainingTurns: 1, isNew: true }];
      }
      result.grantItemCard = true;
      break;
    case 'red_time5s':
      if (!hasSteel) {
        result.newStatusEffects = [{ type: 'time_pressure', remainingTurns: 1, isNew: true }];
      }
      result.grantItemCard = true;
      break;
    case 'red_remove_piece':
      if (!hasSteel) {
        result.removePiece = 'largest';
      }
      result.grantItemCard = true;
      break;
    case 'red_half_score':
      if (!hasSteel) {
        result.newStatusEffects = [{ type: 'half_score', remainingTurns: 1, isNew: true }];
      }
      result.grantItemCard = true;
      break;
    case 'red_undo_last':
      if (!hasSteel) {
        result.undoLastMove = true;
      }
      result.grantItemCard = true;
      break;
    case 'red_big_piece_ban':
      if (!hasSteel) {
        result.newStatusEffects = [{ type: 'big_piece_ban', remainingTurns: 2, isNew: true }];
      }
      result.grantItemCard = true;
      break;
    case 'red_total_08':
      if (!hasSteel && !hasShield) {
        result.scoreChange = -Math.floor(currentPlayer.score * 0.2);
      }
      result.grantItemCard = true;
      break;
  }

  return result;
}

// ==================== 道具卡执行 ====================

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
  _selfPlayer: Player,
  targetPlayer: Player | null,
  selfCreative: CreativePlayerState,
  targetCreative: CreativePlayerState | null,
): ItemResult {
  const result: ItemResult = {};

  // 检查目标是否有钢铁护盾
  const targetHasSteel = targetCreative?.statusEffects.some(
    e => e.type === 'steel' && e.remainingTurns > 0
  );

  switch (cardType) {
    case 'item_blackhole':
      if (!targetHasSteel) {
        result.targetUndoLastMove = true;
      }
      break;
    case 'item_shrink':
      if (!targetHasSteel) {
        result.targetRemovePiece = 'largest';
      }
      break;
    case 'item_curse':
      if (!targetHasSteel) {
        result.targetStatusEffects = [{ type: 'half_score', remainingTurns: 1 }];
      }
      break;
    case 'item_steel':
      result.selfStatusEffects = [{ type: 'steel', remainingTurns: 2 }];
      break;
    case 'item_freeze':
      if (!targetHasSteel) {
        result.targetStatusEffects = [{ type: 'skip_turn', remainingTurns: 1 }];
      }
      break;
    case 'item_pressure':
      if (!targetHasSteel) {
        result.targetStatusEffects = [{ type: 'time_pressure', remainingTurns: 1 }];
      }
      break;
    case 'item_plunder':
      if (!targetHasSteel && targetPlayer) {
        const stealAmount = Math.min(3, targetPlayer.score);
        result.targetScoreChange = -stealAmount;
        result.selfScoreChange = stealAmount;
      }
      break;
    case 'item_blame':
      if (!targetHasSteel) {
        result.transferDebuff = true;
      }
      break;
  }

  return result;
}

// ==================== 状态管理工具 ====================

/**
 * 回合结束时递减状态效果计数器，移除到期的效果。
 * isNew 标记的效果是本回合刚添加的，只清除标记不递减。
 */
export function tickStatusEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map(e => {
      if (e.isNew) return { ...e, isNew: false };
      return { ...e, remainingTurns: e.remainingTurns - 1 };
    })
    .filter(e => e.remainingTurns > 0);
}

/**
 * 给玩家添加道具卡（最多持有3张，多了丢弃最早的）
 */
export function addItemCard(cards: ItemCard[], newCard: ItemCard): ItemCard[] {
  const updated = [...cards, newCard];
  if (updated.length > 3) {
    return updated.slice(updated.length - 3);
  }
  return updated;
}

/**
 * 检查棋子放置后覆盖了哪些特殊方格
 */
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

/**
 * 领地扩张：在己方棋子对角方向找一个空位放置 1×1 方块
 * 返回放置的坐标，失败返回 null
 */
export function findTerritoryExpansionCell(board: number[][], colorIndex: number): { x: number; y: number } | null {
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const adjacents = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const candidates: { x: number; y: number }[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== 0) continue;
      // 必须与同色棋子对角相邻
      const hasDiag = diagonals.some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === colorIndex;
      });
      if (!hasDiag) continue;
      // 不能与同色棋子边相邻
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

/**
 * 初始化创意模式玩家状态
 */
export function initCreativePlayerStates(players: Player[]): CreativePlayerState[] {
  return players.map(p => ({
    playerId: p.id,
    color: p.color,
    itemCards: [],
    statusEffects: [],
    bonusScore: 0,
  }));
}

/**
 * AI 决定是否使用道具卡
 * 简单策略：有道具就随机对最高分对手使用，钢铁留给自己
 */
export function aiDecideItemCard(
  aiCreative: CreativePlayerState,
  allPlayers: Player[],
  allCreative: CreativePlayerState[],
): { cardIndex: number; targetPlayerId: string | null } | null {
  if (aiCreative.itemCards.length === 0) return null;

  // 30% 概率不使用道具
  if (Math.random() < 0.3) return null;

  const card = aiCreative.itemCards[0]; // 使用最早的道具

  if (card.cardType === 'item_steel') {
    return { cardIndex: 0, targetPlayerId: null };
  }

  if (card.cardType === 'item_blame') {
    const hasDebuff = aiCreative.statusEffects.some(e =>
      ['skip_turn', 'time_pressure', 'half_score', 'big_piece_ban'].includes(e.type)
    );
    if (!hasDebuff) return null; // 没有负面状态，不用嫁祸
  }

  // 找最高分的对手
  const opponents = allPlayers.filter(p => p.id !== aiCreative.playerId);
  if (opponents.length === 0) return null;

  const topOpponent = opponents.reduce((a, b) => a.score > b.score ? a : b);
  return { cardIndex: 0, targetPlayerId: topOpponent.id };
}
