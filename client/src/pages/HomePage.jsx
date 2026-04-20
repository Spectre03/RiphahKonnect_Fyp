import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, eventsAPI, groupsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { Card, Avatar } from '../components/ui';
import {
  Newspaper,
  Users,
  Calendar,
  MessageSquare,
  PackageSearch,
  ArrowRight,
  GraduationCap,
  TrendingUp,
  Sparkles,
  Clock,
} from 'lucide-react';

const QUICK_LINKS = [
  { icon: Newspaper, label: 'Feed', to: '/feed', color: 'bg-teal-500', desc: 'Posts & discussions' },
  { icon: Users, label: 'Groups', to: '/groups', color: 'bg-blue-500', desc: 'Study together' },
  { icon: Calendar, label: 'Events', to: '/events', color: 'bg-violet-500', desc: 'Campus events' },
  { icon: PackageSearch, label: 'Lost & Found', to: '/lost-found', color: 'bg-amber-500', desc: 'Find items' },
  { icon: MessageSquare, label: 'Messages', to: '/messages', color: 'bg-rose-500', desc: 'Chat' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [stats, setStats] = useState({ posts: 0, groups: 0, events: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [postsRes, eventsRes, groupsRes] = await Promise.all([
          postsAPI.getFeed(1).catch(() => ({ data: { posts: [], pagination: { total: 0 } } })),
          eventsAPI.getAll(1, true).catch(() => ({ data: { events: [], pagination: { total: 0 } } })),
          groupsAPI.getAll(1).catch(() => ({ data: { groups: [], pagination: { total: 0 } } })),
        ]);
        setRecentPosts(postsRes.data.posts.slice(0, 3));
        setUpcomingEvents(eventsRes.data.events.slice(0, 3));
        setStats({
          posts: postsRes.data.pagination?.total || postsRes.data.posts.length,
          groups: groupsRes.data.pagination?.total || groupsRes.data.groups.length,
          events: eventsRes.data.pagination?.total || eventsRes.data.events.length,
        });
      } catch {
        // silent fail - dashboard is non-critical
      }
    };
    load();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="rc-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-teal-400" />
            </div>
            <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">Dashboard</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {greeting()},{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              {user?.name?.split(' ')[0] || 'there'}
            </span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-lg leading-relaxed">
            Your academic hub at Riphah International University
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-8">
            {[
              { label: 'Posts', value: stats.posts, icon: Newspaper },
              { label: 'Groups', value: stats.groups, icon: Users },
              { label: 'Events', value: stats.events, icon: Calendar },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <s.icon className="h-4.5 w-4.5 text-teal-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 -mt-14 relative z-10 rc-stagger">
          {QUICK_LINKS.map(({ icon: Icon, label, to, color, desc }) => (
            <Link
              key={label}
              to={to}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/50 p-4 group hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center mb-3 shadow-lg shadow-slate-900/5`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
          {/* Recent Activity */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                Recent Activity
              </h2>
              <Link to="/feed" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentPosts.length > 0 ? (
              <div className="space-y-3 rc-stagger">
                {recentPosts.map((post) => (
                  <Card key={post.id} hover padding="p-4">
                    <div className="flex gap-3">
                      <Avatar name={post.author?.name || ''} size="sm" className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link to={`/profile/${post.author?.id}`} className="text-sm font-semibold text-slate-900 hover:text-teal-600 transition-colors truncate">
                            {post.author?.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 flex-shrink-0">{timeAgo(post.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">{post.content}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-10">
                <Sparkles className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No recent posts</p>
                <Link to="/feed" className="text-xs text-teal-600 font-semibold mt-1 inline-block hover:text-teal-700">Create your first post</Link>
              </Card>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-600" />
                Upcoming Events
              </h2>
              <Link to="/events" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-3 rc-stagger">
                {upcomingEvents.map((event) => {
                  const d = new Date(event.startDate);
                  return (
                    <Card key={event.id} hover padding="p-0">
                      <div className="flex items-stretch">
                        <div className="w-16 flex-shrink-0 bg-gradient-to-b from-violet-50 to-violet-100/50 flex flex-col items-center justify-center border-r border-slate-100 py-3">
                          <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                            {d.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-xl font-bold text-violet-700">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0 p-3.5">
                          <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
                          {event.location && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{event.location}</p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">
                            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-10">
                <Calendar className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No upcoming events</p>
                <Link to="/events" className="text-xs text-teal-600 font-semibold mt-1 inline-block hover:text-teal-700">Browse events</Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
