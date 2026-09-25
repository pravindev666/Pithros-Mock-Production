import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, Quote } from 'lucide-react';
import { VoiceMemory } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface AudioPlayerProps {
  memory: VoiceMemory;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ memory, className = '' }) => {
  const { isDark } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2.5;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const waveform = memory.waveformPattern || [20, 35, 45, 60, 80, 50, 40, 30, 65, 75, 55, 30, 20, 15];

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
        isDark
          ? 'border-[#202C40] bg-[#182337] hover:border-[#B99452]/30'
          : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#23324A]/40 shadow-sm'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <span
            className={`text-[11px] uppercase tracking-wider font-medium ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Voice Memory • {memory.relationship}
          </span>
          <h4
            className={`text-base font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            {memory.title}
          </h4>
        </div>
        <div
          className={`flex items-center gap-2 text-xs ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
          }`}
        >
          <Volume2
            className={`w-3.5 h-3.5 ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          />
          <span>{memory.duration}</span>
        </div>
      </div>

      {/* Waveform & Play Control */}
      <div className="flex items-center gap-3 sm:gap-4">
        <motion.button
          onClick={togglePlay}
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer ${
            isDark
              ? 'bg-gradient-to-tr from-[#B99452] to-[#FF9E1B] text-[#111820] shadow-[0_0_16px_rgba(255,184,48,0.25)]'
              : 'bg-gradient-to-tr from-[#23324A] to-[#D9941E] text-white shadow-[0_2px_12px_rgba(178,122,30,0.25)]'
          }`}
          whileHover={{ scale: 1.05, transition: { duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut } }}
          whileTap={{ scale: 0.95, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
          aria-label={isPlaying ? 'Pause audio memory' : 'Play audio memory'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </motion.button>

        {/* Visualizer bars */}
        <div
          className={`flex-1 flex items-center gap-1 sm:gap-1.5 h-12 px-2 py-1 rounded-xl border cursor-pointer ${
            isDark
              ? 'bg-[#182337]/60 border-[#202C40]'
              : 'bg-[#E5DED2]/60 border-[#E5DED2]'
          }`}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
            setProgress(newPct);
          }}
        >
          {waveform.map((height, i) => {
            const barPct = (i / waveform.length) * 100;
            const isActive = progress >= barPct;
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-full"
                animate={{
                  height: `${Math.max(15, height)}%`,
                  backgroundColor: isActive
                    ? isDark
                      ? '#B99452'
                      : '#23324A'
                    : isDark
                    ? '#2D3D56'
                    : '#E5DED2',
                  opacity: isActive ? 1 : 0.45,
                }}
                transition={{ duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut }}
              />
            );
          })}
        </div>
      </div>

      {/* Transcript toggle */}
      {memory.transcript && (
        <div
          className={`mt-3 pt-3 border-t ${
            isDark ? 'border-[#202C40]/80' : 'border-[#E5DED2]/80'
          }`}
        >
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'text-[#9EA3AA] hover:text-[#B99452]'
                : 'text-[#7D766D] hover:text-[#23324A]'
            }`}
          >
            <Quote className="w-3 h-3" />
            <span>{showTranscript ? 'Hide transcript' : 'Read spoken transcript'}</span>
          </button>
          <AnimatePresence>
            {showTranscript && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
                className={`text-xs sm:text-sm italic p-3 rounded-lg border leading-relaxed overflow-hidden ${
                  isDark
                    ? 'text-[#D9D2C6] bg-[#182337]/40 border-[#202C40]'
                    : 'text-[#554F48] bg-[#F3EEE4] border-[#E5DED2]'
                }`}
              >
                {memory.transcript}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

