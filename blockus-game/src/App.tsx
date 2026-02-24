import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { RoomProvider } from './contexts/RoomContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';
import ParticlesBackground from './components/ParticlesBackground';
import TransitionOverlay from './components/TransitionOverlay';
import './App.css';

// 路由级代码分割，降低首屏体积
const LandingPage = lazy(() => import('./components/LandingPage'));
const Login = lazy(() => import('./components/Login'));
const MainLobby = lazy(() => import('./components/MainLobby'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const GameRoom = lazy(() => import('./components/GameRoom'));
const Game = lazy(() => import('./components/Game'));
const CreativeGame = lazy(() => import('./components/creative/CreativeGame'));
const Settings = lazy(() => import('./components/Settings'));
const GameSettings = lazy(() => import('./components/GameSettings'));
const Statistics = lazy(() => import('./components/Statistics'));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
    加载中...
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            <SocketProvider>
              <ConnectionStatus />
              <AuthProvider>
                <RoomProvider>
                  <Router>
                    <div className="App">
                      <ParticlesBackground />
                      <TransitionOverlay />
                      <Suspense fallback={<PageFallback />}>
                        <Routes>
                          <Route path="/welcome" element={<LandingPage />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/" element={<MainLobby />} />
                          <Route path="/profile" element={<UserProfile />} />
                          <Route path="/room/:roomId" element={<GameRoom />} />
                          <Route path="/game" element={<Game />} />
                          <Route path="/creative" element={<CreativeGame />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/game-settings" element={<GameSettings />} />
                          <Route path="/statistics" element={<Statistics />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </div>
                  </Router>
                </RoomProvider>
              </AuthProvider>
            </SocketProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
