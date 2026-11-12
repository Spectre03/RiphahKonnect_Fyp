import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, ArrowRight, Users, Calendar, Megaphone,
  MessageSquare, Search, BookOpen, ChevronDown, Menu, X,
  Sparkles, Shield, CheckCircle2, Zap, Globe, Heart,
  Hash, Bell, Star, TrendingUp, Lock, ChevronRight, Moon, Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Academic Feed',
    desc: 'Share knowledge, post resources, and ask questions. Filter by General, Questions, or Resources.',
    gradient: 'from-indigo-500 to-blue-600',
    light: 'bg-indigo-50',
    tag: 'Feed',
  },
  {
    icon: Users,
    title: 'Semester Groups',
    desc: 'Dedicated spaces for each semester and department. Study together and collaborate in real-time.',
    gradient: 'from-blue-500 to-cyan-500',
    light: 'bg-blue-50',
    tag: 'Groups',
  },
  {
    icon: Calendar,
    title: 'Campus Events',
    desc: 'Discover workshops, seminars, and university events. RSVP and never miss what matters.',
    gradient: 'from-violet-500 to-purple-600',
    light: 'bg-violet-50',
    tag: 'Events',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'Official notices from coordination, teachers, and university admin targeted to your department.',
    gradient: 'from-amber-500 to-orange-500',
    light: 'bg-amber-50',
    tag: 'Notices',
  },
  {
    icon: MessageSquare,
    title: 'Direct Messaging',
    desc: 'Real-time private chat with classmates and faculty. Always fast, always available.',
    gradient: 'from-emerald-500 to-teal-500',
    light: 'bg-emerald-50',
    tag: 'Chat',
  },
  {
    icon: Search,
    title: 'Lost & Found',
    desc: 'Report lost items or help others find theirs. Campus-wide board for the entire community.',
    gradient: 'from-rose-500 to-pink-600',
    light: 'bg-rose-50',
    tag: 'Campus',
  },
];

const STEPS = [
  {
    number: '01',
    icon: GraduationCap,
    title: 'Sign up with your university email',
    desc: 'Use your Riphah email. Your role (Student, Teacher, or Coordination) is detected automatically.',
    gradient: 'from-indigo-500 to-violet-600',
    accentLight: 'border-indigo-100 bg-indigo-50/50',
    accentDark: 'border-indigo-500/20 bg-indigo-500/10',
    numLight: 'text-indigo-200',
    numDark: 'text-indigo-900',
  },
  {
    number: '02',
    icon: Users,
    title: 'Join your groups',
    desc: 'Find semester groups for your department and connect with classmates instantly.',
    gradient: 'from-blue-500 to-indigo-500',
    accentLight: 'border-blue-100 bg-blue-50/50',
    accentDark: 'border-blue-500/20 bg-blue-500/10',
    numLight: 'text-blue-200',
    numDark: 'text-blue-900',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Stay in the loop',
    desc: 'Browse the feed, attend events, read announcements, and chat with your community.',
    gradient: 'from-violet-500 to-purple-600',
    accentLight: 'border-violet-100 bg-violet-50/50',
    accentDark: 'border-violet-500/20 bg-violet-500/10',
    numLight: 'text-violet-200',
    numDark: 'text-violet-900',
  },
];

const ROLES = [
  {
    title: 'Student',
    icon: GraduationCap,
    gradient: 'from-indigo-500 to-blue-600',
    glow: 'shadow-indigo-500/15',
    tagline: 'Your academic home base',
    perks: [
      'Browse and post on the academic feed',
      'Join semester and department groups',
      'RSVP to campus events',
      'Message classmates and teachers',
      'View targeted announcements',
      'Post on the Lost & Found board',
    ],
  },
  {
    title: 'Teacher',
    icon: BookOpen,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
    tagline: 'Empower your students',
    featured: true,
    perks: [
      'Create semester groups for your courses',
      'Post class announcements',
      'Organise and manage campus events',
      'Engage with students on the feed',
      'Direct messaging with students',
      'Share resources and materials',
    ],
  },
  {
    title: 'Coordination',
    icon: Shield,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/15',
    tagline: 'Faculty-level management',
    perks: [
      'Manage all groups within your faculty',
      'Post official announcements',
      'Create university-wide events',
      'Faculty-scoped department control',
      'Monitor academic activity',
      'Direct access to all faculty members',
    ],
  },
];

const STATS = [
  { value: '5,000+', label: 'Students',   color: 'text-indigo-500', darkColor: 'text-indigo-400' },
  { value: '200+',   label: 'Faculty',    color: 'text-violet-500', darkColor: 'text-violet-400' },
  { value: '6',      label: 'Faculties',  color: 'text-blue-500',   darkColor: 'text-blue-400' },
  { value: '50+',    label: 'Departments',color: 'text-teal-500',   darkColor: 'text-teal-400' },
];

const TICKER = [
  'Academic Feed', 'Semester Groups', 'Campus Events',
  'Announcements', 'Direct Messaging', 'Lost & Found',
  'Real-time Chat', 'Department Scoping', 'Faculty Management',
];

const NAV_LINKS = [
  { label: 'Features',     id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Roles',        id: 'roles' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isDarkMode,  setIsDarkMode]  = useState(false); // Default to Light Mode

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  // Theme-aware styles
  const themeStyles = {
    bgApp: isDarkMode ? 'bg-[#0a0a14]' : 'bg-slate-50',
    textPrimary: isDarkMode ? 'text-white' : 'text-slate-900',
    textSecondary: isDarkMode ? 'text-slate-300' : 'text-slate-600',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    navBgScrolled: isDarkMode ? 'bg-[#0a0a14]/80 border-white/10 shadow-black/50' : 'bg-white/80 border-slate-200/60 shadow-slate-200/50',
    navBgPill: isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200',
    navLinkText: isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white',
    sectionBgAlt: isDarkMode ? 'bg-[#0e0e1a]' : 'bg-white',
    cardBg: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300',
    footerBg: isDarkMode ? 'bg-[#07070f] border-white/[0.04]' : 'bg-slate-100 border-slate-200',
  };

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${themeStyles.bgApp}`}>

      {/* ── NAVBAR ── */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6 transition-all duration-300">
        <nav className={`mx-auto max-w-6xl rounded-2xl transition-all duration-300 ${
          scrolled
            ? `backdrop-blur-xl border shadow-2xl px-4 sm:px-6 py-3 ${themeStyles.navBgScrolled}`
            : 'bg-transparent px-2 sm:px-4 py-4'
        }`}>
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <div className="h-10 flex items-center py-0.5">
                <img 
                  src={isDarkMode ? "/logo-dark.png" : "/logo.png"} 
                  alt="RK" 
                  className={`h-full w-auto object-contain transition-opacity duration-300 ${isDarkMode ? 'drop-shadow-sm' : 'mix-blend-multiply'}`} 
                />
              </div>
            </Link>

            {/* Desktop Links */}
            <div className={`hidden md:flex items-center gap-1 rounded-full p-1 border transition-colors ${themeStyles.navBgPill}`}>
              {NAV_LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${themeStyles.navLinkText}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* CTAs & Theme Toggle */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full transition-all ${
                  isDarkMode 
                    ? 'bg-white/10 text-yellow-400 hover:bg-white/20' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user ? (
                <Link
                  to="/home"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                  style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)' }}
                >
                  Go to Dashboard <ArrowRight size={14} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`px-4 py-2 text-[13px] font-bold transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                    style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)' }}
                  >
                    Get Started <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full transition-all ${
                  isDarkMode ? 'bg-white/10 text-yellow-400' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-300 hover:text-white bg-white/5' : 'text-slate-600 hover:text-slate-900 bg-slate-200'
                }`}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </nav>
        
        {/* Mobile Menu */}
        {mobileOpen && (
          <div className={`md:hidden mx-auto max-w-6xl mt-2 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-2xl ${
            isDarkMode ? 'bg-[#0a0a14]/95 border-white/10' : 'bg-white/95 border-slate-200'
          }`}>
            <div className="px-5 py-4 space-y-1">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                    isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {l.label}
                </button>
              ))}
              <div className="pt-3 pb-1 flex flex-col gap-2">
                {user ? (
                  <Link to="/home" onClick={() => setMobileOpen(false)} className="text-center py-3 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)' }}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className={`text-center py-3 text-sm font-semibold border rounded-xl transition-all ${
                      isDarkMode ? 'text-slate-300 border-white/10 hover:bg-white/5' : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}>
                      Sign in
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="text-center py-3 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)' }}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── HERO ── */}
      <section className="relative min-h-[100svh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
        {/* Background Image & Overlays */}
        <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'bg-[#0a0a14]' : 'bg-slate-50'}`}>
          <img src="/campus.jpeg" alt="Campus" className={`w-full h-full object-cover object-center ${isDarkMode ? 'opacity-30' : 'opacity-30'}`} />
          {/* Gradients */}
          {isDarkMode ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a14] via-[#0a0a14]/80 to-transparent" />
              <div className="absolute inset-0 auth-grid opacity-10" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/60 to-transparent" />
              <div className="absolute inset-0 auth-grid opacity-30" />
            </>
          )}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* LEFT: Content */}
          <div className="flex flex-col items-start text-left pt-10">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border backdrop-blur-md shadow-lg ${
              isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-slate-200'
            }`}>
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#c9973a' }} />
              <span className={`text-[11px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Riphah International University
              </span>
            </div>

            {/* Headline */}
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 ${themeStyles.textPrimary}`}>
              Your campus,<br />
              <span style={{ color: '#c9973a' }}>connected.</span>
            </h1>

            <p className={`text-lg sm:text-xl leading-relaxed max-w-lg mb-10 ${themeStyles.textSecondary}`}>
              The premium academic platform built exclusively for Riphah students, teachers, and administration. One campus. One community.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-14">
              <Link
                to="/register"
                className="flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)' }}
              >
                Join the Community <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className={`flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold border backdrop-blur-md transition-all ${
                  isDarkMode 
                    ? 'text-white bg-white/5 hover:bg-white/10 border-white/10' 
                    : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                }`}
              >
                Sign in
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className={`text-2xl sm:text-3xl font-black mb-1 ${themeStyles.textPrimary}`}>{s.value}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Floating UI Mockup */}
          <div className="relative hidden lg:block h-[600px] w-full">
            {/* Decorative Orbs */}
            <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-[#c9973a]/20 rounded-full blur-[60px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-[#1a2b6b]/40 rounded-full blur-[70px]" />

            {/* Mockup Card 1: Semester Group */}
            <div className={`absolute top-8 right-0 w-[420px] backdrop-blur-xl border rounded-3xl p-6 shadow-2xl animate-float ${
              isDarkMode ? 'bg-white/5 border-white/10 shadow-black/50' : 'bg-white/80 border-slate-200 shadow-slate-300/50'
            }`}>
              <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1a2b6b] to-[#2251b8] flex items-center justify-center shadow-inner">
                    <GraduationCap size={20} className="text-white" />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${themeStyles.textPrimary}`}>Software Engineering</div>
                    <div className={`text-xs mt-0.5 ${themeStyles.textMuted}`}>Semester 8 · Official Group</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-[#c9973a]/15 text-[#c9973a] text-[10px] font-bold rounded-full uppercase tracking-wider border border-[#c9973a]/20">Active</div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-2xl p-4 border transition-colors ${
                    isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}>
                    <div className={`h-8 w-8 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div className="flex-1 mt-1">
                      <div className={`h-2 w-1/3 rounded-full mb-2.5 ${isDarkMode ? 'bg-white/20' : 'bg-slate-200'}`} />
                      <div className={`h-1.5 w-3/4 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup Card 2: Announcement */}
            <div className={`absolute bottom-16 left-4 w-[340px] backdrop-blur-xl border rounded-3xl p-5 shadow-2xl animate-float ${
              isDarkMode ? 'bg-[#1a2b6b]/80 border-[#c9973a]/30 shadow-black/50' : 'bg-white border-[#1a2b6b]/20 shadow-slate-300/50'
            }`} style={{ animationDelay: '1.5s' }}>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-inner ${
                  isDarkMode ? 'bg-[#c9973a]/20 border-[#c9973a]/40' : 'bg-indigo-50 border-indigo-100'
                }`}>
                  <Megaphone size={20} className={isDarkMode ? 'text-[#c9973a]' : 'text-indigo-600'} />
                </div>
                <div>
                  <div className={`text-sm font-bold mb-1.5 ${themeStyles.textPrimary}`}>Official Announcement</div>
                  <div className={`text-xs leading-relaxed ${themeStyles.textSecondary}`}>The mid-term schedules for Fall have been published. Please check the resources tab.</div>
                </div>
              </div>
            </div>
            
            {/* Mockup Card 3: New Message */}
            <div className={`absolute top-1/2 -left-8 w-[240px] backdrop-blur-xl border rounded-2xl p-4 flex items-center gap-3 shadow-2xl animate-float ${
              isDarkMode ? 'bg-white/10 border-white/20 shadow-black/50' : 'bg-white/90 border-slate-200 shadow-slate-300/50'
            }`} style={{ animationDelay: '0.7s' }}>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center border-2 border-white/10 shadow-md">
                <Users size={16} className="text-white" />
              </div>
              <div>
                <p className={`text-[11px] font-bold ${themeStyles.textPrimary}`}>Project Discussion</p>
                <p className={`text-[10px] mt-0.5 ${themeStyles.textMuted}`}>3 new messages</p>
              </div>
              <div className="ml-auto h-2 w-2 rounded-full bg-[#c9973a] animate-pulse shadow-[0_0_8px_#c9973a]" />
            </div>

          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className={`py-4 overflow-hidden border-y ${
        isDarkMode ? 'bg-indigo-600/[0.08] border-indigo-500/[0.12]' : 'bg-indigo-50 border-indigo-100'
      }`}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER, ...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className={`flex items-center gap-3 mx-6 text-[11px] font-bold uppercase tracking-widest flex-shrink-0 ${
              isDarkMode ? 'text-indigo-400/60' : 'text-indigo-600'
            }`}>
              <Sparkles size={9} className={isDarkMode ? 'text-indigo-500/40' : 'text-indigo-400'} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className={`py-28 px-5 sm:px-8 ${themeStyles.sectionBgAlt}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 border ${
              isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'
            }`}>
              <Zap size={12} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Everything you need</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 ${themeStyles.textPrimary}`}>
              Built for campus life
            </h2>
            <p className={`text-base max-w-xl mx-auto leading-relaxed ${themeStyles.textSecondary}`}>
              Every feature is designed around how students and teachers actually work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group relative p-6 rounded-2xl transition-all duration-300 cursor-default overflow-hidden ${themeStyles.cardBg}`}
                >
                  {/* Hover gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-2xl`} />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : `${f.light} border-transparent text-slate-600`
                      }`}>
                        {f.tag}
                      </span>
                    </div>
                    <h3 className={`text-sm font-bold mb-2 transition-colors ${themeStyles.textPrimary} group-hover:text-indigo-500`}>{f.title}</h3>
                    <p className={`text-sm leading-relaxed ${themeStyles.textMuted}`}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className={`py-28 px-5 sm:px-8 ${isDarkMode ? 'bg-[#0a0a14]' : 'bg-[#f5f7ff]'}`}
        style={isDarkMode ? {
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        } : {
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 border ${
              isDarkMode ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-100'
            }`}>
              <Hash size={12} className={isDarkMode ? 'text-violet-400' : 'text-violet-500'} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>Get started in minutes</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 ${themeStyles.textPrimary}`}>
              Three steps, that's it
            </h2>
            <p className={`text-base max-w-xl mx-auto leading-relaxed ${themeStyles.textSecondary}`}>
              From sign-up to fully connected with your campus community in under two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:flex absolute top-10 left-[calc(100%-8px)] w-16 items-center z-10">
                      <div className={`flex-1 h-px bg-gradient-to-r ${isDarkMode ? 'from-white/10' : 'from-slate-200'} to-transparent`} />
                      <ChevronRight size={14} className={`${isDarkMode ? 'text-slate-600' : 'text-slate-300'} -ml-1 flex-shrink-0`} />
                    </div>
                  )}
                  <div className={`rounded-2xl p-7 border transition-all duration-200 hover:-translate-y-1.5 ${
                    isDarkMode ? `${step.accentDark} shadow-none` : `bg-white ${step.accentLight} shadow-sm hover:shadow-xl`
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-md`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className={`text-5xl font-black leading-none ${isDarkMode ? step.numDark : step.numLight}`}>{step.number}</span>
                    </div>
                    <h3 className={`text-sm font-bold mb-2 ${themeStyles.textPrimary}`}>{step.title}</h3>
                    <p className={`text-sm leading-relaxed ${themeStyles.textMuted}`}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className={`py-28 px-5 sm:px-8 ${themeStyles.sectionBgAlt}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 border ${
              isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'
            }`}>
              <Globe size={12} className={isDarkMode ? 'text-amber-400' : 'text-amber-500'} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>For everyone on campus</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 ${themeStyles.textPrimary}`}>
              The right tools for your role
            </h2>
            <p className={`text-base max-w-xl mx-auto leading-relaxed ${themeStyles.textSecondary}`}>
              Whether you're a student, teacher, or coordination officer — everything you need is here.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className={`relative rounded-2xl p-7 border transition-all duration-200 hover:-translate-y-1.5 ${
                    role.featured
                      ? isDarkMode 
                        ? `border-violet-500/30 bg-[#12122a] ${role.glow}`
                        : `border-violet-200 shadow-2xl bg-gradient-to-b from-violet-50/80 to-white ${role.glow}`
                      : isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10'
                        : `border-slate-200 bg-white shadow-sm hover:shadow-xl hover:${role.glow}`
                  }`}
                >
                  {role.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)' }}
                      >
                        <Star size={9} fill="currentColor" /> Most Active
                      </div>
                    </div>
                  )}

                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-5 shadow-md`}>
                    <Icon size={20} className="text-white" />
                  </div>

                  <h3 className={`text-base font-bold mb-0.5 ${themeStyles.textPrimary}`}>{role.title}</h3>
                  <p className={`text-xs font-medium mb-5 ${themeStyles.textMuted}`}>{role.tagline}</p>

                  <ul className="space-y-2.5">
                    {role.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5">
                        <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className={`text-sm leading-snug ${themeStyles.textSecondary}`}>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`mt-7 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      role.featured
                        ? 'text-white shadow-md hover:scale-[1.02]'
                        : isDarkMode
                          ? 'border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    style={role.featured ? { background: 'linear-gradient(135deg, #1a2b6b, #2251b8)', boxShadow: '0 4px 12px rgba(26,43,107,0.25)' } : {}}
                  >
                    Join as {role.title} <ArrowRight size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECURITY STRIP ── */}
      <div className={`border-y py-8 px-5 sm:px-8 ${isDarkMode ? 'bg-[#0a0a14] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
          {[
            { icon: Lock,  title: 'University-only access', desc: 'Only @riphah.edu.pk emails accepted' },
            { icon: Shield, title: 'Role-based permissions', desc: 'Students, teachers, and admins each have scoped access' },
            { icon: Zap,   title: 'Real-time everything',   desc: 'Live chat, instant notifications, live feeds' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                  isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'
                }`}>
                  <Icon size={15} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${themeStyles.textPrimary}`}>{item.title}</p>
                  <p className={`text-[11px] mt-0.5 ${themeStyles.textMuted}`}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CTA BANNER ── */}
      <section className={`py-32 px-5 sm:px-8 relative overflow-hidden ${themeStyles.sectionBgAlt}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-600/[0.05] blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.04] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-blue-600/[0.03] blur-3xl" />
          <div className={`absolute inset-0 auth-grid ${isDarkMode ? 'opacity-[0.15]' : 'opacity-[0.4]'}`} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8" style={{ background: 'rgba(201,151,58,0.10)', border: '1px solid rgba(201,151,58,0.20)' }}>
            <Heart size={12} style={{ color: '#c9973a' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>Join the community</span>
          </div>

          <h2 className={`text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] mb-6 ${themeStyles.textPrimary}`}>
            Ready to connect with
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #1a2b6b, #c9973a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              your campus?
            </span>
          </h2>

          <p className={`text-base leading-relaxed mb-10 max-w-lg mx-auto ${themeStyles.textSecondary}`}>
            Sign up with your Riphah university email and join thousands of students
            and teachers already on the platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 px-9 py-4 rounded-2xl text-[15px] font-bold text-white hover:-translate-y-1 active:scale-[0.97] transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #1a2b6b, #c9973a)', boxShadow: '0 20px 40px rgba(26,43,107,0.20)' }}
            >
              Create Free Account <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className={`flex items-center gap-2 px-9 py-4 rounded-2xl text-[15px] font-semibold border hover:-translate-y-0.5 transition-all duration-200 ${
                isDarkMode 
                  ? 'text-slate-300 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/[0.04]' 
                  : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:shadow-md hover:border-slate-300'
              }`}
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={`${themeStyles.footerBg} px-5 sm:px-8 py-8 transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className={`text-sm font-bold tracking-tight ${themeStyles.textPrimary}`}>
              Riphah<span className="text-indigo-500">Konnect</span>
            </span>
          </Link>

          <p className={`text-[11px] text-center ${themeStyles.textSecondary}`}>
            Restricted to{' '}
            <span className={`font-mono ${themeStyles.textMuted}`}>@riphah.edu.pk</span>
            {' '}and{' '}
            <span className={`font-mono ${themeStyles.textMuted}`}>@students.riphah.edu.pk</span>
          </p>

          <p className={`text-[11px] ${themeStyles.textSecondary}`}>
            {new Date().getFullYear()} RiphahKonnect
          </p>
        </div>
      </footer>

    </div>
  );
}
