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
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), inset 0 0 20px rgba(99, 102, 241, 0.05); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.5), inset 0 0 25px rgba(99, 102, 241, 0.08); }
`;

const ProfileContainer = styled.div`
  min-height: 100vh;
  padding: 24px;
  overflow-y: auto;
  background: var(--bg-gradient);
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
  
  @media (min-width: 768px) {
    padding: 40px;
  }
`;

const ProfileCard = styled.div`
  position: relative;
  z-index: 1;
  background: var(--surface-color);
  backdrop-filter: blur(20px);
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  padding: 36px;
  max-width: 900px;
  margin: 0 auto;
  margin-bottom: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
    border-radius: 20px 20px 0 0;
  }
  
  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 36px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--surface-border);
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 24px;
  }
`;

const AvatarWrapper = styled.div`
  flex-shrink: 0;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.4));
    z-index: -1;
    opacity: 0.6;
    filter: blur(12px);
  }
`;

const Avatar = styled.div<{ image?: string }>`
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.2rem;
  color: white;
  font-weight: 700;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: ${glowPulse} 3s ease-in-out infinite;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.h1`
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 2.2rem;
  font-weight: 700;
  font-family: 'Orbitron', 'Rajdhani', sans-serif;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const UserMeta = styled.div`
  color: var(--text-secondary);
  font-size: 1rem;
  margin-bottom: 12px;
  font-family: 'Rajdhani', sans-serif;
`;

const UserBio = styled.p`
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 16px 0;
  font-style: italic;
  max-width: 400px;
`;

const EditButton = styled.button`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  color: var(--primary-color);
  border: 1px solid rgba(99, 102, 241, 0.4);
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    background: rgba(99, 102, 241, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
`;

const StatsSection = styled.div`
  margin-bottom: 36px;
`;

const SectionTitle = styled.h2`
  color: var(--text-primary);
  margin: 0 0 20px 0;
  font-size: 1.4rem;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &::before {
    content: '';
    width: 4px;
    height: 24px;
    background: linear-gradient(180deg, var(--primary-color), #8b5cf6);
    border-radius: 2px;
  }
`;

/* 核心指标紧凑行 */
const CompactStatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: 16px 0 20px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  border: 1px solid var(--surface-border);
`;

const CompactStat = styled.span`
  font-size: 0.95rem;
  color: var(--text-secondary);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  
  strong {
    color: var(--primary-color);
    margin-right: 4px;
  }
`;

/* 详细统计入口按钮 */
const DetailStatsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 12px;
  color: var(--primary-color);
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  cursor: pointer;
  transition: all 0.25s ease;
  
  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.25));
    border-color: rgba(99, 102, 241, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
  }
`;

/* 游戏化：段位徽章 */
const RankBadge = styled.div<{ $tier: number }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 8px;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

/* 游戏化：核心数据突出区 */
const HeroStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 0;
`;

const HeroStatCard = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
  
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
  }
`;

const HeroStatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-color);
  font-family: 'Orbitron', sans-serif;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
`;

const HeroStatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-weight: 600;
`;

/* 最近对局 */
const RecentMatchesSection = styled.div`
  margin-top: 28px;
`;

const MatchCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.03));
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`;

const MatchInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MatchDate = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
`;

const MatchMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const ResultBadge = styled.span<{ $isWin: boolean }>`
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${p => p.$isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${p => p.$isWin ? '#10b981' : '#ef4444'};
`;

const ViewReplayBtn = styled.span`
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15));
  color: var(--primary-color);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(99, 102, 241, 0.3);
`;

const ActionsSection = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: var(--surface-border);
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  }
`;

const LogoutButton = styled.button`
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }
`;

const BackButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  backdrop-filter: blur(8px);
  font-weight: 600;
  font-family: 'Rajdhani', sans-serif;
  
  &:hover {
    background: var(--surface-border);
    transform: translateX(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  margin-top: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  border: 1px solid var(--surface-border);
`;

const PasswordTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-family: 'Orbitron', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
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

const AccountPanel = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(139, 92, 246, 0.02));
  border-radius: 14px;
  padding: 20px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  margin-bottom: 24px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-family: 'Rajdhani', sans-serif;

  span.label {
    color: var(--text-muted);
    min-width: 90px;
    font-weight: 500;
  }

  span.value {
    color: var(--text-primary);
    word-break: break-all;
    font-weight: 600;
  }

  span.badge {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  span.guest-badge {
    background: var(--surface-border);
    color: var(--text-secondary);
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
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
  const { user, firebaseUser, isGuest, logout, updateProfile } = useAuth();
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
            <UserMeta>
              {user.profile.age && `${user.profile.age}岁`}
              {user.profile.gender && ` • ${formatGender(user.profile.gender)}`}
              {user.profile.location && ` • ${user.profile.location}`}
            </UserMeta>
            {user.profile.bio && <UserBio>"{user.profile.bio}"</UserBio>}
            <div style={{ marginTop: '16px' }}>
              <EditButton onClick={() => { soundManager.buttonClick(); handleEditProfile(); }} onMouseEnter={() => soundManager.buttonHover()}>
                {t('player.editProfile') || '编辑资料'}
              </EditButton>
            </div>
          </UserInfo>
        </Header>

        <StatsSection>
          <SectionTitle>{t('statistics.title') || '游戏统计'}</SectionTitle>
          <HeroStats>
            <HeroStatCard>
              <HeroStatValue>{user.stats.winRate.toFixed(1)}%</HeroStatValue>
              <HeroStatLabel>{t('statistics.winRate') || '胜率'}</HeroStatLabel>
            </HeroStatCard>
            <HeroStatCard>
              <HeroStatValue>{ladderPoints}</HeroStatValue>
              <HeroStatLabel>{t('ladder.points') || '天梯积分'}</HeroStatLabel>
            </HeroStatCard>
          </HeroStats>
          <CompactStatsRow>
            <CompactStat><strong>{user.stats.totalGames}</strong>{t('statistics.gamesShort') || '局'}</CompactStat>
            <CompactStat><strong>{user.stats.totalWins}</strong>{t('statistics.winsShort') || '胜'}</CompactStat>
          </CompactStatsRow>
          <DetailStatsButton onClick={() => { soundManager.buttonClick(); handleViewStats(); }} onMouseEnter={() => soundManager.buttonHover()}>
            {t('statistics.viewDetails') || '查看详细统计'}
            <span style={{ opacity: 0.8 }}>→</span>
          </DetailStatsButton>

          <RecentMatchesSection>
            <SectionTitle>{t('statistics.recentMatches') || '最近对局'}</SectionTitle>
            {gameHistory.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
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

        <div>
          <SectionTitle>{t('profile.accountInfo') || t('login.accountInfo') || '账户信息'}</SectionTitle>
          <AccountPanel>
            <InfoRow>
              <span className="label">账户类型</span>
              {isGuest
                ? <span className="guest-badge">访客</span>
                : <span className="badge">邮箱用户</span>
              }
            </InfoRow>
            {user.profile.email && (
              <InfoRow>
                <span className="label">邮箱</span>
                <span className="value">{user.profile.email}</span>
              </InfoRow>
            )}
            <InfoRow>
              <span className="label">注册时间</span>
              <span className="value">{formatDate(user.profile.createdAt)}</span>
            </InfoRow>
            <InfoRow>
              <span className="label">{t('player.lastLogin') || '最后登录'}</span>
              <span className="value">{formatDate(user.profile.lastLoginAt)}</span>
            </InfoRow>
          </AccountPanel>

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
        </div>

        <ActionsSection>
          <ActionButton onClick={() => { soundManager.buttonClick(); handleEditProfile(); }} onMouseEnter={() => soundManager.buttonHover()}>
            {t('player.editProfile') || '修改个人资料'}
          </ActionButton>
          <LogoutButton onClick={() => { soundManager.buttonClick(); handleLogout(); }} onMouseEnter={() => soundManager.buttonHover()}>
            {t('player.logout') || '退出登录'}
          </LogoutButton>
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
    </ProfileContainer>
  );
};

export default UserProfile;
