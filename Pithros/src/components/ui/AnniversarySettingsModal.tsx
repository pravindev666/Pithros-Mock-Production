import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Bell, Mail, Phone, CheckCircle2, ShieldCheck, Moon } from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { modalBackdropVariants, modalDialogVariants } from '../../lib/motion';
import { Memorial } from '../../types';
import { useAnniversaries } from '../../hooks/useAnniversaries';

interface AnniversarySettingsModalProps {
  isOpen: boolean;
  memorial: Memorial;
  onClose: () => void;
}

export const AnniversarySettingsModal: React.FC<AnniversarySettingsModalProps> = ({
  isOpen,
  memorial,
  onClose,
}) => {
  const { isDark } = useTheme();
  const { settings, isSaving, updateSettings, toggleOptOut } = useAnniversaries(memorial.id);

  const [birthdayEnabled, setBirthdayEnabled] = useState(true);
  const [deathAnniversaryEnabled, setDeathAnniversaryEnabled] = useState(true);
  const [memorialCreationEnabled, setMemorialCreationEnabled] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (settings) {
      setBirthdayEnabled(settings.birthday);
      setDeathAnniversaryEnabled(settings.deathAnniversary);
      setMemorialCreationEnabled(settings.memorialCreation);
      setCustomDate(settings.customDate || '');
      setCustomLabel(settings.customDateLabel || '');
      setEmailEnabled(settings.channels.email);
      setWhatsappEnabled(settings.channels.whatsapp);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      birthday: birthdayEnabled,
      deathAnniversary: deathAnniversaryEnabled,
      memorialCreation: memorialCreationEnabled,
      customDate: customDate || undefined,
      customDateLabel: customLabel || undefined,
      channels: {
        email: emailEnabled,
        whatsapp: whatsappEnabled,
        push: false,
      },
    });
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          className={`fixed inset-0 backdrop-blur-sm ${
            isDark ? 'bg-[#111820]/85' : 'bg-[#20242A]/40'
          }`}
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
        />

        <motion.div
          className={`relative z-10 w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-colors my-6 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
          variants={modalDialogVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Header */}
          <div
            className={`flex items-start justify-between pb-3.5 border-b ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isDark ? 'bg-[#B99452]/10 text-[#B99452]' : 'bg-[#23324A]/10 text-[#23324A]'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={`text-lg font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Remembrance Anniversaries & Milestones
                </h3>
                <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  Gentle, dignified reminders for family prayer days and quiet reflection.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSavedNotice ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2
                className={`w-12 h-12 mx-auto ${
                  isDark ? 'text-[#2D7A5F]' : 'text-[#397A5E]'
                }`}
              />
              <h4
                className={`text-lg font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Preferences Quietly Preserved
              </h4>
              <p
                className={`text-xs ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Your family notification preferences have been saved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-5">
              {/* Opt-Out Master Switch */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  settings?.isOptedOut
                    ? isDark
                      ? 'bg-[#182337] border-[#2D3D56]'
                      : 'bg-[#E5DED2] border-[#E5DED2]'
                    : isDark
                    ? 'bg-[#182337]/60 border-[#202C40]'
                    : 'bg-[#E5DED2] border-[#E8DCC8]'
                }`}
              >
                <div className="space-y-0.5 pr-3">
                  <span
                    className={`text-xs font-semibold block ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Mute All Remembrance Reminders
                  </span>
                  <span
                    className={`text-[11px] leading-relaxed block ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Family opt-out: Pause all email and message notifications unconditionally.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleOptOut}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                    settings?.isOptedOut
                      ? 'bg-[#2D7A5F] text-white border-[#2D7A5F]'
                      : isDark
                      ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                      : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                  }`}
                >
                  {settings?.isOptedOut ? 'Unmute' : 'Mute All'}
                </button>
              </div>

              {!settings?.isOptedOut && (
                <>
                  {/* Milestones selection */}
                  <div className="space-y-2.5">
                    <label
                      className={`block text-xs font-medium uppercase tracking-wider ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      Remembrance Dates
                    </label>

                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer border-inherit hover:opacity-90">
                        <input
                          type="checkbox"
                          checked={deathAnniversaryEnabled}
                          onChange={(e) => setDeathAnniversaryEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#23324A] rounded"
                        />
                        <div className="flex-1 text-xs">
                          <span className={`font-medium block ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                            Passing Day Anniversary ({memorial.deathDate})
                          </span>
                          <span className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                            Annual remembrance light and family prayer notification.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer border-inherit hover:opacity-90">
                        <input
                          type="checkbox"
                          checked={birthdayEnabled}
                          onChange={(e) => setBirthdayEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#23324A] rounded"
                        />
                        <div className="flex-1 text-xs">
                          <span className={`font-medium block ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                            Birth Centenary / Birthday ({memorial.birthDate})
                          </span>
                          <span className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                            Celebrating their life and entry into this world.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer border-inherit hover:opacity-90">
                        <input
                          type="checkbox"
                          checked={memorialCreationEnabled}
                          onChange={(e) => setMemorialCreationEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#23324A] rounded"
                        />
                        <div className="flex-1 text-xs">
                          <span className={`font-medium block ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                            Sanctuary Creation Anniversary
                          </span>
                          <span className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                            Annual renewal of family archives and photos.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Custom Date Addition */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label
                        className={`block text-xs font-medium mb-1 ${
                          isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                        }`}
                      >
                        Custom Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                          isDark
                            ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                            : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-medium mb-1 ${
                          isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                        }`}
                      >
                        Custom Label
                      </label>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g. Shraddha, Chautha, Memorial Mass"
                        className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                          isDark
                            ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                            : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Notification Channels */}
                  <div className="space-y-2 pt-2 border-t border-inherit">
                    <label
                      className={`block text-xs font-medium uppercase tracking-wider ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      Quiet Delivery Channels
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer border-inherit">
                        <input
                          type="checkbox"
                          checked={emailEnabled}
                          onChange={(e) => setEmailEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#23324A] rounded"
                        />
                        <Mail className="w-4 h-4 text-[#23324A]" />
                        <span className={`text-xs ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                          Email Letter
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer border-inherit">
                        <input
                          type="checkbox"
                          checked={whatsappEnabled}
                          onChange={(e) => setWhatsappEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#23324A] rounded"
                        />
                        <Phone className="w-4 h-4 text-[#2D7A5F]" />
                        <span className={`text-xs ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                          WhatsApp Message
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-inherit">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSaving}
                  icon={Bell}
                >
                  {isSaving ? 'Saving...' : 'Save Remembrance Schedule'}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
