import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:4000';

const socket = io(SOCKET_URL, {
  autoConnect: false, // Connected automatically when user is authenticated
});

let currentOnlineUsers = [];
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((fn) => fn([...currentOnlineUsers]));
};

socket.on('online_users', (users) => {
  currentOnlineUsers = Array.isArray(users) ? users : [];
  notifyListeners();
});

socket.on('onlineUsers', (users) => {
  currentOnlineUsers = Array.isArray(users) ? users : [];
  notifyListeners();
});

socket.on('userOnline', (userId) => {
  if (userId && !currentOnlineUsers.includes(userId)) {
    currentOnlineUsers = [...currentOnlineUsers, userId];
    notifyListeners();
  }
});

socket.on('userOffline', (userId) => {
  if (userId) {
    currentOnlineUsers = currentOnlineUsers.filter((id) => id !== userId);
    notifyListeners();
  }
});

socket.on('connect', () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) socket.emit('identify', parsed.id);
    }
  } catch {
    // ignore
  }
  socket.emit('request_online_users');
});

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState(currentOnlineUsers);

  useEffect(() => {
    const handler = (users) => setOnlineUsers([...users]);
    listeners.add(handler);
    if (socket.connected) {
      socket.emit('request_online_users');
    }
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return onlineUsers;
}

export default socket;
