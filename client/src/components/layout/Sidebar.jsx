import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvatarGradient } from '../../utils/brand';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard, Newspaper, Users, Calendar,
  PackageSearch, MessageSquare, LogOut, Menu, X,
  Megaphone, ShieldCheck, UserCog, GraduationCap,
  ChevronRight, BookOpen, FileText,
} from 'lucide-react';
import NotificationDropdown from '../ui/NotificationDropdown';

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
  { to: '/admin/groups',  label: 'Group Management',icon: BookOpen },
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

/* Role badge styles — semantic colors, not random */
const ROLE_META = {
  STUDENT:          { label: 'Student',          bg: 'bg-teal-500/15 border-teal-500/25',         text: 'text-teal-300' },
  TEACHER:          { label: 'Teacher',          bg: 'bg-blue-500/15 border-blue-400/25',          text: 'text-blue-300' },
  COORDINATION:     { label: 'Coordination',     bg: 'bg-amber-500/15 border-amber-400/25',        text: 'text-amber-300' },
  UNIVERSITY_ADMIN: { label: 'University Admin', bg: 'bg-orange-500/15 border-orange-400/25',      text: 'text-orange-300' },
  SYSTEM_ADMIN:     { label: 'System Admin',     bg: 'bg-red-500/15 border-red-400/25',            text: 'text-red-300' },
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

      <div className="px-4 pt-5 pb-4">
        <Link to="/home" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          {/* Actual logo mark */}
          <div className="h-20 flex items-center">
            <img
              src="/logo-dark.png"
              alt="RiphahKonnect"
              className="h-full w-auto object-contain"
            />
          </div>
        </Link>
      </div>

      {/* ── Role pill ── */}
      <div className="px-4 mb-3">
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider',
          roleMeta.bg, roleMeta.text
        )}>
          {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
          {roleMeta.label}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 mb-3 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Nav ── */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto dark-scroll">
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
                  ? 'text-white border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              )}
              style={active ? {
                background: 'linear-gradient(90deg, rgba(201,151,58,0.12), rgba(201,151,58,0.04))',
                borderRight: '2px solid #c9973a',
              } : {}}
            >
              <Icon
                size={15}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {active && (
                <ChevronRight size={12} className="text-amber-400/60 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-4 mt-3 mb-3 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── User section ── */}
      <div className="px-2.5 pb-5 space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</span>
          <NotificationDropdown />
        </div>
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group border',
            isActive('/profile')
              ? 'text-white border-transparent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
          )}
          style={isActive('/profile') ? {
            background: 'linear-gradient(90deg, rgba(201,151,58,0.12), rgba(201,151,58,0.04))',
            borderRight: '2px solid #c9973a',
          } : {}}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-1 ring-white/10"
              style={{ background: getAvatarGradient(user?.name || '') }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-slate-200 group-hover:text-white">
              {user?.name || 'Profile'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{user?.department || user?.email}</p>
          </div>
        </Link>

        <button
          onClick={() => { logout(); setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all cursor-pointer border border-transparent"
        >
          <LogOut size={15} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  /* Sidebar background = deep navy */
  const sidebarBg = { background: '#0c1a4a', borderRight: '1px solid rgba(255,255,255,0.04)' };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-64 flex-shrink-0 z-30" style={sidebarBg}>
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-40" style={sidebarBg}>
        <Link to="/home" className="flex items-center">
          <div className="h-14 flex items-center">
            <img
              src="/logo-dark.png"
              alt="RiphahKonnect"
              className="h-full w-auto object-contain"
            />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationDropdown position="top-down" />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40 animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50 animate-slideInLeft shadow-2xl"
            style={sidebarBg}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

// === [SPEC-BLOCK-START] Airaf-A-38 (2026-09-26T16:33:51+05:00) ===
// [Airaf-A-38-L1] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #216
// [Airaf-A-38-L2] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #235
// [Airaf-A-38-L3] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #254
// [Airaf-A-38-L4] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #273
// [Airaf-A-38-L5] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #292
// [Airaf-A-38-L6] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #311
// [Airaf-A-38-L7] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #330
// [Airaf-A-38-L8] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #349
// [Airaf-A-38-L9] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #368
// [Airaf-A-38-L10] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #387
// [Airaf-A-38-L11] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #406
// [Airaf-A-38-L12] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #425
// [Airaf-A-38-L13] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #444
// [Airaf-A-38-L14] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #463
// [Airaf-A-38-L15] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #482
// [Airaf-A-38-L16] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #501
// [Airaf-A-38-L17] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #520
// [Airaf-A-38-L18] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #539
// [Airaf-A-38-L19] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #558
// [Airaf-A-38-L20] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #577
// [Airaf-A-38-L21] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #596
// [Airaf-A-38-L22] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #615
// [Airaf-A-38-L23] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #634
// [Airaf-A-38-L24] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #653
// [Airaf-A-38-L25] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #672
// [Airaf-A-38-L26] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #691
// [Airaf-A-38-L27] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #710
// [Airaf-A-38-L28] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #729
// [Airaf-A-38-L29] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #748
// [Airaf-A-38-L30] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #767
// [Airaf-A-38-L31] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #786
// [Airaf-A-38-L32] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #805
// [Airaf-A-38-L33] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #824
// [Airaf-A-38-L34] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #843
// [Airaf-A-38-L35] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #862
// [Airaf-A-38-L36] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #881
// [Airaf-A-38-L37] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #900
// [Airaf-A-38-L38] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #919
// [Airaf-A-38-L39] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #938
// [Airaf-A-38-L40] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #957
// [Airaf-A-38-L41] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #976
// [Airaf-A-38-L42] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #995
// [Airaf-A-38-L43] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #17
// [Airaf-A-38-L44] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #36
// [Airaf-A-38-L45] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #55
// [Airaf-A-38-L46] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #74
// [Airaf-A-38-L47] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #93
// [Airaf-A-38-L48] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #112
// [Airaf-A-38-L49] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #131
// [Airaf-A-38-L50] Add responsive mobile drawer toggle for Sidebar navigation :: verification rule #150
// === [SPEC-BLOCK-END] ===
