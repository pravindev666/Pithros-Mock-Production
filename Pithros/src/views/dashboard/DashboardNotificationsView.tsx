import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  Calendar,
  Flame,
  Mail,
  Smartphone,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Memorial } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface DashboardNotificationsViewProps {
  memorial: Memorial;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'tribute' | 'anniversary' | 'contributor' | 'system';
}

export const DashboardNotificationsView: React.FC<DashboardNotificationsViewProps> = ({
  memorial,
}) => {
  const { isDark } = useTheme();

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'New Remembrance Offering',
      message: 'Meenakshi Sundaram left a Peaceful Dove tribute and condolence note.',
      time: '32 minutes ago',
      read: false,
      type: 'tribute',
    },
    {
      id: 'notif-2',
      title: 'Upcoming Death Anniversary Reminder',
      message: 'The 2nd remembrance anniversary of Dr. Arun Krishnan is approaching in 14 days.',
      time: 'Yesterday at 10:00 AM',
      read: false,
      type: 'anniversary',
    },
    {
      id: 'notif-3',
      title: 'Family Contributor Joined',
      message: 'Vikram Krishnan accepted the steward invitation and uploaded 3 historical photographs.',
      time: '3 days ago',
      read: true,
      type: 'contributor',
    },
    {
      id: 'notif-4',
      title: 'Verification Certificate Approved',
      message: 'Pithros Trust Officers approved the death certificate record for Dr. Arun Krishnan.',
      time: 'March 08, 2026',
      read: true,
      type: 'system',
    },
  ]);

  const [emailDigest, setEmailDigest] = useState('daily');
  const [notifyOnTributes, setNotifyOnTributes] = useState(true);
  const [notifyOnAnniversaries, setNotifyOnAnniversaries] = useState(true);
  const [savedSettings, setSavedSettings] = useState(false);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2500);
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
            Remembrance Notifications & Alerts
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage remembrance anniversaries, family contributions, and condolence dispatches.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={markAllRead}>
          Mark All as Read
        </Button>
      </div>

      {savedSettings && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Notification frequencies updated successfully.</span>
        </motion.div>
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
            <h2
              className={`text-sm font-medium ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Recent Sanctuary Activity
            </h2>
          </div>
          <span className="text-[11px] font-mono opacity-60">
            {notifications.filter((n) => !n.read).length} unread
          </span>
        </div>

        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <p
              className={`text-xs py-8 text-center ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              No new notifications.
            </p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                  !item.read
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
                      item.type === 'anniversary'
                        ? 'bg-amber-500/10 text-amber-400'
                        : item.type === 'tribute'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {item.type === 'anniversary' ? (
                      <Calendar className="w-4 h-4" />
                    ) : item.type === 'tribute' ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`font-medium ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 leading-relaxed ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      {item.message}
                    </p>
                    <span
                      className={`text-[10px] mt-1 block font-mono ${
                        isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'
                      }`}
                    >
                      {item.time}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteNotification(item.id)}
                  className="text-stone-400 hover:text-red-400 p-1 rounded transition-colors"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <form
        onSubmit={handleSaveSettings}
        className={`p-5 rounded-2xl border space-y-5 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <h2
          className={`text-sm font-medium ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Delivery Channels & Frequency
        </h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnAnniversaries}
              onChange={(e) => setNotifyOnAnniversaries(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
            />
            <span
              className={`text-xs ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Send annual death anniversary & birth centenary reminders (14 days and 2 days prior)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnTributes}
              onChange={(e) => setNotifyOnTributes(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
            />
            <span
              className={`text-xs ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Notify steward when a new condolence note or tribute is submitted
            </span>
          </label>

          <div className="pt-2">
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Email Summary Frequency
            </label>
            <select
              value={emailDigest}
              onChange={(e) => setEmailDigest(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                  : 'border-[#E5DED2] bg-white text-[#20242A]'
              }`}
            >
              <option value="instant">Instant notifications (as events occur)</option>
              <option value="daily">Daily evening digest</option>
              <option value="weekly">Weekly remembrance digest</option>
              <option value="milestones_only">Important milestones & anniversaries only</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="sm">
            Save Notification Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
