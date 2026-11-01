import { useState, useEffect, useRef } from 'react';
import { useAppReady } from '@/lib/appReady';

// Animates a number from its previous value to the target (easeOutCubic).
// On first mount goes 0 → target; on later changes animates from the current value.
// Waits for the app "ready" signal (post-splash) before starting.
export default function useCountUp(target, duration = 1000, delay = 0) {
  const { ready } = useAppReady();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!ready) return;
    if (typeof target !== 'number' || isNaN(target)) return;
    const from = fromRef.current;
    const start = performance.now() + delay;
    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed < 0) { rafRef.current = requestAnimationFrame(tick); return; }
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, delay, ready]);

  return typeof target === 'number' ? display : target;
}