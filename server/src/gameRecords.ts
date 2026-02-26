/**
 * 对局记录存储：文件持久化，供 RL 训练导出
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'gameRecords.json');
const MAX_RECORDS = 10000; // 最多保留条数，超出时删除最旧的

export interface GameRecordPayload {
  id: string;
  date: string;
  duration: number;
  mode: 'classic' | 'creative' | 'multiplayer';
  players: Array<{
    id?: string;
    name: string;
    color: string;
    score: number;
    isWinner: boolean;
    isAI?: boolean;
  }>;
  settings?: {
    aiDifficulty?: string;
    timeLimit?: number;
  };
  moves: Array<{
    playerColor: string;
    pieceId?: string;
    position?: { x: number; y: number };
    boardChanges: Array<{ x: number; y: number; color: number }>;
    timestamp: number;
  }>;
  finalBoard: number[][];
  userId?: string; // 可选：人类玩家 ID
}

let cache: GameRecordPayload[] | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadRecords(): GameRecordPayload[] {
  if (cache !== null) return cache;
  ensureDataDir();
  if (!fs.existsSync(RECORDS_FILE)) {
    cache = [];
    return cache;
  }
  try {
    const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
    cache = JSON.parse(raw);
    if (!Array.isArray(cache)) cache = [];
    return cache;
  } catch (e) {
    console.warn('[GameRecords] Failed to load:', (e as Error).message);
    cache = [];
    return cache;
  }
}

function saveRecords(records: GameRecordPayload[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 0), 'utf-8');
    cache = records;
  } catch (e) {
    console.warn('[GameRecords] Failed to save:', (e as Error).message);
  }
}

/** 追加一条对局记录 */
export function appendRecord(record: GameRecordPayload): void {
  const records = loadRecords();
  // 去重：同 id 不重复
  if (records.some(r => r.id === record.id)) return;
  records.unshift(record);
  if (records.length > MAX_RECORDS) {
    records.splice(MAX_RECORDS);
  }
  saveRecords(records);
}

/** 获取记录列表（分页） */
export function listRecords(limit = 100, offset = 0): GameRecordPayload[] {
  const records = loadRecords();
  return records.slice(offset, offset + limit);
}

/** 获取总条数 */
export function getTotalCount(): number {
  return loadRecords().length;
}

/** 导出全部记录（供 RL 训练） */
export function exportAll(): GameRecordPayload[] {
  return [...loadRecords()];
}
