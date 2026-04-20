import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
        <div className="h-12 w-12 bg-teal-50 rounded-2xl flex items-center justify-center">
          <GraduationCap className="h-7 w-7 text-teal-600" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
