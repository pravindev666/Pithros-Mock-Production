import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Bell, CheckCircle2, Flame, Lock, RefreshCw } from 'lucide-react';
import { Memorial } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import {
  notificationsApi,
  relativeTime,
  type AppNotification,
} from '../../services/api/notifications';

interface DashboardNotificationsViewProps {
  memorial: Memorial;
}

const iconFor = (type: string) => {
  if (type === 'tribute_pending') return Flame;
  if (type.startsWith('account_deletion')) return Lock;
  if (type.startsWith('verification')) return CheckCircle2;
  return Bell;
};

export const DashboardNotificationsView: React.FC<DashboardNotificationsViewProps> = () => {
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await notificationsApi.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The notification could not be marked read.');
    }
  };

  const handleMarkAll = async () => {
    setError(null);
    try {
      await notificationsApi.markAllRead();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notifications could not be updated.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Notifications
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
            Verification decisions, family activity, and stewardship updates — in one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} icon={RefreshCw} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={unreadCount === 0}>
            Mark All as Read
          </Button>
        </div>
      </div>

      {error && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
            isDark ? 'bg-[#3A1414] border-[#7F1D1D] text-[#FCA5A5]' : 'bg-[#FEF2F2] border-[#F87171] text-[#991B1B]'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications Inbox */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h2 className={`text-sm font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
              Your Activity
            </h2>
          </div>
          <span className="text-[11px] font-mono opacity-60">{unreadCount} unread</span>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Loading notifications…
            </p>
          ) : notifications.length === 0 ? (
            <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Nothing new yet. Verification decisions, tributes, and family activity will appear
              here.
            </p>
          ) : (
            notifications.map((item) => {
              const Icon = iconFor(item.type);
              const isUnread = item.readAt === null;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                    isUnread
                      ? isDark
                        ? 'border-[#B99452]/30 bg-[#1A150F]'
                        : 'border-[#23324A]/30 bg-[#FBF6ED]'
                      : isDark
                        ? 'border-[#202C40] bg-[#16120D]'
                        : 'border-[#E5DED2] bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${
                        item.type.startsWith('verification')
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : item.type === 'tribute_pending'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                        {item.title}
                      </h3>
                      <p
                        className={`text-[11px] mt-0.5 leading-relaxed ${
                          isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                        }`}
                      >
                        {item.body}
                      </p>
                      <span
                        className={`text-[10px] mt-1 block font-mono ${
                          isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'
                        }`}
                      >
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-colors whitespace-nowrap ${
                        isDark
                          ? 'border-[#B99452]/30 text-[#B99452] hover:bg-[#B99452]/10'
                          : 'border-[#23324A]/30 text-[#23324A] hover:bg-[#23324A]/10'
                      }`}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delivery — honest status */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 rounded-2xl border space-y-2 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <h2 className={`text-sm font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
          Delivery
        </h2>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
          Notifications appear here in your dashboard. Email and SMS delivery are not available
          yet — when they arrive, these same events will also reach your inbox. The record always
          stays here.
        </p>
      </motion.div>
    </div>
  );
};
