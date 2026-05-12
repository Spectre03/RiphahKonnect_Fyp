import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, ArrowRight, Users, Calendar, Megaphone,
  MessageSquare, Search, BookOpen, ChevronDown, Menu, X,
  Sparkles, Shield, CheckCircle2, Zap, Globe, Heart,
  Hash, Bell, Star, TrendingUp, Lock, ChevronRight,
} from 'lucide-react';

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
    accent: 'border-indigo-200 bg-indigo-50/50',
    num: 'text-indigo-100',
  },
  {
    number: '02',
    icon: Users,
    title: 'Join your groups',
    desc: 'Find semester groups for your department and connect with classmates instantly.',
    gradient: 'from-blue-500 to-indigo-500',
    accent: 'border-blue-200 bg-blue-50/50',
    num: 'text-blue-100',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Stay in the loop',
    desc: 'Browse the feed, attend events, read announcements, and chat with your community.',
    gradient: 'from-violet-500 to-purple-600',
    accent: 'border-violet-200 bg-violet-50/50',
    num: 'text-violet-100',
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
  { value: '5,000+', label: 'Students', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { value: '200+',   label: 'Faculty',  color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { value: '6',      label: 'Faculties',color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  { value: '50+',    label: 'Departments',color:'text-teal-400',  bg: 'bg-teal-500/10',   border: 'border-teal-500/20' },
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
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a14]/95 backdrop-blur-md border-b border-white/[0.06] shadow-2xl shadow-black/40'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>

            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/35">
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="text-[15px] font-bold text-white tracking-tight">
                Riphah<span className="text-indigo-400">Konnect</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="text-[13px] text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-[13px] font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-white hover:-translate-y-0.5 active:scale-[0.97] transition-all shadow-lg shadow-indigo-500/25"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                Get Started <ArrowRight size={13} />
              </Link>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all cursor-pointer"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#0a0a14]/98 backdrop-blur-md">
            <div className="px-5 py-4 space-y-1">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all cursor-pointer"
                >
                  {l.label}
                </button>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="text-center py-3 text-sm font-semibold text-slate-300 border border-white/10 rounded-xl hover:bg-white/[0.04] transition-all">
                  Sign in
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="text-center py-3 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 sm:px-8 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-indigo-600/[0.08] blur-[120px]" />
          <div className="absolute top-1/2 -left-64 w-[500px] h-[500px] rounded-full bg-violet-600/[0.06] blur-3xl" />
          <div className="absolute bottom-0 -right-64 w-[500px] h-[500px] rounded-full bg-blue-600/[0.06] blur-3xl" />
          <div className="absolute inset-0 auth-grid opacity-[0.15]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded-full mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] font-bold text-indigo-300 tracking-widest uppercase">
              Riphah International University
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-[5rem] font-black text-white leading-[1.04] tracking-tight mb-6">
            Your campus,
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 45%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              connected.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            The academic platform built exclusively for Riphah students, teachers, and administration.
            One campus. One community.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link
              to="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-bold text-white shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-[0.97] transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-slate-400 border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200"
            >
              Sign in <ChevronRight size={15} />
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {STATS.map((s) => (
              <div key={s.label} className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${s.border} ${s.bg} backdrop-blur-sm`}>
                <span className={`text-xl font-black leading-none ${s.color}`}>{s.value}</span>
                <span className="text-[11px] font-semibold text-slate-500 leading-none">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating preview cards */}
        <div className="relative z-10 mt-20 w-full max-w-3xl mx-auto hidden sm:block">
          <div className="relative">
            {/* Main card */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-5 backdrop-blur-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
                <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <GraduationCap size={15} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="h-2.5 w-24 bg-white/10 rounded-full" />
                  <div className="h-2 w-16 bg-white/[0.06] rounded-full mt-1.5" />
                </div>
                <div className="flex gap-1.5">
                  {['bg-indigo-500/40', 'bg-violet-500/40', 'bg-blue-500/40'].map((c, i) => (
                    <div key={i} className={`h-2 w-2 rounded-full ${c}`} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {FEATURES.slice(0, 3).map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 hover:bg-white/[0.06] transition-colors">
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                        <Icon size={15} className="text-white" />
                      </div>
                      <p className="text-[11px] font-bold text-white/70">{f.title}</p>
                      <div className="h-1.5 w-full bg-white/[0.04] rounded-full mt-2" />
                      <div className="h-1.5 w-3/4 bg-white/[0.03] rounded-full mt-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating notification */}
            <div className="absolute -right-6 top-6 bg-[#12121f] border border-white/[0.1] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/40 backdrop-blur-sm">
              <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">New announcement</p>
                <p className="text-[10px] text-slate-500 mt-0.5">CS Department · just now</p>
              </div>
            </div>

            {/* Floating stat */}
            <div className="absolute -left-6 bottom-6 bg-[#12121f] border border-white/[0.1] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/40 backdrop-blur-sm">
              <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">342 active now</p>
                <p className="text-[10px] text-slate-500 mt-0.5">across all groups</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => scrollTo('features')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-700 hover:text-slate-500 transition-colors cursor-pointer"
        >
          <span className="text-[9px] font-bold uppercase tracking-widest">Scroll</span>
          <ChevronDown size={14} className="animate-bounce" />
        </button>
      </section>

      {/* ── TICKER ── */}
      <div className="bg-indigo-600/[0.08] border-y border-indigo-500/[0.12] py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER, ...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="flex items-center gap-3 mx-6 text-[11px] font-bold text-indigo-400/60 uppercase tracking-widest flex-shrink-0">
              <Sparkles size={9} className="text-indigo-500/40" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-5 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-5">
              <Zap size={12} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Everything you need</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Built for campus life
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
              Every feature is designed around how students and teachers actually work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative p-6 rounded-2xl border border-slate-100 bg-white hover:border-transparent hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-2 transition-all duration-300 cursor-default overflow-hidden"
                >
                  {/* Hover gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-2xl`} />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className={`text-[10px] font-bold ${f.light} text-slate-500 px-2.5 py-1 rounded-full border border-slate-100`}>
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
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
        className="py-28 px-5 sm:px-8"
        style={{
          background: '#f5f7ff',
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-violet-50 border border-violet-100 rounded-full mb-5">
              <Hash size={12} className="text-violet-500" />
              <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Get started in minutes</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Three steps, that's it
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
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
                      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                      <ChevronRight size={14} className="text-slate-300 -ml-1 flex-shrink-0" />
                    </div>
                  )}
                  <div className={`bg-white rounded-2xl p-7 border ${step.accent} shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-md`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className={`text-5xl font-black leading-none ${step.num}`}>{step.number}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="py-28 px-5 sm:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-100 rounded-full mb-5">
              <Globe size={12} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">For everyone on campus</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              The right tools for your role
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
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
                      ? `border-violet-200 shadow-2xl ${role.glow} bg-gradient-to-b from-violet-50/80 to-white`
                      : `border-slate-100 bg-white shadow-sm hover:shadow-xl hover:${role.glow}`
                  }`}
                >
                  {role.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                      >
                        <Star size={9} fill="currentColor" /> Most Active
                      </div>
                    </div>
                  )}

                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-5 shadow-md`}>
                    <Icon size={20} className="text-white" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-0.5">{role.title}</h3>
                  <p className="text-xs text-slate-400 font-medium mb-5">{role.tagline}</p>

                  <ul className="space-y-2.5">
                    {role.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5">
                        <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 leading-snug">{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`mt-7 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      role.featured
                        ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-500/20'
                        : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
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
      <div className="bg-slate-50 border-y border-slate-100 py-8 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
          {[
            { icon: Lock,  title: 'University-only access', desc: 'Only @riphah.edu.pk emails accepted' },
            { icon: Shield, title: 'Role-based permissions', desc: 'Students, teachers, and admins each have scoped access' },
            { icon: Zap,   title: 'Real-time everything',   desc: 'Live chat, instant notifications, live feeds' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{item.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CTA BANNER ── */}
      <section className="py-32 px-5 sm:px-8 relative overflow-hidden bg-[#0a0a14]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-600/[0.1] blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.08] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-blue-600/[0.06] blur-3xl" />
          <div className="absolute inset-0 auth-grid opacity-[0.15]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
            <Heart size={12} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Join the community</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.08] mb-6">
            Ready to connect with
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8, #c084fc, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              your campus?
            </span>
          </h2>

          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-lg mx-auto">
            Sign up with your Riphah university email and join thousands of students
            and teachers already on the platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 px-9 py-4 rounded-2xl text-[15px] font-bold text-white shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-[0.97] transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              Create Free Account <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-9 py-4 rounded-2xl text-[15px] font-semibold text-slate-400 border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#07070f] border-t border-white/[0.04] px-5 sm:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              Riphah<span className="text-indigo-400">Konnect</span>
            </span>
          </Link>

          <p className="text-[11px] text-slate-600 text-center">
            Restricted to{' '}
            <span className="text-slate-400 font-mono">@riphah.edu.pk</span>
            {' '}and{' '}
            <span className="text-slate-400 font-mono">@students.riphah.edu.pk</span>
          </p>

          <p className="text-[11px] text-slate-700">
            {new Date().getFullYear()} RiphahKonnect
          </p>
        </div>
      </footer>

    </div>
  );
}
