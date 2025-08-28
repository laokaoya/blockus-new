import { useState, useEffect } from 'react';

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  winRate: number;
  bestScore: number;
  averageScore: number;
  gamesThisWeek: number;
  gamesThisMonth: number;
  currentStreak: number;
  bestStreak: number;
}

const defaultStats: UserStats = {
  totalGames: 0,
  totalWins: 0,
  totalScore: 0,
  winRate: 0,
  bestScore: 0,
  averageScore: 0,
  gamesThisWeek: 0,
  gamesThisMonth: 0,
  currentStreak: 0,
  bestStreak: 0
};

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage加载统计数据
  useEffect(() => {
    const loadStats = () => {
      try {
        const savedStats = localStorage.getItem('userStats');
        if (savedStats) {
          const parsedStats = JSON.parse(savedStats);
          // 合并保存的统计数据和默认值
          const mergedStats = { ...defaultStats, ...parsedStats };
          setStats(mergedStats);
        }
      } catch (error) {
        console.error('加载用户统计数据失败:', error);
        setStats(defaultStats);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  // 保存统计数据到localStorage
  const saveStats = (newStats: UserStats) => {
    try {
      localStorage.setItem('userStats', JSON.stringify(newStats));
      setStats(newStats);
    } catch (error) {
      console.error('保存用户统计数据失败:', error);
    }
  };

  // 更新游戏结果
  const updateGameResult = (score: number, isWinner: boolean) => {
    const newStats = { ...stats };
    
    // 更新基础统计
    newStats.totalGames += 1;
    newStats.totalWins += isWinner ? 1 : 0;
    newStats.totalScore += score;
    newStats.winRate = (newStats.totalWins / newStats.totalGames) * 100;
    newStats.bestScore = Math.max(newStats.bestScore, score);
    newStats.averageScore = newStats.totalScore / newStats.totalGames;
    
    // 更新连胜记录
    if (isWinner) {
      newStats.currentStreak += 1;
      newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
    } else {
      newStats.currentStreak = 0;
    }
    
    // 更新本周和本月游戏次数
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 这里可以添加更复杂的周/月统计逻辑
    newStats.gamesThisWeek += 1;
    newStats.gamesThisMonth += 1;
    
    saveStats(newStats);
  };

  // 重置统计数据
  const resetStats = () => {
    saveStats(defaultStats);
  };

  // 获取成就信息
  const getAchievements = () => {
    const achievements = [];
    
    if (stats.totalGames >= 10) achievements.push({ id: 'first10', name: '初出茅庐', description: '完成10局游戏' });
    if (stats.totalGames >= 50) achievements.push({ id: 'first50', name: '游戏达人', description: '完成50局游戏' });
    if (stats.totalGames >= 100) achievements.push({ id: 'first100', name: '游戏大师', description: '完成100局游戏' });
    
    if (stats.totalWins >= 5) achievements.push({ id: 'first5wins', name: '初战告捷', description: '获得5次胜利' });
    if (stats.totalWins >= 25) achievements.push({ id: 'first25wins', name: '胜利专家', description: '获得25次胜利' });
    if (stats.totalWins >= 50) achievements.push({ id: 'first50wins', name: '胜利大师', description: '获得50次胜利' });
    
    if (stats.bestScore >= 50) achievements.push({ id: 'score50', name: '高分玩家', description: '单局得分达到50分' });
    if (stats.bestScore >= 100) achievements.push({ id: 'score100', name: '高分专家', description: '单局得分达到100分' });
    
    if (stats.currentStreak >= 3) achievements.push({ id: 'streak3', name: '连胜新手', description: '连续获胜3局' });
    if (stats.currentStreak >= 5) achievements.push({ id: 'streak5', name: '连胜专家', description: '连续获胜5局' });
    if (stats.currentStreak >= 10) achievements.push({ id: 'streak10', name: '连胜大师', description: '连续获胜10局' });
    
    return achievements;
  };

  // 获取等级信息
  const getLevel = () => {
    const totalScore = stats.totalScore;
    if (totalScore < 100) return { level: 1, name: '新手', nextLevelScore: 100 };
    if (totalScore < 300) return { level: 2, name: '学徒', nextLevelScore: 300 };
    if (totalScore < 600) return { level: 3, name: '熟练工', nextLevelScore: 600 };
    if (totalScore < 1000) return { level: 4, name: '专家', nextLevelScore: 1000 };
    if (totalScore < 1500) return { level: 5, name: '大师', nextLevelScore: 1500 };
    if (totalScore < 2100) return { level: 6, name: '宗师', nextLevelScore: 2100 };
    if (totalScore < 2800) return { level: 7, name: '传奇', nextLevelScore: 2800 };
    return { level: 8, name: '神话', nextLevelScore: Infinity };
  };

  return {
    stats,
    isLoading,
    updateGameResult,
    resetStats,
    getAchievements,
    getLevel
  };
};
