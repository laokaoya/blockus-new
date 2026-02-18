import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import socketService from '../services/socketService';

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = socketService.on('connectionChange', (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setConnectionError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async (token?: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      await socketService.connect(token);
      setIsConnected(true);
    } catch (error: any) {
      setConnectionError(error.message || 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  const value: SocketContextType = {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    connectionError,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
