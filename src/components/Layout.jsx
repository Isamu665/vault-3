import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, TrendingDown, PieChart, CalendarCheck,
  Landmark, Target, Tags, BarChart3, Moon, Sun, Menu, X, Wallet, LogOut, Calculator, Gem } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import useRuleConfig from '@/hooks/useRuleConfig';
import FloatingAssistantButton from '@/components/assistant/FloatingAssistantButton';

const NAV = [
{ to: '/', label: 'Painel', icon: LayoutDashboard },
{ to: '/receitas', label: 'Receitas', icon: TrendingUp },
{ to: '/despesas', label: 'Despesas', icon: TrendingDown },
{ to: '/regra', label: 'Regra 50/30/20', icon: PieChart },
{ to: '/contas', label: 'Contas a pagar', icon: CalendarCheck },
{ to: '/dividas', label: 'Dívidas', icon: Landmark },
{ to: '/patrimonio', label: 'Patrimônio', icon: Gem },
  { to: '/metas', label: 'Metas', icon: Target },
{ to: '/categorias', label: 'Categorias', icon: Tags },
{ to: '/simulacro', label: 'Simulacro', icon: Calculator },
{ to: '/relatorios', label: 'Relatórios', icon: BarChart3 }];


export default function Layout() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [open, setOpen] = useState(false);
  const { config } = useRuleConfig();
  const ruleLabel = `Regra ${config.categories.map((c) => c.percentage).join('/')}`;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => setOpen(false), [pathname]);

  // Gesture support: swipe right from left half of screen to open, swipe left to close
  useEffect(() => {
    let startX = 0, startY = 0, startTime = 0, startTarget = null;

    const isHorizontalScrollable = (el) => {
      let node = el;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const onStart = (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      startTarget = e.target;
    };

    const onEnd = (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Date.now() - startTime > 500) return;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      // Don't interfere with horizontally scrollable components
      if (startTarget && isHorizontalScrollable(startTarget)) return;
      // Open: swipe right starting from the left half of the screen
      if (dx > 0 && startX <= window.innerWidth / 2) setOpen(true);
      // Close: swipe left anywhere
      else if (dx < 0) setOpen(false);
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed z-40 inset-y-0 left-0 w-64 border-r bg-card px-4 py-6 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight">V.A.U.L.T</span>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />{to === '/regra' ? ruleLabel : label}
              </Link>);

          })}
        </nav>
        <div className="absolute bottom-6 left-4 right-4 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {dark ? 'Tema claro' : 'Tema escuro'}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-muted-foreground" onClick={() => base44.auth.logout()}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 backdrop-blur px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <span className="font-semibold">Meu Financeiro</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Botão flutuante do assistente — visível em todas as páginas */}
      <FloatingAssistantButton />
    </div>);

}