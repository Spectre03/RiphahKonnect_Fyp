import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, GraduationCap, Loader2, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const token = searchParams.get('token');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await authAPI.resetPassword({ token, password: data.password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a14] px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 left-0 w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute inset-0 auth-grid opacity-40" />
      </div>

      <div className="relative w-full max-w-sm animate-fadeUp">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Riphah<span className="text-indigo-400">Konnect</span>
          </span>
        </div>

        {!token ? (
          /* ── No token ── */
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/[0.14] border border-slate-200/70 px-8 py-9 text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Invalid reset link</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              This link is missing or has expired. Request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Request new link <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* ── Form ── */
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/[0.14] border border-slate-200/70 px-8 py-9">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set new password</h1>
            <p className="mt-1.5 mb-7 text-sm text-slate-500">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className={errors.password ? 'animate-shake' : ''}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New password</label>
                <div className="input-icon-wrap relative">
                  <Lock className="input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors duration-200 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'At least 8 characters' },
                      pattern: {
                        value: /\d/,
                        message: 'Must contain at least one number',
                      },
                    })}
                    placeholder="Min. 8 characters with a number"
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
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-2 gradient-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-150 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none cursor-pointer text-sm"
              >
                {isSubmitting
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <>Reset password <ArrowRight className="h-4 w-4" /></>
                }
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
