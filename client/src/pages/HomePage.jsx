import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, eventsAPI, groupsAPI, announcementsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { Card, Avatar, Badge } from '../components/ui';
import {
  Newspaper, Users, Calendar, MessageSquare, PackageSearch,
  ArrowRight, GraduationCap, Sparkles, Clock, Megaphone,
  ShieldCheck, UserCog, BarChart3, MapPin, TrendingUp, FileText,
} from 'lucide-react';

const STUDENT_TEACHER_LINKS = [
  { icon: Newspaper,     label: 'Feed',          to: '/feed',          from: 'from-teal-500',   to_: 'to-emerald-500',  desc: 'Posts & discussions' },
  { icon: Users,         label: 'Groups',        to: '/groups',        from: 'from-blue-500',   to_: 'to-indigo-500',   desc: 'Semester groups' },
  { icon: FileText,      label: 'Resources',     to: '/resources',     from: 'from-cyan-500',   to_: 'to-teal-500',     desc: 'Notes & past papers' },
  { icon: Calendar,      label: 'Events',        to: '/events',        from: 'from-violet-500', to_: 'to-purple-500',   desc: 'Campus events' },
  { icon: Megaphone,     label: 'Announcements', to: '/announcements', from: 'from-amber-500',  to_: 'to-orange-500',   desc: 'Official notices' },
  { icon: PackageSearch, label: 'Lost & Found',  to: '/lost-found',    from: 'from-rose-500',   to_: 'to-pink-500',     desc: 'Find items' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      from: 'from-indigo-500', to_: 'to-violet-500',   desc: 'Chat' },
];

const COORDINATION_LINKS = [
  { icon: Newspaper,     label: 'Feed',          to: '/feed',          from: 'from-teal-500',   to_: 'to-emerald-500',  desc: 'Posts & discussions' },
  { icon: Users,         label: 'Groups',        to: '/groups',        from: 'from-blue-500',   to_: 'to-indigo-500',   desc: 'Create & manage' },
  { icon: Calendar,      label: 'Events',        to: '/events',        from: 'from-violet-500', to_: 'to-purple-500',   desc: 'Organise events' },
  { icon: Megaphone,     label: 'Announcements', to: '/announcements', from: 'from-amber-500',  to_: 'to-orange-500',   desc: 'Post notices' },
  { icon: PackageSearch, label: 'Lost & Found',  to: '/lost-found',    from: 'from-rose-500',   to_: 'to-pink-500',     desc: 'Manage reports' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      from: 'from-indigo-500', to_: 'to-violet-500',   desc: 'Chat' },
];

const UNIVERSITY_ADMIN_LINKS = [
  { icon: Megaphone,     label: 'Announcements', to: '/announcements', from: 'from-amber-500',  to_: 'to-orange-500',   desc: 'Post & manage' },
  { icon: Calendar,      label: 'Events',        to: '/events',        from: 'from-violet-500', to_: 'to-purple-500',   desc: 'Create events' },
  { icon: PackageSearch, label: 'Lost & Found',  to: '/lost-found',    from: 'from-rose-500',   to_: 'to-pink-500',     desc: 'Resolve reports' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      from: 'from-indigo-500', to_: 'to-violet-500',   desc: 'Chat' },
];

const SYSTEM_ADMIN_LINKS = [
  { icon: UserCog,       label: 'User Mgmt',     to: '/admin/users',   from: 'from-violet-600', to_: 'to-indigo-600',   desc: 'Block / unblock' },
  { icon: MessageSquare, label: 'Messages',       to: '/messages',      from: 'from-indigo-500', to_: 'to-violet-500',   desc: 'Chat' },
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

  /* ── column count for quick links ── */
  const colClass =
    quickLinks.length <= 2 ? 'grid-cols-2' :
    quickLinks.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
    quickLinks.length === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' :
    quickLinks.length === 6 ? 'grid-cols-2 sm:grid-cols-3' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';   /* 7 links → wrap evenly */

  return (
    <div className="page-wrapper">

      {/* ══════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a14] via-[#0f0f20] to-[#12102a]">
        {/* Ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 right-0 w-[520px] h-[380px] rounded-full bg-indigo-600/12 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-[380px] h-[280px] rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-2xl" />
          <div className="absolute inset-0 banner-grid opacity-30" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-12">
          {/* Role badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 border text-xs font-bold tracking-widest uppercase
            bg-indigo-500/10 border-indigo-500/20 text-indigo-300">
            {isAdmin
              ? <ShieldCheck size={12} />
              : <GraduationCap size={12} />
            }
            {isAdmin ? 'Administration Panel' : 'Student Dashboard'}
          </div>

          {/* Greeting */}
          <h1 className="text-2xl sm:text-3xl lg:text-[2.4rem] font-extrabold text-white leading-tight tracking-tight">
            {greeting()},{' '}
            <span style={{
              background: isAdmin
                ? 'linear-gradient(135deg, #c084fc, #818cf8)'
                : 'linear-gradient(135deg, #6366f1, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {user?.name?.split(' ')[0] || 'there'}.
            </span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-lg">
            {isAdmin
              ? 'Manage your campus — announcements, events, and community activity.'
              : 'Your academic hub at Riphah International University.'
            }
          </p>

          {/* Stats row — students/teachers only */}
          {!isAdmin && (
            <div className="flex items-center flex-wrap gap-4 mt-7">
              {[
                { label: 'Posts',  value: stats.posts,  icon: Newspaper,  color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/15' },
                { label: 'Groups', value: stats.groups, icon: Users,      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/15' },
                { label: 'Events', value: stats.events, icon: Calendar,   color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
              ].map((s) => (
                <div key={s.label} className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border ${s.bg} ${s.border}`}>
                  <s.icon size={14} className={s.color} />
                  <span className={`text-lg font-extrabold text-white leading-none ${stats.posts === null ? 'opacity-30' : 'animate-popIn'}`}>
                    {stats.posts === null ? '—' : s.value}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Admin role badge */}
          {isAdmin && (
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                role === 'SYSTEM_ADMIN'     ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                role === 'UNIVERSITY_ADMIN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                              'bg-violet-500/10 text-violet-400 border-violet-500/20'
              }`}>
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
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3.5">Quick Access</p>
          <div className={`grid gap-2.5 ${colClass} stagger`}>
            {quickLinks.map(({ icon: Icon, label, to, from, to_, desc }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200/70 hover:bg-indigo-50/50 hover:shadow-md hover:shadow-indigo-100/80 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br ${from} ${to_} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight truncate">{label}</p>
                  <p className="text-[11px] text-slate-400 leading-tight truncate">{desc}</p>
                </div>
                <ArrowRight size={13} className="ml-auto flex-shrink-0 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200" />
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
          <div className="lg:col-span-3">
            {!isAdmin ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center">
                      <TrendingUp size={12} className="text-teal-600" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                  </div>
                  <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
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
                                className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                              >
                                {post.author?.name}
                              </Link>
                              {post.author?.department && (
                                <span className="text-[11px] text-indigo-600 font-semibold truncate hidden sm:block">{post.author.department}</span>
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
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                      <Newspaper size={22} className="text-indigo-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Nothing posted yet</p>
                    <p className="text-xs text-slate-400 mt-1">Be the first to share something with the community.</p>
                    <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-3 transition-colors">
                      Go to Feed <ArrowRight size={11} />
                    </Link>
                  </Card>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Megaphone size={12} className="text-amber-600" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">Recent Announcements</h2>
                  </div>
                  <Link to="/announcements" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>

                {recentAnnouncements.length > 0 ? (
                  <div className="space-y-3 stagger">
                    {recentAnnouncements.map((ann) => (
                      <Card key={ann.id} hover padding="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ann.type === 'OFFICIAL' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                            <Megaphone size={15} className={ann.type === 'OFFICIAL' ? 'text-amber-600' : 'text-blue-600'} />
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
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                      <Megaphone size={22} className="text-amber-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No announcements yet</p>
                    <Link to="/announcements" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-3 transition-colors">
                      Post one <ArrowRight size={11} />
                    </Link>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* RIGHT — Upcoming Events (2/5) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Calendar size={12} className="text-violet-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Upcoming Events</h2>
              </div>
              <Link to="/events" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
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
                        <div className="w-16 flex-shrink-0 bg-gradient-to-b from-violet-500 to-indigo-600 flex flex-col items-center justify-center rounded-l-2xl py-3">
                          <span className="text-[9px] font-bold text-violet-200 uppercase tracking-widest">
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
                <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                  <Calendar size={22} className="text-violet-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No upcoming events</p>
                <Link to="/events" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-3 transition-colors">
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
