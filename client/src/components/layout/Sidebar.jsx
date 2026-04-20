import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvatarGradient } from '../../utils/brand';
import {
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  Users,
  Calendar,
  PackageSearch,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/groups', label: 'Study Groups', icon: Users },
  { to: '/events', label: 'Events', icon: Calendar },
  { to: '/lost-found', label: 'Lost & Found', icon: PackageSearch },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-9 w-9 bg-teal-600 rounded-xl flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-[15px] font-bold text-white tracking-tight">
            Riphah<span className="text-teal-400">Connect</span>
          </span>
          <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Academic Platform</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 mt-2 space-y-1 dark-scroll overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group ${
                active
                  ? 'bg-teal-600/10 text-teal-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {label}
              {active && <ChevronRight className="h-3 w-3 ml-auto text-teal-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="px-3 pb-4 mt-auto space-y-2">
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            isActive('/profile')
              ? 'bg-teal-600/10 text-teal-400'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ background: getAvatarGradient(user?.name || '') }}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.department || user?.email}</p>
          </div>
        </Link>

        <button
          onClick={() => { logout(); setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-64 flex-shrink-0 bg-slate-950 border-r border-slate-800/60 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950 border-b border-slate-800/60 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">
            Riphah<span className="text-teal-400">Connect</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-slate-950 z-50 rc-slide-in shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
