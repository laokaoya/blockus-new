import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { UserProfile as UserProfileType } from '../types/game';
import soundManager from '../utils/soundManager';

interface GameRecordBrief {
  id: string;
  date: string;
  players: { name: string; color: string; score: number; isWinner: boolean }[];
  moves: { boardChanges: { x: number; y: number; color: number }[] }[];
}

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 28px rgba(99, 102, 241, 0.45); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ProfileContainer = styled.div`
  min-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  padding-bottom: 40px;
  background: var(--bg-gradient);
  position: relative;
  -webkit-overflow-scrolling: touch;
  
  /* 棋盘格背景 - 与游戏风格呼应，浅色模式自动适配 */
  &::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: 
      linear-gradient(var(--profile-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--profile-grid) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
    z-index: 0;
  }
  &::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--profile-overlay);
    pointer-events: none;
    z-index: 0;
  }
  
  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const ProfileCard = styled.div`
  position: relative;
  z-index: 1;
  background: var(--profile-card-bg);
  backdrop-filter: blur(24px);
  border: 1px solid var(--profile-card-border);
  border-radius: 20px;
  padding: 28px;
  max-width: 720px;
  margin: 0 auto;
  box-shadow: var(--profile-card-shadow);
  animation: ${fadeInUp} 0.4s ease-out;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

/* 紧凑头部：头像 + 信息一行 */
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
`;

const AvatarWrapper = styled.div`
  flex-shrink: 0;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(139, 92, 246, 0.35));
    z-index: -1;
    opacity: 0.7;
    filter: blur(10px);
  }
`;

const Avatar = styled.div<{ image?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: 700;
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: ${glowPulse} 4s ease-in-out infinite;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const UserName = styled.h1`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.6rem;
  font-weight: 700;
  font-family: 'Orbitron', 'Rajdhani', sans-serif;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

const UserMeta = styled.span`
  color: var(--text-muted);
  font-size: 0.9rem;
  font-family: 'Rajdhani', sans-serif;
`;

const UserBio = styled.p`
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 8px 0 0 0;
  font-style: italic;
  width: 100%;
  max-width: 360px;
`;

const EditButton = styled.button`
  background: var(--profile-btn-bg);
  color: var(--primary-color);
  border: 1px solid var(--profile-btn-border);
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    background: var(--profile-btn-hover-bg);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  }
`;

const StatsSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: var(--text-secondary);
  margin: 0 0 14px 0;
  font-size: 0.8rem;
  font-family: 'Orbitron', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

/* 4 格统计 - 游戏棋子风格 */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatTile = styled.div`
  background: var(--profile-tile-bg);
  border: 1px solid var(--profile-tile-border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary-color);
  font-family: 'Orbitron', sans-serif;
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DetailStatsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  background: var(--profile-btn-bg);
  border: 1px solid var(--profile-btn-border);
  border-radius: 10px;
  color: var(--primary-color);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--profile-btn-hover-bg);
    border-color: rgba(99, 102, 241, 0.45);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
`;

const RankBadge = styled.div<{ $tier: number }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${p => {
    const gradients: Record<number, string> = {
      0: 'linear-gradient(135deg, #94a3b8, #64748b)',
      1: 'linear-gradient(135deg, #cd7f32, #a0522d)',
      2: 'linear-gradient(135deg, #c0c0c0, #808080)',
      3: 'linear-gradient(135deg, #ffd700, #daa520)',
      4: 'linear-gradient(135deg, #e5e4e2, #b4b4b4)',
      5: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    };
    return gradients[p.$tier] || gradients[0];
  }};
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const RecentMatchesSection = styled.div`
  margin-top: 20px;
`;

const MatchCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: var(--profile-match-bg);
  border: 1px solid var(--profile-match-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--profile-btn-hover-bg);
    border-color: rgba(99, 102, 241, 0.35);
    transform: translateX(3px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
  }
`;

const MatchInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MatchDate = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
`;

const MatchMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 0.8rem;
  color: var(--text-muted);
`;

const ResultBadge = styled.span<{ $isWin: boolean }>`
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${p => p.$isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${p => p.$isWin ? '#10b981' : '#ef4444'};
`;

const ViewReplayBtn = styled.span`
  padding: 6px 12px;
  background: var(--profile-btn-bg);
  color: var(--primary-color);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid var(--profile-btn-border);
`;

const ActionsSection = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--profile-match-border);
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  background: var(--profile-btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--profile-btn-border);
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: var(--profile-btn-hover-bg);
    border-color: rgba(99, 102, 241, 0.45);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
`;

const LogoutButton = styled.button`
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: rgba(239, 68, 68, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
  }
`;

const DeleteAccountButton = styled.button`
  background: rgba(127, 29, 29, 0.1);
  color: #f87171;
  border: 1px solid rgba(220, 38, 38, 0.3);
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: rgba(220, 38, 38, 0.2);
    border-color: rgba(220, 38, 38, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
  }
`;

const BackButton = styled.button`
  background: var(--profile-btn-bg);
  color: var(--text-secondary);
  border: 1px solid var(--profile-btn-border);
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: var(--profile-btn-hover-bg);
    color: var(--text-primary);
    transform: translateX(-2px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }
`;

// 编辑资料模态框样式
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
`;

const ModalTitle = styled.h2`
  margin: 0 0 25px 0;
  color: var(--text-primary);
  font-size: 1.8rem;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 16px;
  color: var(--text-primary);
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: var(--surface-highlight);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 16px;
  color: var(--text-primary);
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: var(--surface-highlight);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 16px;
  color: var(--text-primary);
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  option {
    background: var(--surface-color);
  }
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 20px 0;
  padding: 15px;
  background: var(--surface-highlight);
  border-radius: var(--radius-md);
`;

const AvatarPreview = styled.div<{ image?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
  cursor: pointer;
  border: 2px solid var(--surface-border);
  transition: border-color 0.3s ease;
  
  &:hover {
    border-color: var(--primary-color);
  }
`;

const AvatarInput = styled.input`
  display: none;
`;

const UploadButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-border);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
`;

const SaveButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-border);
    transform: translateY(-2px);
  }
`;

const PasswordSection = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: var(--profile-match-bg);
  border-radius: 10px;
  border: 1px solid var(--profile-match-border);
`;

const PasswordTitle = styled.h3`
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  font-size: 0.75rem;
  font-family: 'Orbitron', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
`;

const PasswordForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PasswordInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: var(--surface-color);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const SmallButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const AlertMessage = styled.div<{ type?: 'success' | 'error' }>`
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  background: ${p => p.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${p => p.type === 'success' ? '#10b981' : '#ef4444'};
  border: 1px solid ${p => p.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
`;

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, firebaseUser, isGuest, logout, deleteAccount, updateProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nickname: '',
    age: '',
    gender: '',
    location: '',
    bio: ''
  });
  const [editAvatar, setEditAvatar] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameRecordBrief[]>([]);

  // 注销账号
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gameHistory');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        setGameHistory(Array.isArray(list) ? list.slice(0, 5) : []);
      } catch {
        setGameHistory([]);
      }
    }
  }, []);

  // 未登录或游客身份 → 跳转登录页
  if (!user || isGuest) {
    return <Navigate to="/login" replace />;
  }

  const getRankFromPoints = (pts: number) => {
    if (pts >= 2501) return 5;
    if (pts >= 2001) return 4;
    if (pts >= 1501) return 3;
    if (pts >= 1001) return 2;
    if (pts >= 501) return 1;
    return 0;
  };

  const rankLabels = [
    t('ladder.rankNewbie'),
    t('ladder.rankBronze'),
    t('ladder.rankSilver'),
    t('ladder.rankGold'),
    t('ladder.rankPlatinum'),
    t('ladder.rankMaster'),
  ];

  const ladderPoints = (user.stats as { ladderPoints?: number }).ladderPoints ?? 1000;
  const rankTier = getRankFromPoints(ladderPoints);

  const isHumanWin = (game: GameRecordBrief) =>
    game.players.some(p => p.color === 'red' && p.isWinner);

  const formatMatchDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return d.toLocaleDateString('zh-CN');
  };

  const handleViewReplay = (gameId: string) => {
    soundManager.buttonClick();
    navigate('/statistics', { state: { selectedGameId: gameId } });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    setEditFormData({
      nickname: user.profile.nickname,
      age: user.profile.age?.toString() || '',
      gender: user.profile.gender || '',
      location: user.profile.location || '',
      bio: user.profile.bio || ''
    });
    setEditAvatar(user.profile.avatar || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({
      nickname: '',
      age: '',
      gender: '',
      location: '',
      bio: ''
    });
    setEditAvatar('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB限制
        showToast(t('login.avatarTooLarge') || '头像文件大小不能超过5MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editFormData.nickname.trim()) {
      showToast(t('login.nicknameRequired') || '昵称不能为空', 'error');
      return;
    }
    
    if (editFormData.nickname.length > 20) {
      showToast(t('login.nicknameTooLong') || '昵称长度不能超过20个字符', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedProfile: UserProfileType = {
        ...user.profile,
        nickname: editFormData.nickname.trim(),
        age: editFormData.age ? parseInt(editFormData.age) : undefined,
        gender: editFormData.gender as 'male' | 'female' | 'other' || undefined,
        location: editFormData.location.trim() || undefined,
        avatar: editAvatar,
        bio: editFormData.bio.trim() || undefined,
        lastLoginAt: Date.now()
      };
      
      // 调用 updateProfile 更新本地状态
      updateProfile(updatedProfile);
      
      // 如果已连接服务器，尝试同步更新到服务器（可选，取决于后端是否支持更新用户信息）
      // 目前 updateProfile 只更新本地 AuthContext，如果需要同步到服务器，可以在 AuthContext 中扩展
      
      setIsEditing(false);
    } catch (err) {
      showToast(t('common.saveFailed') || '保存失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!firebaseUser || !firebaseUser.email) return;
    if (!currentPassword) { setPasswordMsg({ type: 'error', text: '请输入当前密码' }); return; }
    if (newPassword.length < 6) { setPasswordMsg({ type: 'error', text: '新密码至少需要6个字符' }); return; }
    if (newPassword !== confirmNewPassword) { setPasswordMsg({ type: 'error', text: '两次输入的新密码不一致' }); return; }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setPasswordMsg({ type: 'success', text: '密码已成功修改' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordMsg({ type: 'error', text: '当前密码不正确' });
      } else {
        setPasswordMsg({ type: 'error', text: '修改密码失败，请重试' });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleViewStats = () => {
    navigate('/statistics');
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (!deletePassword.trim()) {
      setDeleteError(t('profile.deletePasswordRequired') || '请输入密码以确认注销');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      setDeletePassword('');
      navigate('/login');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError(t('profile.deleteWrongPassword') || '密码错误');
      } else if (code === 'auth/requires-recent-login') {
        setDeleteError(t('profile.deleteRequiresReauth') || '请重新登录后再试');
      } else {
        setDeleteError(t('profile.deleteFailed') || '注销失败，请重试');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackToLobby = () => {
    navigate('/', { state: { showTransition: true } });
  };

  const formatGender = (gender?: string) => {
    switch (gender) {
      case 'male': return '男';
      case 'female': return '女';
      case 'other': return '其他';
      default: return '未设置';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <ProfileContainer>
      <BackButton onClick={() => { soundManager.buttonClick(); handleBackToLobby(); }} onMouseEnter={() => soundManager.buttonHover()}>
        ← {t('common.backToLobby') || '返回大厅'}
      </BackButton>
      
      <ProfileCard>
        <Header>
          <AvatarWrapper>
            <Avatar image={user.profile.avatar}>
              {!user.profile.avatar && (user.profile.nickname ? user.profile.nickname.charAt(0).toUpperCase() : '👤')}
            </Avatar>
          </AvatarWrapper>
          
          <UserInfo>
            <UserName>{user.profile.nickname}</UserName>
            <RankBadge $tier={rankTier}>{rankLabels[rankTier]}</RankBadge>
            {(user.profile.age || user.profile.gender || user.profile.location) && (
              <UserMeta>
                {user.profile.age && `${user.profile.age}岁`}
                {user.profile.gender && ` • ${formatGender(user.profile.gender)}`}
                {user.profile.location && ` • ${user.profile.location}`}
              </UserMeta>
            )}
            {user.profile.bio && <UserBio>"{user.profile.bio}"</UserBio>}
            <EditButton onClick={() => { soundManager.buttonClick(); handleEditProfile(); }} onMouseEnter={() => soundManager.buttonHover()}>
              {t('player.editProfile') || '编辑资料'}
            </EditButton>
          </UserInfo>
        </Header>

        <StatsSection>
          <SectionTitle>{t('statistics.title') || '游戏统计'}</SectionTitle>
          <StatsGrid>
            <StatTile>
              <StatValue>{user.stats.winRate.toFixed(1)}%</StatValue>
              <StatLabel>{t('statistics.winRate') || '胜率'}</StatLabel>
            </StatTile>
            <StatTile>
              <StatValue>{ladderPoints}</StatValue>
              <StatLabel>{t('ladder.points') || '天梯积分'}</StatLabel>
            </StatTile>
            <StatTile>
              <StatValue>{user.stats.totalGames}</StatValue>
              <StatLabel>{t('statistics.gamesShort') || '局'}</StatLabel>
            </StatTile>
            <StatTile>
              <StatValue>{user.stats.totalWins}</StatValue>
              <StatLabel>{t('statistics.winsShort') || '胜'}</StatLabel>
            </StatTile>
          </StatsGrid>
          <DetailStatsButton onClick={() => { soundManager.buttonClick(); handleViewStats(); }} onMouseEnter={() => soundManager.buttonHover()}>
            {t('statistics.viewDetails') || '查看详细统计'}
            <span style={{ opacity: 0.8 }}>→</span>
          </DetailStatsButton>

          <RecentMatchesSection>
            <SectionTitle>{t('statistics.recentMatches') || '最近对局'}</SectionTitle>
            {gameHistory.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('statistics.noHistory') || '暂无历史对局记录'}
              </div>
            ) : (
              gameHistory.map((game) => (
                <MatchCard key={game.id} onClick={() => handleViewReplay(game.id)} onMouseEnter={() => soundManager.buttonHover()}>
                  <MatchInfo>
                    <MatchDate>{formatMatchDate(game.date)}</MatchDate>
                    <MatchMeta>
                      <ResultBadge $isWin={isHumanWin(game)}>
                        {isHumanWin(game) ? (t('statistics.win') || '胜利') : (t('statistics.lose') || '失败')}
                      </ResultBadge>
                      <span>{game.moves?.length || 0} {t('statistics.totalMoves') || '步'}</span>
                    </MatchMeta>
                  </MatchInfo>
                  <ViewReplayBtn>{t('statistics.viewReplay') || '查看回放'}</ViewReplayBtn>
                </MatchCard>
              ))
            )}
          </RecentMatchesSection>
        </StatsSection>

        {firebaseUser && firebaseUser.email && (
            <PasswordSection>
              <PasswordTitle>安全设置</PasswordTitle>
              {!showPasswordForm ? (
                <SmallButton type="button" onClick={() => { setShowPasswordForm(true); setPasswordMsg(null); }}>
                  修改密码
                </SmallButton>
              ) : (
                <PasswordForm onSubmit={handleChangePassword}>
                  <PasswordInput
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="当前密码"
                    autoComplete="current-password"
                  />
                  <PasswordInput
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="新密码（至少6位）"
                    autoComplete="new-password"
                  />
                  <PasswordInput
                    type="password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="确认新密码"
                    autoComplete="new-password"
                  />
                  {passwordMsg && <AlertMessage type={passwordMsg.type}>{passwordMsg.text}</AlertMessage>}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <SmallButton type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? '修改中...' : '确认修改'}
                    </SmallButton>
                    <CancelButton type="button" onClick={() => { setShowPasswordForm(false); setPasswordMsg(null); }}
                      style={{ padding: '10px 20px', fontSize: '14px' }}>
                      取消
                    </CancelButton>
                  </div>
                </PasswordForm>
              )}
              {passwordMsg && !showPasswordForm && <AlertMessage type={passwordMsg.type} style={{ marginTop: '10px' }}>{passwordMsg.text}</AlertMessage>}
            </PasswordSection>
          )}

        <ActionsSection>
          <ActionButton onClick={() => { soundManager.buttonClick(); handleEditProfile(); }} onMouseEnter={() => soundManager.buttonHover()}>
            {t('player.editProfile') || '修改个人资料'}
          </ActionButton>
          <LogoutButton onClick={() => { soundManager.buttonClick(); handleLogout(); }} onMouseEnter={() => soundManager.buttonHover()}>
            {t('player.logout') || '退出登录'}
          </LogoutButton>
          {firebaseUser?.email && (
            <DeleteAccountButton onClick={() => { soundManager.buttonClick(); setShowDeleteModal(true); setDeleteError(null); setDeletePassword(''); }} onMouseEnter={() => soundManager.buttonHover()}>
              {t('profile.deleteAccount') || '注销账号'}
            </DeleteAccountButton>
          )}
        </ActionsSection>
      </ProfileCard>
      
      {/* 编辑资料模态框 */}
      {isEditing && (
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>编辑个人资料</ModalTitle>
            <Form onSubmit={handleSaveProfile}>
              <FormGroup>
                <Label htmlFor="edit-nickname">昵称 *</Label>
                <Input
                  id="edit-nickname"
                  name="nickname"
                  type="text"
                  value={editFormData.nickname}
                  onChange={handleInputChange}
                  placeholder="请输入您的昵称"
                  maxLength={20}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="edit-age">年龄</Label>
                <Input
                  id="edit-age"
                  name="age"
                  type="number"
                  value={editFormData.age}
                  onChange={handleInputChange}
                  placeholder="请输入您的年龄"
                  min="1"
                  max="120"
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="edit-gender">性别</Label>
                <Select
                  id="edit-gender"
                  name="gender"
                  value={editFormData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">请选择性别</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="edit-location">地区</Label>
                <Input
                  id="edit-location"
                  name="location"
                  type="text"
                  value={editFormData.location}
                  onChange={handleInputChange}
                  placeholder="请输入您的地区"
                  maxLength={50}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="edit-bio">个人介绍</Label>
                <TextArea
                  id="edit-bio"
                  name="bio"
                  value={editFormData.bio}
                  onChange={handleInputChange}
                  placeholder="用一句话介绍自己..."
                  maxLength={100}
                />
              </FormGroup>

              <FormGroup>
                <Label>头像</Label>
                <AvatarSection>
                  <AvatarPreview image={editAvatar} onClick={handleAvatarClick}>
                    {!editAvatar && '👤'}
                  </AvatarPreview>
                  <div>
                    <UploadButton type="button" onClick={handleAvatarClick}>
                      选择头像
                    </UploadButton>
                    <AvatarInput
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      支持 JPG、PNG 格式，最大 5MB
                    </div>
                  </div>
                </AvatarSection>
              </FormGroup>

              <ButtonGroup>
                <CancelButton type="button" onClick={handleCancelEdit}>
                  取消
                </CancelButton>
                <SaveButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '保存中...' : '保存'}
                </SaveButton>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 注销账号确认模态框 */}
      {showDeleteModal && (
        <ModalOverlay>
          <ModalContent>
            <ModalTitle style={{ color: '#dc2626' }}>{t('profile.deleteAccount') || '注销账号'}</ModalTitle>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
              {t('profile.deleteConfirm') || '注销后无法恢复，账号、游戏记录及数据将被永久删除。请输入密码确认：'}
            </p>
            <Form onSubmit={handleDeleteAccount}>
              <FormGroup>
                <Label htmlFor="delete-password">{t('profile.deletePassword') || '当前密码'}</Label>
                <PasswordInput
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder={t('profile.deletePasswordPlaceholder') || '请输入密码'}
                  autoComplete="current-password"
                />
              </FormGroup>
              {deleteError && <AlertMessage type="error">{deleteError}</AlertMessage>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <CancelButton type="button" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(null); }} style={{ flex: 1 }}>
                  {t('common.cancel') || '取消'}
                </CancelButton>
                <DeleteAccountButton type="submit" disabled={isDeleting} style={{ flex: 1 }}>
                  {isDeleting ? (t('profile.deleting') || '注销中...') : (t('profile.confirmDelete') || '确认注销')}
                </DeleteAccountButton>
              </div>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
    </ProfileContainer>
  );
};

export default UserProfile;
