import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRoom, ChatMessage } from '../contexts/RoomContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import soundManager from '../utils/soundManager';

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const messagePop = keyframes`
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ChatContainer = styled.div<{ isOpen: boolean }>`
  position: absolute;
  right: 20px;
  bottom: 120px; /* Above BottomDock */
  width: 320px;
  height: 400px;
  background: var(--surface-color);
  backdrop-filter: blur(12px);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(120%)'};
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
  opacity: ${props => props.isOpen ? 1 : 0};
  pointer-events: ${props => props.isOpen ? 'auto' : 'none'};
  z-index: 90;
  overflow: hidden;

  @media (max-width: 768px) {
    width: calc(100% - 40px);
    right: 20px;
    bottom: 100px;
    height: 300px;
  }
`;

const ChatHeader = styled.div`
  padding: 12px 16px;
  background: var(--surface-highlight);
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  color: var(--text-primary);
  letter-spacing: 1px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`;

const MessageItem = styled.div<{ isMe: boolean; isSystem: boolean }>`
  align-self: ${props => props.isSystem ? 'center' : (props.isMe ? 'flex-end' : 'flex-start')};
  max-width: 85%;
  animation: ${messagePop} 0.2s ease-out;
  
  ${props => props.isSystem ? `
    background: var(--surface-highlight);
    color: var(--text-secondary);
    font-size: 0.75rem;
    padding: 4px 12px;
    border-radius: 12px;
    margin: 4px 0;
    text-align: center;
  ` : `
    display: flex;
    flex-direction: column;
    align-items: ${props.isMe ? 'flex-end' : 'flex-start'};
  `}
`;

const SenderName = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-bottom: 2px;
  margin-left: 4px;
  margin-right: 4px;
`;

const MessageBubble = styled.div<{ isMe: boolean }>`
  background: ${props => props.isMe ? 'var(--primary-gradient)' : 'var(--surface-highlight)'};
  color: ${props => props.isMe ? 'white' : 'var(--text-primary)'};
  padding: 8px 12px;
  border-radius: 12px;
  border-top-right-radius: ${props => props.isMe ? '2px' : '12px'};
  border-top-left-radius: ${props => props.isMe ? '12px' : '2px'};
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const InputArea = styled.form`
  padding: 12px;
  background: var(--surface-highlight);
  display: flex;
  gap: 8px;
`;

const ChatInput = styled.input`
  flex: 1;
  background: var(--surface-color);
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  padding: 8px 16px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: 'Rajdhani', sans-serif;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: var(--surface-color);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const SendButton = styled.button`
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 10px var(--primary-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ToggleButton = styled.button<{ isOpen: boolean; hasUnread: boolean }>`
  position: absolute;
  right: 20px;
  bottom: 120px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 89;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  opacity: ${props => props.isOpen ? 0 : 1};
  pointer-events: ${props => props.isOpen ? 'none' : 'auto'};
  transform: ${props => props.isOpen ? 'scale(0.8)' : 'scale(1)'};

  &:hover {
    background: rgba(30, 41, 59, 0.8);
    transform: translateY(-2px);
    border-color: var(--primary-color);
  }

  ${props => props.hasUnread && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid rgba(15, 23, 42, 1);
      animation: pulse 2s infinite;
    }
  `}

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  @media (max-width: 768px) {
    bottom: 100px;
  }
`;

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 11.5C21.0039 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChatBox: React.FC = () => {
  const { chatMessages, sendChatMessage } = useRoom();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatMessages.length > prevMessagesLengthRef.current) {
      if (isOpen) {
        scrollToBottom();
      } else {
        setHasUnread(true);
        soundManager.messageNotification();
      }
    }
    prevMessagesLengthRef.current = chatMessages.length;
  }, [chatMessages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendChatMessage(inputValue.trim());
      setInputValue('');
      soundManager.buttonClick();
    }
  };

  return (
    <>
      <ToggleButton 
        isOpen={isOpen} 
        onClick={() => {
          setIsOpen(true);
          soundManager.buttonClick();
        }}
        hasUnread={hasUnread}
        title="Chat"
      >
        <ChatIcon />
      </ToggleButton>

      <ChatContainer isOpen={isOpen}>
        <ChatHeader>
          <span>CHAT ROOM</span>
          <CloseButton onClick={() => setIsOpen(false)}>×</CloseButton>
        </ChatHeader>
        
        <MessagesArea>
          {chatMessages.map((msg, index) => (
            <MessageItem 
              key={`${msg.timestamp}-${index}`} 
              isMe={msg.senderId === user?.profile.id}
              isSystem={msg.type === 'system'}
            >
              {msg.type !== 'system' && !msg.senderId.startsWith('ai_') && (
                <SenderName>{msg.senderName}</SenderName>
              )}
              <MessageBubble isMe={msg.senderId === user?.profile.id}>
                {msg.content}
              </MessageBubble>
            </MessageItem>
          ))}
          <div ref={messagesEndRef} />
        </MessagesArea>

        <InputArea onSubmit={handleSubmit}>
          <ChatInput 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
          />
          <SendButton type="submit" disabled={!inputValue.trim()}>
            <SendIcon />
          </SendButton>
        </InputArea>
      </ChatContainer>
    </>
  );
};

export default ChatBox;