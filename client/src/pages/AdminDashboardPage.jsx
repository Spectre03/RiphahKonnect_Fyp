import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import { timeAgo, getAvatarGradient } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Badge, Modal, Button } from '../components/ui';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Users, Newspaper, Calendar, Megaphone,
  BookOpen, Trash2, Loader2, UserX, AlertTriangle,
  BarChart3, RefreshCw, UserCog, TrendingUp, Activity,
  Search, Filter, Eye, Hash, ArrowUpRight, Clock,
  CheckCircle2, XCircle, MessageSquare, PackageSearch,
} from 'lucide-react';

const ROLE_META = {
  STUDENT:          { label: 'Student',          color: 'bg-teal-500',   text: 'text-teal-700',   light: 'bg-teal-50   border-teal-200',   badge: 'teal' },
  TEACHER:          { label: 'Teacher',           color: 'bg-blue-500',   text: 'text-blue-700',   light: 'bg-blue-50   border-blue-200',   badge: 'blue' },
  COORDINATION:     { label: 'Coordination',      color: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50 border-violet-200', badge: 'purple' },
  UNIVERSITY_ADMIN: { label: 'Univ. Admin',       color: 'bg-amber-500',  text: 'text-amber-700',  light: 'bg-amber-50  border-amber-200',  badge: 'amber' },
  SYSTEM_ADMIN:     { label: 'System Admin',      color: 'bg-red-500',    text: 'text-red-700',    light: 'bg-red-50    border-red-200',    badge: 'red' },
};

const CONTENT_TABS = [
  { key: 'posts',         label: 'Posts',         type: 'post',         icon: Newspaper },
  { key: 'announcements', label: 'Announcements', type: 'announcement', icon: Megaphone },
  { key: 'events',        label: 'Events',        type: 'event',        icon: Calendar },
  { key: 'lostFound',     label: 'Lost & Found',  type: 'lostFound',    icon: PackageSearch },
];

const NAV_SECTIONS = [
  { label: 'User Management',  to: '/admin/users',    icon: UserCog,       gradient: 'from-indigo-500 to-violet-600', desc: 'Manage all users, roles & access' },
  { label: 'Group Management', to: '/admin/groups',   icon: BookOpen,      gradient: 'from-violet-500 to-purple-600', desc: 'View and delete semester groups' },
  { label: 'Academic Feed',    to: '/feed',           icon: Newspaper,     gradient: 'from-blue-500 to-cyan-500',     desc: 'Browse and moderate posts' },
  { label: 'Events',           to: '/events',         icon: Calendar,      gradient: 'from-teal-500 to-emerald-500',  desc: 'Campus events overview' },
  { label: 'Announcements',    to: '/announcements',  icon: Megaphone,     gradient: 'from-amber-500 to-orange-500',  desc: 'Official notices & updates' },
  { label: 'Lost & Found',     to: '/lost-found',     icon: PackageSearch, gradient: 'from-rose-500 to-pink-600',     desc: 'Campus lost & found board' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats,        setStats]        = useState(null);
  const [recentUsers,  setRecentUsers]  = useState([]);
  const [content,      setContent]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('posts');
  const [search,       setSearch]       = useState('');
  const [deleting,     setDeleting]     = useState({});
  const [confirmModal, setConfirmModal] = useState(null); // { action: 'delete' | 'resolve', type, item }

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sRes, cRes] = await Promise.all([adminAPI.getStats(), adminAPI.getContent()]);
      setStats(sRes.data.stats);
      setRecentUsers(sRes.data.recentUsers || []);
      setContent(cRes.data);
    } catch {
      toast.error('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const executeConfirmModal = async () => {
    if (!confirmModal) return;
    const { action, type, item } = confirmModal;
    const id = item.id;
    const key = `${action}-${type}-${id}`;
    setDeleting((p) => ({ ...p, [key]: true }));
    try {
      if (action === 'resolve' && type === 'lostFound') {
        await adminAPI.resolveLostFound(id);
        setContent((prev) => ({
          ...prev,
          lostFound: (prev.lostFound || []).map((x) => (x.id === id ? { ...x, status: 'RESOLVED' } : x)),
        }));
        toast.success('Lost & Found item marked as resolved.');
      } else if (action === 'delete') {
        if (type === 'post')         await adminAPI.deletePost(id);
        if (type === 'announcement') await adminAPI.deleteAnnouncement(id);
        if (type === 'event')        await adminAPI.deleteEvent(id);
        if (type === 'lostFound')    await adminAPI.deleteLostFound(id);

        setContent((prev) => ({
          ...prev,
          posts:         type === 'post'         ? (prev.posts || []).filter((x) => x.id !== id)         : prev.posts,
          announcements: type === 'announcement' ? (prev.announcements || []).filter((x) => x.id !== id) : prev.announcements,
          events:        type === 'event'        ? (prev.events || []).filter((x) => x.id !== id)        : prev.events,
          lostFound:     type === 'lostFound'    ? (prev.lostFound || []).filter((x) => x.id !== id)     : prev.lostFound,
        }));
        setStats((s) => s ? ({
          ...s,
          totalPosts:         type === 'post'         ? s.totalPosts - 1         : s.totalPosts,
          totalAnnouncements: type === 'announcement' ? s.totalAnnouncements - 1 : s.totalAnnouncements,
          totalEvents:        type === 'event'        ? s.totalEvents - 1        : s.totalEvents,
          totalLostFound:     type === 'lostFound'    ? (s.totalLostFound || 1) - 1 : s.totalLostFound,
        }) : s);
        toast.success('Deleted successfully.');
      }
      setConfirmModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed.');
    } finally {
      setDeleting((p) => ({ ...p, [key]: false }));
    }
  };

  const activeTab    = CONTENT_TABS.find((t) => t.key === tab);
  const rawContent   = content?.[tab] || [];
  const filtered     = search.trim()
    ? rawContent.filter((item) => {
        const text = (item.title || item.content || item.description || '').toLowerCase();
        const name = (item.author?.name || item.createdBy?.name || item.reportedBy?.name || '').toLowerCase();
        return text.includes(search.toLowerCase()) || name.includes(search.toLowerCase());
      })
    : rawContent;

  const statCards = [
    { label: 'Total Users',     value: stats?.totalUsers,       sub: `+${stats?.newUsersWeek || 0} this week`,  icon: Users,     gradient: 'from-indigo-500 to-blue-600',   alert: false },
    { label: 'Posts',           value: stats?.totalPosts,       sub: `+${stats?.newPostsToday || 0} today`,     icon: Newspaper, gradient: 'from-blue-500 to-cyan-500',     alert: false },
    { label: 'Events',          value: stats?.totalEvents,      sub: 'campus events',                            icon: Calendar,  gradient: 'from-violet-500 to-purple-600', alert: false },
    { label: 'Announcements',   value: stats?.totalAnnouncements, sub: 'total posted',                          icon: Megaphone, gradient: 'from-amber-500 to-orange-500',  alert: false },
    { label: 'Lost & Found',    value: stats?.totalLostFound ?? (content?.lostFound?.length || 0), sub: 'reported items', icon: PackageSearch, gradient: 'from-rose-500 to-pink-600', alert: false },
    { label: 'Blocked',         value: stats?.blockedUsers,     sub: 'blocked accounts',                         icon: UserX,     gradient: 'from-red-500 to-rose-600',      alert: stats?.blockedUsers > 0 },
  ];

  return (
    <div className="page-wrapper">

      {/* ── Header ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none opacity-20" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-24 -top-20 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.07) 0%, transparent 70%)' }} />
          <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 bg-red-500/20 border border-red-400/30 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={17} className="text-red-400" />
                </div>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>System Administration</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/15 border border-green-500/25 rounded-full text-[9px] font-bold text-green-400 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Control Panel</h1>
              <p className="text-slate-400 text-sm mt-1.5">
                Welcome back, <span className="text-white font-semibold">{user?.name}</span>
                {stats && <span className="ml-2" style={{ color: '#c9973a' }}>· {stats.newUsersToday} new users today</span>}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.08] border border-white/[0.15] text-white text-sm font-semibold rounded-xl hover:bg-white/[0.12] transition-all cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <Link
                to="/admin/users"
                className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition-all shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)', boxShadow: '0 4px 14px rgba(26,43,107,0.35)' }}
              >
                <UserCog size={14} /> Manage Users
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading
            ? [...Array(6)].map((_, i) => (
                <Card key={i} padding="p-5">
                  <div className="skeleton h-10 w-10 rounded-xl mb-3" />
                  <div className="skeleton h-7 w-14 rounded mb-1.5" />
                  <div className="skeleton h-3 w-20 rounded" />
                </Card>
              ))
            : statCards.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} padding="p-5" className={cn('relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all', s.alert && 'border-red-200')}>
                    {s.alert && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-md`}>
                      <Icon size={17} className="text-white" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 leading-none">{s.value ?? '—'}</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">{s.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                  </Card>
                );
              })
          }
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-4 space-y-5">

            {/* Role Breakdown */}
            <Card padding="p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-900">Users by Role</h2>
                </div>
                {stats && (
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {stats.totalUsers} total
                  </span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(ROLE_META).map(([role, meta]) => {
                    const count = stats?.roleBreakdown?.[role] || 0;
                    const total = stats?.totalUsers || 1;
                    const pct   = Math.round((count / total) * 100);
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${meta.text}`}>{meta.label}</span>
                          <span className="text-xs font-bold text-slate-600">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.color} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-indigo-700">{stats?.newUsersToday ?? '—'}</p>
                  <p className="text-[10px] font-semibold text-indigo-400 mt-0.5">New Today</p>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-violet-700">{stats?.newUsersWeek ?? '—'}</p>
                  <p className="text-[10px] font-semibold text-violet-400 mt-0.5">This Week</p>
                </div>
              </div>
            </Card>

            {/* Recent Users */}
            <Card padding="p-0">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-900">Recent Signups</h2>
                </div>
                <Link to="/admin/users" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                  View all <ArrowUpRight size={11} />
                </Link>
              </div>

              <div className="divide-y divide-slate-50">
                {loading
                  ? [...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <div className="skeleton h-8 w-8 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3 w-24 rounded" />
                          <div className="skeleton h-2.5 w-32 rounded" />
                        </div>
                      </div>
                    ))
                  : recentUsers.length === 0
                  ? <p className="text-center py-8 text-sm text-slate-400">No users yet.</p>
                  : recentUsers.map((u) => {
                      const meta = ROLE_META[u.role];
                      return (
                        <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: getAvatarGradient(u.name || '') }}
                          >
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta?.light}`}>
                              {meta?.label}
                            </span>
                            {u.isBlocked && (
                              <span className="text-[9px] font-bold text-red-500">Blocked</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-8 space-y-5">

            {/* Content Moderation */}
            <Card padding="p-0">
              <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-500" />
                    <h2 className="text-sm font-bold text-slate-900">Content Moderation</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {filtered.length} items
                    </span>
                  </div>
                </div>

                {/* Tabs + Search */}
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl">
                    {CONTENT_TABS.map((t) => {
                      const Icon = t.icon;
                      const cnt  = content?.[t.key]?.length ?? 0;
                      return (
                        <button
                          key={t.key}
                          onClick={() => { setTab(t.key); setSearch(''); }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                            tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                          )}
                        >
                          <Icon size={12} />
                          {t.label}
                          <span className={cn('text-[9px] font-bold px-1 rounded', tab === t.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500')}>
                            {cnt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search ${activeTab?.label.toLowerCase()}...`}
                      className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Content list */}
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-14">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Filter size={18} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No {activeTab?.label.toLowerCase()} found</p>
                    {search && <p className="text-xs text-slate-400 mt-1">Try a different search term</p>}
                  </div>
                ) : (
                  filtered.map((item) => {
                    const type   = activeTab?.type;
                    const delKey = `delete-${type}-${item.id}`;
                    const resKey = `resolve-${type}-${item.id}`;
                    const author = item.author || item.createdBy || item.reportedBy;
                    const title  = item.title || (item.content?.substring(0, 80) + (item.content?.length > 80 ? '…' : '')) || 'Untitled';
                    const meta   = item.type || item.status || '';

                    return (
                      <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{ background: getAvatarGradient(author?.name || '') }}
                        >
                          {author?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1 mb-0.5">{title}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-slate-500">{author?.name || 'Unknown'}</span>
                            {author?.role && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ROLE_META[author.role]?.light || 'bg-slate-50 border-slate-200'}`}>
                                {ROLE_META[author.role]?.label || author.role}
                              </span>
                            )}
                            {meta && (
                              <span className={cn(
                                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                                meta === 'RESOLVED' ? 'bg-slate-100 text-slate-600' :
                                meta === 'LOST' ? 'bg-red-50 text-red-600' :
                                meta === 'FOUND' ? 'bg-teal-50 text-teal-600' :
                                'text-indigo-500 bg-indigo-50'
                              )}>
                                {meta}
                              </span>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400">{timeAgo(item.createdAt)}</span>
                            {item._count && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] text-slate-400">
                                  {tab === 'posts'
                                    ? `${item._count.likes} likes · ${item._count.comments} comments`
                                    : `${item._count.rsvps} attending`
                                  }
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {type === 'lostFound' && item.status !== 'RESOLVED' && (
                            <button
                              onClick={() => setConfirmModal({ action: 'resolve', type, item })}
                              disabled={deleting[resKey]}
                              className="px-2 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Mark Resolved"
                            >
                              {deleting[resKey] ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmModal({ action: 'delete', type, item })}
                            disabled={deleting[delKey]}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                            title="Delete"
                          >
                            {deleting[delKey]
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Platform Sections */}
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Activity size={14} className="text-slate-400" /> Quick Access
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {NAV_SECTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.to}
                      to={s.to}
                      className="group flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{s.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Confirmation Pop-up Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.action === 'resolve' ? 'Mark Lost & Found Item Resolved' : 'Confirm Deletion'}
        subtitle={
          confirmModal?.action === 'resolve'
            ? 'Confirm that this item has been resolved'
            : 'This action cannot be undone'
        }
        icon={confirmModal?.action === 'resolve' ? CheckCircle2 : Trash2}
        iconColor={
          confirmModal?.action === 'resolve'
            ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
            : 'bg-gradient-to-br from-red-500 to-rose-600'
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {confirmModal?.action === 'resolve' ? (
              <>
                Mark <span className="font-bold text-slate-900">&ldquo;{confirmModal?.item?.title}&rdquo;</span> as{' '}
                <span className="font-bold text-teal-700">Resolved</span>?
              </>
            ) : (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-slate-900">
                  &ldquo;{confirmModal?.item?.title || confirmModal?.item?.content?.substring(0, 40) || 'this item'}&rdquo;
                </span>?
              </>
            )}
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmModal(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmModal?.action === 'resolve' ? 'primary' : 'danger'}
              onClick={executeConfirmModal}
              icon={confirmModal?.action === 'resolve' ? CheckCircle2 : Trash2}
            >
              {confirmModal?.action === 'resolve' ? 'Mark Resolved' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
