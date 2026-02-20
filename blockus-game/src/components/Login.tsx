import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserProfile } from '../types/game';

type AuthMode = 'login' | 'register' | 'reset';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const LoginContainer = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-gradient);
`;

const LoginCard = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 36px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 420px;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;

  @media (max-width: 480px) {
    padding: 24px 20px;
  }
`;

const Title = styled.h1`
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: 'Rajdhani', sans-serif;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin-bottom: 28px;
  font-size: 0.9rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const PrimaryButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 13px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
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

const GuestButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  padding: 13px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    background: var(--surface-border);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 4px 0;

  &::before, &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--surface-border);
  }

  span {
    padding: 0 14px;
    color: var(--text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 0;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
`;

const ForgotLink = styled(LinkButton)`
  display: block;
  text-align: right;
  margin-top: -8px;
`;

const SwitchRow = styled.div`
  margin-top: 4px;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(239, 68, 68, 0.2);
  font-size: 0.85rem;
  text-align: left;
`;

const SuccessMessage = styled.div`
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(16, 185, 129, 0.2);
  font-size: 0.85rem;
  text-align: left;
`;

const GuestNicknameRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;

  > div { flex: 1; }
`;

function mapFirebaseError(code: string, t: (key: string) => string): string {
  switch (code) {
    case 'auth/email-already-in-use': return t('login.emailAlreadyInUse');
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return t('login.wrongPassword');
    case 'auth/user-not-found': return t('login.userNotFound');
    case 'auth/too-many-requests': return t('login.tooManyRequests');
    case 'auth/invalid-email': return t('login.emailInvalid');
    case 'auth/weak-password': return t('login.passwordTooShort');
    default: return t('login.loginFailed');
  }
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail, loginAsGuest, resetPassword } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [guestNickname, setGuestNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) { setError(t('login.emailRequired')); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError(t('login.emailInvalid')); return; }
    if (!password) { setError(t('login.passwordRequired')); return; }
    if (password.length < 6) { setError(t('login.passwordTooShort')); return; }

    if (mode === 'register') {
      if (!nickname.trim()) { setError(t('login.nicknameRequired')); return; }
      if (nickname.length > 20) { setError(t('login.nicknameTooLong')); return; }
      if (password !== confirmPassword) { setError(t('login.passwordMismatch')); return; }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(email, password, nickname.trim());
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/', { state: { showTransition: true } });
    } catch (err: any) {
      const code = err?.code || '';
      setError(mapFirebaseError(code, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) { setError(t('login.emailRequired')); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError(t('login.emailInvalid')); return; }

    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess(t('login.resetPasswordSent'));
    } catch (err: any) {
      const code = err?.code || '';
      setError(mapFirebaseError(code, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const finalNick = guestNickname.trim() || `Guest_${Math.floor(Math.random() * 10000)}`;
      const profile: UserProfile = {
        id: `guest_${Date.now()}`,
        nickname: finalNick,
        isGuest: true,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };
      await loginAsGuest(profile);
      navigate('/', { state: { showTransition: true } });
    } catch {
      setError(t('login.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  if (mode === 'reset') {
    return (
      <LoginContainer>
        <LoginCard>
          <Title>{t('login.resetPassword')}</Title>
          <Subtitle>{t('login.resetPasswordDesc')}</Subtitle>
          <Form onSubmit={handleResetPassword}>
            <FormGroup>
              <Label>{t('login.emailLabel')}</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
              />
            </FormGroup>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('login.sending') : t('login.sendResetEmail')}
            </PrimaryButton>
            <SwitchRow>
              <LinkButton type="button" onClick={() => switchMode('login')}>
                {t('login.backToLogin')}
              </LinkButton>
            </SwitchRow>
          </Form>
        </LoginCard>
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <LoginCard>
        <Title>{t('login.welcome')}</Title>
        <Subtitle>{t('login.subtitle')}</Subtitle>

        <Form onSubmit={handleEmailAuth}>
          {mode === 'register' && (
            <FormGroup>
              <Label>{t('login.nicknameLabel')} *</Label>
              <Input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder={t('login.nicknamePlaceholder')}
                maxLength={20}
                autoComplete="username"
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label>{t('login.emailLabel')}</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              autoComplete="email"
            />
          </FormGroup>

          <FormGroup>
            <Label>{t('login.passwordLabel')}</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </FormGroup>

          {mode === 'register' && (
            <FormGroup>
              <Label>{t('login.confirmPasswordLabel')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('login.confirmPasswordPlaceholder')}
                autoComplete="new-password"
              />
            </FormGroup>
          )}

          {mode === 'login' && (
            <ForgotLink type="button" onClick={() => switchMode('reset')}>
              {t('login.forgotPassword')}
            </ForgotLink>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? (mode === 'register' ? t('login.registering') : t('login.loggingIn'))
              : (mode === 'register' ? t('login.register') : t('login.login'))
            }
          </PrimaryButton>

          <SwitchRow>
            {mode === 'login' ? (
              <LinkButton type="button" onClick={() => switchMode('register')}>
                {t('login.switchToRegister')}
              </LinkButton>
            ) : (
              <LinkButton type="button" onClick={() => switchMode('login')}>
                {t('login.switchToLogin')}
              </LinkButton>
            )}
          </SwitchRow>
        </Form>

        <Divider><span>{t('login.orDivider')}</span></Divider>

        <div style={{ marginTop: '8px' }}>
          <GuestNicknameRow>
            <FormGroup>
              <Label>{t('login.nicknameLabel')}</Label>
              <Input
                type="text"
                value={guestNickname}
                onChange={e => setGuestNickname(e.target.value)}
                placeholder={t('login.nicknamePlaceholder')}
                maxLength={20}
              />
            </FormGroup>
          </GuestNicknameRow>
          <GuestButton
            onClick={handleGuest}
            disabled={isSubmitting}
            style={{ marginTop: '10px' }}
          >
            {t('login.enterAsGuest')}
          </GuestButton>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '6px' }}>
            {t('login.guestDesc')}
          </div>
        </div>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
