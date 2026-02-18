import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { RoomProvider } from './contexts/RoomContext';
import MainLobby from './components/MainLobby';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import GameRoom from './components/GameRoom';
import Game from './components/Game';
import GameSettings from './components/GameSettings';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import LandingPage from './components/LandingPage';
import ParticlesBackground from './components/ParticlesBackground';
import TransitionOverlay from './components/TransitionOverlay';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <SocketProvider>
        <AuthProvider>
          <RoomProvider>
          <Router>
            <div className="App">
              <ParticlesBackground />
              <TransitionOverlay />
              <Routes>
                <Route path="/welcome" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<MainLobby />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/room/:roomId" element={<GameRoom />} />
                <Route path="/game" element={<Game />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/game-settings" element={<GameSettings />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
          </RoomProvider>
        </AuthProvider>
      </SocketProvider>
    </LanguageProvider>
  );
}

export default App;
