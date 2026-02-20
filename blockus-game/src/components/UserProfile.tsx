import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserProfile as UserProfileType } from '../types/game';

const ProfileContainer = styled.div`
  height: 100vh;
  padding: 20px;
  overflow-y: auto;
  
  @media (min-width: 768px) {
    padding: 40px;
  }
`;

const ProfileCard = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg);
  max-width: 800px;
  margin: 0 auto;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--surface-border);
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const Avatar = styled.div<{ image?: string }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
  font-weight: bold;
  border: 4px solid var(--surface-border);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h1`
  margin: 0 0 10px 0;
  color: var(--text-primary);
  font-size: 2.5rem;
  font-weight: 700;
`;

const UserMeta = styled.div`
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 15px;
`;

const UserBio = styled.p`
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
  font-style: italic;
`;

const EditButton = styled.button`
  background: var(--surface-highlight);
  color: var(--primary-color);
  border: 1px solid var(--surface-border);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover {
    background: var(--surface-border);
    transform: translateY(-1px);
  }
`;

const StatsSection = styled.div`
  margin-bottom: 40px;
`;

const SectionTitle = styled.h2`
  color: var(--text-primary);
  margin-bottom: 20px;
  font-size: 1.8rem;
  border-left: 4px solid var(--primary-color);
  padding-left: 15px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: var(--surface-highlight);
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary-color);
    transform: translateY(-3px);
    background: var(--surface-border);
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const ActionsSection = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-border);
    border-color: var(--primary-color);
    transform: translateY(-2px);
  }
`;

const LogoutButton = styled.button`
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
  }
`;

const BackButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 10px 24px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  backdrop-filter: blur(4px);
  
  &:hover {
    background: var(--surface-border);
    transform: translateX(-2px);
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
  background: var(--surface-highlight);
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
`;

const PasswordTitle = styled.h3`
  color: var(--text-primary);
  margin: 0 0 16px 0;
  font-size: 1.1rem;
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

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--text-secondary);
  font-size: 0.9rem;

  span.label {
    color: var(--text-muted);
    min-width: 80px;
  }

  span.value {
    color: var(--text-primary);
    word-break: break-all;
  }

  span.badge {
    background: var(--primary-color);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  span.guest-badge {
    background: var(--surface-border);
    color: var(--text-secondary);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
        alert('头像文件大小不能超过5MB');
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
      alert('昵称不能为空');
      return;
    }
    
    if (editFormData.nickname.length > 20) {
      alert('昵称长度不能超过20个字符');
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
      alert('保存失败，请重试');
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
    navigate('/');
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
      <BackButton onClick={handleBackToLobby}>
        ← 返回大厅
      </BackButton>
      
      <ProfileCard>
        <Header>
          <Avatar image={user.profile.avatar}>
            {!user.profile.avatar && '👤'}
          </Avatar>
          
          <UserInfo>
            <UserName>{user.profile.nickname}</UserName>
            <UserMeta>
              {user.profile.age && `${user.profile.age}岁`}
              {user.profile.gender && ` • ${formatGender(user.profile.gender)}`}
              {user.profile.location && ` • ${user.profile.location}`}
            </UserMeta>
            {user.profile.bio && <UserBio>"{user.profile.bio}"</UserBio>}
            <div style={{ marginTop: '15px' }}>
              <EditButton onClick={handleEditProfile}>
                编辑资料
              </EditButton>
            </div>
          </UserInfo>
        </Header>

        <StatsSection>
          <SectionTitle>游戏统计</SectionTitle>
          <StatsGrid>
            <StatCard>
              <StatValue>{user.stats.totalGames}</StatValue>
              <StatLabel>总局数</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{user.stats.totalWins}</StatValue>
              <StatLabel>胜利局数</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{user.stats.winRate.toFixed(1)}%</StatValue>
              <StatLabel>胜率</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{user.stats.bestScore}</StatValue>
              <StatLabel>最高得分</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{user.stats.averageScore.toFixed(1)}</StatValue>
              <StatLabel>平均得分</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{Math.round(user.stats.totalPlayTime / 60)}</StatValue>
              <StatLabel>总游戏时长(小时)</StatLabel>
            </StatCard>
          </StatsGrid>
        </StatsSection>

        <div>
          <SectionTitle>账户信息</SectionTitle>
          <div style={{ marginBottom: '20px' }}>
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
              <span className="label">最后登录</span>
              <span className="value">{formatDate(user.profile.lastLoginAt)}</span>
            </InfoRow>
          </div>

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
          <ActionButton onClick={handleViewStats}>
            查看详细统计
          </ActionButton>
          <ActionButton onClick={handleEditProfile}>
            修改个人资料
          </ActionButton>
          <LogoutButton onClick={handleLogout}>
            退出登录
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
