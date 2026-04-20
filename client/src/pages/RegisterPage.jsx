import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, GraduationCap, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await registerUser(data);
      toast.success('Account created! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-950 p-10 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-600/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #14b8a6 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Riphah<span className="text-teal-400">Connect</span>
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="inline-block px-3 py-1 bg-teal-500/10 rounded-full border border-teal-500/20 mb-4">
            <span className="text-xs font-semibold text-teal-400 tracking-wide">JOIN THE COMMUNITY</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Start your<br />
            <span className="text-teal-400">journey.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base max-w-sm leading-relaxed">
            Connect with peers, find study partners, and never miss a campus event again.
          </p>
        </div>

        <p className="relative text-slate-600 text-xs">
          Riphah International University
        </p>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-9 w-9 bg-teal-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Riphah<span className="text-teal-600">Connect</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-500">Join the RiphahConnect community</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                {...register('name', {
                  required: 'Name is required.',
                  maxLength: { value: 100, message: 'Max 100 characters.' },
                })}
                placeholder="Ahmad Khan"
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">University Email</label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required.',
                  pattern: { value: /@(students\.)?riphah\.edu\.pk$/i, message: 'Only Riphah university emails allowed.' },
                })}
                placeholder="you@riphah.edu.pk"
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: { value: 8, message: 'Min 8 characters.' },
                    pattern: { value: /\d/, message: 'Must contain a number.' },
                  })}
                  placeholder="Min 8 characters with a number"
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                <select
                  {...register('department')}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                >
                  <option value="">Select...</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Semester</label>
                <select
                  {...register('semester')}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                >
                  <option value="">Select...</option>
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Create account <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-500 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
