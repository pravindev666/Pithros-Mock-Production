import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, BookOpen, ChevronLeft, ChevronRight, QrCode, ShieldCheck, Heart } from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface MemorialBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorial?: Partial<Memorial>;
}

export const MemorialBookModal: React.FC<MemorialBookModalProps> = ({
  isOpen,
  onClose,
  memorial,
}) => {
  const { isDark } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  // Safe fallback data if previewed with abstract memorial
  const name = memorial?.fullName || 'Beloved Life';
  const dates = memorial?.birthDate && memorial?.deathDate 
    ? `${memorial.birthDate} — ${memorial.deathDate}`
    : '1948 — 2026';
  const epitaph = memorial?.shortEpitaph || 'A life lived with gentle brilliance, steadfast kindness, and quiet wisdom.';
  const overview = memorial?.story?.overview || 'A life remembered not only for accomplishments, but for the warmth, humor, and dignity shared with everyone who crossed their path.';
  const earlyLife = memorial?.story?.earlyLife || 'Growing up surrounded by ancestral lands and patient elders, developing an early appreciation for literature, nature, and community.';
  const enduringLegacy = memorial?.story?.enduringLegacy || 'Their teachings, moral integrity, and unwavering support continue to echo through children, students, and lifelong friends.';
  const restingPlace = memorial?.restingPlace || memorial?.birthPlace || 'Ancestral Sanctuary';
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
    ? memorial.tributes.slice(0, 4)
    : [
        { id: '1', authorName: 'Prof. Ramachandran', relationship: 'Colleague & Friend', message: 'A steadfast friend whose patience and gentle humor illuminated every committee room and classroom.', date: '2026', isApproved: true },
        { id: '2', authorName: 'Meera Iyer', relationship: 'Former Student', message: 'The standard against which I measure every mentor. Thank you for believing in me when I did not.', date: '2026', isApproved: true },
      ];

  const handlePrint = () => {
    window.print();
  };

  const pages = [
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
        className={`fixed inset-0 backdrop-blur-md print:hidden ${
          isDark ? 'bg-black/85' : 'bg-black/60'
        }`}
      />

      {/* Main Book Shell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.cinematicEaseOut }}
        className={`relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none ${
          isDark ? 'bg-[#0E0C09] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FAF6EF] border-[#E5DED2] text-[#20242A]'
        }`}
      >
        {/* Top Action Bar (Hidden on print) */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b print:hidden ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#E5DED2]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
            <div>
              <h2 className="text-sm font-serif font-medium">Memorial Keepsake Book</h2>
              <p className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                Commemorative printable volume for family archives and memorial programs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A] hover:bg-[#EAE2D5]'
              }`}
              aria-label="Close memorial book"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page Selector Tabs (Screen Only) */}
        <div
          className={`flex items-center justify-between px-6 py-2 border-b text-xs overflow-x-auto print:hidden ${
            isDark ? 'border-[#182337] bg-[#111820]' : 'border-[#EAE2D5] bg-[#F3EEE4]'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            {pages.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`px-3 py-1.5 rounded-lg font-serif transition-colors cursor-pointer ${
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
              {currentPage + 1} / {pages.length}
            </span>
            <button
              disabled={currentPage === pages.length - 1}
              onClick={() => setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1))}
              className="p-1 rounded-md disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Book Viewport */}
        <div className="p-6 sm:p-10 md:p-12 overflow-y-auto flex-1 font-serif print:p-0 print:overflow-visible">
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
                    CHRONOLOGY
                  </span>
                  <h2 className="text-2xl font-serif mt-1">Milestones & Journey</h2>
                </div>

                <div className="space-y-6">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="text-right w-20 flex-shrink-0">
                        <span className="text-base font-serif font-medium text-[#23324A]">
                          {m.year}
                        </span>
                      </div>
                      <div className="w-px self-stretch bg-[#23324A]/30 relative">
                        <div className="w-2 h-2 rounded-full bg-[#23324A] -left-[3.5px] top-1.5 absolute" />
                      </div>
                      <div className="flex-1 pb-4">
                        <h4 className="text-sm font-serif font-semibold">{m.title}</h4>
                        <p className="text-xs font-sans opacity-85 mt-1 leading-relaxed">
                          {m.description}
                        </p>
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
                    FAMILY CIRCLE
                  </span>
                  <h2 className="text-2xl font-serif mt-1">The Kinship Constellation</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {familyList.map((f, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-inherit">
                      <h4 className="text-sm font-serif font-medium">{f.name}</h4>
                      <p className="text-xs font-sans opacity-70">{f.relationship}</p>
                      <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-sans font-medium text-[#23324A]">
                        Role: {f.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 5: CONDOLENCES */}
          {(currentPage === 4 || typeof window !== 'undefined') && (
            <div className={`page-tributes ${currentPage !== 4 ? 'hidden print:block print:break-after-page' : ''}`}>
              <div className="max-w-2xl mx-auto space-y-6 py-4">
                <div className="border-b pb-4 text-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                    WORDS OF REMEMBRANCE
                  </span>
                  <h2 className="text-2xl font-serif mt-1">From the Family Condolence Ledger</h2>
                </div>

                <div className="space-y-4">
                  {tributesList.map((t, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-inherit">
                      <p className="text-xs font-editorial italic leading-relaxed opacity-90">
                        “{t.message}”
                      </p>
                      <div className="mt-2 text-right">
                        <span className="text-xs font-serif font-semibold">{t.authorName}</span>
                        <span className="text-[11px] font-sans opacity-70 block">{t.relationship}</span>
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
              <div className="max-w-md mx-auto text-center space-y-6 py-8 p-8 rounded-2xl border border-[#23324A]/30 bg-gradient-to-b from-transparent to-[#23324A]/5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-sans font-semibold text-[#23324A]">
                    PERMANENT DIGITAL LINK
                  </span>
                  <h3 className="text-xl font-serif">Living Memorial Plaque</h3>
                  <p className="text-xs font-sans opacity-75">
                    Scan to visit the full memorial with audio recordings, photos, and tributes.
                  </p>
                </div>

                <div className="p-6 bg-white rounded-2xl inline-block shadow-md border">
                  <QrCode className="w-36 h-36 text-black mx-auto" />
                </div>

                <div className="space-y-2 text-xs font-sans">
                  <p className="font-mono text-[11px] opacity-80">
                    pithros.com/m/{memorial?.slug || 'memorial'}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#2D7A5F]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Family Managed & Document Reviewed</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info note (screen only) */}
        <div
          className={`px-6 py-3 border-t text-[11px] flex items-center justify-between print:hidden ${
            isDark ? 'border-[#202C40] bg-[#182337] text-[#9EA3AA]' : 'border-[#E5DED2] bg-[#E5DED2] text-[#7D766D]'
          }`}
        >
          <span>Available as archival PDF or future commemorative leather-bound print.</span>
          <span className="font-serif">Pithros Remembrance System</span>
        </div>
      </motion.div>
    </div>
  );
};
