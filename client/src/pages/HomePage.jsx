import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, eventsAPI, groupsAPI, announcementsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { Card, Avatar, Badge } from '../components/ui';
import {
  Newspaper, Users, Calendar, MessageSquare, PackageSearch,
  ArrowRight, GraduationCap, Clock, Megaphone,
  ShieldCheck, UserCog, BarChart3, MapPin, TrendingUp, FileText,
} from 'lucide-react';

const STUDENT_TEACHER_LINKS = [
  { icon: Newspaper,     label: 'Feed',          to: '/feed',          bg: 'from-[#1a2b6b] to-[#1e3a8a]',   desc: 'Posts & discussions' },
  { icon: Users,         label: 'Groups',        to: '/groups',        bg: 'from-[#1a2b6b] to-[#2251b8]',   desc: 'Semester groups' },
  { icon: FileText,      label: 'Resources',     to: '/resources',     bg: 'from-[#1e3a8a] to-[#2251b8]',   desc: 'Notes & past papers' },
  { icon: Calendar,      label: 'Events',        to: '/events',        bg: 'from-[#c9973a] to-[#d4a84b]',   desc: 'Campus events' },
  { icon: Megaphone,     label: 'Announcements', to: '/announcements', bg: 'from-[#9a6f1e] to-[#c9973a]',   desc: 'Official notices' },
  { icon: PackageSearch, label: 'Lost & Found',  to: '/lost-found',    bg: 'from-[#1a2b6b] to-[#1e3a8a]',   desc: 'Find items' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      bg: 'from-[#1e3a8a] to-[#2251b8]',   desc: 'Chat' },
];

const COORDINATION_LINKS = [
  { icon: Newspaper,     label: 'Feed',          to: '/feed',          bg: 'from-[#1a2b6b] to-[#1e3a8a]',   desc: 'Posts & discussions' },
  { icon: Users,         label: 'Groups',        to: '/groups',        bg: 'from-[#1a2b6b] to-[#2251b8]',   desc: 'Create & manage' },
  { icon: Calendar,      label: 'Events',        to: '/events',        bg: 'from-[#c9973a] to-[#d4a84b]',   desc: 'Organise events' },
  { icon: Megaphone,     label: 'Announcements', to: '/announcements', bg: 'from-[#9a6f1e] to-[#c9973a]',   desc: 'Post notices' },
  { icon: PackageSearch, label: 'Lost & Found',  to: '/lost-found',    bg: 'from-[#1a2b6b] to-[#1e3a8a]',   desc: 'Manage reports' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      bg: 'from-[#1e3a8a] to-[#2251b8]',   desc: 'Chat' },
];

const UNIVERSITY_ADMIN_LINKS = [
  { icon: Megaphone,     label: 'Announcements', to: '/announcements', bg: 'from-[#9a6f1e] to-[#c9973a]',   desc: 'Post & manage' },
  { icon: Calendar,      label: 'Events',        to: '/events',        bg: 'from-[#c9973a] to-[#d4a84b]',   desc: 'Create events' },
  { icon: PackageSearch, label: 'Lost & Found',  to: '/lost-found',    bg: 'from-[#1a2b6b] to-[#1e3a8a]',   desc: 'Resolve reports' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      bg: 'from-[#1e3a8a] to-[#2251b8]',   desc: 'Chat' },
];

const SYSTEM_ADMIN_LINKS = [
  { icon: UserCog,       label: 'User Mgmt',     to: '/admin/users',   bg: 'from-[#1a2b6b] to-[#1e3a8a]',   desc: 'Block / unblock' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      bg: 'from-[#1e3a8a] to-[#2251b8]',   desc: 'Chat' },
];

const LINKS_BY_ROLE = {
  STUDENT:          STUDENT_TEACHER_LINKS,
  TEACHER:          STUDENT_TEACHER_LINKS,
  COORDINATION:     COORDINATION_LINKS,
  UNIVERSITY_ADMIN: UNIVERSITY_ADMIN_LINKS,
  SYSTEM_ADMIN:     SYSTEM_ADMIN_LINKS,
};

const ADMIN_ROLES = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [stats, setStats] = useState({ posts: null, groups: null, events: null });

  const role = user?.role || 'STUDENT';
  const isAdmin = ADMIN_ROLES.includes(role);
  const quickLinks = LINKS_BY_ROLE[role] || STUDENT_TEACHER_LINKS;

  useEffect(() => {
    const load = async () => {
      try {
        const promises = [
          eventsAPI.getAll(1, true).catch(() => ({ data: { events: [], pagination: { total: 0 } } })),
          announcementsAPI.getAll({ page: 1 }).catch(() => ({ data: { announcements: [] } })),
        ];
        if (!isAdmin) {
          promises.push(postsAPI.getFeed(1).catch(() => ({ data: { posts: [], pagination: { total: 0 } } })));
          promises.push(groupsAPI.getAll({ page: 1 }).catch(() => ({ data: { groups: [], pagination: { total: 0 } } })));
        }
        const [eventsRes, announcementsRes, postsRes, groupsRes] = await Promise.all(promises);
        setUpcomingEvents(eventsRes.data.events.slice(0, 4));
        setRecentAnnouncements(announcementsRes.data.announcements.slice(0, 4));
        if (!isAdmin && postsRes) {
          setRecentPosts(postsRes.data.posts.slice(0, 4));
          setStats({
            posts:  postsRes.data.pagination?.total ?? postsRes.data.posts.length,
            groups: groupsRes?.data.pagination?.total ?? 0,
            events: eventsRes.data.pagination?.total ?? eventsRes.data.events.length,
          });
        }
      } catch { /* silent */ }
    };
    load();
  }, [isAdmin]);

  const colClass =
    quickLinks.length <= 2 ? 'grid-cols-2' :
    quickLinks.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
    quickLinks.length === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' :
    quickLinks.length === 6 ? 'grid-cols-2 sm:grid-cols-3' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <div className="page-wrapper">

      {/* ══════════════════════════════════════
          CAMPUS HERO — with actual campus photo
      ══════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(/campus.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Deep navy overlay with slight gold tint on edges */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(12,26,74,0.93) 0%, rgba(26,43,107,0.87) 50%, rgba(12,26,74,0.92) 100%)',
          }}
        />
        {/* Subtle grid texture over the overlay */}
        <div className="absolute inset-0 banner-grid opacity-20" />
        {/* Gold shimmer orb (top right) */}
        <div
          className="absolute -top-16 right-0 w-[460px] h-[320px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.08) 0%, transparent 70%)' }}
        />
        {/* Navy depth orb (bottom left) */}
        <div
          className="absolute bottom-0 -left-20 w-[380px] h-[260px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.4) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
          {/* Role / context badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 border text-xs font-bold tracking-widest uppercase"
            style={{
              background: isAdmin ? 'rgba(201,151,58,0.12)' : 'rgba(201,151,58,0.10)',
              borderColor: 'rgba(201,151,58,0.28)',
              color: '#d4a84b',
            }}
          >
            {isAdmin ? <ShieldCheck size={12} /> : <GraduationCap size={12} />}
            {isAdmin ? 'Administration Panel' : 'Riphah International University'}
          </div>

          {/* Greeting */}
          <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-extrabold text-white leading-tight tracking-tight">
            {greeting()},{' '}
            <span style={{
              background: 'linear-gradient(135deg, #c9973a, #e0c070)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {user?.name?.split(' ')[0] || 'there'}.
            </span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-lg">
            {isAdmin
              ? 'Manage your campus — announcements, events, and community activity.'
              : 'Your academic hub — connect, collaborate, and grow at Riphah.'
            }
          </p>

          {/* Stats row — students/teachers only */}
          {!isAdmin && (
            <div className="flex items-center flex-wrap gap-3 mt-7">
              {[
                { label: 'Posts',  value: stats.posts,  icon: Newspaper,  borderColor: 'rgba(26,43,107,0.4)',  bg: 'rgba(26,43,107,0.25)',  textColor: '#93c5fd' },
                { label: 'Groups', value: stats.groups, icon: Users,      borderColor: 'rgba(13,148,136,0.4)', bg: 'rgba(13,148,136,0.18)', textColor: '#5eead4' },
                { label: 'Events', value: stats.events, icon: Calendar,   borderColor: 'rgba(201,151,58,0.4)', bg: 'rgba(201,151,58,0.15)', textColor: '#e0c070' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border"
                  style={{ background: s.bg, borderColor: s.borderColor }}
                >
                  <s.icon size={14} style={{ color: s.textColor }} />
                  <span
                    className={`text-lg font-extrabold text-white leading-none ${stats.posts === null ? 'opacity-30' : 'animate-popIn'}`}
                  >
                    {stats.posts === null ? '—' : s.value}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Admin role badge */}
          {isAdmin && (
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border"
                style={{
                  background: role === 'SYSTEM_ADMIN'
                    ? 'rgba(239,68,68,0.12)'
                    : role === 'UNIVERSITY_ADMIN'
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(201,151,58,0.12)',
                  borderColor: role === 'SYSTEM_ADMIN'
                    ? 'rgba(239,68,68,0.25)'
                    : role === 'UNIVERSITY_ADMIN'
                    ? 'rgba(245,158,11,0.25)'
                    : 'rgba(201,151,58,0.25)',
                  color: role === 'SYSTEM_ADMIN' ? '#fca5a5' : role === 'UNIVERSITY_ADMIN' ? '#fcd34d' : '#d4a84b',
                }}
              >
                <BarChart3 size={12} />
                {role === 'SYSTEM_ADMIN' ? 'System Administrator' :
                 role === 'UNIVERSITY_ADMIN' ? 'University Administrator' :
                 'Coordination Office'}
              </span>
              <span className="text-xs text-slate-500">
                {upcomingEvents.length} upcoming · {recentAnnouncements.length} recent announcements
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          QUICK LINKS
      ══════════════════════════════════════ */}
      <div className="border-b border-slate-200/70 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3.5"
            style={{ color: '#c9973a' }}
          >
            Quick Access
          </p>
          <div className={`grid gap-2.5 ${colClass} stagger`}>
            {quickLinks.map(({ icon: Icon, label, to, bg, desc }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(26,43,107,0.15)';
                  e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(26,43,107,0.10)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className={`h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-bold text-slate-800 transition-colors leading-tight truncate"
                    style={{}}
                  >
                    {label}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight truncate">{desc}</p>
                </div>
                <ArrowRight size={13} className="ml-auto flex-shrink-0 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENT GRID
      ══════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT — Recent Activity or Announcements (3/5) */}
          {/* LEFT — Recent Activity or Announcements (3/5) */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Announcements block */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(201,151,58,0.08)' }}
                  >
                    <Megaphone size={12} style={{ color: '#c9973a' }} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Announcements</h2>
                </div>
                <Link
                  to="/announcements"
                  className="inline-flex items-center gap-1 text-xs font-bold transition-colors"
                  style={{ color: '#1a2b6b' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#c9973a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#1a2b6b'; }}
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              {recentAnnouncements.length > 0 ? (
                <div className="space-y-3 stagger">
                  {recentAnnouncements.map((ann) => (
                    <Card key={ann.id} hover padding="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: ann.type === 'OFFICIAL'
                              ? 'rgba(201,151,58,0.10)'
                              : 'rgba(26,43,107,0.08)',
                          }}
                        >
                          <Megaphone
                            size={15}
                            style={{ color: ann.type === 'OFFICIAL' ? '#c9973a' : '#1a2b6b' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-bold text-slate-900 truncate">{ann.title}</p>
                            <Badge variant={ann.type === 'OFFICIAL' ? 'amber' : 'blue'} size="xs">{ann.type}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{ann.content}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(ann.createdAt)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(201,151,58,0.08)' }}
                  >
                    <Megaphone size={22} style={{ color: 'rgba(201,151,58,0.35)' }} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No announcements yet</p>
                  <Link
                    to="/announcements"
                    className="inline-flex items-center gap-1 text-xs font-bold mt-3 transition-colors"
                    style={{ color: '#1a2b6b' }}
                  >
                    Post one <ArrowRight size={11} />
                  </Link>
                </Card>
              )}
            </div>

            {/* Recent Activity block (Non-Admins only) */}
            {!isAdmin && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(26,43,107,0.08)' }}
                    >
                      <TrendingUp size={12} style={{ color: '#1a2b6b' }} />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                  </div>
                  <Link
                    to="/feed"
                    className="inline-flex items-center gap-1 text-xs font-bold transition-colors"
                    style={{ color: '#1a2b6b' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#c9973a'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#1a2b6b'; }}
                  >
                    View all <ArrowRight size={12} />
                  </Link>
                </div>

                {recentPosts.length > 0 ? (
                  <div className="space-y-3 stagger">
                    {recentPosts.map((post) => (
                      <Card key={post.id} hover padding="p-4">
                        <div className="flex gap-3">
                          <Avatar name={post.author?.name || ''} size="sm" className="mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 mb-1">
                              <Link
                                to={`/profile/${post.author?.id}`}
                                className="text-sm font-bold text-slate-900 hover:text-[#1a2b6b] transition-colors truncate"
                              >
                                {post.author?.name}
                              </Link>
                              {post.author?.department && (
                                <span className="text-[11px] font-semibold truncate hidden sm:block" style={{ color: '#1a2b6b' }}>
                                  {post.author.department}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 flex-shrink-0 ml-auto">{timeAgo(post.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{post.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-12">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'rgba(26,43,107,0.06)' }}
                    >
                      <Newspaper size={22} style={{ color: 'rgba(26,43,107,0.3)' }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Nothing posted yet</p>
                    <p className="text-xs text-slate-400 mt-1">Be the first to share something with the community.</p>
                    <Link
                      to="/feed"
                      className="inline-flex items-center gap-1 text-xs font-bold mt-3 transition-colors"
                      style={{ color: '#1a2b6b' }}
                    >
                      Go to Feed <ArrowRight size={11} />
                    </Link>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Upcoming Events (2/5) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(109,40,217,0.08)' }}
                >
                  <Calendar size={12} style={{ color: '#6d28d9' }} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Upcoming Events</h2>
              </div>
              <Link
                to="/events"
                className="inline-flex items-center gap-1 text-xs font-bold transition-colors"
                style={{ color: '#1a2b6b' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#c9973a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#1a2b6b'; }}
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-3 stagger">
                {upcomingEvents.map((event) => {
                  const d = new Date(event.startDate);
                  return (
                    <Card key={event.id} hover padding="p-0">
                      <div className="flex items-stretch">
                        <div
                          className="w-16 flex-shrink-0 flex flex-col items-center justify-center rounded-l-2xl py-3"
                          style={{ background: 'linear-gradient(135deg, #1a2b6b, #1e3a8a)' }}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>
                            {d.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-2xl font-extrabold text-white leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0 p-3.5">
                          <p className="text-sm font-bold text-slate-900 truncate leading-tight">{event.title}</p>
                          {event.location && (
                            <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                              <MapPin size={10} className="flex-shrink-0" /> {event.location}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">
                            <Clock size={10} className="inline mr-1" />
                            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(109,40,217,0.06)' }}
                >
                  <Calendar size={22} style={{ color: 'rgba(109,40,217,0.3)' }} />
                </div>
                <p className="text-sm font-semibold text-slate-700">No upcoming events</p>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-1 text-xs font-bold mt-3 transition-colors"
                  style={{ color: '#1a2b6b' }}
                >
                  {isAdmin ? 'Create an event' : 'Browse events'} <ArrowRight size={11} />
                </Link>
              </Card>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
