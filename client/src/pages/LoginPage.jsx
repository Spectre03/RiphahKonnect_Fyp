import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, GraduationCap, Loader2, ArrowRight,
  Lock, Mail, Sparkles, ArrowLeft,
} from 'lucide-react';

const FEATURES = [
  { emoji: '🎓', title: 'Academic Feed', desc: 'Share knowledge, ask questions, post resources' },
  { emoji: '👥', title: 'Semester Groups', desc: 'Connect with classmates in dedicated groups' },
  { emoji: '📅', title: 'Campus Events', desc: 'Discover and RSVP to university events' },
  { emoji: '📢', title: 'Announcements', desc: 'Stay updated with official notices' },
];

export default function LoginPage() {
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/home';
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(returnTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col relative overflow-hidden bg-[#0a0a14]">
        {/* Ambient background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-2xl" />
          {/* Grid */}
          <div className="absolute inset-0 auth-grid opacity-40" />
        </div>

        <div className="relative flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center">
            <div className="h-12 flex items-center py-0.5">
              <img src="/logo-dark.png" alt="RiphahKonnect" className="h-full w-auto object-contain" />
            </div>
          </div>

          {/* Hero copy */}
          <div className="mt-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(201,151,58,0.10)', border: '1px solid rgba(201,151,58,0.20)' }}>
              <Sparkles className="h-3 w-3" style={{ color: '#c9973a' }} />
              <span className="text-xs font-semibold tracking-wide" style={{ color: '#c9973a' }}>RIPHAH INTERNATIONAL UNIVERSITY</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Your campus,<br />
              <span className="hero-gradient-text">connected.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              The academic platform that brings students, teachers, and administration together in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors">
                <span className="text-lg block mb-1">{f.emoji}</span>
                <p className="text-xs font-semibold text-white mb-0.5">{f.title}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-6 text-[11px] text-slate-600">
            Only <span className="text-slate-400">@riphah.edu.pk</span> and <span className="text-slate-400">@students.riphah.edu.pk</span> emails are accepted.
          </p>
        </div>
      </div>

      {/* ── RIGHT: Auth Form ── */}
      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-10 overflow-hidden bg-slate-50">
        {/* Ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-100/60 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-100/50 blur-3xl" />
        </div>

        <div className="w-full max-w-[420px] animate-fadeUp relative z-10">
          {/* Back to home */}
          <div className="flex items-center justify-between mb-5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center mb-5">
            <div className="h-10 flex items-center py-0.5">
              <img src="/logo.png" alt="RiphahKonnect" className="h-full w-auto object-contain" />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/[0.08] border border-slate-200/70 px-8 py-9">
            {user ? (
              <div className="text-center">
                <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-indigo-50/50">
                  <span className="text-2xl font-bold text-indigo-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">You are logged in</h2>
                <p className="text-slate-500 text-sm mt-1 mb-8">
                  You are currently authenticated as <span className="font-semibold text-slate-700">{user.email}</span>
                </p>
                <div className="space-y-3">
                  <Link
                    to="/home"
                    className="w-full h-12 gradient-brand text-white font-bold rounded-xl flex items-center justify-center hover:opacity-95 shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="w-full h-12 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
                <p className="text-slate-500 text-sm mt-1 mb-7">Sign in to your account to continue</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email */}
                  <div className={errors.email ? 'animate-shake' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <div className="input-icon-wrap relative">
                      <Mail className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none" />
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /@(students\.)?riphah\.edu\.pk$/,
                            message: 'Must be a Riphah university email',
                          },
                        })}
                        type="email"
                        placeholder="you@students.riphah.edu.pk"
                        autoComplete="email"
                        className={`input-premium w-full pl-10 ${errors.email ? 'border-red-400 focus:border-red-400 focus:shadow-none' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className={errors.password ? 'animate-shake' : ''}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="input-icon-wrap relative">
                      <Lock className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none" />
                      <input
                        {...register('password', { required: 'Password is required' })}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={`input-premium w-full pl-10 pr-11 ${errors.password ? 'border-red-400' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer p-0.5"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 mt-2 gradient-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-150 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none cursor-pointer text-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Create one
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-5">
            {['Secure', 'Private', 'Official'].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
