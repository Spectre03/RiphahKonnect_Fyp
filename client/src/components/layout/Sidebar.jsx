import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvatarGradient } from '../../utils/brand';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard, Newspaper, Users, Calendar,
  PackageSearch, MessageSquare, LogOut, Menu, X,
  Megaphone, ShieldCheck, UserCog, GraduationCap,
  ChevronRight, Sparkles, BookOpen, FileText,
} from 'lucide-react';

const STUDENT_NAV = [
  { to: '/home',          label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/feed',          label: 'Feed',            icon: Newspaper },
  { to: '/groups',        label: 'Semester Groups', icon: Users },
  { to: '/resources',     label: 'Resources',       icon: FileText },
  { to: '/events',        label: 'Events',          icon: Calendar },
  { to: '/announcements', label: 'Announcements',   icon: Megaphone },
  { to: '/lost-found',    label: 'Lost & Found',    icon: PackageSearch },
  { to: '/messages',      label: 'Messages',        icon: MessageSquare },
];

const TEACHER_NAV = [
  { to: '/home',          label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/feed',          label: 'Feed',            icon: Newspaper },
  { to: '/groups',        label: 'Semester Groups', icon: Users },
  { to: '/resources',     label: 'Resources',       icon: FileText },
  { to: '/events',        label: 'Events',          icon: Calendar },
  { to: '/announcements', label: 'Announcements',   icon: Megaphone },
  { to: '/lost-found',    label: 'Lost & Found',    icon: PackageSearch },
  { to: '/messages',      label: 'Messages',        icon: MessageSquare },
];

const COORDINATION_NAV = [
  { to: '/home',          label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/feed',          label: 'Feed',            icon: Newspaper },
  { to: '/groups',        label: 'Semester Groups', icon: Users },
  { to: '/events',        label: 'Events',          icon: Calendar },
  { to: '/announcements', label: 'Announcements',   icon: Megaphone },
  { to: '/lost-found',    label: 'Lost & Found',    icon: PackageSearch },
  { to: '/messages',      label: 'Messages',        icon: MessageSquare },
];

const UNIVERSITY_ADMIN_NAV = [
  { to: '/home',          label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/feed',          label: 'Feed',            icon: Newspaper },
  { to: '/announcements', label: 'Announcements',   icon: Megaphone },
  { to: '/events',        label: 'Events',          icon: Calendar },
  { to: '/lost-found',    label: 'Lost & Found',    icon: PackageSearch },
  { to: '/messages',      label: 'Messages',        icon: MessageSquare },
];

const SYSTEM_ADMIN_NAV = [
  { to: '/admin',         label: 'Admin Panel',     icon: ShieldCheck },
  { to: '/admin/users',   label: 'User Management', icon: UserCog },
  { to: '/admin/groups',  label: 'Group Management', icon: BookOpen },
  { to: '/feed',          label: 'Feed',            icon: Newspaper },
  { to: '/announcements', label: 'Announcements',   icon: Megaphone },
  { to: '/messages',      label: 'Messages',        icon: MessageSquare },
];

const NAV_BY_ROLE = {
  STUDENT:          STUDENT_NAV,
  TEACHER:          TEACHER_NAV,
  COORDINATION:     COORDINATION_NAV,
  UNIVERSITY_ADMIN: UNIVERSITY_ADMIN_NAV,
  SYSTEM_ADMIN:     SYSTEM_ADMIN_NAV,
};

const ROLE_META = {
  STUDENT:          { label: 'Student',         color: 'from-teal-500 to-emerald-500' },
  TEACHER:          { label: 'Teacher',          color: 'from-blue-500 to-indigo-500' },
  COORDINATION:     { label: 'Coordination',     color: 'from-violet-500 to-purple-500' },
  UNIVERSITY_ADMIN: { label: 'University Admin', color: 'from-amber-500 to-orange-500' },
  SYSTEM_ADMIN:     { label: 'System Admin',     color: 'from-red-500 to-rose-500' },
};

const ADMIN_ROLES = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'STUDENT';
  const navItems = NAV_BY_ROLE[role] || STUDENT_NAV;
  const roleMeta = ROLE_META[role] || ROLE_META.STUDENT;
  const isAdmin = ADMIN_ROLES.includes(role);

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Brand ── */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
            isAdmin
              ? 'bg-gradient-to-br from-violet-500 to-purple-600'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600'
          )}>
            {isAdmin
              ? <ShieldCheck className="h-4.5 w-4.5 text-white" size={18} />
              : <GraduationCap className="h-4.5 w-4.5 text-white" size={18} />
            }
          </div>
          <div>
            <div className="text-[15px] font-bold text-white tracking-tight leading-none">
              Riphah<span className="text-indigo-400">Konnect</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5 tracking-wide uppercase">
              {isAdmin ? 'Administration' : 'Academic Platform'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Role pill ── */}
      <div className="px-5 mb-3">
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
          'bg-gradient-to-r text-white',
          roleMeta.color
        )}>
          <Sparkles className="h-3 w-3" />
          {roleMeta.label}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 mb-3 h-px bg-slate-800/60" />

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto dark-scroll">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon
                size={16}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {active && (
                <ChevronRight size={12} className="text-indigo-500 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-5 mt-3 mb-3 h-px bg-slate-800/60" />

      {/* ── User section ── */}
      <div className="px-3 pb-5 space-y-1">
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group border',
            isActive('/profile')
              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
          )}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: getAvatarGradient(user?.name || '') }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-slate-200 group-hover:text-white">
              {user?.name || 'Profile'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{user?.department || user?.email}</p>
          </div>
        </Link>

        <button
          onClick={() => { logout(); setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer border border-transparent"
        >
          <LogOut size={16} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-64 flex-shrink-0 bg-[#0a0a14] border-r border-white/[0.04] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#0a0a14] border-b border-white/[0.04] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            isAdmin ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
          )}>
            {isAdmin
              ? <ShieldCheck size={15} className="text-white" />
              : <GraduationCap size={15} className="text-white" />
            }
          </div>
          <span className="text-sm font-bold text-white">
            Riphah<span className="text-indigo-400">Konnect</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/70 z-40 animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0a0a14] z-50 animate-slideInLeft shadow-2xl border-r border-white/[0.04]">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

// === [SPEC-BLOCK-START] Airaf-A-20 (2026-09-02T16:10:42+05:00) ===
// [Airaf-A-20-L1] Connect Sidebar badge counters to live socket events :: verification rule #102
// [Airaf-A-20-L2] Connect Sidebar badge counters to live socket events :: verification rule #121
// [Airaf-A-20-L3] Connect Sidebar badge counters to live socket events :: verification rule #140
// [Airaf-A-20-L4] Connect Sidebar badge counters to live socket events :: verification rule #159
// [Airaf-A-20-L5] Connect Sidebar badge counters to live socket events :: verification rule #178
// [Airaf-A-20-L6] Connect Sidebar badge counters to live socket events :: verification rule #197
// [Airaf-A-20-L7] Connect Sidebar badge counters to live socket events :: verification rule #216
// [Airaf-A-20-L8] Connect Sidebar badge counters to live socket events :: verification rule #235
// [Airaf-A-20-L9] Connect Sidebar badge counters to live socket events :: verification rule #254
// [Airaf-A-20-L10] Connect Sidebar badge counters to live socket events :: verification rule #273
// [Airaf-A-20-L11] Connect Sidebar badge counters to live socket events :: verification rule #292
// [Airaf-A-20-L12] Connect Sidebar badge counters to live socket events :: verification rule #311
// [Airaf-A-20-L13] Connect Sidebar badge counters to live socket events :: verification rule #330
// [Airaf-A-20-L14] Connect Sidebar badge counters to live socket events :: verification rule #349
// [Airaf-A-20-L15] Connect Sidebar badge counters to live socket events :: verification rule #368
// [Airaf-A-20-L16] Connect Sidebar badge counters to live socket events :: verification rule #387
// [Airaf-A-20-L17] Connect Sidebar badge counters to live socket events :: verification rule #406
// [Airaf-A-20-L18] Connect Sidebar badge counters to live socket events :: verification rule #425
// [Airaf-A-20-L19] Connect Sidebar badge counters to live socket events :: verification rule #444
// [Airaf-A-20-L20] Connect Sidebar badge counters to live socket events :: verification rule #463
// [Airaf-A-20-L21] Connect Sidebar badge counters to live socket events :: verification rule #482
// [Airaf-A-20-L22] Connect Sidebar badge counters to live socket events :: verification rule #501
// [Airaf-A-20-L23] Connect Sidebar badge counters to live socket events :: verification rule #520
// [Airaf-A-20-L24] Connect Sidebar badge counters to live socket events :: verification rule #539
// [Airaf-A-20-L25] Connect Sidebar badge counters to live socket events :: verification rule #558
// [Airaf-A-20-L26] Connect Sidebar badge counters to live socket events :: verification rule #577
// [Airaf-A-20-L27] Connect Sidebar badge counters to live socket events :: verification rule #596
// [Airaf-A-20-L28] Connect Sidebar badge counters to live socket events :: verification rule #615
// [Airaf-A-20-L29] Connect Sidebar badge counters to live socket events :: verification rule #634
// [Airaf-A-20-L30] Connect Sidebar badge counters to live socket events :: verification rule #653
// [Airaf-A-20-L31] Connect Sidebar badge counters to live socket events :: verification rule #672
// [Airaf-A-20-L32] Connect Sidebar badge counters to live socket events :: verification rule #691
// [Airaf-A-20-L33] Connect Sidebar badge counters to live socket events :: verification rule #710
// [Airaf-A-20-L34] Connect Sidebar badge counters to live socket events :: verification rule #729
// [Airaf-A-20-L35] Connect Sidebar badge counters to live socket events :: verification rule #748
// [Airaf-A-20-L36] Connect Sidebar badge counters to live socket events :: verification rule #767
// [Airaf-A-20-L37] Connect Sidebar badge counters to live socket events :: verification rule #786
// [Airaf-A-20-L38] Connect Sidebar badge counters to live socket events :: verification rule #805
// [Airaf-A-20-L39] Connect Sidebar badge counters to live socket events :: verification rule #824
// [Airaf-A-20-L40] Connect Sidebar badge counters to live socket events :: verification rule #843
// [Airaf-A-20-L41] Connect Sidebar badge counters to live socket events :: verification rule #862
// [Airaf-A-20-L42] Connect Sidebar badge counters to live socket events :: verification rule #881
// [Airaf-A-20-L43] Connect Sidebar badge counters to live socket events :: verification rule #900
// [Airaf-A-20-L44] Connect Sidebar badge counters to live socket events :: verification rule #919
// [Airaf-A-20-L45] Connect Sidebar badge counters to live socket events :: verification rule #938
// [Airaf-A-20-L46] Connect Sidebar badge counters to live socket events :: verification rule #957
// [Airaf-A-20-L47] Connect Sidebar badge counters to live socket events :: verification rule #976
// [Airaf-A-20-L48] Connect Sidebar badge counters to live socket events :: verification rule #995
// === [SPEC-BLOCK-END] ===
