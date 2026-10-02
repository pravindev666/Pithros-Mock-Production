import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, MessageSquare, QrCode, Shield, Download, Lock, ExternalLink, Sparkles } from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { modalBackdropVariants, modalDialogVariants } from '../../lib/motion';
import { useQR } from '../../hooks/useQR';
import { DocumentSecurityBadge } from './DocumentSecurityBadge';

interface ShareModalProps {
  isOpen: boolean;
  memorial: Memorial;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  memorial,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'og_preview' | 'qr_plaque'>('share');
  const { memorialUrl, qrSvgUrl, svgContent, downloadQRAsSVG } = useQR(memorial.slug);

  if (!isOpen) return null;

  const isRestricted = memorial.privacy === 'private' || memorial.privacy === 'family';

  const handleCopy = () => {
    navigator.clipboard.writeText(memorialUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Remembering ${memorial.fullName} (${memorial.birthDate.slice(-4)} – ${memorial.deathDate.slice(-4)}). Read their enduring life story and offer a quiet remembrance:\n${memorialUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
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

        {/* Dialog Window */}
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
            <div>
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Remembrance Link & Archival Share
              </span>
              <h3
                className={`text-xl font-serif mt-0.5 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Share {memorial.fullName}
              </h3>
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

          {/* Mode Switcher Tabs */}
          <div
            className={`flex items-center gap-1.5 p-1 rounded-xl my-4 border ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'
            }`}
          >
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'share'
                  ? isDark
                    ? 'bg-[#202C40] text-[#F8F5EE] shadow-xs'
                    : 'bg-[#FCFAF5] text-[#20242A] shadow-xs'
                  : isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              Direct Share
            </button>
            <button
              onClick={() => setActiveTab('og_preview')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'og_preview'
                  ? isDark
                    ? 'bg-[#202C40] text-[#F8F5EE] shadow-xs'
                    : 'bg-[#FCFAF5] text-[#20242A] shadow-xs'
                  : isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              Social Preview
            </button>
            <button
              onClick={() => setActiveTab('qr_plaque')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'qr_plaque'
                  ? isDark
                    ? 'bg-[#202C40] text-[#F8F5EE] shadow-xs'
                    : 'bg-[#FCFAF5] text-[#20242A] shadow-xs'
                  : isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              Plaque QR Code
            </button>
          </div>

          {/* Restrictive Guard Banner */}
          {isRestricted && (
            <div
              className={`p-3 rounded-xl border text-xs mb-4 flex items-start gap-2.5 ${
                isDark
                  ? 'bg-[#1F1710] border-[#3B2C1A] text-[#B99452]'
                  : 'bg-[#FFF7E8] border-[#E8D09E] text-[#7A5210]'
              }`}
            >
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Restricted Memorial Access</span>
                <span className="text-[11px] opacity-90">
                  This memorial is set to <strong>{memorial.privacy}</strong>. Sensitive documents, confidential archival notes, and family records are never indexed or exposed publicly.
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: DIRECT SHARE */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Permanent Canonical URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={memorialUrl}
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono select-all focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6]'
                        : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A]'
                    }`}
                  />
                  <Button
                    variant={copied ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={handleCopy}
                    icon={copied ? Check : Copy}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleWhatsApp}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#D9D2C6] hover:border-[#2D7A5F]/50'
                      : 'border-[#E5DED2] bg-[#F3EEE4] text-[#554F48] hover:border-[#2D7A5F]/50 hover:bg-[#E5DED2]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-[#2D7A5F]" />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  onClick={() => setActiveTab('qr_plaque')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#D9D2C6] hover:border-[#B99452]/50'
                      : 'border-[#E5DED2] bg-[#F3EEE4] text-[#554F48] hover:border-[#23324A]/50 hover:bg-[#E5DED2]'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-[#23324A]" />
                  <span>Generate Physical Plaque QR</span>
                </button>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#2D7A5F]" />
                  <span className={isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}>
                    Audit Logging Active: External visits and access requests are monitored.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPENGRAPH PREVIEW */}
          {activeTab === 'og_preview' && (
            <div className="space-y-3.5">
              <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                When shared on WhatsApp, iMessage, LinkedIn, or social platforms, your memorial displays this dignified card:
              </p>

              {/* Social Card */}
              <div
                className={`rounded-2xl border overflow-hidden transition-colors shadow-lg ${
                  isDark ? 'border-[#2D3D56] bg-[#16120D]' : 'border-[#E5DED2] bg-[#FCFAF5]'
                }`}
              >
                <div className="relative h-44 w-full bg-stone-900 overflow-hidden">
                  <img
                    src={memorial.coverUrl || memorial.portraitUrl}
                    alt={memorial.fullName}
                    className="w-full h-full object-cover filter brightness-[0.78]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={memorial.portraitUrl}
                        alt={memorial.fullName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#B99452] shadow-md"
                      />
                      <div>
                        <h4 className="text-white font-serif text-base font-medium">
                          {memorial.fullName}
                        </h4>
                        <p className="text-white/80 text-[11px]">
                          {memorial.birthDate.slice(-4)} – {memorial.deathDate.slice(-4)}
                        </p>
                      </div>
                    </div>
                    {memorial.verificationStatus === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2D7A5F]/80 text-white border border-[#2D7A5F]">
                        ✓ Verified Memorial
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <p
                    className={`text-xs italic leading-relaxed line-clamp-2 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    “{memorial.shortEpitaph}”
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-inherit">
                    <span className="font-mono text-[#23324A]">pithros.org/m/{memorial.slug}</span>
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Permanent Sanctuary</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHYSICAL QR MEMORIAL PLAQUE */}
          {activeTab === 'qr_plaque' && (
            <div className="space-y-4">
              <div
                className={`p-5 rounded-2xl border text-center transition-colors shadow-md ${
                  isDark ? 'border-[#2D3D56] bg-[#16120D]' : 'border-[#E5DED2] bg-[#F3EEE4]'
                }`}
              >
                {/* Plaque Layout */}
                <div className="inline-block p-4 rounded-xl bg-white text-stone-900 shadow-sm border border-stone-200 mx-auto">
                  <div className="flex flex-col items-center justify-center">
                    {/* Authentic Vector QR Code */}
                    {svgContent ? (
                      <div
                        className="w-36 h-36 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                      />
                    ) : (
                      <img
                        src={qrSvgUrl}
                        alt={`QR Code for ${memorial.fullName}`}
                        className="w-36 h-36 object-contain"
                      />
                    )}

                    <div className="mt-2 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-mono text-stone-500">
                        Scan to remember
                      </p>
                      <p className="text-xs font-serif font-semibold text-stone-900 mt-0.5">
                        {memorial.fullName}
                      </p>
                    </div>
                  </div>
                </div>

                <p
                  className={`text-xs mt-3.5 max-w-xs mx-auto ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  This QR code resolves directly to <strong>/m/{memorial.slug}</strong>. Ready for engraving on granite gravestones, urn niches, prayer booklets, or wooden remembrance tablets.
                </p>

                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => downloadQRAsSVG(`pithros-qr-${memorial.slug}`)}
                    icon={Download}
                  >
                    Download Vector SVG (Print Ready)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
