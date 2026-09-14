import type { Transition, Variants } from 'framer-motion';

// Shared motion presets. Import these instead of inlining durations and springs so the
// whole app moves with one personality. Reduced motion is handled by <MotionConfig
// reducedMotion="user"> in src/app/page.tsx.

export const ease = { outExpo: [0.16, 1, 0.3, 1] as const };

// Critically damped-ish springs: they arrive fast and settle without a slow tail.
export const spring = {
  soft: { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 } satisfies Transition,
  snappy: { type: 'spring', stiffness: 620, damping: 42 } satisfies Transition,
  bouncy: { type: 'spring', stiffness: 460, damping: 24 } satisfies Transition
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: ease.outExpo } }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring.soft },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.14 } }
};

export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } }
});

export const slideInRight: Variants = {
  hidden: { x: '105%' },
  show: { x: 0, transition: spring.soft },
  exit: { x: '105%', transition: { duration: 0.22, ease: ease.outExpo } }
};

export const slideInLeft: Variants = {
  hidden: { x: '-105%' },
  show: { x: 0, transition: spring.soft },
  exit: { x: '-105%', transition: { duration: 0.22, ease: ease.outExpo } }
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } }
};
