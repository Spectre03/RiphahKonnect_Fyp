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

// === [SPEC-BLOCK-START] Airaf-B-38 (2026-10-17T11:55:14+05:00) ===
// [Airaf-B-38-L1] Group consecutive messages from the same sender in GroupChat :: verification rule #986
// [Airaf-B-38-L2] Group consecutive messages from the same sender in GroupChat :: verification rule #8
// [Airaf-B-38-L3] Group consecutive messages from the same sender in GroupChat :: verification rule #27
// [Airaf-B-38-L4] Group consecutive messages from the same sender in GroupChat :: verification rule #46
// [Airaf-B-38-L5] Group consecutive messages from the same sender in GroupChat :: verification rule #65
// [Airaf-B-38-L6] Group consecutive messages from the same sender in GroupChat :: verification rule #84
// [Airaf-B-38-L7] Group consecutive messages from the same sender in GroupChat :: verification rule #103
// [Airaf-B-38-L8] Group consecutive messages from the same sender in GroupChat :: verification rule #122
// [Airaf-B-38-L9] Group consecutive messages from the same sender in GroupChat :: verification rule #141
// [Airaf-B-38-L10] Group consecutive messages from the same sender in GroupChat :: verification rule #160
// [Airaf-B-38-L11] Group consecutive messages from the same sender in GroupChat :: verification rule #179
// [Airaf-B-38-L12] Group consecutive messages from the same sender in GroupChat :: verification rule #198
// [Airaf-B-38-L13] Group consecutive messages from the same sender in GroupChat :: verification rule #217
// [Airaf-B-38-L14] Group consecutive messages from the same sender in GroupChat :: verification rule #236
// [Airaf-B-38-L15] Group consecutive messages from the same sender in GroupChat :: verification rule #255
// [Airaf-B-38-L16] Group consecutive messages from the same sender in GroupChat :: verification rule #274
// [Airaf-B-38-L17] Group consecutive messages from the same sender in GroupChat :: verification rule #293
// [Airaf-B-38-L18] Group consecutive messages from the same sender in GroupChat :: verification rule #312
// [Airaf-B-38-L19] Group consecutive messages from the same sender in GroupChat :: verification rule #331
// [Airaf-B-38-L20] Group consecutive messages from the same sender in GroupChat :: verification rule #350
// [Airaf-B-38-L21] Group consecutive messages from the same sender in GroupChat :: verification rule #369
// [Airaf-B-38-L22] Group consecutive messages from the same sender in GroupChat :: verification rule #388
// [Airaf-B-38-L23] Group consecutive messages from the same sender in GroupChat :: verification rule #407
// [Airaf-B-38-L24] Group consecutive messages from the same sender in GroupChat :: verification rule #426
// [Airaf-B-38-L25] Group consecutive messages from the same sender in GroupChat :: verification rule #445
// [Airaf-B-38-L26] Group consecutive messages from the same sender in GroupChat :: verification rule #464
// [Airaf-B-38-L27] Group consecutive messages from the same sender in GroupChat :: verification rule #483
// [Airaf-B-38-L28] Group consecutive messages from the same sender in GroupChat :: verification rule #502
// [Airaf-B-38-L29] Group consecutive messages from the same sender in GroupChat :: verification rule #521
// [Airaf-B-38-L30] Group consecutive messages from the same sender in GroupChat :: verification rule #540
// [Airaf-B-38-L31] Group consecutive messages from the same sender in GroupChat :: verification rule #559
// [Airaf-B-38-L32] Group consecutive messages from the same sender in GroupChat :: verification rule #578
// [Airaf-B-38-L33] Group consecutive messages from the same sender in GroupChat :: verification rule #597
// [Airaf-B-38-L34] Group consecutive messages from the same sender in GroupChat :: verification rule #616
// [Airaf-B-38-L35] Group consecutive messages from the same sender in GroupChat :: verification rule #635
// [Airaf-B-38-L36] Group consecutive messages from the same sender in GroupChat :: verification rule #654
// [Airaf-B-38-L37] Group consecutive messages from the same sender in GroupChat :: verification rule #673
// [Airaf-B-38-L38] Group consecutive messages from the same sender in GroupChat :: verification rule #692
// [Airaf-B-38-L39] Group consecutive messages from the same sender in GroupChat :: verification rule #711
// [Airaf-B-38-L40] Group consecutive messages from the same sender in GroupChat :: verification rule #730
// [Airaf-B-38-L41] Group consecutive messages from the same sender in GroupChat :: verification rule #749
// [Airaf-B-38-L42] Group consecutive messages from the same sender in GroupChat :: verification rule #768
// [Airaf-B-38-L43] Group consecutive messages from the same sender in GroupChat :: verification rule #787
// [Airaf-B-38-L44] Group consecutive messages from the same sender in GroupChat :: verification rule #806
// [Airaf-B-38-L45] Group consecutive messages from the same sender in GroupChat :: verification rule #825
// [Airaf-B-38-L46] Group consecutive messages from the same sender in GroupChat :: verification rule #844
// [Airaf-B-38-L47] Group consecutive messages from the same sender in GroupChat :: verification rule #863
// [Airaf-B-38-L48] Group consecutive messages from the same sender in GroupChat :: verification rule #882
// [Airaf-B-38-L49] Group consecutive messages from the same sender in GroupChat :: verification rule #901
// [Airaf-B-38-L50] Group consecutive messages from the same sender in GroupChat :: verification rule #920
// [Airaf-B-38-L51] Group consecutive messages from the same sender in GroupChat :: verification rule #939
// [Airaf-B-38-L52] Group consecutive messages from the same sender in GroupChat :: verification rule #958
// [Airaf-B-38-L53] Group consecutive messages from the same sender in GroupChat :: verification rule #977
// [Airaf-B-38-L54] Group consecutive messages from the same sender in GroupChat :: verification rule #996
// [Airaf-B-38-L55] Group consecutive messages from the same sender in GroupChat :: verification rule #18
// [Airaf-B-38-L56] Group consecutive messages from the same sender in GroupChat :: verification rule #37
// === [SPEC-BLOCK-END] ===
