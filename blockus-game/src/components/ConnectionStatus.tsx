// 监听 Socket 连接状态，断线/重连时 Toast 提示

import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';

export function ConnectionStatus() {
  const { isConnected } = useSocket();
  const { showToast } = useToast();
  const prevConnectedRef = useRef<boolean | null>(null);
  const hadDisconnectRef = useRef(false);

  useEffect(() => {
    if (prevConnectedRef.current === null) {
      prevConnectedRef.current = isConnected;
      return;
    }
    const prev = prevConnectedRef.current;
    prevConnectedRef.current = isConnected;

    if (prev && !isConnected) {
      hadDisconnectRef.current = true;
      showToast('连接已断开，正在尝试重连...', 'info');
    } else if (!prev && isConnected && hadDisconnectRef.current) {
      hadDisconnectRef.current = false;
      showToast('已重新连接', 'success');
    }
  }, [isConnected, showToast]);

  return null;
}
