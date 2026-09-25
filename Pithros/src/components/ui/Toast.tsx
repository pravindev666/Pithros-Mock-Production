import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  showToast: (
    message: string,
    options?: {
      type?: 'success' | 'info' | 'warning';
      action?: { label: string; onClick: () => void };
      duration?: number;
    }
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useTheme();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options?: {
        type?: 'success' | 'info' | 'warning';
        action?: { label: string; onClick: () => void };
        duration?: number;
      }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newToast: ToastMessage = {
        id,
        message,
        type: options?.type || 'success',
        action: options?.action,
        duration: options?.duration || 4500,
      };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.duration);
      }
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md text-xs transition-colors ${
                isDark
                  ? 'bg-[#16120E]/95 border-[#202C40] text-[#F8F5EE]'
                  : 'bg-[#FCFAF5]/95 border-[#E5DED2] text-[#20242A]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                ) : toast.type === 'info' ? (
                  <Info className="w-4 h-4 text-sky-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#2D7A5F] flex-shrink-0" />
                )}
                <span className="font-medium leading-relaxed">{toast.message}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className={`font-semibold underline underline-offset-2 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      isDark ? 'text-[#B99452] hover:text-[#D1B477]' : 'text-[#23324A] hover:text-[#182337]'
                    }`}
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => dismissToast(toast.id)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-[#9EA3AA] hover:text-[#F8F5EE]' : 'text-[#7D766D] hover:text-[#20242A]'
                  }`}
                  aria-label="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside ToastProvider
    return {
      showToast: (msg: string) => console.log('[Toast]', msg),
      dismissToast: () => {},
    };
  }
  return context;
};
