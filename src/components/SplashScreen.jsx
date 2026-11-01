import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
export default function SplashScreen({ onComplete }) {
  useEffect(() => { const timer = setTimeout(onComplete, 700); return () => clearTimeout(timer); }, [onComplete]);
  return <motion.div initial={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center text-white" role="status" aria-label="Abrindo V.A.U.L.T">
    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="rounded-3xl bg-indigo-500/20 border border-indigo-400/30 p-6"><Wallet className="w-12 h-12 text-indigo-300" /></motion.div>
    <p className="mt-6 text-xl tracking-[.4em]">V.A.U.L.T</p><p className="mt-2 text-xs text-slate-400">Seu futuro começa com clareza.</p>
  </motion.div>;
}
