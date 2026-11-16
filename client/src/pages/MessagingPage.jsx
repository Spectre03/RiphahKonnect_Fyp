import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { conversationsAPI, usersAPI } from '../services/api';
import socket, { useOnlineUsers } from '../services/socket';
import { timeShort } from '../utils/brand';
import { cn } from '../utils/cn';
import { checkTextContent } from '../utils/moderation';
import { Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Send, Loader2, MessageSquare, ArrowLeft, Search, Plus, X, Pin,
} from 'lucide-react';

export default function MessagingPage() {
  const { user } = useAuth();
  const onlineUsers = useOnlineUsers();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const messagesEndRef = useRef(null);
  const activeConvRef = useRef(null);
  const handledQueryRef = useRef(false);

  // Deduplicate DM conversations by partner ID so the same person's name never appears twice
  const deduplicateConversations = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const c of list) {
      if (!c) continue;
      if (!c.isGroup) {
        const other = c.participants?.find((p) => p.id !== user?.id);
        if (other?.id) {
          if (seen.has(other.id)) continue;
          seen.add(other.id);
        }
      }
      out.push(c);
    }
    return out;
  };

  // Keep ref in sync so socket handler always has fresh value
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Shared Socket.io listener setup
  useEffect(() => {
    if (!user?.id) return;
    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('identify', user.id);
    }

    const handleNewMessage = (msg) => {
      const convId = msg.conversationId;
      if (activeConvRef.current?.id === convId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === convId);
        if (!exists) {
          conversationsAPI.getAll()
            .then((res) => setConversations(deduplicateConversations(res.data.conversations || [])))
            .catch(() => {});
          return prev;
        }
        const updated = prev.map((c) =>
          c.id === convId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c
        );
        return deduplicateConversations(
          [...updated].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );
      });
    };

    const handleMessagePinned = (updatedMsg) => {
      if (activeConvRef.current?.id === updatedMsg.conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messagePinned', handleMessagePinned);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagePinned', handleMessagePinned);
    };
  }, [user?.id]);

  const openConversation = async (conv) => {
    if (!conv?.id) return;
    if (activeConvRef.current?.id && activeConvRef.current.id !== conv.id) {
      socket.emit('leaveConversation', activeConvRef.current.id);
    }
    setActiveConv(conv);
    setMessagesLoading(true);
    socket.emit('joinConversation', conv.id);
    try {
      const res = await conversationsAPI.getMessages(conv.id);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error('Failed to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleNewConversation = async (participantId, initialDraft = '') => {
    if (!participantId) return;
    try {
      const res = await conversationsAPI.create({ participantId });
      const conv = res.data.conversation;
      if (!conv) return;

      const existing = conversations.find((c) => c.id === conv.id || (!c.isGroup && c.participants?.some((p) => p.id === participantId)));
      const convToOpen = existing || {
        ...conv,
        lastMessage: null,
        updatedAt: new Date().toISOString(),
      };

      setConversations((prev) => {
        if (prev.some((c) => c.id === convToOpen.id)) return prev;
        return deduplicateConversations([convToOpen, ...prev]);
      });

      setShowNewChat(false);
      await openConversation(convToOpen);

      if (initialDraft) {
        setNewMessage(initialDraft);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start conversation.');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await conversationsAPI.getAll();
        const convList = deduplicateConversations(res.data.conversations || []);
        setConversations(convList);

        // 1. Check location.state?.openConvId (e.g. from ProfilePage)
        if (location.state?.openConvId) {
          const convToOpen = convList.find((c) => c.id === location.state.openConvId);
          if (convToOpen) {
            setTimeout(() => openConversation(convToOpen), 50);
          }
        }

        // 2. Check URL query params (?userId=...&inquire=...) from Lost & Found or Profile
        const targetUserId = searchParams.get('userId');
        const inquireText = searchParams.get('inquire');
        if (targetUserId && !handledQueryRef.current) {
          handledQueryRef.current = true;
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('userId');
          nextParams.delete('inquire');
          setSearchParams(nextParams, { replace: true });

          if (targetUserId !== user?.id) {
            const createRes = await conversationsAPI.create({ participantId: targetUserId });
            const conv = createRes.data.conversation;
            if (conv) {
              const existing = convList.find((c) => c.id === conv.id);
              const convToOpen = existing || {
                ...conv,
                lastMessage: null,
                updatedAt: new Date().toISOString(),
              };
              setConversations((prev) =>
                prev.some((c) => c.id === conv.id) ? prev : [convToOpen, ...prev]
              );
              await openConversation(convToOpen);
              if (inquireText) {
                setNewMessage(inquireText);
              }
            }
          }
        }
      } catch {
        toast.error('Failed to load conversations.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location.state?.openConvId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    const modCheck = checkTextContent(newMessage, { minLength: 1, fieldName: 'Message' });
    if (!modCheck.clean) {
      toast.error(modCheck.reason);
      return;
    }

    try {
      setSending(true);
      const res = await conversationsAPI.sendMessage(activeConv.id, newMessage.trim());
      const sent = res.data.message;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setNewMessage('');
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === activeConv.id
              ? { ...c, lastMessage: sent, updatedAt: sent.createdAt }
              : c
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conv) => {
    if (!conv) return { name: 'Unknown' };
    if (conv.isGroup) return { name: conv.name || 'Group Chat' };
    return conv.participants?.find((p) => p.id !== user?.id) || { name: 'Unknown' };
  };

  const handleTogglePin = async (messageId) => {
    try {
      const res = await conversationsAPI.togglePin(messageId);
      const updatedMsg = res.data.message;
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
      toast.success(updatedMsg.isPinned ? 'Message pinned' : 'Message unpinned');
    } catch {
      toast.error('Failed to pin/unpin message');
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const filteredConversations = conversations.filter((conv) => {
    if (!convSearch.trim()) return true;
    const other = getOtherUser(conv);
    return (other.name || '').toLowerCase().includes(convSearch.trim().toLowerCase());
  });

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>Direct Messages</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Messages</h1>
            <p className="text-slate-400 text-sm mt-1.5">Chat with students, teachers, and coordinators across campus</p>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
            style={{ background: '#c9973a', color: '#0c1a4a' }}
          >
            <Plus size={14} /> New Chat
          </button>
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
              'w-full md:w-[290px] border-r border-slate-100 flex flex-col flex-shrink-0',
              activeConv ? 'hidden md:flex' : 'flex'
            )}>
              {/* List header */}
              <div className="px-4 py-3.5 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Chats ({conversations.length})</span>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="h-7 px-2.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
                    title="Start new conversation"
                  >
                    <Plus size={13} /> New
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={convSearch}
                    onChange={(e) => setConvSearch(e.target.value)}
                    placeholder="Filter chats or search..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium placeholder-slate-400 focus:border-[#1a2b6b] focus:bg-white focus:outline-none transition-all"
                  />
                  {convSearch && (
                    <button
                      type="button"
                      onClick={() => setConvSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
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
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare size={22} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {convSearch ? 'No matching chats' : 'No conversations yet'}
                    </p>
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="text-xs text-[#1a2b6b] hover:underline font-bold mt-2 cursor-pointer transition-colors"
                    >
                      Search Campus Directory to Chat →
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const other = getOtherUser(conv);
                    const isActive = activeConv?.id === conv.id;
                    const isOnline = onlineUsers?.has?.(other.id);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer text-left border-b border-slate-50',
                          isActive
                            ? 'border-l-2'
                            : 'hover:bg-slate-50'
                        )}
                        style={isActive ? { background: 'rgba(26,43,107,0.05)', borderLeftColor: '#1a2b6b' } : {}}
                      >
                        <Avatar name={other.name || ''} src={other.avatarUrl} size="sm" online={isOnline} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn('text-xs font-bold truncate', isActive ? 'text-[#1a2b6b]' : 'text-slate-900')}>
                              {other.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {conv.lastMessage && (
                                <span className="text-[10px] text-slate-400">{timeShort(conv.lastMessage.createdAt)}</span>
                              )}
                            </div>
                          </div>
                          {conv.lastMessage ? (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {conv.lastMessage.sender?.id === user?.id ? 'You: ' : ''}
                              {conv.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
                              {other.department || 'Click to send a message'}
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
                    <Avatar
                      name={getOtherUser(activeConv).name || ''}
                      src={getOtherUser(activeConv).avatarUrl}
                      size="sm"
                      online={onlineUsers?.has?.(getOtherUser(activeConv).id)}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate">{getOtherUser(activeConv).name}</p>
                      {onlineUsers?.has?.(getOtherUser(activeConv).id) ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          <span className="text-[10px] text-slate-400 font-medium">Offline</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pinned Messages Banner */}
                  {pinnedMessages.length > 0 && (
                    <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-start gap-2">
                      <Pin size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-800">Pinned Message</p>
                        <p className="text-xs text-amber-700 truncate">{pinnedMessages[pinnedMessages.length - 1].content}</p>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f8fafc]">
                    {messagesLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-indigo-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <MessageSquare size={22} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Start the conversation!</p>
                        <p className="text-xs text-slate-400 mt-1">Say hello to {getOtherUser(activeConv).name}</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={cn('flex group', isMine ? 'justify-end' : 'justify-start')}>
                            <div className={cn('flex items-center gap-2 max-w-[72%]', isMine ? 'flex-row-reverse' : 'flex-row')}>
                              <div className={cn(
                                'px-4 py-2.5 text-sm leading-relaxed break-words relative',
                                isMine ? 'msg-sent' : 'msg-received'
                              )}>
                                {msg.isPinned && (
                                  <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-600 rounded-full p-1 shadow-sm">
                                    <Pin size={10} className="fill-amber-600" />
                                  </div>
                                )}
                                <p>{msg.content}</p>
                                <p className={cn('text-[10px] mt-1 text-right', isMine ? 'text-indigo-200' : 'text-slate-400')}>
                                  {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>

                              {/* Pin Button (shows on hover) */}
                              <button
                                onClick={() => handleTogglePin(msg.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-all cursor-pointer"
                                title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <Pin size={14} className={msg.isPinned ? 'fill-slate-400' : ''} />
                              </button>
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
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-[#1a2b6b] focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
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
                    <MessageSquare size={28} className="text-slate-300" />
                  </div>
                  <p className="text-base font-bold text-slate-800">Your messages</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-xs">
                    Select a conversation to start chatting, or start a new one with any student, teacher, or coordinator.
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
            onlineUsers={onlineUsers}
          />
        )}
      </div>
    </div>
  );
}

function NewChatModal({ onClose, onSelect, currentUserId, onlineUsers }) {
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);

  // Load initial directory of campus users immediately when modal opens
  useEffect(() => {
    let mounted = true;
    const loadInitialUsers = async () => {
      try {
        setSearching(true);
        const res = await usersAPI.search('all');
        if (!mounted) return;
        const list = (res.data.users || []).filter((u) => u.id !== currentUserId);
        setAllUsers(list);
        setResults(list);
      } catch {
        // Fallback to empty if error
      } finally {
        if (mounted) setSearching(false);
      }
    };
    loadInitialUsers();
    return () => { mounted = false; };
  }, [currentUserId]);

  const handleSearch = async (q) => {
    setQuery(q);
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(allUsers);
      return;
    }

    // Instant local filter first so UI never feels stuck
    const lower = trimmed.toLowerCase();
    const localMatches = allUsers.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(lower) ||
        (u.email || '').toLowerCase().includes(lower) ||
        (u.department || '').toLowerCase().includes(lower)
    );
    setResults(localMatches);

    try {
      setSearching(true);
      const res = await usersAPI.search(trimmed);
      const remoteList = (res.data.users || []).filter((u) => u.id !== currentUserId);
      setResults(remoteList);
    } catch {
      // Keep local matches if network call fails
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl shadow-slate-900/20 border border-slate-100 animate-scaleUp">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#1a2b6b' }}>
              <MessageSquare size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">New Conversation</h2>
              <p className="text-[11px] text-slate-400">Select a user or search by name, email, or department</p>
            </div>
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
              placeholder="Search by name, email, or department..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:border-[#1a2b6b] focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-3 pb-3 space-y-1">
          {searching && results.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#1a2b6b]" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 font-medium">
              No campus users found matching "{query}"
            </p>
          ) : (
            results.map((u) => {
              const isOnline = onlineUsers?.has?.(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelect(u.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl cursor-pointer text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name || ''} src={u.avatarUrl} size="sm" online={isOnline} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#1a2b6b]">
                          {u.name}
                        </p>
                        <span
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                            isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate font-medium">
                        {u.department || u.email || 'Riphah University'}
                        {u.role && u.role !== 'STUDENT' ? ` • ${u.role.replace('_', ' ')}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#1a2b6b] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    Message →
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
