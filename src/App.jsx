import { lazy, Suspense, useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { useRecordsRealtime } from '@/hooks/useCollection';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import SetupRequired from '@/components/SetupRequired';
import DataSettings from '@/pages/DataSettings';
import DataConnectionBanner from '@/components/DataConnectionBanner';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import EmailConfirmed from '@/pages/EmailConfirmed';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Incomes from '@/pages/Incomes';
import Expenses from '@/pages/Expenses';
import Rule from '@/pages/Rule';
import Bills from '@/pages/Bills';
import Debts from '@/pages/Debts';
import Goals from '@/pages/Goals';
import Categories from '@/pages/Categories';
import SplashScreen from '@/components/SplashScreen';
import { AppReadyProvider, useAppReady } from '@/lib/appReady';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Patrimonio = lazy(() => import('@/pages/Patrimonio'));
const Reports = lazy(() => import('@/pages/Reports'));
const Simulacro = lazy(() => import('@/pages/Simulacro'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isConfigured, recovery, user } = useAuth();
  const location = useLocation();
  useRecordsRealtime(user?.id);
  if (!isConfigured) return <SetupRequired />;
  if (location.pathname === '/' && new URLSearchParams(location.search).has('confirm-email')) {
    return <EmailConfirmed />;
  }

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (recovery && location.pathname !== '/reset-password') return <Navigate to="/reset-password" replace />;

  return (
    <div key={user?.id || 'signed-out'}><DataConnectionBanner /><Suspense fallback={<p role="status" className="p-6">Carregando página…</p>}><Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/receitas" element={<Incomes />} />
          <Route path="/despesas" element={<Expenses />} />
          <Route path="/regra" element={<Rule />} />
          <Route path="/contas" element={<Bills />} />
          <Route path="/dividas" element={<Debts />} />
          <Route path="/metas" element={<Goals />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/simulacro" element={<Simulacro />} />
          <Route path="/patrimonio" element={<Patrimonio />} />
          <Route path="/dados" element={<DataSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes></Suspense></div>
  );
};


function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const { markReady } = useAppReady();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {showSplash && <SplashScreen onComplete={() => {
          setShowSplash(false);
          // Let the page paint before kicking off the in-app animations
          setTimeout(markReady, 120);
        }} />}
        <Router basename={import.meta.env.BASE_URL}>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

function App() {
  return (
    <AppReadyProvider>
      <AppShell />
    </AppReadyProvider>
  )
}

export default App

