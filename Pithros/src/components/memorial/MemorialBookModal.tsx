import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Heart,
  FileText,
  CreditCard,
  Image as ImageIcon,
  Shield,
  Download,
} from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface MemorialBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorial?: Partial<Memorial>;
  initialAsset?: 'book' | 'card' | 'poster' | 'qr_card' | 'plaque' | 'tributes';
}

export const MemorialBookModal: React.FC<MemorialBookModalProps> = ({
  isOpen,
  onClose,
  memorial,
  initialAsset = 'book',
}) => {
  const { isDark } = useTheme();
  const [selectedAsset, setSelectedAsset] = useState<
    'book' | 'card' | 'poster' | 'qr_card' | 'plaque' | 'tributes'
  >(initialAsset);
  const [currentPage, setCurrentPage] = useState(0);

  // Safe fallback data
  const name = memorial?.fullName || 'Beloved Life';
  const dates = memorial?.birthDate && memorial?.deathDate
    ? `${memorial.birthDate} — ${memorial.deathDate}`
    : '1948 — 2026';
  const epitaph = memorial?.shortEpitaph || 'A life lived with gentle brilliance, steadfast kindness, and quiet wisdom.';
  const overview = memorial?.story?.overview || 'A life remembered not only for accomplishments, but for the warmth, humor, and dignity shared with everyone who crossed their path.';
  const earlyLife = memorial?.story?.earlyLife || 'Growing up surrounded by ancestral lands and patient elders, developing an early appreciation for literature, nature, and community.';
  const enduringLegacy = memorial?.story?.enduringLegacy || 'Their teachings, moral integrity, and unwavering support continue to echo through children, students, and lifelong friends.';
  const restingPlace = memorial?.restingPlace || memorial?.birthPlace || 'Ancestral Sanctuary';
  const portraitUrl = memorial?.portraitUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';

  const milestones = memorial?.timeline && memorial.timeline.length > 0
    ? memorial.timeline
    : [
        { id: '1', year: '1948', title: 'The Beginnings', description: 'Born to a family of teachers and cultivators, fostering an enduring love for community and books.' },
        { id: '2', year: '1975', title: 'A Lifelong Bond', description: 'Marriage and beginning a shared journey of mutual devotion, raising a family grounded in kindness.' },
        { id: '3', year: '1998', title: 'Life’s Dedication', description: 'Dedicated decades to mentoring students and recording oral histories of local villages.' },
        { id: '4', year: '2026', title: 'Enduring Legacy', description: 'Remembered with deep gratitude by children, grandchildren, colleagues, and friends across generations.' },
      ];

  const familyList = memorial?.family && memorial.family.length > 0
    ? memorial.family
    : [
        { id: '1', name: 'Sarada Devi', relationship: 'Spouse & Companion', role: 'steward' as const },
        { id: '2', name: 'Dr. Anand', relationship: 'Son', role: 'biographer' as const },
        { id: '3', name: 'Maya', relationship: 'Daughter', role: 'archivist' as const },
        { id: '4', name: 'Kavya & Rohan', relationship: 'Grandchildren', role: 'contributor' as const },
      ];

  const tributesList = memorial?.tributes && memorial.tributes.length > 0
    ? memorial.tributes
    : [
        { id: '1', authorName: 'Prof. Ramachandran', relationship: 'Colleague & Friend', message: 'A steadfast friend whose patience and gentle humor illuminated every committee room and classroom.', date: '2026', isApproved: true },
        { id: '2', authorName: 'Meera Iyer', relationship: 'Former Student', message: 'The standard against which I measure every mentor. Thank you for believing in me when I did not.', date: '2026', isApproved: true },
      ];

  const handlePrint = () => {
    window.print();
  };

  const bookPages = [
    { id: 'cover', title: 'Cover' },
    { id: 'story', title: 'Life Story' },
    { id: 'timeline', title: 'Chronicle' },
    { id: 'family', title: 'Kinship' },
    { id: 'tributes', title: 'Condolences' },
    { id: 'plaque', title: 'QR Plaque' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:static print:overflow-visible">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={`fixed inset-0 backdrop-blur-md print:hidden ${isDark ? 'bg-black/85' : 'bg-black/60'}`}
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.cinematicEaseOut }}
        className={`relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none ${
          isDark
            ? 'bg-[#0E0C09] border-[#202C40] text-[#F8F5EE]'
            : 'bg-[#FAF6EF] border-[#E5DED2] text-[#20242A]'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b print:hidden ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#EAE2D5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
            <div>
              <h2 className="text-sm font-serif font-semibold">Memorial Keepsake Pack</h2>
              <p className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                Print-ready family keepsakes, memorial books, cards, and grave plaques
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint}>
              Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A] hover:bg-[#EAE2D5]'
              }`}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Keepsake Asset Switcher Bar */}
        <div
          className={`flex items-center gap-1 sm:gap-2 px-6 py-2.5 border-b text-xs overflow-x-auto print:hidden ${
            isDark ? 'border-[#182337] bg-[#111820]' : 'border-[#EAE2D5] bg-[#F3EEE4]'
          }`}
        >
          {[
            { id: 'book', label: '1. Memorial Book', icon: BookOpen },
            { id: 'card', label: '2. Remembrance Card', icon: CreditCard },
            { id: 'poster', label: '3. A4 Poster', icon: ImageIcon },
            { id: 'qr_card', label: '4. QR Memorial Card', icon: QrCode },
            { id: 'plaque', label: '5. QR Plaque Sheet', icon: Shield },
            { id: 'tributes', label: '6. Tribute Book', icon: Heart },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = selectedAsset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAsset(item.id as any)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[#182337] text-[#B99452] font-semibold border border-[#B99452]/40 shadow-xs'
                      : 'bg-[#FCFAF5] text-[#23324A] font-semibold border border-[#23324A]/30 shadow-xs'
                    : isDark
                    ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                    : 'text-[#7D766D] hover:text-[#20242A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* If Memorial Book is selected, show page selector tabs */}
        {selectedAsset === 'book' && (
          <div
            className={`flex items-center justify-between px-6 py-2 border-b text-xs overflow-x-auto print:hidden ${
              isDark ? 'border-[#182337] bg-[#141B2D]' : 'border-[#EAE2D5] bg-[#EFE8DC]'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              {bookPages.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCurrentPage(idx)}
                  className={`px-3 py-1 rounded-lg font-serif transition-colors cursor-pointer ${
                    currentPage === idx
                      ? isDark
                        ? 'bg-[#182337] text-[#B99452] font-medium'
                        : 'bg-[#FCFAF5] text-[#23324A] font-medium shadow-xs'
                      : isDark
                      ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                      : 'text-[#7D766D] hover:text-[#20242A]'
                  }`}
                >
                  {idx + 1}. {p.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 pl-4">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-md disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] opacity-70">
                {currentPage + 1} / {bookPages.length}
              </span>
              <button
                disabled={currentPage === bookPages.length - 1}
                onClick={() => setCurrentPage((prev) => Math.min(bookPages.length - 1, prev + 1))}
                className="p-1 rounded-md disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Content */}
        <div className="p-6 sm:p-10 md:p-12 overflow-y-auto flex-1 font-serif print:p-0 print:overflow-visible">
          {/* ASSET 1: MEMORIAL BOOK */}
          {selectedAsset === 'book' && (
            <div className="space-y-12">
              {/* PAGE 1: COVER */}
              {(currentPage === 0 || typeof window !== 'undefined') && (
                <div className={`page-cover ${currentPage !== 0 ? 'hidden print:block print:break-after-page' : ''}`}>
                  <div className="min-h-[500px] flex flex-col justify-between items-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-[#23324A]/30 bg-gradient-to-b from-transparent via-[#B99452]/5 to-transparent">
                    <div className="space-y-2">
                      <span className="text-[11px] tracking-[0.3em] uppercase font-sans font-medium text-[#23324A]">
                        PITHROS MEMORIAL ARCHIVE
                      </span>
                      <div className="w-12 h-px bg-[#23324A]/40 mx-auto mt-2" />
                    </div>

                    <div className="space-y-4 max-w-xl py-12">
                      <span className="text-xs uppercase tracking-[0.25em] font-sans opacity-70">
                        IN CELEBRATION OF A CHERISHED LIFE
                      </span>
                      <h1 className="text-4xl sm:text-5xl font-serif tracking-tight leading-tight">
                        {name}
                      </h1>
                      <p className="text-sm font-sans tracking-[0.2em] uppercase font-medium text-[#23324A]">
                        {dates}
                      </p>
                      <p className="text-sm italic max-w-md mx-auto opacity-80 pt-4 leading-relaxed font-editorial">
                        “{epitaph}”
                      </p>
                    </div>

                    <div className="space-y-2 text-xs font-sans opacity-70">
                      <p>Resting in {restingPlace}</p>
                      <p className="text-[10px] tracking-widest uppercase">Permanent Digital Archive • Pithros</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 2: LIFE STORY */}
              {(currentPage === 1 || typeof window !== 'undefined') && (
                <div className={`page-story ${currentPage !== 1 ? 'hidden print:block print:break-after-page' : ''}`}>
                  <div className="max-w-2xl mx-auto space-y-8 py-4">
                    <div className="border-b pb-4 text-center">
                      <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                        BIOGRAPHICAL MEMOIR
                      </span>
                      <h2 className="text-2xl font-serif mt-1">The Story of {name}</h2>
                    </div>

                    <div className="space-y-6 text-sm leading-relaxed font-sans text-justify">
                      <div>
                        <h3 className="text-xs font-serif font-semibold uppercase tracking-wider mb-2 text-[#23324A]">
                          Life Overview
                        </h3>
                        <p className="opacity-90">{overview}</p>
                      </div>

                      <div>
                        <h3 className="text-xs font-serif font-semibold uppercase tracking-wider mb-2 text-[#23324A]">
                          Early Beginnings & Origins
                        </h3>
                        <p className="opacity-90">{earlyLife}</p>
                      </div>

                      <div>
                        <h3 className="text-xs font-serif font-semibold uppercase tracking-wider mb-2 text-[#23324A]">
                          Passions & Enduring Legacy
                        </h3>
                        <p className="opacity-90">{enduringLegacy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: CHRONICLE / TIMELINE */}
              {(currentPage === 2 || typeof window !== 'undefined') && (
                <div className={`page-timeline ${currentPage !== 2 ? 'hidden print:block print:break-after-page' : ''}`}>
                  <div className="max-w-2xl mx-auto space-y-6 py-4">
                    <div className="border-b pb-4 text-center">
                      <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                        LIFE CHRONICLE
                      </span>
                      <h2 className="text-2xl font-serif mt-1">Milestones & Footprints</h2>
                    </div>

                    <div className="space-y-6 font-sans">
                      {milestones.map((m) => (
                        <div key={m.id} className="flex gap-4 border-l-2 border-[#23324A]/20 pl-4 py-1">
                          <span className="font-mono text-xs font-semibold text-[#23324A] whitespace-nowrap">
                            {m.year}
                          </span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-serif font-semibold text-base">{m.title}</h4>
                            <p className="text-xs opacity-80 leading-relaxed">{m.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: KINSHIP */}
              {(currentPage === 3 || typeof window !== 'undefined') && (
                <div className={`page-family ${currentPage !== 3 ? 'hidden print:block print:break-after-page' : ''}`}>
                  <div className="max-w-2xl mx-auto space-y-6 py-4">
                    <div className="border-b pb-4 text-center">
                      <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                        KINSHIP & CIRCLE
                      </span>
                      <h2 className="text-2xl font-serif mt-1">Remembered by Family</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-sans text-xs">
                      {familyList.map((f) => (
                        <div key={f.id} className="p-4 rounded-xl border border-[#23324A]/20 bg-[#FCFAF5]/50">
                          <h4 className="font-serif font-semibold text-sm">{f.name}</h4>
                          <span className="opacity-70">{f.relationship}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 5: TRIBUTES */}
              {(currentPage === 4 || typeof window !== 'undefined') && (
                <div className={`page-tributes ${currentPage !== 4 ? 'hidden print:block print:break-after-page' : ''}`}>
                  <div className="max-w-2xl mx-auto space-y-6 py-4">
                    <div className="border-b pb-4 text-center">
                      <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                        WORDS OF REMEMBRANCE
                      </span>
                      <h2 className="text-2xl font-serif mt-1">Condolences & Reflections</h2>
                    </div>

                    <div className="space-y-4 font-sans">
                      {tributesList.map((t) => (
                        <div key={t.id} className="p-4 rounded-xl border border-[#23324A]/20 bg-[#FCFAF5]/50 space-y-2">
                          <p className="text-xs italic leading-relaxed">“{t.message}”</p>
                          <div className="flex items-center justify-between text-[10px] opacity-70">
                            <span className="font-semibold">{t.authorName}</span>
                            <span>{t.relationship}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 6: QR MEMORIAL PLAQUE */}
              {(currentPage === 5 || typeof window !== 'undefined') && (
                <div className={`page-plaque ${currentPage !== 5 ? 'hidden print:block print:break-after-page' : ''}`}>
                  <div className="max-w-md mx-auto text-center p-8 rounded-2xl border-2 border-[#23324A] space-y-6">
                    <div className="space-y-1">
                      <span className="text-[10px] tracking-widest uppercase font-sans text-[#23324A]">
                        PERMANENT MEMORIAL SANCTUARY
                      </span>
                      <h3 className="text-2xl font-serif">{name}</h3>
                      <p className="text-xs font-mono opacity-80">{dates}</p>
                    </div>

                    {/* QR Code Container */}
                    <div className="w-44 h-44 mx-auto p-3 rounded-2xl bg-white border border-[#23324A]/20 shadow-xs flex flex-col items-center justify-center">
                      <QrCode className="w-36 h-36 text-black" />
                    </div>

                    <div className="space-y-2 text-xs font-sans opacity-80">
                      <p className="font-serif font-semibold">Scan with any smartphone camera</p>
                      <p className="text-[11px] leading-relaxed">
                        To access oral histories, photograph archives, and leave condolences in this permanent memorial.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ASSET 2: REMEMBRANCE CARD (Wallet / Pocket Card) */}
          {selectedAsset === 'card' && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-8 rounded-2xl border-2 border-[#B99452] bg-[#16120E] text-[#F8F5EE] shadow-xl text-center space-y-4">
                <span className="text-[9px] tracking-[0.3em] uppercase font-mono text-[#B99452]">
                  IN REMEMBRANCE
                </span>
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#B99452] shadow-md">
                  <img src={portraitUrl} alt={name} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-serif">{name}</h3>
                  <p className="text-xs font-mono text-[#D9D2C6]/80">{dates}</p>
                </div>
                <p className="text-xs italic text-[#B99452] max-w-xs mx-auto leading-relaxed">
                  “{epitaph}”
                </p>
                <div className="pt-2 border-t border-[#B99452]/20 flex items-center justify-between text-[10px] text-[#9EA3AA]">
                  <span>PITHROS ARCHIVE</span>
                  <span>SCAN TO REMEMBER</span>
                </div>
              </div>
              <p className="text-center text-xs opacity-70">
                Wallet-sized 3.5” x 2” memorial card for distribution at memorial services.
              </p>
            </div>
          )}

          {/* ASSET 3: A4 MEMORIAL POSTER */}
          {selectedAsset === 'poster' && (
            <div className="max-w-xl mx-auto p-10 rounded-2xl border-4 border-[#23324A] bg-[#FCFAF5] text-[#20242A] shadow-2xl text-center space-y-6">
              <span className="text-xs tracking-[0.35em] uppercase font-mono text-[#23324A] font-semibold">
                IN HONOR OF A LIFE CHERISHED
              </span>
              <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-[#23324A] shadow-lg">
                <img src={portraitUrl} alt={name} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-serif font-bold text-[#20242A]">{name}</h2>
                <p className="text-sm font-mono text-[#23324A] tracking-wider">{dates}</p>
              </div>
              <div className="w-16 h-px bg-[#23324A]/40 mx-auto" />
              <p className="text-sm italic max-w-md mx-auto leading-relaxed">
                “{overview}”
              </p>
              <div className="pt-6 border-t border-[#23324A]/20 flex items-center justify-between text-xs opacity-70">
                <span>Resting in {restingPlace}</span>
                <span className="font-mono uppercase tracking-widest text-[10px]">Pithros Permanent Archive</span>
              </div>
            </div>
          )}

          {/* ASSET 4: QR MEMORIAL CARD */}
          {selectedAsset === 'qr_card' && (
            <div className="max-w-sm mx-auto p-8 rounded-2xl border-2 border-[#23324A] bg-[#FCFAF5] text-[#20242A] shadow-xl text-center space-y-4">
              <span className="text-[10px] tracking-widest uppercase font-mono text-[#23324A] font-bold">
                SCAN TO VISIT MEMORIAL
              </span>
              <h3 className="text-xl font-serif">{name}</h3>
              <p className="text-xs font-mono opacity-70">{dates}</p>
              <div className="w-40 h-40 mx-auto p-3 rounded-2xl bg-white border border-[#23324A]/30 flex items-center justify-center">
                <QrCode className="w-32 h-32 text-black" />
              </div>
              <p className="text-xs opacity-80 leading-relaxed font-sans">
                Point any mobile camera at this code to view their biography, photo gallery, voice recordings, and leave personal memories.
              </p>
            </div>
          )}

          {/* ASSET 5: QR PLAQUE SHEET (Stone / Metal Spec) */}
          {selectedAsset === 'plaque' && (
            <div className="max-w-lg mx-auto p-8 rounded-2xl border-4 border-dashed border-[#B99452] bg-[#14120F] text-[#F8F5EE] shadow-2xl text-center space-y-6">
              <div className="border border-[#B99452]/40 p-8 rounded-xl space-y-4 bg-gradient-to-b from-white/5 to-transparent">
                <span className="text-[10px] tracking-[0.3em] uppercase font-mono text-[#B99452]">
                  OUTDOOR HEADSTONE & SHRINE PLAQUE SPECIFICATION
                </span>
                <h3 className="text-3xl font-serif text-[#F8F5EE]">{name}</h3>
                <p className="text-xs font-mono text-[#B99452]">{dates}</p>
                <div className="w-36 h-36 mx-auto p-3 rounded-xl bg-white flex items-center justify-center">
                  <QrCode className="w-28 h-28 text-black" />
                </div>
                <p className="text-xs text-[#D9D2C6] italic max-w-sm mx-auto">
                  “A quiet sanctuary of memory, accessible across generations.”
                </p>
              </div>
              <p className="text-xs text-[#9EA3AA]">
                Print-ready 1:1 scale layout for brass, stainless steel, or ceramic etching.
              </p>
            </div>
          )}

          {/* ASSET 6: FAMILY TRIBUTES BOOK */}
          {selectedAsset === 'tributes' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center border-b pb-4">
                <span className="text-[10px] uppercase tracking-widest font-mono text-[#23324A] font-bold">
                  FAMILY CONDOLENCE COMPILATION
                </span>
                <h2 className="text-3xl font-serif mt-1">Reflections on {name}</h2>
                <p className="text-xs opacity-75 mt-1 font-sans">
                  {tributesList.length} reflections gathered from family, friends, and colleagues
                </p>
              </div>

              <div className="space-y-4">
                {tributesList.map((t, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-[#23324A]/20 bg-[#FCFAF5]/70 space-y-2">
                    <p className="text-sm italic leading-relaxed font-serif">“{t.message}”</p>
                    <div className="flex items-center justify-between text-xs font-sans opacity-75 pt-1">
                      <span className="font-semibold">{t.authorName}</span>
                      <span>{t.relationship}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
