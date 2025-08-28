import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import MainLobby from './components/MainLobby';
import Game from './components/Game';
import GameSettings from './components/GameSettings';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<MainLobby />} />
            <Route path="/game" element={<Game />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/game-settings" element={<GameSettings />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
