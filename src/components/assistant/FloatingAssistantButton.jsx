import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import AssistantChat from './AssistantChat';

export default function FloatingAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
        onClick={() => setOpen((o) => !o)}
        aria-label="Assistente financeiro"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div key="x" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="msg" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
              <MessageSquare className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Painel de chat */}
      <AssistantChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}