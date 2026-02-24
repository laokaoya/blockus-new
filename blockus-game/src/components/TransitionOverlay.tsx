import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import soundManager from '../utils/soundManager';
import { useLanguage } from '../contexts/LanguageContext';

const glitchAnim = keyframes`
  0% {
    clip-path: inset(40% 0 61% 0);
    transform: translate(-20px, -10px);
  }
  20% {
    clip-path: inset(92% 0 1% 0);
    transform: translate(20px, 10px);
  }
  40% {
    clip-path: inset(43% 0 1% 0);
    transform: translate(-20px, 10px);
  }
  60% {
    clip-path: inset(25% 0 58% 0);
    transform: translate(20px, -10px);
  }
  80% {
    clip-path: inset(54% 0 7% 0);
    transform: translate(-20px, 10px);
  }
  100% {
    clip-path: inset(58% 0 43% 0);
    transform: translate(20px, -10px);
  }
`;

const scanlineAnim = keyframes`
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
`;

const OverlayContainer = styled.div<{ $isActive: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
  opacity: 0;
  transition: opacity 0.4s ease;

  ${props => props.$isActive && css`
    opacity: 1;
    pointer-events: auto;
  `}
`;

const GlitchLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #0f172a;
  
  &::before, &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0f172a;
  }

  &::before {
    animation: ${glitchAnim} 0.4s infinite linear alternate-reverse;
    background: #1a237e;
    opacity: 0.5;
  }

  &::after {
    animation: ${glitchAnim} 0.4s infinite linear alternate;
    background: #4f46e5;
    opacity: 0.5;
  }
`;

const Scanline = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  animation: ${scanlineAnim} 1s linear infinite;
`;

const LoadingText = styled.div`
  color: #fff;
  font-family: 'Courier New', monospace;
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 5px;
  z-index: 10;
  text-shadow: 0 0 10px #fff;
  animation: blink 0.8s ease-in-out infinite;

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const SkipButton = styled.button`
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  z-index: 11;
  transition: all 0.2s ease;
  font-family: 'Rajdhani', sans-serif;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const LOADING_MESSAGES = [
  "SYSTEM SYNCHRONIZING...",
  "ESTABLISHING UPLINK...",
  "LOADING ASSETS...",
  "CALIBRATING SENSORS...",
  "ENCRYPTING DATA...",
  "NETWORK HANDSHAKE...",
  "ACCESSING MAINFRAME...",
  "DECRYPTING PROTOCOLS...",
  "REROUTING POWER...",
  "SCANNING BIOMETRICS...",
  "INITIALIZING..."
];

const SKIP_BUTTON_DELAY_MS = 2500;  // 2.5 秒后显示「跳过」
const TRANSITION_TIMEOUT_MS = 6000; // 6 秒视为超时，显示返回提示

const TransitionOverlay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);
  const [showSkip, setShowSkip] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    const state = location.state as { showTransition?: boolean; fromGameReturn?: boolean } | null;
    if (!state?.showTransition) {
      setIsActive(false);
      setShowSkip(false);
      setIsTimeout(false);
      return;
    }

    const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    setMessage(randomMsg);
    setShowSkip(false);
    setIsTimeout(false);
    setIsActive(true);
    soundManager.pageTransition();

    // Clear showTransition to prevent re-trigger, preserve fromGameReturn for MainLobby
    const preserved = state?.fromGameReturn ? { fromGameReturn: true } : {};
    window.history.replaceState(preserved, '');

    const timer = setTimeout(() => setIsActive(false), 1400);
    const safety = setTimeout(() => setIsActive(false), 8000); // 兜底 8 秒强制关闭
    const skipTimer = setTimeout(() => setShowSkip(true), SKIP_BUTTON_DELAY_MS);
    const timeoutTimer = setTimeout(() => setIsTimeout(true), TRANSITION_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(safety);
      clearTimeout(skipTimer);
      clearTimeout(timeoutTimer);
    };
  }, [location]);

  const handleSkip = () => {
    setIsActive(false);
    setShowSkip(false);
    setIsTimeout(false);
  };

  const handleBackOnTimeout = () => {
    setIsActive(false);
    navigate('/', { replace: true });
  };

  if (!isActive) return null;

  return (
    <OverlayContainer $isActive={isActive}>
      <GlitchLayer />
      <Scanline />
      <LoadingText>{isTimeout ? 'LOAD TIMEOUT' : message}</LoadingText>
      {isTimeout ? (
        <SkipButton onClick={handleBackOnTimeout}>
          {t('common.loadingTimeout')}，{t('common.backToHome')}
        </SkipButton>
      ) : showSkip ? (
        <SkipButton onClick={handleSkip}>{t('common.skip') || 'Skip'}</SkipButton>
      ) : null}
    </OverlayContainer>
  );
};

export default TransitionOverlay;
