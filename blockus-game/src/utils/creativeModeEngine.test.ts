/**
 * 创意模式引擎单元测试
 */
import { resolveItemCard } from './creativeModeEngine';
import type { CreativePlayerState } from '../types/creative';

const createCreativePlayer = (overrides?: Partial<CreativePlayerState>): CreativePlayerState => ({
  playerId: 'p1',
  color: 'red',
  itemCards: [],
  statusEffects: [],
  bonusScore: 0,
  ...overrides,
});

const mockPlayer = { id: 'p1', color: 'red', score: 10 };
const mockTarget = { id: 'p2', color: 'yellow', score: 15 };

describe('creativeModeEngine: resolveItemCard', () => {
  it('item_steel 给使用者添加免疫', () => {
    const self = createCreativePlayer();
    const result = resolveItemCard('item_steel', mockPlayer as any, null, self, null);
    expect(result.selfStatusEffects).toHaveLength(1);
    expect(result.selfStatusEffects![0].type).toBe('steel');
    expect(result.selfStatusEffects![0].remainingTurns).toBe(2);
  });

  it('item_curse 给目标添加减半效果', () => {
    const self = createCreativePlayer();
    const target = createCreativePlayer({ playerId: 'p2' });
    const result = resolveItemCard('item_curse', mockPlayer as any, mockTarget as any, self, target);
    expect(result.targetStatusEffects).toHaveLength(1);
    expect(result.targetStatusEffects![0].type).toBe('half_score');
  });

  it('item_freeze 给目标添加跳过回合', () => {
    const self = createCreativePlayer();
    const target = createCreativePlayer({ playerId: 'p2' });
    const result = resolveItemCard('item_freeze', mockPlayer as any, mockTarget as any, self, target);
    expect(result.targetStatusEffects).toHaveLength(1);
    expect(result.targetStatusEffects![0].type).toBe('skip_turn');
  });

  it('目标有钢铁护盾时 item_curse 无效', () => {
    const self = createCreativePlayer();
    const target = createCreativePlayer({
      playerId: 'p2',
      statusEffects: [{ type: 'steel', remainingTurns: 2 }],
    });
    const result = resolveItemCard('item_curse', mockPlayer as any, mockTarget as any, self, target);
    expect(result.targetStatusEffects).toBeUndefined();
  });

  it('item_plunder 掠夺目标分数', () => {
    const self = createCreativePlayer();
    const target = createCreativePlayer({ playerId: 'p2' });
    const result = resolveItemCard('item_plunder', mockPlayer as any, mockTarget as any, self, target);
    expect(result.targetScoreChange).toBe(-3);
    expect(result.selfScoreChange).toBeGreaterThanOrEqual(0);
  });

  it('item_shrink 移除目标最大棋子', () => {
    const self = createCreativePlayer();
    const target = createCreativePlayer({ playerId: 'p2' });
    const result = resolveItemCard('item_shrink', mockPlayer as any, mockTarget as any, self, target);
    expect(result.targetRemovePiece).toBe('largest');
  });

  it('item_blackhole 撤销目标最后一手', () => {
    const self = createCreativePlayer();
    const target = createCreativePlayer({ playerId: 'p2' });
    const result = resolveItemCard('item_blackhole', mockPlayer as any, mockTarget as any, self, target);
    expect(result.targetUndoLastMove).toBe(true);
  });
});
