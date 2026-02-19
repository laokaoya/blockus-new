// 创意模式数据类型定义

import { PlayerColor } from './game';

// ==================== 特殊方格 ====================

export type SpecialTileType = 'gold' | 'purple' | 'red' | 'barrier';

export interface SpecialTile {
  x: number;
  y: number;
  type: SpecialTileType;
  used: boolean; // 是否已被触发
}

// ==================== 效果池 ====================

export type GoldEffectId =
  | 'gold_plus3'
  | 'gold_plus6'
  | 'gold_plus10'
  | 'gold_next_double'
  | 'gold_free_card'
  | 'gold_extra_turn'
  | 'gold_score_shield'
  | 'gold_global_bonus'
  | 'gold_purple_upgrade'
  | 'gold_territory';

export type PurpleEffectId =
  | 'purple_plus5'
  | 'purple_plus2'
  | 'purple_minus3'
  | 'purple_minus1'
  | 'purple_minus10'
  | 'purple_next_double'
  | 'purple_skip'
  | 'purple_free_card'
  | 'purple_time5s'
  | 'purple_nothing'
  | 'purple_score_swap'
  | 'purple_score_average'
  | 'purple_remove_piece';

export type RedEffectId =
  | 'red_minus3'
  | 'red_minus5'
  | 'red_minus10'
  | 'red_skip'
  | 'red_time5s'
  | 'red_remove_piece'
  | 'red_half_score'
  | 'red_undo_last'
  | 'red_big_piece_ban'
  | 'red_total_08';

export type TileEffectId = GoldEffectId | PurpleEffectId | RedEffectId;

export interface TileEffect {
  id: TileEffectId;
  name: string;       // 显示名称
  description: string; // 效果描述
  type: SpecialTileType;
}

// ==================== 道具卡 ====================

export type ItemCardId =
  | 'item_blackhole'
  | 'item_shrink'
  | 'item_curse'
  | 'item_steel'
  | 'item_freeze'
  | 'item_pressure'
  | 'item_plunder'
  | 'item_blame';

export interface ItemCard {
  id: string;        // 唯一实例 ID
  cardType: ItemCardId;
  name: string;
  description: string;
  needsTarget: boolean; // 是否需要选择目标玩家
}

// ==================== 玩家状态buff/debuff ====================

export type StatusEffectType =
  | 'next_double'     // 下回合得分×2
  | 'score_shield'    // 得分护盾（N回合内分数不减少）
  | 'skip_turn'       // 下回合被跳过
  | 'time_pressure'   // 下回合只有5秒
  | 'half_score'      // 下回合得分×0.5
  | 'big_piece_ban'   // N回合不能用4格以上棋子
  | 'steel'           // 钢铁护盾（免疫负面）
  | 'purple_upgrade'  // 紫色方格变金色
  | 'chain_piece_size'; // 连锁：记录上回合棋子格数

export interface StatusEffect {
  type: StatusEffectType;
  remainingTurns: number;
  value?: number; // 额外数据（如连锁的棋子格数）
}

// ==================== 创意模式游戏状态扩展 ====================

export interface CreativePlayerState {
  playerId: string;
  color: PlayerColor;
  itemCards: ItemCard[];      // 持有的道具卡（最多3张）
  statusEffects: StatusEffect[];
}

export interface CreativeGameState {
  specialTiles: SpecialTile[];
  creativePlayers: CreativePlayerState[];
  itemPhase: boolean;         // 当前是否处于道具使用阶段
  itemPhaseTimeLeft: number;  // 道具阶段剩余时间
  pendingEffect: PendingEffect | null; // 等待展示的效果
  lastTriggeredTile: SpecialTile | null;
}

export interface PendingEffect {
  effectId: TileEffectId;
  tileType: SpecialTileType;
  resolved: boolean;
}

// ==================== 效果池定义 ====================

export const GOLD_EFFECTS: TileEffect[] = [
  { id: 'gold_plus3',          name: '+3',         description: '额外获得3分', type: 'gold' },
  { id: 'gold_plus6',          name: '+6',         description: '额外获得6分', type: 'gold' },
  { id: 'gold_plus10',         name: '+10',        description: '额外获得10分', type: 'gold' },
  { id: 'gold_next_double',    name: '×2',         description: '下回合得分翻倍', type: 'gold' },
  { id: 'gold_free_card',      name: '道具卡',     description: '免费获得一张道具卡', type: 'gold' },
  { id: 'gold_extra_turn',     name: '额外回合',   description: '本回合后立即再行动一次', type: 'gold' },
  { id: 'gold_score_shield',   name: '得分护盾',   description: '2回合内分数不会减少', type: 'gold' },
  { id: 'gold_global_bonus',   name: '全局加分',   description: '已放棋子每块+1分', type: 'gold' },
  { id: 'gold_purple_upgrade', name: '透视',       description: '2回合内紫色方格变为金色效果', type: 'gold' },
  { id: 'gold_territory',      name: '领地扩张',   description: '在己方棋子旁免费放一个1×1方块', type: 'gold' },
];

export const PURPLE_EFFECTS: TileEffect[] = [
  { id: 'purple_plus5',         name: '+5',         description: '额外获得5分', type: 'purple' },
  { id: 'purple_plus2',         name: '+2',         description: '额外获得2分', type: 'purple' },
  { id: 'purple_minus3',        name: '-3',         description: '扣除3分', type: 'purple' },
  { id: 'purple_minus1',        name: '-1',         description: '扣除1分', type: 'purple' },
  { id: 'purple_minus10',       name: '-10',        description: '扣除10分', type: 'purple' },
  { id: 'purple_next_double',   name: '×2',         description: '下回合得分翻倍', type: 'purple' },
  { id: 'purple_skip',          name: '跳过',       description: '下回合被跳过', type: 'purple' },
  { id: 'purple_free_card',     name: '道具卡',     description: '获得一张道具卡', type: 'purple' },
  { id: 'purple_time5s',        name: '5秒',        description: '下回合只有5秒', type: 'purple' },
  { id: 'purple_nothing',       name: '无事发生',   description: '什么都没有发生', type: 'purple' },
  { id: 'purple_score_swap',    name: '分数互换',   description: '与最高分玩家互换分数', type: 'purple' },
  { id: 'purple_score_average', name: '均分',       description: '所有玩家分数变为平均分', type: 'purple' },
  { id: 'purple_remove_piece',  name: '棋子丢失',   description: '随机移除一个未使用棋子', type: 'purple' },
];

export const RED_EFFECTS: TileEffect[] = [
  { id: 'red_minus3',       name: '-3 + 道具卡',     description: '扣3分，但获得一张道具卡', type: 'red' },
  { id: 'red_minus5',       name: '-5 + 道具卡',     description: '扣5分，但获得一张道具卡', type: 'red' },
  { id: 'red_minus10',      name: '-10 + 道具卡',    description: '扣10分，但获得一张道具卡', type: 'red' },
  { id: 'red_skip',         name: '跳过 + 道具卡',   description: '下回合被跳过，但获得道具卡', type: 'red' },
  { id: 'red_time5s',       name: '5秒 + 道具卡',    description: '下回合只有5秒，但获得道具卡', type: 'red' },
  { id: 'red_remove_piece', name: '丢棋 + 道具卡',   description: '移除最大未使用棋子，但获得道具卡', type: 'red' },
  { id: 'red_half_score',   name: '×0.5 + 道具卡',   description: '下回合得分减半，但获得道具卡', type: 'red' },
  { id: 'red_undo_last',    name: '回收 + 道具卡',   description: '最近放置的棋子被清除，但获得道具卡', type: 'red' },
  { id: 'red_big_piece_ban',name: '限制 + 道具卡',   description: '2回合不能用4格以上棋子，但获得道具卡', type: 'red' },
  { id: 'red_total_08',     name: '×0.8 + 道具卡',   description: '总分×0.8，但获得道具卡', type: 'red' },
];

export const ITEM_CARD_DEFS: Omit<ItemCard, 'id'>[] = [
  { cardType: 'item_blackhole', name: '黑洞',   description: '清除目标最近放置的棋子', needsTarget: true },
  { cardType: 'item_shrink',    name: '缩减',   description: '移除目标最大的未使用棋子', needsTarget: true },
  { cardType: 'item_curse',     name: '诅咒',   description: '目标下回合得分×0.5', needsTarget: true },
  { cardType: 'item_steel',     name: '钢铁',   description: '自己2回合免疫负面效果和道具', needsTarget: false },
  { cardType: 'item_freeze',    name: '冰冻',   description: '目标下回合被跳过', needsTarget: true },
  { cardType: 'item_pressure',  name: '压迫',   description: '目标下回合只有5秒', needsTarget: true },
  { cardType: 'item_plunder',   name: '掠夺',   description: '从目标偷取3分', needsTarget: true },
  { cardType: 'item_blame',     name: '嫁祸',   description: '把自己的一个负面状态转移给目标', needsTarget: true },
];
