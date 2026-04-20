import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, GraduationCap, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    authAPI
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-600/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #14b8a6 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
      </div>

      <div className="relative w-full max-w-sm rc-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Riphah<span className="text-teal-400">Connect</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
          {status === 'loading' && (
            <>
              <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-7 w-7 text-teal-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verifying your email...</h2>
              <p className="mt-2 text-sm text-slate-500">Please wait while we confirm your email address</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Email Verified!</h2>
              <p className="mt-2 text-sm text-slate-500">{message}</p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-sm transition-all"
              >
                Go to Login <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
              <p className="mt-2 text-sm text-slate-500">{message}</p>
              <Link
                to="/login"
                className="mt-6 inline-block text-sm text-teal-600 hover:text-teal-500 font-semibold"
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
