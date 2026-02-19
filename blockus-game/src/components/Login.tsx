import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserProfile } from '../types/game';
import { UserIcon } from './Icons';

const LoginContainer = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: transparent; /* 使用全局背景 */
`;

const LoginCard = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  text-align: center;
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Title = styled.h1`
  color: var(--text-primary);
  margin-bottom: 10px;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: 'Rajdhani', sans-serif;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin-bottom: 30px;
  font-size: 0.95rem;
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
  font-size: 0.9rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 16px;
  color: var(--text-primary);
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: rgba(0, 0, 0, 0.3);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
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
    background: rgba(0, 0, 0, 0.3);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
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
    background: #1e293b;
    color: var(--text-primary);
  }
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 10px 0;
  padding: 15px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
`;

const AvatarPreview = styled.div<{ image?: string }>`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  
  svg {
    width: 32px;
    height: 32px;
  }
`;

const AvatarInput = styled.input`
  display: none;
`;

const UploadButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
`;

const SubmitButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 14px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 10px;
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

const ErrorMessage = styled.div`
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(239, 68, 68, 0.2);
  font-size: 0.9rem;
  margin-top: 10px;
`;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    nickname: '',
    age: '',
    gender: '',
    location: '',
    bio: ''
  });
  
  const [avatar, setAvatar] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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
        setError(t('login.avatarTooLarge'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 如果没有输入昵称，自动生成一个
    const finalNickname = formData.nickname.trim() || `Player_${Math.floor(Math.random() * 10000)}`;
    
    if (finalNickname.length > 20) {
      setError(t('login.nicknameTooLong'));
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const profile: UserProfile = {
        id: `user_${Date.now()}`,
        nickname: finalNickname,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender as 'male' | 'female' | 'other' || undefined,
        location: formData.location.trim() || undefined,
        avatar,
        bio: formData.bio.trim() || undefined,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };
      
      const success = await login(profile);
      if (success) {
        navigate('/');
      } else {
        setError(t('login.loginFailed'));
      }
    } catch (err) {
      setError(t('login.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>{t('login.welcome')}</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="nickname">{t('login.nicknameLabel')}</Label>
            <Input
              id="nickname"
              name="nickname"
              type="text"
              value={formData.nickname}
              onChange={handleInputChange}
              placeholder={t('login.nicknamePlaceholder')}
              maxLength={20}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="age">{t('login.ageLabel')}</Label>
            <Input
              id="age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleInputChange}
              placeholder={t('login.agePlaceholder')}
              min="1"
              max="120"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="gender">{t('login.genderLabel')}</Label>
            <Select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">{t('login.genderPlaceholder')}</option>
              <option value="male">{t('login.male')}</option>
              <option value="female">{t('login.female')}</option>
              <option value="other">{t('login.other')}</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="location">{t('login.locationLabel')}</Label>
            <Input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleInputChange}
              placeholder={t('login.locationPlaceholder')}
              maxLength={50}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="bio">{t('login.bioLabel')}</Label>
            <TextArea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder={t('login.bioPlaceholder')}
              maxLength={100}
            />
          </FormGroup>

          <FormGroup>
            <Label>{t('login.avatarLabel')}</Label>
            <AvatarSection>
              <AvatarPreview image={avatar} onClick={handleAvatarClick}>
                {!avatar && <UserIcon />}
              </AvatarPreview>
              <div>
                <UploadButton type="button" onClick={handleAvatarClick}>
                  {t('login.selectAvatar')}
                </UploadButton>
                <AvatarInput
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {t('login.avatarFormats')}
                </div>
              </div>
            </AvatarSection>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('login.creating') : t('login.startGame')}
          </SubmitButton>
        </Form>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
