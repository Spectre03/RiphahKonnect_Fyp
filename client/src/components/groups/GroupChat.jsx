import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { conversationsAPI } from '../../services/api';
import socket from '../../services/socket';
import { timeShort } from '../../utils/brand';
import { cn } from '../../utils/cn';
import { checkTextContent } from '../../utils/moderation';
import { Avatar } from '../ui';
import toast from 'react-hot-toast';
import { Send, Loader2, Pin, X } from 'lucide-react';

export default function GroupChat({ conversationId, canPin = false }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Connect to shared socket and load messages
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const res = await conversationsAPI.getMessages(conversationId);
        setMessages(res.data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch {
        toast.error('Failed to load chat messages.');
      } finally {
        setLoading(false);
      }
    };
    loadMessages();

    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('identify', user.id);
    }
    socket.emit('joinConversation', conversationId);

    const handleNewMessage = (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    const handleMessagePinned = (updatedMsg) => {
      if (updatedMsg.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messagePinned', handleMessagePinned);

    return () => {
      socket.emit('leaveConversation', conversationId);
      socket.off('newMessage', handleNewMessage);
      socket.off('messagePinned', handleMessagePinned);
    };
  }, [user?.id, conversationId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const modCheck = checkTextContent(newMessage, { minLength: 1, fieldName: 'Message' });
    if (!modCheck.clean) {
      toast.error(modCheck.reason);
      return;
    }

    try {
      setSending(true);
      const res = await conversationsAPI.sendMessage(conversationId, newMessage.trim());
      const sent = res.data.message;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleTogglePin = async (messageId) => {
    if (!canPin) return;
    try {
      const res = await conversationsAPI.togglePin(messageId);
      const updatedMsg = res.data.message;
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
      toast.success(updatedMsg.isPinned ? 'Message pinned to group chat' : 'Message unpinned');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to pin/unpin message.');
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1] || null;

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
      {/* Pinned Message Banner */}
      {latestPinned && (
        <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Pin size={14} className="fill-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-amber-900">
                  Pinned Message {pinnedMessages.length > 1 ? `(${pinnedMessages.length})` : ''}
                </p>
                {latestPinned.sender?.name && (
                  <span className="text-[11px] font-medium text-amber-700">
                    · {latestPinned.sender.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 truncate">{latestPinned.content}</p>
            </div>
          </div>
          {canPin && (
            <button
              type="button"
              onClick={() => handleTogglePin(latestPinned.id)}
              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Unpin message"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm font-medium">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id;
            const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[80%] group',
                  isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                {!isMe && showAvatar && (
                  <span className="text-xs font-semibold text-slate-500 mb-1 ml-1">{msg.sender?.name}</span>
                )}
                <div className={cn('flex items-center gap-2', isMe && 'flex-row-reverse')}>
                  {!isMe && (
                    <div className="w-8 flex-shrink-0 self-end">
                      {showAvatar ? <Avatar name={msg.sender?.name || '?'} src={msg.sender?.avatarUrl} size="sm" /> : null}
                    </div>
                  )}
                  <div
                    className={cn(
                      'px-4 py-2.5 text-[15px] leading-relaxed shadow-sm break-words relative',
                      isMe
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100'
                    )}
                  >
                    {msg.isPinned && (
                      <div
                        className="absolute -top-2 -right-2 bg-amber-100 text-amber-600 rounded-full p-1 shadow-sm border border-amber-200"
                        title="Pinned message"
                      >
                        <Pin size={10} className="fill-amber-600" />
                      </div>
                    )}
                    {msg.content}
                  </div>

                  {/* Pin / Unpin Button (Coordinators, Teachers, and Admins only) */}
                  {canPin && (
                    <button
                      type="button"
                      onClick={() => handleTogglePin(msg.id)}
                      className={cn(
                        'p-1.5 rounded-full transition-all cursor-pointer flex-shrink-0',
                        msg.isPinned
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 opacity-100'
                          : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                      )}
                      title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                    >
                      <Pin size={14} className={msg.isPinned ? 'fill-amber-600' : ''} />
                    </button>
                  )}
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
            onFocus={(e) => { e.target.style.borderColor = '#1a2b6b'; }}
            onBlur={(e) => { e.target.style.borderColor = ''; }}
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
