import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { conversationsAPI } from '../../services/api';
import { timeShort } from '../../utils/brand';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui';
import toast from 'react-hot-toast';
import { Send, Loader2 } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export default function GroupChat({ conversationId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Connect to socket and load messages
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    // Load initial messages
    const loadMessages = async () => {
      try {
        setLoading(true);
        const res = await conversationsAPI.getMessages(conversationId);
        setMessages(res.data.messages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (err) {
        toast.error('Failed to load chat messages.');
      } finally {
        setLoading(false);
      }
    };
    loadMessages();

    // Setup Socket
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('identify', user.id);
      socket.emit('joinConversation', conversationId);
    });

    socket.on('newMessage', (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });

    return () => {
      socket.emit('leaveConversation', conversationId);
      socket.disconnect();
    };
  }, [user?.id, conversationId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    try {
      setSending(true);
      const res = await conversationsAPI.sendMessage(conversationId, newMessage);
      const sent = res.data.message;
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border border-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-50/30 rounded-2xl border border-slate-200/60 overflow-hidden" style={{ height: '600px' }}>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm font-medium">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);

            return (
              <div key={msg.id} className={cn('flex flex-col max-w-[80%]', isMe ? 'ml-auto items-end' : 'mr-auto items-start')}>
                {!isMe && showAvatar && (
                  <span className="text-xs font-semibold text-slate-500 mb-1 ml-1">{msg.sender?.name}</span>
                )}
                <div className={cn('flex items-end gap-2', isMe && 'flex-row-reverse')}>
                  {!isMe && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar ? <Avatar name={msg.sender?.name || '?'} size="sm" /> : null}
                    </div>
                  )}
                  <div className={cn(
                    'px-4 py-2.5 text-[15px] leading-relaxed shadow-sm break-words',
                    isMe 
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-br-sm' 
                      : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100'
                  )}>
                    {msg.content}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {timeShort(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            style={{ '--tw-ring-color': 'rgba(26,43,107,0.15)' }} 
            onFocus={(e) => { e.target.style.borderColor='#1a2b6b'; }} 
            onBlur={(e) => { e.target.style.borderColor=''; }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
