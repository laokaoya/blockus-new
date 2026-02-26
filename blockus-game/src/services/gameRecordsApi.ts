/**
 * 对局记录 API：保存到服务端、导出
 */

const API_BASE = process.env.REACT_APP_SERVER_URL || (
  process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001'
);

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
  userId?: string;
}

/** 保存对局到服务端（静默失败，不阻塞 UI） */
export async function saveGameRecord(record: GameRecordPayload): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      console.warn('[GameRecords] Save failed:', res.status);
    }
  } catch (e) {
    console.warn('[GameRecords] Save error:', (e as Error).message);
  }
}

/** 导出全部对局记录（下载 JSON 文件） */
export function exportGameRecords(): void {
  const url = `${API_BASE}/api/games/export`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `blockus_records_${Date.now()}.json`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
