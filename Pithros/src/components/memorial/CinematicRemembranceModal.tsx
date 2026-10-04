import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
} from 'lucide-react';
import { Memorial } from '../../types';

interface CinematicRemembranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorial: Memorial;
}

export const CinematicRemembranceModal: React.FC<CinematicRemembranceModalProps> = ({
  isOpen,
  onClose,
  memorial,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const availablePhotos = memorial.media.filter((m) => m.type === 'photo');
  const photosList = [
    { url: memorial.portraitUrl || '', title: memorial.fullName, year: 'Portrait' },
    ...availablePhotos.map((p) => ({ url: p.url, title: p.title, year: p.year })),
  ];

  // Slide deck structure:
  // Slide 0: Opening Remembrance Title Card
  // Slides 1..N: Photos with subtle Ken Burns zoom
  // Slide N+1: Concluding Tribute Card
  const totalSlides = photosList.length + 2;

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(interval);
  }, [isOpen, isPlaying, totalSlides]);

  // Keyboard navigation & escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, totalSlides]);

  // Audio control
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setAudioPlaying(true);
    }
  };

  const sampleVoiceUrl = memorial.voiceMemories?.[0]?.audioUrl;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cinematic Remembrance"
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-[#060504] text-[#F8F5EE] flex flex-col justify-between overflow-hidden select-none focus:outline-none"
    >
      {/* Optional Audio Element */}
      {sampleVoiceUrl && (
        <audio ref={audioRef} src={sampleVoiceUrl} loop />
      )}

      {/* Top Floating Controls */}
      <div className="relative z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B99452]" />
          <span className="text-xs uppercase font-mono tracking-[0.25em] text-[#B99452]">
            Cinematic Remembrance
          </span>
        </div>

        <div className="flex items-center gap-3">
          {sampleVoiceUrl && (
            <button
              onClick={toggleAudio}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#F8F5EE] transition-all cursor-pointer backdrop-blur-md"
              title={audioPlaying ? 'Mute spoken memories' : 'Play voice memory'}
            >
              {audioPlaying ? <Volume2 className="w-4 h-4 text-[#B99452]" /> : <VolumeX className="w-4 h-4 opacity-70" />}
            </button>
          )}

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#F8F5EE] transition-all cursor-pointer backdrop-blur-md"
            title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#F8F5EE] transition-all cursor-pointer backdrop-blur-md"
            title="Exit Remembrance (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Cinema Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* SLIDE 0: OPENING DIGNITY CARD */}
          {currentIndex === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-2xl px-6 space-y-6"
            >
              <span className="text-xs sm:text-sm tracking-[0.35em] uppercase font-mono text-[#B99452]">
                Remembering
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif tracking-tight text-[#F8F5EE]">
                {memorial.fullName}
              </h1>
              <div className="w-16 h-px bg-[#B99452]/50 mx-auto" />
              <p className="text-sm sm:text-base font-mono tracking-widest text-[#D9D2C6]/80">
                {memorial.birthDate || '1948'} — {memorial.deathDate || '2026'}
              </p>
              {memorial.restingPlace && (
                <p className="text-xs text-[#9EA3AA] font-serif pt-4">
                  Resting in {memorial.restingPlace}
                </p>
              )}
            </motion.div>
          )}

          {/* SLIDES 1..N: PHOTO FOCUS */}
          {currentIndex > 0 && currentIndex <= photosList.length && (
            <motion.div
              key={`photo-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4 }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              {/* Blurred atmospheric glow backdrop */}
              <div
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110"
                style={{ backgroundImage: `url(${photosList[currentIndex - 1]?.url})` }}
              />

              {/* Foreground Image with slow Ken Burns effect */}
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1.08, x: [0, -8, 8] }}
                transition={{ duration: 8, ease: 'linear' }}
                className="relative z-10 max-w-4xl max-h-[75vh] w-auto h-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              >
                <img
                  src={photosList[currentIndex - 1]?.url}
                  alt={photosList[currentIndex - 1]?.title}
                  className="w-full h-full object-contain max-h-[75vh]"
                />
              </motion.div>

              {/* Photo Caption Overlay */}
              <div className="absolute bottom-16 left-0 right-0 z-20 text-center px-4">
                <div className="inline-block px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                  <h4 className="text-sm font-serif font-medium text-[#F8F5EE]">
                    {photosList[currentIndex - 1]?.title}
                  </h4>
                  {photosList[currentIndex - 1]?.year && (
                    <span className="text-[10px] font-mono text-[#B99452] block mt-0.5">
                      {photosList[currentIndex - 1]?.year}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* FINAL SLIDE: CONCLUDING REMEMBRANCE */}
          {currentIndex === totalSlides - 1 && (
            <motion.div
              key="outro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 1.6 }}
              className="text-center max-w-2xl px-6 space-y-6"
            >
              <Heart className="w-8 h-8 text-[#B99452] mx-auto opacity-80" />
              <h2 className="text-3xl sm:text-5xl font-serif text-[#F8F5EE]">
                A life remembered by those who loved them.
              </h2>
              {memorial.shortEpitaph && (
                <p className="text-sm sm:text-base italic text-[#D9D2C6] font-serif max-w-lg mx-auto leading-relaxed pt-2">
                  “{memorial.shortEpitaph}”
                </p>
              )}
              <div className="pt-8">
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#B99452]">
                  PITHROS PERMANENT MEMORIAL ARCHIVE
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Floating Navigation Bar */}
      <div className="relative z-20 flex items-center justify-between p-6 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={() => setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1))}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-[#F8F5EE] transition-all cursor-pointer backdrop-blur-md"
          title="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Slide Progress Dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 max-w-md">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentIndex === i
                  ? 'w-6 bg-[#B99452]'
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % totalSlides)}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-[#F8F5EE] transition-all cursor-pointer backdrop-blur-md"
          title="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
