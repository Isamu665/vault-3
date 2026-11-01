import React, { useRef, useEffect } from 'react';
import { motion, useInView, useAnimationControls } from 'framer-motion';
import { useAppReady } from '@/lib/appReady';

// Professional chart entrance: rises into view with an "easeOutExpo"-like curve
// when scrolled into the viewport. Feels weighty and deliberate, not abrupt.
// Held in its initial state until the app is "ready" (post-splash) so it never
// plays hidden behind the splash overlay.
const EASE = [0.22, 1, 0.36, 1];

export default function ChartReveal({ children, delay = 0, className }) {
  const { ready } = useAppReady();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const controls = useAnimationControls();

  useEffect(() => {
    if (ready && inView) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [ready, inView, controls]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={controls}
      transition={{ duration: 0.65, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}