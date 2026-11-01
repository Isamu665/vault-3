import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
export default function ProtectedRoute({ unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <p role="status" className="p-8">Conectando sua conta…</p>;
  return isAuthenticated ? <Outlet /> : unauthenticatedElement;
}
