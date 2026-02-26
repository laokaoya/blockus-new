/**
 * 对局记录 API：存储、列表、导出
 */

import { Router, Request, Response } from 'express';
import { appendRecord, listRecords, getTotalCount, exportAll, type GameRecordPayload } from '../gameRecords';

const router = Router();

/** POST /api/games - 保存对局记录 */
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<GameRecordPayload>;
    if (!body.players || !Array.isArray(body.players) || !body.moves || !body.finalBoard) {
      return res.status(400).json({ success: false, error: 'Missing required fields: players, moves, finalBoard' });
    }
    const record: GameRecordPayload = {
      id: body.id || `game_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      date: body.date || new Date().toISOString(),
      duration: body.duration ?? 0,
      mode: body.mode || 'classic',
      players: body.players,
      settings: body.settings,
      moves: body.moves,
      finalBoard: body.finalBoard,
      userId: body.userId,
    };
    appendRecord(record);
    return res.json({ success: true, id: record.id });
  } catch (e) {
    console.warn('[GameRecords API] Save error:', (e as Error).message);
    return res.status(500).json({ success: false, error: 'SAVE_FAILED' });
  }
});

/** GET /api/games - 列表（分页） */
router.get('/', (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const records = listRecords(limit, offset);
    const total = getTotalCount();
    return res.json({ success: true, records, total });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'LIST_FAILED' });
  }
});

/** GET /api/games/export - 导出全部记录（JSON 供 RL 训练） */
router.get('/export', (_req: Request, res: Response) => {
  try {
    const records = exportAll();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="blockus_records_${Date.now()}.json"`);
    return res.send(JSON.stringify(records, null, 2));
  } catch (e) {
    return res.status(500).json({ success: false, error: 'EXPORT_FAILED' });
  }
});

/** GET /api/games/stats - 统计信息 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const total = getTotalCount();
    return res.json({ success: true, total });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'STATS_FAILED' });
  }
});

export default router;
