import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, GraduationCap, Loader2, ArrowRight,
  User, Mail, Lock, BookOpen, Hash, Sparkles, Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants';

/**
 * Detect the broad account category from the email:
 *   digits@students.riphah.edu.pk → 'STUDENT'
 *   letters@riphah.edu.pk         → 'STAFF'  (TEACHER or UNIVERSITY_ADMIN, user picks)
 *   anything else                 → null
 */
function detectCategory(email) {
  if (!email) return null;
  if (/^\d+@students\.riphah\.edu\.pk$/i.test(email)) return 'STUDENT';
  if (/^[a-zA-Z][^@]*@riphah\.edu\.pk$/i.test(email)) return 'STAFF';
  return null;
}

const STAFF_ROLES = [
  {
    value: 'TEACHER',
    label: 'Teaching Faculty',
    desc: 'Teach courses & manage coursework',
    icon: GraduationCap,
    color: 'indigo',
  },
  {
    value: 'UNIVERSITY_ADMIN',
    label: 'Administrative Staff',
    desc: 'Management & administration roles',
    icon: Briefcase,
    color: 'violet',
  },
];

const ROLE_META = {
  STUDENT:          { label: 'Student',              icon: GraduationCap, scheme: 'indigo' },
  TEACHER:          { label: 'Teaching Faculty',      icon: GraduationCap, scheme: 'indigo' },
  UNIVERSITY_ADMIN: { label: 'Administrative Staff',  icon: Briefcase,     scheme: 'violet' },
};

const STEPS_INFO = [
  { step: 1, label: 'Account' },
  { step: 2, label: 'Academic' },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  // Staff-only: which sub-role they pick (TEACHER | UNIVERSITY_ADMIN)
  const [staffRole, setStaffRole] = useState('TEACHER');

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm();

  const emailValue = watch('email', '');
  const category = detectCategory(emailValue);
  const isStaff = category === 'STAFF';
  const isStudent = category === 'STUDENT';

  // Final role that will be sent to the backend
  const resolvedRole = isStudent ? 'STUDENT' : isStaff ? staffRole : null;
  const roleMeta = resolvedRole ? ROLE_META[resolvedRole] : null;

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      // Inject role for staff accounts; backend ignores it for students (email determines STUDENT)
      if (isStaff) payload.role = staffRole;
      await registerUser(payload);
      toast.success(`${roleMeta?.label ?? 'Account'} created! Welcome to RiphahKonnect.`);
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    }
  };

  const goNext = async () => {
    const valid = await trigger(['name', 'email', 'password']);
    if (valid) setStep(2);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col relative overflow-hidden bg-[#0a0a14]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute inset-0 auth-grid opacity-40" />
        </div>

        <div className="relative flex flex-col h-full p-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Riphah<span className="text-indigo-400">Konnect</span>
            </span>
          </div>

          <div className="mt-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full mb-5">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span className="text-xs font-semibold text-violet-300 tracking-wide">JOIN THE COMMUNITY</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Start your<br />
              <span style={{
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                journey here.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Join thousands of Riphah students and faculty already collaborating on the platform.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '5K+', label: 'Students' },
              { value: '200+', label: 'Teachers' },
              { value: '50+', label: 'Departments' },
            ].map((s) => (
              <div key={s.label} className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
                <div className="text-xl font-extrabold text-white mb-0.5">{s.value}</div>
                <div className="text-[11px] text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[11px] text-slate-600">
            Only <span className="text-slate-400">@riphah.edu.pk</span> and{' '}
            <span className="text-slate-400">@students.riphah.edu.pk</span> emails accepted.
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form ── */}
      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-10 overflow-hidden bg-slate-50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-violet-100/60 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-100/50 blur-3xl" />
        </div>

        <div className="w-full max-w-[460px] animate-fadeUp relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Riphah<span className="text-indigo-600">Konnect</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/[0.08] border border-slate-200/70 px-8 py-9">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create account</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  {step === 1
                    ? 'Start with your basic info'
                    : isStudent
                      ? 'Tell us about your academics'
                      : 'Select your department'}
                </p>
              </div>
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {STEPS_INFO.map((s) => (
                  <div key={s.step} className="flex items-center gap-1.5">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.step
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : step > s.step
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                    }`}>
                      {step > s.step ? '✓' : s.step}
                    </div>
                    {s.step < STEPS_INFO.length && (
                      <div className={`h-px w-4 ${step > s.step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Full name */}
                  <div className={errors.name ? 'animate-shake' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
                    <div className="input-icon-wrap relative">
                      <User className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none" />
                      <input
                        {...register('name', {
                          required: 'Name is required',
                          minLength: { value: 2, message: 'Too short' },
                        })}
                        type="text"
                        placeholder="Muhammad Ali"
                        autoComplete="name"
                        className={`input-premium w-full pl-10 ${errors.name ? 'border-red-400 focus:border-red-400 focus:shadow-none' : ''}`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className={errors.email ? 'animate-shake' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">University email</label>
                    <div className="input-icon-wrap relative">
                      <Mail className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none" />
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^(\d+@students\.riphah\.edu\.pk|[a-zA-Z][^@]*@riphah\.edu\.pk)$/i,
                            message: 'Use your SAP ID (44316@students.riphah.edu.pk) or staff email (name@riphah.edu.pk)',
                          },
                        })}
                        type="email"
                        placeholder="44316@students.riphah.edu.pk"
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

                    {/* Student: simple badge */}
                    {isStudent && !errors.email && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700">
                        <GraduationCap className="h-3 w-3" />
                        Student account
                      </div>
                    )}

                    {/* Staff: role picker cards */}
                    {isStaff && !errors.email && (
                      <div className="mt-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Select your role
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {STAFF_ROLES.map(({ value, label, desc, icon: Icon, color }) => {
                            const selected = staffRole === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setStaffRole(value)}
                                className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all duration-150 ${
                                  selected
                                    ? color === 'indigo'
                                      ? 'bg-indigo-50 border-indigo-400 shadow-sm shadow-indigo-100'
                                      : 'bg-violet-50 border-violet-400 shadow-sm shadow-violet-100'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                                  selected
                                    ? color === 'indigo'
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-violet-500 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <p className={`text-xs font-bold leading-tight ${selected ? (color === 'indigo' ? 'text-indigo-800' : 'text-violet-800') : 'text-slate-700'}`}>
                                  {label}
                                </p>
                                <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div className={errors.password ? 'animate-shake' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                    <div className="input-icon-wrap relative">
                      <Lock className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none" />
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 8, message: 'At least 8 characters' },
                        })}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className={`input-premium w-full pl-10 pr-11 ${errors.password ? 'border-red-400 focus:border-red-400 focus:shadow-none' : ''}`}
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

                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full h-12 mt-2 gradient-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-150 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/25 cursor-pointer text-sm"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Role confirmation banner */}
                  {roleMeta && (() => {
                    const Icon = roleMeta.icon;
                    const isViolet = roleMeta.scheme === 'violet';
                    return (
                      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium ${
                        isViolet
                          ? 'bg-violet-50 border-violet-200 text-violet-800'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      }`}>
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span>Registering as <strong>{roleMeta.label}</strong></span>
                      </div>
                    );
                  })()}

                  {/* Department */}
                  <div className={errors.department ? 'animate-shake' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                    <div className="input-icon-wrap relative">
                      <BookOpen className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none z-10" />
                      <select
                        {...register('department', { required: 'Department is required' })}
                        className={`input-premium w-full pl-10 ${errors.department ? 'border-red-400' : ''}`}
                      >
                        <option value="">Select your department</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {errors.department && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                        {errors.department.message}
                      </p>
                    )}
                  </div>

                  {/* Semester — students only */}
                  {isStudent && (
                    <div className={errors.semester ? 'animate-shake' : ''}>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Semester</label>
                      <div className="input-icon-wrap relative">
                        <Hash className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none z-10" />
                        <select
                          {...register('semester', { required: 'Semester is required' })}
                          className={`input-premium w-full pl-10 ${errors.semester ? 'border-red-400' : ''}`}
                        >
                          <option value="">Select semester</option>
                          {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                      </div>
                      {errors.semester && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                          <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                          {errors.semester.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer text-sm shadow-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] h-12 gradient-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-150 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none cursor-pointer text-sm"
                    >
                      {isSubmitting
                        ? <Loader2 className="h-5 w-5 animate-spin" />
                        : <>Create account <ArrowRight className="h-4 w-4" /></>
                      }
                    </button>
                  </div>
                </div>
              )}
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
