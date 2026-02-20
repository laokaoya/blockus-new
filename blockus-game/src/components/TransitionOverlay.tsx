import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import soundManager from '../utils/soundManager';

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

const TransitionOverlay: React.FC = () => {
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    const state = location.state as { showTransition?: boolean } | null;
    if (!state?.showTransition) return;

    const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    setMessage(randomMsg);

    setIsActive(true);
    soundManager.pageTransition();

    // Clear state to prevent re-trigger on re-render
    window.history.replaceState({}, '');

    const timer = setTimeout(() => {
      setIsActive(false);
    }, 1400);

    // Safety: force-hide after 3s in case something goes wrong
    const safety = setTimeout(() => {
      setIsActive(false);
    }, 3000);

    return () => { clearTimeout(timer); clearTimeout(safety); };
  }, [location]);

  if (!isActive) return null;

  return (
    <OverlayContainer $isActive={isActive}>
      <GlitchLayer />
      <Scanline />
      <LoadingText>{message}</LoadingText>
    </OverlayContainer>
  );
};

export default TransitionOverlay;
