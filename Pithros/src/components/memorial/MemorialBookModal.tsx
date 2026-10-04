import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Printer,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Heart,
  CreditCard,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

type AssetKey = 'book' | 'card' | 'poster' | 'qr_card' | 'plaque' | 'tributes';

interface MemorialBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorial?: Partial<Memorial>;
  initialAsset?: AssetKey;
  /**
   * Show a neutral, clearly fictional sample keepsake (used for promotional
   * surfaces). No person, portrait, or real memorial is represented.
   */
  sample?: boolean;
}

/**
 * Neutral sample copy. Deliberately generic: no personal name, dates, places
 * or biography, so the sample never reads as a real deceased person.
 */
const SAMPLE = {
  name: 'A Life Remembered',
  dates: 'Sample keepsake · illustrative only',
  epitaph: 'Stories, photographs, milestones, and memories preserved together.',
  overview:
    'A biography is written here by the family: the story of a life, in their own words, kept alongside the photographs and milestones that go with it.',
  earlyLife:
    'Early years, family origins, and the places and people that shaped a childhood.',
  enduringLegacy:
    'The values, passions, and kindnesses that continue through the people who remember.',
  restingPlace: 'A place chosen by the family',
  milestones: [
    { id: 's1', year: 'Chapter I', title: 'Early years', description: 'Where the story begins: family, home, and first memories.' },
    { id: 's2', year: 'Chapter II', title: 'Family and friendships', description: 'The relationships and shared moments that mattered most.' },
    { id: 's3', year: 'Chapter III', title: 'Work and passions', description: 'The pursuits, craft, and contributions of a lifetime.' },
    { id: 's4', year: 'Chapter IV', title: 'Remembered', description: 'Held in the thoughts of family and friends across generations.' },
  ],
  family: [
    { id: 'sf1', name: 'Family member', relationship: 'Relationship shown here', role: 'steward' as const },
    { id: 'sf2', name: 'Family member', relationship: 'Relationship shown here', role: 'contributor' as const },
    { id: 'sf3', name: 'Family member', relationship: 'Relationship shown here', role: 'contributor' as const },
    { id: 'sf4', name: 'Family member', relationship: 'Relationship shown here', role: 'contributor' as const },
  ],
  tributes: [
    { id: 'st1', authorName: 'A friend', relationship: 'Friend', message: 'Tributes from family and friends are gathered here, in their own words.', date: '', isApproved: true },
    { id: 'st2', authorName: 'A colleague', relationship: 'Colleague', message: 'Each memory shared becomes part of a lasting record.', date: '', isApproved: true },
  ],
};

/** Neutral, non-identifying portrait placeholder. */
const Silhouette: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 100 100"
    role="img"
    aria-label="Portrait placeholder"
    className={`w-full h-full ${className}`}
  >
    <rect width="100" height="100" fill="currentColor" opacity="0.08" />
    <circle cx="50" cy="38" r="16" fill="currentColor" opacity="0.28" />
    <path d="M18 100c0-22 14-36 32-36s32 14 32 36z" fill="currentColor" opacity="0.28" />
  </svg>
);

const ASSET_TABS: { id: AssetKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'book', label: '1. Memorial Book', icon: BookOpen },
  { id: 'card', label: '2. Remembrance Card', icon: CreditCard },
  { id: 'poster', label: '3. A4 Poster', icon: ImageIcon },
  { id: 'qr_card', label: '4. QR Memorial Card', icon: QrCode },
  { id: 'plaque', label: '5. QR Plaque Sheet', icon: Shield },
  { id: 'tributes', label: '6. Tribute Book', icon: Heart },
];

const BOOK_PAGES = [
  { id: 'cover', title: 'Cover' },
  { id: 'story', title: 'Life Story' },
  { id: 'timeline', title: 'Chronicle' },
  { id: 'family', title: 'Kinship' },
  { id: 'tributes', title: 'Condolences' },
  { id: 'plaque', title: 'QR Plaque' },
];

export const MemorialBookModal: React.FC<MemorialBookModalProps> = ({
  isOpen,
  onClose,
  memorial,
  initialAsset = 'book',
  sample = false,
}) => {
  const { isDark } = useTheme();
  const [selectedAsset, setSelectedAsset] = useState<AssetKey>(initialAsset);
  const [currentPage, setCurrentPage] = useState(0);
  const [printing, setPrinting] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const printRootRef = useRef<HTMLDivElement>(null);

  // Without a memorial we only ever show the neutral sample.
  const isSample = sample || !memorial;
  const m = isSample ? undefined : memorial;

  const name = m?.fullName || SAMPLE.name;
  const dates = !isSample && m?.birthDate && m?.deathDate ? `${m.birthDate} — ${m.deathDate}` : isSample ? SAMPLE.dates : '';
  const epitaph = m?.shortEpitaph || SAMPLE.epitaph;
  const overview = m?.story?.overview || SAMPLE.overview;
  const earlyLife = m?.story?.earlyLife || SAMPLE.earlyLife;
  const enduringLegacy = m?.story?.enduringLegacy || SAMPLE.enduringLegacy;
  const restingPlace = m?.restingPlace || m?.birthPlace || SAMPLE.restingPlace;
  const portraitUrl = m?.portraitUrl || '';

  const milestones = m?.timeline && m.timeline.length > 0 ? m.timeline : SAMPLE.milestones;
  const familyList = m?.family && m.family.length > 0 ? m.family : SAMPLE.family;
  const tributesList = m?.tributes && m.tributes.length > 0 ? m.tributes : SAMPLE.tributes;

  // Samples never link to a real memorial: the QR resolves to the site itself.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pithros.org';
  const qrTargetUrl = isSample || !m?.slug ? `${origin}/` : `${origin}/m/${m.slug}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(qrTargetUrl)}`;

  // Dialog behaviour: focus, Escape, scroll lock, focus restore.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  // Print: render ONLY the selected artifact into an isolated root, hide
  // everything else in print CSS (see index.css), then call the browser print.
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const finish = () => {
      document.body.classList.remove('keepsake-printing');
      setPrinting(false);
    };
    const run = async () => {
      const imgs = Array.from(printRootRef.current?.querySelectorAll('img') ?? []);
      await Promise.race([
        Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.addEventListener('load', () => res(), { once: true });
                  img.addEventListener('error', () => res(), { once: true });
                }),
          ),
        ),
        new Promise((res) => setTimeout(res, 4000)),
      ]);
      if (cancelled) return;
      document.body.classList.add('keepsake-printing');
      window.addEventListener('afterprint', finish, { once: true });
      window.print();
    };
    run();
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('keepsake-printing');
    };
  }, [printing]);

  if (!isOpen) return null;

  const handlePrint = () => setPrinting(true);

  const portrait = (cls: string) =>
    portraitUrl ? (
      <img src={portraitUrl} alt={name} className={`w-full h-full object-cover ${cls}`} />
    ) : (
      <Silhouette className="text-current" />
    );

  const renderBookPage = (idx: number) => {
    switch (idx) {
      case 0:
        return (
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
              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight leading-tight break-words">
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
        );
      case 1:
        return (
          <div className="max-w-2xl mx-auto space-y-8 py-4">
            <div className="border-b pb-4 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                BIOGRAPHICAL MEMOIR
              </span>
              <h2 className="text-2xl font-serif mt-1 break-words">The Story of {name}</h2>
            </div>

            <div className="space-y-6 text-sm leading-relaxed font-sans text-justify">
              <div>
                <h3 className="text-xs font-serif font-semibold uppercase tracking-wider mb-2 text-[#23324A]">
                  Life Overview
                </h3>
                <p className="opacity-90 break-words">{overview}</p>
              </div>

              <div>
                <h3 className="text-xs font-serif font-semibold uppercase tracking-wider mb-2 text-[#23324A]">
                  Early Beginnings & Origins
                </h3>
                <p className="opacity-90 break-words">{earlyLife}</p>
              </div>

              <div>
                <h3 className="text-xs font-serif font-semibold uppercase tracking-wider mb-2 text-[#23324A]">
                  Passions & Enduring Legacy
                </h3>
                <p className="opacity-90 break-words">{enduringLegacy}</p>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            <div className="border-b pb-4 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                LIFE CHRONICLE
              </span>
              <h2 className="text-2xl font-serif mt-1">Milestones & Footprints</h2>
            </div>

            <div className="space-y-6 font-sans">
              {milestones.map((ms) => (
                <div key={ms.id} className="flex gap-4 border-l-2 border-[#23324A]/20 pl-4 py-1 break-inside-avoid">
                  <span className="font-mono text-xs font-semibold text-[#23324A] whitespace-nowrap">
                    {ms.year}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs font-serif font-semibold text-base break-words">{ms.title}</h4>
                    <p className="text-xs opacity-80 leading-relaxed break-words">{ms.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            <div className="border-b pb-4 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                KINSHIP & CIRCLE
              </span>
              <h2 className="text-2xl font-serif mt-1">Remembered by Family</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 font-sans text-xs">
              {familyList.map((f) => (
                <div key={f.id} className="p-4 rounded-xl border border-[#23324A]/20 bg-[#FCFAF5]/50 min-w-0 break-inside-avoid">
                  <h4 className="font-serif font-semibold text-sm break-words">{f.name}</h4>
                  <span className="opacity-70 break-words">{f.relationship}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            <div className="border-b pb-4 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#23324A] font-sans font-semibold">
                WORDS OF REMEMBRANCE
              </span>
              <h2 className="text-2xl font-serif mt-1">Condolences & Reflections</h2>
            </div>

            <div className="space-y-4 font-sans">
              {tributesList.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-[#23324A]/20 bg-[#FCFAF5]/50 space-y-2 break-inside-avoid">
                  <p className="text-xs italic leading-relaxed break-words">“{t.message}”</p>
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-70">
                    <span className="font-semibold">{t.authorName}</span>
                    <span>{t.relationship}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="max-w-md mx-auto text-center p-8 rounded-2xl border-2 border-[#23324A] space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] tracking-widest uppercase font-sans text-[#23324A]">
                PERMANENT MEMORIAL SANCTUARY
              </span>
              <h3 className="text-2xl font-serif break-words">{name}</h3>
              <p className="text-xs font-mono opacity-80">{dates}</p>
            </div>

            {/* QR Code Container */}
            <div className="w-44 h-44 mx-auto p-3 rounded-2xl bg-white border border-[#23324A]/20 shadow-xs flex flex-col items-center justify-center">
              <img src={qrImageUrl} alt={`QR Code for ${name}`} className="w-36 h-36 object-contain" />
            </div>

            <div className="space-y-2 text-xs font-sans opacity-80">
              <p className="font-serif font-semibold">Scan with any smartphone camera</p>
              <p className="text-[11px] leading-relaxed">
                To access oral histories, photograph archives, and leave condolences in this permanent memorial.
              </p>
            </div>
          </div>
        );
    }
  };

  const renderAsset = (asset: AssetKey, forPrint: boolean) => {
    switch (asset) {
      case 'book':
        return forPrint ? (
          <div>
            {BOOK_PAGES.map((p, idx) => (
              <div key={p.id} className="keepsake-print-page">
                {renderBookPage(idx)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12">{renderBookPage(currentPage)}</div>
        );

      // ASSET 2: REMEMBRANCE CARD (Wallet / Pocket Card)
      case 'card':
        return (
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-8 rounded-2xl border-2 border-[#B99452] bg-[#16120E] text-[#F8F5EE] shadow-xl text-center space-y-4">
              <span className="text-[9px] tracking-[0.3em] uppercase font-mono text-[#B99452]">
                IN REMEMBRANCE
              </span>
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#B99452] shadow-md">
                {portrait('')}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-serif break-words">{name}</h3>
                <p className="text-xs font-mono text-[#D9D2C6]/80">{dates}</p>
              </div>
              <p className="text-xs italic text-[#B99452] max-w-xs mx-auto leading-relaxed">“{epitaph}”</p>
              <div className="pt-2 border-t border-[#B99452]/20 flex items-center justify-between text-[10px] text-[#9EA3AA]">
                <span>PITHROS ARCHIVE</span>
                <span>SCAN TO REMEMBER</span>
              </div>
            </div>
            {!forPrint && (
              <p className="text-center text-xs opacity-70">
                Wallet-sized 3.5” x 2” memorial card for distribution at memorial services.
              </p>
            )}
          </div>
        );

      // ASSET 3: A4 MEMORIAL POSTER
      case 'poster':
        return (
          <div className="max-w-xl mx-auto p-10 rounded-2xl border-4 border-[#23324A] bg-[#FCFAF5] text-[#20242A] shadow-2xl text-center space-y-6">
            <span className="text-xs tracking-[0.35em] uppercase font-mono text-[#23324A] font-semibold">
              IN HONOR OF A LIFE CHERISHED
            </span>
            <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-[#23324A] shadow-lg text-[#23324A]">
              {portrait('')}
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-serif font-bold text-[#20242A] break-words">{name}</h2>
              <p className="text-sm font-mono text-[#23324A] tracking-wider">{dates}</p>
            </div>
            <div className="w-16 h-px bg-[#23324A]/40 mx-auto" />
            <p className="text-sm italic max-w-md mx-auto leading-relaxed">“{overview}”</p>
            <div className="pt-6 border-t border-[#23324A]/20 flex items-center justify-between gap-4 text-xs opacity-70">
              <span>Resting in {restingPlace}</span>
              <span className="font-mono uppercase tracking-widest text-[10px]">Pithros Permanent Archive</span>
            </div>
          </div>
        );

      // ASSET 4: QR MEMORIAL CARD
      case 'qr_card':
        return (
          <div className="max-w-sm mx-auto p-8 rounded-2xl border-2 border-[#23324A] bg-[#FCFAF5] text-[#20242A] shadow-xl text-center space-y-4">
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#23324A] font-bold">
              SCAN TO VISIT MEMORIAL
            </span>
            <h3 className="text-xl font-serif break-words">{name}</h3>
            <p className="text-xs font-mono opacity-70">{dates}</p>
            <div className="w-40 h-40 mx-auto p-3 rounded-2xl bg-white border border-[#23324A]/30 flex items-center justify-center">
              <img src={qrImageUrl} alt={`QR Code for ${name}`} className="w-32 h-32 object-contain" />
            </div>
            <p className="text-xs opacity-80 leading-relaxed font-sans">
              Point any mobile camera at this code to view their biography, photo gallery, voice recordings, and leave personal memories.
            </p>
          </div>
        );

      // ASSET 5: QR PLAQUE SHEET (Stone / Metal Spec)
      case 'plaque':
        return (
          <div className="max-w-lg mx-auto p-8 rounded-2xl border-4 border-dashed border-[#B99452] bg-[#14120F] text-[#F8F5EE] shadow-2xl text-center space-y-6">
            <div className="border border-[#B99452]/40 p-8 rounded-xl space-y-4 bg-gradient-to-b from-white/5 to-transparent">
              <span className="text-[10px] tracking-[0.3em] uppercase font-mono text-[#B99452]">
                OUTDOOR HEADSTONE & SHRINE PLAQUE SPECIFICATION
              </span>
              <h3 className="text-3xl font-serif text-[#F8F5EE] break-words">{name}</h3>
              <p className="text-xs font-mono text-[#B99452]">{dates}</p>
              <div className="w-36 h-36 mx-auto p-3 rounded-xl bg-white flex items-center justify-center">
                <img src={qrImageUrl} alt={`QR Code for ${name}`} className="w-28 h-28 object-contain" />
              </div>
              <p className="text-xs text-[#D9D2C6] italic max-w-sm mx-auto">
                “A quiet sanctuary of memory, accessible across generations.”
              </p>
            </div>
            {!forPrint && (
              <p className="text-xs text-[#9EA3AA]">
                Print-ready 1:1 scale layout for brass, stainless steel, or ceramic etching.
              </p>
            )}
          </div>
        );

      // ASSET 6: FAMILY TRIBUTES BOOK
      case 'tributes':
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center border-b pb-4">
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#23324A] font-bold">
                FAMILY CONDOLENCE COMPILATION
              </span>
              <h2 className="text-3xl font-serif mt-1 break-words">Reflections on {name}</h2>
              <p className="text-xs opacity-75 mt-1 font-sans">
                {tributesList.length} reflections gathered from family, friends, and colleagues
              </p>
            </div>

            <div className="space-y-4">
              {tributesList.map((t, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-[#23324A]/20 bg-[#FCFAF5]/70 space-y-2 break-inside-avoid">
                  <p className="text-sm italic leading-relaxed font-serif break-words">“{t.message}”</p>
                  <div className="flex items-center justify-between gap-3 text-xs font-sans opacity-75 pt-1">
                    <span className="font-semibold">{t.authorName}</span>
                    <span>{t.relationship}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keepsake-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 backdrop-blur-md ${isDark ? 'bg-black/85' : 'bg-black/60'}`}
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.cinematicEaseOut }}
        className={`relative z-10 w-full max-w-4xl max-h-[92vh] max-h-[92dvh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-[#0E0C09] border-[#202C40] text-[#F8F5EE]'
            : 'bg-[#FAF6EF] border-[#E5DED2] text-[#20242A]'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#EAE2D5]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
            <div className="min-w-0">
              <h2 id="keepsake-modal-title" className="text-sm font-serif font-semibold">
                Memorial Keepsake Pack
              </h2>
              <p className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                {isSample
                  ? 'A sample of what Pithros can create. Illustrative only, no real person is shown.'
                  : 'Print-ready family keepsakes, memorial books, cards, and grave plaques'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              disabled={printing}
              className="whitespace-nowrap"
            >
              Print / Save PDF
            </Button>
            <button
              ref={closeRef}
              type="button"
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
          role="group"
          aria-label="Keepsake artifact"
          className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 border-b text-xs overflow-x-auto ${
            isDark ? 'border-[#182337] bg-[#111820]' : 'border-[#EAE2D5] bg-[#F3EEE4]'
          }`}
        >
          {ASSET_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = selectedAsset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedAsset(item.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[#182337] text-[#B99452] font-semibold border border-[#B99452]/40 shadow-xs'
                      : 'bg-[#FCFAF5] text-[#23324A] font-semibold border border-[#23324A]/30 shadow-xs'
                    : isDark
                    ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                    : 'text-[#7D766D] hover:text-[#20242A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* If Memorial Book is selected, show page selector tabs */}
        {selectedAsset === 'book' && (
          <div
            className={`flex items-center justify-between px-4 sm:px-6 py-2 border-b text-xs ${
              isDark ? 'border-[#182337] bg-[#141B2D]' : 'border-[#EAE2D5] bg-[#EFE8DC]'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto min-w-0">
              {BOOK_PAGES.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  aria-current={currentPage === idx ? 'page' : undefined}
                  onClick={() => setCurrentPage(idx)}
                  className={`flex-shrink-0 whitespace-nowrap px-3 py-1 rounded-lg font-serif transition-colors cursor-pointer ${
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

            <div className="flex items-center gap-1 pl-4 flex-shrink-0">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-md disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] opacity-70">
                {currentPage + 1} / {BOOK_PAGES.length}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === BOOK_PAGES.length - 1}
                onClick={() => setCurrentPage((prev) => Math.min(BOOK_PAGES.length - 1, prev + 1))}
                className="p-1 rounded-md disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Content */}
        <div className="p-4 sm:p-10 md:p-12 overflow-y-auto flex-1 font-serif">
          {renderAsset(selectedAsset, false)}
        </div>
      </motion.div>

      {/* Isolated print root: only the selected artifact, outside the app tree. */}
      {printing &&
        createPortal(
          <div id="keepsake-print-root" ref={printRootRef} data-asset={selectedAsset} className="font-serif">
            <style>{`@page { size: A4 portrait; margin: ${selectedAsset === 'poster' ? '10mm' : '14mm'}; }`}</style>
            {renderAsset(selectedAsset, true)}
          </div>,
          document.body,
        )}
    </div>
  );
};
