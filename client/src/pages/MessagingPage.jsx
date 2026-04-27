import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { conversationsAPI, usersAPI } from '../services/api';
import { timeShort } from '../utils/brand';
import { cn } from '../utils/cn';
import { Avatar, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Send, Loader2, MessageSquare, ArrowLeft, Search, Plus, X,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export default function MessagingPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeConvRef = useRef(null);

  // Keep ref in sync so socket handler always has fresh value
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Socket.io setup
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('newMessage', (msg) => {
      const convId = msg.conversationId;
      // Append to messages if this conversation is active
      if (activeConvRef.current?.id === convId) {
        setMessages((prev) => {
          // Avoid duplicates (our own sent messages are added optimistically)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      // Update last message preview in conversation list (dedup if conv not yet in list)
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === convId);
        const updated = exists
          ? prev.map((c) => c.id === convId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c)
          : prev; // don't add unknown conversations from socket alone
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await conversationsAPI.getAll();
        setConversations(res.data.conversations);
      } catch { toast.error('Failed to load conversations.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const openConversation = async (conv) => {
    // Leave previous room
    if (activeConvRef.current) {
      socketRef.current?.emit('leaveConversation', activeConvRef.current.id);
    }
    setActiveConv(conv);
    setMessagesLoading(true);
    // Join new room for real-time updates
    socketRef.current?.emit('joinConversation', conv.id);
    try {
      const res = await conversationsAPI.getMessages(conv.id);
      setMessages(res.data.messages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to load messages.'); }
    finally { setMessagesLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;
    try {
      setSending(true);
      const res = await conversationsAPI.sendMessage(activeConv.id, newMessage);
      const sent = res.data.message;
      // Add to messages (socket may also deliver it — dedup by id handles that)
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
      setNewMessage('');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessage: sent, updatedAt: sent.createdAt }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to send message.'); }
    finally { setSending(false); }
  };

  const handleNewConversation = async (participantId) => {
    try {
      const res = await conversationsAPI.create({ participantId });
      const conv = res.data.conversation;

      let convToOpen = conv;
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === conv.id);
        if (existing) {
          // Use the full local entry (has lastMessage, updatedAt)
          convToOpen = existing;
          return prev;
        }
        return [{ ...conv, lastMessage: null, updatedAt: new Date().toISOString() }, ...prev];
      });

      setShowNewChat(false);
      // Small defer so setConversations state flush happens before openConversation reads refs
      setTimeout(() => openConversation(convToOpen), 0);
    } catch { toast.error('Failed to start conversation.'); }
  };

  const getOtherUser = (conv) => {
    if (conv.isGroup) return { name: conv.name || 'Group Chat' };
    return conv.participants?.find((p) => p.id !== user?.id) || { name: 'Unknown' };
  };

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full bg-indigo-500/[0.14] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-violet-500/[0.10] blur-3xl" />
          <div className="absolute top-0 left-1/2 w-72 h-40 rounded-full bg-blue-400/[0.10] blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 block mb-2">Direct Messages</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Messages</h1>
          <p className="text-indigo-200 text-sm mt-1.5">Chat with classmates and colleagues</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Chat Window ── */}
        <div
          className="bg-white rounded-2xl border border-slate-900/[0.06] shadow-sm overflow-hidden"
          style={{ height: 'calc(100vh - 13rem)' }}
        >
          <div className="flex h-full">
            {/* ── Sidebar: Conversation List ── */}
            <div className={cn(
              'w-full md:w-[280px] border-r border-slate-100 flex flex-col flex-shrink-0',
              activeConv ? 'hidden md:flex' : 'flex'
            )}>
              {/* List header */}
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Chats</span>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 cursor-pointer transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Conversation items */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="space-y-1 p-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3 w-2/3 rounded" />
                          <div className="skeleton h-2.5 w-full rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare size={22} className="text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No conversations</p>
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold mt-2 cursor-pointer transition-colors"
                    >
                      Start a chat
                    </button>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const other = getOtherUser(conv);
                    const isActive = activeConv?.id === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer text-left border-b border-slate-50',
                          isActive
                            ? 'bg-indigo-50 border-l-2 border-l-indigo-600'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <Avatar name={other.name || ''} size="sm" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn('text-xs font-bold truncate', isActive ? 'text-indigo-700' : 'text-slate-900')}>
                              {other.name}
                            </p>
                            {conv.lastMessage && (
                              <span className="text-[10px] text-slate-400 flex-shrink-0">{timeShort(conv.lastMessage.createdAt)}</span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {conv.lastMessage.sender?.id === user?.id ? 'You: ' : ''}
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Main: Chat Area ── */}
            <div className={cn('flex-1 flex flex-col min-w-0', !activeConv ? 'hidden md:flex' : 'flex')}>
              {activeConv ? (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm">
                    <button
                      onClick={() => setActiveConv(null)}
                      className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <Avatar name={getOtherUser(activeConv).name || ''} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{getOtherUser(activeConv).name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-slate-400 font-semibold">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f8fafc]">
                    {messagesLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-indigo-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <MessageSquare size={22} className="text-slate-200" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Start the conversation!</p>
                        <p className="text-xs text-slate-400 mt-1">Say hello to {getOtherUser(activeConv).name}</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'max-w-[72%] px-4 py-2.5 text-sm leading-relaxed break-words',
                              isMine ? 'msg-sent' : 'msg-received'
                            )}>
                              <p>{msg.content}</p>
                              <p className={cn('text-[10px] mt-1 text-right', isMine ? 'text-indigo-200' : 'text-slate-400')}>
                                {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={handleSend}
                    className="px-4 py-3 border-t border-slate-100 flex gap-2 bg-white"
                  >
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${getOtherUser(activeConv).name}...`}
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="h-10 w-10 rounded-xl gradient-brand text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex-shrink-0 shadow-sm shadow-indigo-500/25"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] text-center p-8">
                  <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <MessageSquare size={28} className="text-slate-200" />
                  </div>
                  <p className="text-base font-bold text-slate-800">Your messages</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-xs">
                    Select a conversation to start chatting, or start a new one.
                  </p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-bold hover:opacity-90 cursor-pointer transition-all shadow-md shadow-indigo-500/25"
                  >
                    <Plus size={14} /> New Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            onSelect={handleNewConversation}
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  );
}

function NewChatModal({ onClose, onSelect, currentUserId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      setSearching(true);
      const res = await usersAPI.search(q);
      setResults(res.data.users.filter((u) => u.id !== currentUserId));
    } catch { toast.error('Search failed.'); }
    finally { setSearching(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl shadow-slate-900/20 border border-slate-100 animate-scaleUp">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <MessageSquare size={14} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">New Conversation</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto px-3 pb-3">
          {searching ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin text-indigo-400" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 font-medium">
              {query.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
            </p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelect(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 rounded-xl cursor-pointer text-left transition-colors"
              >
                <Avatar name={u.name || ''} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                  {u.department && <p className="text-[11px] text-slate-400 truncate font-medium">{u.department}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
