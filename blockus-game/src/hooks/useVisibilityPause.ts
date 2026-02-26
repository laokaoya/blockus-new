/**
 * 监听页面可见性变化（离开/返回应用），用于移动端自动暂停
 * 离开时暂停，返回时显示「点击继续」遮罩，避免后台运行导致卡死
 */
import { useState, useEffect, useCallback } from 'react';

export function useVisibilityPause(setPaused?: (paused: boolean) => void) {
  const [isVisibilityPaused, setIsVisibilityPaused] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVisibilityPaused(true);
        setPaused?.(true);
      } else {
        // 返回时保持暂停，等待用户点击「继续」再恢复
        setIsVisibilityPaused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setPaused]);

  const resume = useCallback(() => {
    setIsVisibilityPaused(false);
    setPaused?.(false);
  }, [setPaused]);

  return { isVisibilityPaused, resume };
}
