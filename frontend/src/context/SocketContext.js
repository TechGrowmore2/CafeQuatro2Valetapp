import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { initSocket, connectSocket, disconnectSocket, getSocket } from '../services/socket';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketInstance = initSocket();
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        
        // Join appropriate room based on role
        if (user.role === 'driver') {
          socketInstance.emit('join-driver', user.id);
        } else if (user.role === 'customer') {
          socketInstance.emit('join-customer', user.phone);
        } else if (user.role === 'supervisor') {
          socketInstance.emit('join-supervisor', user.id);
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      connectSocket();

      return () => {
        disconnectSocket();
      };
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    connected,
    emit: (event, data) => {
      if (socket && connected) {
        socket.emit(event, data);
      }
    },
    on: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
      }
    },
    off: (event, callback) => {
      if (socket) {
        socket.off(event, callback);
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
