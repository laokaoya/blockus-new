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
        const stealAmount = Math.min(3, Math.max(0, targetPlayer.score));
        result.targetScoreChange = -3;
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
 * AI 决定是否使用道具卡 — 按难度区分策略
 */
export function aiDecideItemCard(
  aiCreative: CreativePlayerState,
  allPlayers: Player[],
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
  const hasSteel = aiCreative.statusEffects.some(
    e => e.type === 'steel' && e.remainingTurns > 0
  );

  // === Easy: 50% skip, random card, random target ===
  if (difficulty === 'easy') {
    if (Math.random() < 0.5) return null;
    const idx = Math.floor(Math.random() * aiCreative.itemCards.length);
    const card = aiCreative.itemCards[idx];
    if (!card.needsTarget) return { cardIndex: idx, targetPlayerId: null };
    if (card.cardType === 'item_blame' && !hasDebuff) return null;
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    return { cardIndex: idx, targetPlayerId: target.id };
  }

  // === Medium & Hard: score each card and pick the best ===
  let bestCardIndex = -1;
  let bestCardScore = -Infinity;
  let bestTarget: string | null = null;

  for (let i = 0; i < aiCreative.itemCards.length; i++) {
    const card = aiCreative.itemCards[i];
    const { score: cardScore, targetId } = evaluateCard(
      card, aiCreative, allPlayers, allCreative, myScore, opponents,
      hasDebuff, hasSteel, specialTiles, difficulty,
    );
    if (cardScore > bestCardScore) {
      bestCardScore = cardScore;
      bestCardIndex = i;
      bestTarget = targetId;
    }
  }

  // Medium: 15% chance to skip even with a good card
  if (difficulty === 'medium' && Math.random() < 0.15) return null;
  // Only use if there's positive value
  if (bestCardScore <= 0 || bestCardIndex < 0) return null;

  return { cardIndex: bestCardIndex, targetPlayerId: bestTarget };
}

function evaluateCard(
  card: import('../types/creative').ItemCard,
  aiCreative: CreativePlayerState,
  allPlayers: Player[],
  allCreative: CreativePlayerState[],
  myScore: number,
  opponents: Player[],
  hasDebuff: boolean,
  hasSteel: boolean,
  specialTiles: SpecialTile[],
  difficulty: 'easy' | 'medium' | 'hard',
): { score: number; targetId: string | null } {
  const opponentsWithCreative = opponents.map(p => ({
    player: p,
    creative: allCreative.find(c => c.playerId === p.id),
  }));

  const topOpponent = opponents.reduce((a, b) => a.score > b.score ? a : b);
  const topScore = topOpponent.score + (allCreative.find(c => c.playerId === topOpponent.id)?.bonusScore ?? 0);
  const scoreDiff = myScore - topScore;

  switch (card.cardType) {
    case 'item_steel': {
      // High value if we're near red tiles or have debuffs
      const nearRedTiles = specialTiles.filter(t => t.type === 'red' && !t.used).length;
      if (hasSteel) return { score: -1, targetId: null };
      let value = 10;
      if (nearRedTiles > 0) value += nearRedTiles * 15;
      if (hasDebuff) value += 20;
      return { score: value, targetId: null };
    }

    case 'item_blame': {
      if (!hasDebuff) return { score: -1, targetId: null };
      // Transfer debuff to the leading opponent
      const target = findBestTarget(opponentsWithCreative, 'highest_score');
      return { score: 35, targetId: target };
    }

    case 'item_plunder': {
      // Steal from the closest scoring opponent for max relative gain
      const sorted = [...opponents].sort((a, b) => {
        const diffA = Math.abs(a.score - myScore);
        const diffB = Math.abs(b.score - myScore);
        return diffA - diffB;
      });
      const closest = sorted.find(p => p.score > 0) ?? topOpponent;
      const stealAmount = Math.min(3, closest.score);
      const targetCreative = allCreative.find(c => c.playerId === closest.id);
      if (targetCreative?.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0)) {
        return { score: -1, targetId: null };
      }
      let value = stealAmount * 2 + 5;
      if (scoreDiff < -5) value += 10;
      return { score: value, targetId: closest.id };
    }

    case 'item_freeze': {
      // Freeze the most threatening opponent
      const target = findBestTarget(opponentsWithCreative, 'highest_score_no_steel');
      if (!target) return { score: -1, targetId: null };
      let value = 25;
      if (difficulty === 'hard' && scoreDiff < 0) value += 10;
      return { score: value, targetId: target };
    }

    case 'item_curse': {
      const target = findBestTarget(opponentsWithCreative, 'highest_score_no_steel');
      if (!target) return { score: -1, targetId: null };
      return { score: 20, targetId: target };
    }

    case 'item_shrink': {
      // Target the opponent with the most large unused pieces
      const targetData = opponentsWithCreative
        .filter(o => !o.creative?.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0))
        .map(o => {
          const largePieces = o.player.pieces.filter(p => !p.isUsed && p.type >= 4).length;
          return { id: o.player.id, largePieces };
        })
        .sort((a, b) => b.largePieces - a.largePieces);
      if (targetData.length === 0 || targetData[0].largePieces === 0) return { score: 5, targetId: topOpponent.id };
      return { score: 15 + targetData[0].largePieces * 2, targetId: targetData[0].id };
    }

    case 'item_blackhole': {
      const target = findBestTarget(opponentsWithCreative, 'highest_score_no_steel');
      if (!target) return { score: -1, targetId: null };
      return { score: 22, targetId: target };
    }

    case 'item_pressure': {
      const target = findBestTarget(opponentsWithCreative, 'highest_score_no_steel');
      if (!target) return { score: -1, targetId: null };
      return { score: 15, targetId: target };
    }

    default:
      return { score: 5, targetId: topOpponent.id };
  }
}

function findBestTarget(
  opponentsWithCreative: Array<{ player: Player; creative: CreativePlayerState | undefined }>,
  strategy: 'highest_score' | 'highest_score_no_steel',
): string | null {
  let candidates = opponentsWithCreative;
  if (strategy === 'highest_score_no_steel') {
    candidates = candidates.filter(
      o => !o.creative?.statusEffects.some(e => e.type === 'steel' && e.remainingTurns > 0)
    );
  }
  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => a.player.score > b.player.score ? a : b);
  return best.player.id;
}
