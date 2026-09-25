import React from 'react';
import {
  motion,
  Transition,
  Variants,
  useReducedMotion,
  AnimatePresence,
} from 'motion/react';

/**
 * Pithros Motion Grammar & Single Source of Truth
 * 
 * Philosophy: Quiet, slow, soft, cinematic, organic, premium.
 * Motion should be felt, not noticed.
 * 
 * Strict Timing System:
 * - Micro: 150ms - 220ms (0.15s - 0.22s) -> Buttons, icons, chips, tooltips, small state changes
 * - Standard: 250ms - 400ms (0.25s - 0.40s) -> Cards, dialogs, drawers, tabs, dropdowns, list items
 * - Emotional: 500ms - 900ms (0.50s - 0.90s) -> Hero reveals, memorial portraits, timeline, constellation
 * - Ambient: 2s - 30s -> Starfield, orbits, subtle glows, slow background motion
 * - Page Enter Transitions: 450ms - 650ms (0.45s - 0.65s) -> Opacity & subtle vertical offset
 */

export const MOTION_TIMING = {
  // Micro interactions (150ms - 220ms)
  microFast: 0.15,
  micro: 0.18,
  microSlow: 0.22,

  // Standard component transitions (250ms - 400ms)
  standardFast: 0.26,
  standard: 0.32,
  standardSlow: 0.38,

  // Emotional & ritual animations (500ms - 900ms)
  emotionalFast: 0.52,
  emotional: 0.65,
  emotionalSlow: 0.85,

  // Ambient animations (2s - 30s)
  ambientFast: 3.5,
  ambient: 8.0,
  ambientSlow: 24.0,

  // Page Enter / Exit transitions
  pageEnter: 0.5,
  pageExit: 0.22,
} as const;

export const MOTION_EASING = {
  // Pure easeOut deceleration for organic, dignified feeling
  easeOut: 'easeOut' as const,
  // Cubic bezier for cinematic curve
  cinematicEaseOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  gentleEaseOut: [0.25, 1, 0.5, 1] as [number, number, number, number],
} as const;

// Transition presets
export const microTransition: Transition = {
  duration: MOTION_TIMING.micro,
  ease: MOTION_EASING.easeOut,
};

export const standardTransition: Transition = {
  duration: MOTION_TIMING.standard,
  ease: MOTION_EASING.easeOut,
};

export const emotionalTransition: Transition = {
  duration: MOTION_TIMING.emotional,
  ease: MOTION_EASING.easeOut,
};

export const pageEnterTransition: Transition = {
  duration: MOTION_TIMING.pageEnter,
  ease: MOTION_EASING.cinematicEaseOut,
};

// Reusable Framer Motion Variants
export const pageEnterVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: pageEnterTransition,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: MOTION_TIMING.pageExit,
      ease: MOTION_EASING.easeOut,
    },
  },
};

export const cardEnterVariants: Variants = {
  initial: {
    opacity: 0,
    y: 14,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: standardTransition,
  },
};

export const fadeInVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: standardTransition,
  },
  exit: {
    opacity: 0,
    transition: microTransition,
  },
};

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: standardTransition,
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: MOTION_EASING.easeOut },
  },
};

export const modalDialogVariants: Variants = {
  initial: {
    opacity: 0,
    y: 14,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: standardTransition,
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.985,
    transition: {
      duration: MOTION_TIMING.microSlow,
      ease: MOTION_EASING.easeOut,
    },
  },
};

export const drawerVariants: Variants = {
  initialRight: {
    x: '100%',
    opacity: 0.5,
  },
  animateRight: {
    x: 0,
    opacity: 1,
    transition: {
      duration: MOTION_TIMING.standardSlow,
      ease: MOTION_EASING.cinematicEaseOut,
    },
  },
  exitRight: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: MOTION_TIMING.standardFast,
      ease: MOTION_EASING.easeOut,
    },
  },
};

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 14,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: standardTransition,
  },
};

export const emotionalRevealVariants: Variants = {
  initial: {
    opacity: 0,
    y: 18,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: emotionalTransition,
  },
};

export const cardHoverMotion = {
  whileHover: {
    y: -3,
    transition: { duration: MOTION_TIMING.microSlow, ease: MOTION_EASING.easeOut },
  },
};

export const wizardStepVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: MOTION_TIMING.standard,
      ease: MOTION_EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: MOTION_TIMING.microSlow,
      ease: MOTION_EASING.easeOut,
    },
  },
};

export const microHoverTap = {
  whileHover: {
    scale: 1.015,
    transition: microTransition,
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut },
  },
};

// =========================================================================
// REUSABLE MOTION PRIMITIVES
// =========================================================================

/**
 * 1. Reveal Primitive
 * Scroll-triggered or mount-triggered reveal with respect for prefers-reduced-motion.
 */
interface RevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  delay?: number;
  duration?: number;
  className?: string;
  whileInView?: boolean;
  once?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  direction = 'up',
  distance = 20,
  delay = 0,
  duration = MOTION_TIMING.emotional,
  className = '',
  whileInView = true,
  once = true,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const getOffset = () => {
    if (shouldReduceMotion || direction === 'none') return { x: 0, y: 0 };
    switch (direction) {
      case 'up':
        return { x: 0, y: distance };
      case 'down':
        return { x: 0, y: -distance };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getOffset();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: offset.x,
      y: offset.y,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : duration,
        delay,
        ease: MOTION_EASING.cinematicEaseOut,
      },
    },
  };

  if (whileInView) {
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: '-40px' }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 2. RevealGroup & Stagger Primitives
 * Orchestrates sequential reveal of multiple child items.
 */
interface RevealGroupProps {
  children: React.ReactNode;
  stagger?: number;
  delayChildren?: number;
  className?: string;
  whileInView?: boolean;
  once?: boolean;
}

export const RevealGroup: React.FC<RevealGroupProps> = ({
  children,
  stagger = 0.08,
  delayChildren = 0.04,
  className = '',
  whileInView = true,
  once = true,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : stagger,
        delayChildren: shouldReduceMotion ? 0 : delayChildren,
      },
    },
  };

  if (whileInView) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: '-40px' }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const Stagger = RevealGroup;

/**
 * 3. FadeIn Primitive
 * Clean opacity entrance/exit without positional shifting.
 */
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = MOTION_TIMING.standard,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay, ease: MOTION_EASING.easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 4. SlideUp Primitive
 * Subtle upward glide with smooth deceleration.
 */
interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export const SlideUp: React.FC<SlideUpProps> = ({
  children,
  delay = 0,
  duration = MOTION_TIMING.standard,
  distance = 14,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : distance }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -distance / 2 }}
      transition={{ duration, delay, ease: MOTION_EASING.cinematicEaseOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 5. ScaleReveal Primitive
 * Soft scale (0.97 -> 1.0) and opacity for portraits, cards, and modal dialogs.
 */
interface ScaleRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const ScaleReveal: React.FC<ScaleRevealProps> = ({
  children,
  delay = 0,
  duration = MOTION_TIMING.emotional,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
      transition={{ duration, delay, ease: MOTION_EASING.cinematicEaseOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 6. ImageReveal Primitive
 * Archival image crossfade with gentle scale-down from 1.04 to 1.0.
 */
interface ImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export const ImageReveal: React.FC<ImageRevealProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`overflow-hidden ${containerClassName}`}>
      <motion.img
        src={src}
        alt={alt}
        className={className}
        initial={{
          opacity: 0,
          scale: shouldReduceMotion ? 1 : 1.04,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: shouldReduceMotion ? 0.3 : MOTION_TIMING.emotional,
          ease: MOTION_EASING.cinematicEaseOut,
        }}
      />
    </div>
  );
};

/**
 * 7. ModalTransition Primitive
 * Backdrop and dialog scale/fade wrapper with AnimatePresence.
 */
interface ModalTransitionProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            variants={modalDialogVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative z-10 ${className}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * 8. DrawerTransition Primitive
 * Smooth sliding drawer from right with backdrop.
 */
interface DrawerTransitionProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const DrawerTransition: React.FC<DrawerTransitionProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <motion.div
              variants={drawerVariants}
              initial="initialRight"
              animate="animateRight"
              exit="exitRight"
              className={`relative w-screen max-w-md ${className}`}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * 9. PageTransition Primitive
 * Strict boundary wrapper for route level view changes.
 */
export const PageTransition: React.FC<{
  children: React.ReactNode;
  className?: string;
  routeKey?: string;
}> = ({ children, className = '', routeKey }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      key={routeKey}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{
        duration: shouldReduceMotion ? 0.2 : MOTION_TIMING.pageEnter,
        ease: MOTION_EASING.cinematicEaseOut,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
