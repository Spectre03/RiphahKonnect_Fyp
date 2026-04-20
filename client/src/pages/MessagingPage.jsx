import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { conversationsAPI, usersAPI } from '../services/api';
import { timeShort } from '../utils/brand';
import { cn } from '../utils/cn';
import { Avatar, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Send,
  Loader2,
  MessageSquare,
  ArrowLeft,
  Search,
  Plus,
  X,
} from 'lucide-react';

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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await conversationsAPI.getAll();
        setConversations(res.data.conversations);
      } catch {
        toast.error('Failed to load conversations.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setMessagesLoading(true);
    try {
      const res = await conversationsAPI.getMessages(conv.id);
      setMessages(res.data.messages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error('Failed to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;
    try {
      setSending(true);
      const res = await conversationsAPI.sendMessage(activeConv.id, newMessage);
      setMessages([...messages, res.data.message]);
      setNewMessage('');
      setConversations(conversations.map((c) =>
        c.id === activeConv.id
          ? { ...c, lastMessage: res.data.message, updatedAt: new Date().toISOString() }
          : c
      ));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async (participantId) => {
    try {
      const res = await conversationsAPI.create({ participantId });
      const conv = res.data.conversation;
      const existing = conversations.find((c) => c.id === conv.id);
      if (!existing) {
        setConversations([{ ...conv, lastMessage: null, updatedAt: new Date().toISOString() }, ...conversations]);
      }
      setShowNewChat(false);
      openConversation(conv);
    } catch {
      toast.error('Failed to start conversation.');
    }
  };

  const getOtherUser = (conv) => {
    if (conv.isGroup) return { name: conv.name || 'Group Chat' };
    return conv.participants?.find((p) => p.id !== user?.id) || { name: 'Unknown' };
  };

  return (
    <div className="rc-fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-11 w-11 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20 flex-shrink-0">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Messages</h1>
            <p className="text-xs text-slate-500">Chat with your classmates</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className={cn('w-full md:w-80 border-r border-slate-200/60 flex flex-col', activeConv ? 'hidden md:flex' : 'flex')}>
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Chats</span>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    <p className="text-xs text-slate-400 mt-2">Loading chats...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">No conversations yet</p>
                    <button onClick={() => setShowNewChat(true)} className="text-sm text-teal-600 hover:text-teal-500 font-semibold mt-1.5 cursor-pointer">
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
                          'w-full flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer text-left border-b border-slate-50',
                          isActive ? 'bg-teal-50/70 border-l-2 border-l-teal-500' : 'hover:bg-slate-50'
                        )}
                      >
                        <Avatar name={other.name || ''} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn('text-sm font-semibold truncate min-w-0', isActive ? 'text-teal-700' : 'text-slate-900')}>{other.name}</p>
                            {conv.lastMessage && (
                              <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{timeShort(conv.lastMessage.createdAt)}</span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-xs text-slate-400 truncate min-w-0 mt-0.5">
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

            {/* Chat Area */}
            <div className={cn('flex-1 flex flex-col', !activeConv ? 'hidden md:flex' : 'flex')}>
              {activeConv ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3.5 border-b border-slate-100 flex items-center gap-3 bg-white">
                    <button
                      onClick={() => setActiveConv(null)}
                      className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <Avatar name={getOtherUser(activeConv).name || ''} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{getOtherUser(activeConv).name}</p>
                      <p className="text-[10px] text-teal-500 font-semibold">Online</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {messagesLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                        <p className="text-xs text-slate-400 mt-2">Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'max-w-[70%] px-4 py-2.5 text-sm shadow-sm',
                              isMine
                                ? 'bg-teal-600 text-white rounded-2xl rounded-br-md'
                                : 'bg-white text-slate-900 rounded-2xl rounded-bl-md border border-slate-200/60'
                            )}>
                              <p className="leading-relaxed break-words min-w-0">{msg.content}</p>
                              <p className={cn('text-[10px] mt-1', isMine ? 'text-teal-200' : 'text-slate-400')}>
                                {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSend} className="p-3.5 border-t border-slate-200 flex gap-2 bg-white">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-teal-600/20 transition-all flex-shrink-0"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-50/50">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-900">Select a conversation</p>
                    <p className="text-sm text-slate-400 mt-1">Choose a chat to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onSelect={handleNewConversation} currentUserId={user?.id} />}
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
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await usersAPI.search(q);
      setResults(res.data.users.filter((u) => u.id !== currentUserId));
    } catch {
      toast.error('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 rc-scale-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl shadow-slate-900/10 border border-slate-200/50">
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">New Chat</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto px-3 pb-3">
          {searching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {query.length < 2 ? 'Type to search users' : 'No users found'}
            </p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelect(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-teal-50 rounded-xl cursor-pointer text-left transition-colors"
              >
                <Avatar name={u.name || ''} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                  {u.department && <p className="text-xs text-slate-400 truncate">{u.department}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
