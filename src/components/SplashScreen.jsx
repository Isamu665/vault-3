import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SPLASH_GIF = 'https://media.base44.com/images/public/6a67e3522de5a7c8ffdb36c9/c8b731b38_motiondesigners2d_pindownio_1785203942.gif';
const SPLASH_DURATION = 3000;

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
        >
          <img
            src={SPLASH_GIF}
            alt="V.A.U.L.T"
            className="w-full h-full object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}