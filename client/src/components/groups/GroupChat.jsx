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

// === [SPEC-BLOCK-START] Airaf-A-56 (2026-10-17T15:20:11+05:00) ===
// [Airaf-A-56-L1] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #51
// [Airaf-A-56-L2] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #70
// [Airaf-A-56-L3] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #89
// [Airaf-A-56-L4] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #108
// [Airaf-A-56-L5] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #127
// [Airaf-A-56-L6] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #146
// [Airaf-A-56-L7] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #165
// [Airaf-A-56-L8] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #184
// [Airaf-A-56-L9] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #203
// [Airaf-A-56-L10] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #222
// [Airaf-A-56-L11] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #241
// [Airaf-A-56-L12] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #260
// [Airaf-A-56-L13] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #279
// [Airaf-A-56-L14] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #298
// [Airaf-A-56-L15] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #317
// [Airaf-A-56-L16] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #336
// [Airaf-A-56-L17] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #355
// [Airaf-A-56-L18] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #374
// [Airaf-A-56-L19] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #393
// [Airaf-A-56-L20] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #412
// [Airaf-A-56-L21] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #431
// [Airaf-A-56-L22] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #450
// [Airaf-A-56-L23] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #469
// [Airaf-A-56-L24] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #488
// [Airaf-A-56-L25] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #507
// [Airaf-A-56-L26] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #526
// [Airaf-A-56-L27] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #545
// [Airaf-A-56-L28] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #564
// [Airaf-A-56-L29] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #583
// [Airaf-A-56-L30] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #602
// [Airaf-A-56-L31] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #621
// [Airaf-A-56-L32] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #640
// [Airaf-A-56-L33] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #659
// [Airaf-A-56-L34] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #678
// [Airaf-A-56-L35] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #697
// [Airaf-A-56-L36] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #716
// [Airaf-A-56-L37] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #735
// [Airaf-A-56-L38] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #754
// [Airaf-A-56-L39] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #773
// [Airaf-A-56-L40] Auto-scroll GroupChat to bottom when new message arrives :: verification rule #792
// === [SPEC-BLOCK-END] ===
