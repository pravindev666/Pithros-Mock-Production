import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Share2,
  Sparkles,
  Grid,
  Check,
  Image as ImageIcon,
  Flame,
  Crown,
} from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface MemoryMosaicModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorial: Memorial;
  isPremium?: boolean;
}

export const MemoryMosaicModal: React.FC<MemoryMosaicModalProps> = ({
  isOpen,
  onClose,
  memorial,
  isPremium = false,
}) => {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const availablePhotos = memorial.media.filter((m) => m.type === 'photo');
  const allImages = [
    { id: 'portrait', url: memorial.portraitUrl || '', title: 'Portrait' },
    ...availablePhotos.map((p) => ({ id: p.id, url: p.url, title: p.title })),
  ];

  const [mosaicLayout, setMosaicLayout] = useState<'3' | '6' | '9'>('3');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  // Initialize selected photos
  useEffect(() => {
    const count = parseInt(mosaicLayout, 10);
    const initial = allImages.slice(0, count).map((img) => img.id);
    setSelectedPhotoIds(initial);
  }, [mosaicLayout, memorial]);

  const toggleSelectPhoto = (id: string) => {
    const limit = parseInt(mosaicLayout, 10);
    if (selectedPhotoIds.includes(id)) {
      if (selectedPhotoIds.length > 1) {
        setSelectedPhotoIds(selectedPhotoIds.filter((pId) => pId !== id));
      }
    } else {
      if (selectedPhotoIds.length < limit) {
        setSelectedPhotoIds([...selectedPhotoIds, id]);
      } else {
        // Replace the last selected
        setSelectedPhotoIds([...selectedPhotoIds.slice(0, limit - 1), id]);
      }
    }
  };

  const selectedImages = selectedPhotoIds
    .map((id) => allImages.find((img) => img.id === id))
    .filter(Boolean) as { id: string; url: string; title: string }[];

  // Render to canvas for high-resolution PNG download
  const handleDownloadMosaic = async () => {
    setIsGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 1200;
      const height = 1200;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#0E0C09';
      ctx.fillRect(0, 0, width, height);

      // Gold ornate border
      ctx.strokeStyle = '#B99452';
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, width - 64, height - 64);
      ctx.strokeStyle = 'rgba(185, 148, 82, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Title & Dates Header
      ctx.fillStyle = '#B99452';
      ctx.font = '600 24px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('IN LOVING MEMORY', width / 2, 95);

      ctx.fillStyle = '#F8F5EE';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText(memorial.fullName, width / 2, 150);

      ctx.fillStyle = '#D9D2C6';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText(
        `${memorial.birthDate || '1948'} — ${memorial.deathDate || '2026'}`,
        width / 2,
        185
      );

      // Photos Grid area
      const gridTop = 230;
      const gridHeight = 780;
      const gridWidth = 1040;
      const gridLeft = (width - gridWidth) / 2;

      const count = selectedImages.length;
      let cols = 3;
      let rows = 1;

      if (count === 3) {
        cols = 3;
        rows = 1;
      } else if (count === 6) {
        cols = 3;
        rows = 2;
      } else {
        cols = 3;
        rows = 3;
      }

      const cellW = (gridWidth - (cols - 1) * 16) / cols;
      const cellH = (gridHeight - (rows - 1) * 16) / rows;

      // Load images
      const loadedImgs = await Promise.all(
        selectedImages.map((img) => {
          return new Promise<HTMLImageElement | null>((resolve) => {
            const el = new Image();
            el.crossOrigin = 'anonymous';
            el.onload = () => resolve(el);
            el.onerror = () => resolve(null);
            el.src = img.url;
          });
        })
      );

      loadedImgs.forEach((imgEl, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = gridLeft + col * (cellW + 16);
        const y = gridTop + row * (cellH + 16);

        if (imgEl) {
          ctx.save();
          // Clip cell with rounded corners
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, 12);
          ctx.clip();

          // Cover fit
          const hRatio = cellW / imgEl.width;
          const vRatio = cellH / imgEl.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShiftX = (cellW - imgEl.width * ratio) / 2;
          const centerShiftY = (cellH - imgEl.height * ratio) / 2;

          ctx.drawImage(
            imgEl,
            0,
            0,
            imgEl.width,
            imgEl.height,
            x + centerShiftX,
            y + centerShiftY,
            imgEl.width * ratio,
            imgEl.height * ratio
          );
          ctx.restore();

          // Border around cell
          ctx.strokeStyle = 'rgba(185, 148, 82, 0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellW, cellH);
        }
      });

      // Footer
      ctx.fillStyle = '#B99452';
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillText(`“${memorial.shortEpitaph?.slice(0, 80) || 'A cherished life remembered.'}”`, width / 2, 1070);

      ctx.fillStyle = '#9EA3AA';
      ctx.font = '14px sans-serif';
      ctx.fillText('PITHROS PERMANENT MEMORIAL ARCHIVE', width / 2, 1120);

      // Trigger download
      const link = document.createElement('a');
      link.download = `${memorial.slug}-memory-mosaic.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Celebrating the cherished life and memories of ${memorial.fullName} on PITHROS:\n\n${window.location.origin}/m/${memorial.slug}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={`fixed inset-0 backdrop-blur-md ${isDark ? 'bg-black/85' : 'bg-black/70'}`}
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.cinematicEaseOut }}
        className={`relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE]'
            : 'bg-[#FAF6EF] border-[#E5DED2] text-[#20242A]'
        }`}
      >
        {/* Top Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#EAE2D5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'}`} />
            <div>
              <h2 className="text-base font-serif font-semibold">Memory Mosaic</h2>
              <p className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                Curate a commemorative photo tapestry to download and share
              </p>
            </div>
          </div>

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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Controls: Layout Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold mb-1">
                Mosaic Moments
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMosaicLayout('3')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    mosaicLayout === '3'
                      ? isDark
                        ? 'border-[#B99452] bg-[#B99452]/20 text-[#B99452] font-semibold'
                        : 'border-[#23324A] bg-[#23324A]/10 text-[#23324A] font-semibold'
                      : isDark
                      ? 'border-[#202C40] text-[#9EA3AA]'
                      : 'border-[#E5DED2] text-[#7D766D]'
                  }`}
                >
                  3 Moments (Free)
                </button>
                <button
                  type="button"
                  onClick={() => setMosaicLayout('6')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    mosaicLayout === '6'
                      ? isDark
                        ? 'border-[#B99452] bg-[#B99452]/20 text-[#B99452] font-semibold'
                        : 'border-[#23324A] bg-[#23324A]/10 text-[#23324A] font-semibold'
                      : isDark
                      ? 'border-[#202C40] text-[#9EA3AA]'
                      : 'border-[#E5DED2] text-[#7D766D]'
                  }`}
                >
                  6 Moments
                </button>
                <button
                  type="button"
                  onClick={() => setMosaicLayout('9')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    mosaicLayout === '9'
                      ? isDark
                        ? 'border-[#B99452] bg-[#B99452]/20 text-[#B99452] font-semibold'
                        : 'border-[#23324A] bg-[#23324A]/10 text-[#23324A] font-semibold'
                      : isDark
                      ? 'border-[#202C40] text-[#9EA3AA]'
                      : 'border-[#E5DED2] text-[#7D766D]'
                  }`}
                >
                  9 Moments (Care)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Share2}
                onClick={handleShareWhatsApp}
              >
                Share to WhatsApp
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                isLoading={isGenerating}
                onClick={handleDownloadMosaic}
              >
                Download Keepsake Card
              </Button>
            </div>
          </div>

          {/* Mosaic Live Preview Canvas Card */}
          <div
            className={`max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${
              isDark ? 'border-[#B99452]/40 bg-[#0E0C09]' : 'border-[#23324A]/30 bg-[#16120E] text-[#F8F5EE]'
            }`}
          >
            {/* Ornate Inner Border */}
            <div className="absolute inset-3 border border-[#B99452]/30 rounded-2xl pointer-events-none" />

            <div className="relative z-10 text-center space-y-2 mb-6">
              <span className="text-[10px] tracking-[0.25em] uppercase font-mono text-[#B99452]">
                IN LOVING MEMORY
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif text-[#F8F5EE]">
                {memorial.fullName}
              </h3>
              <p className="text-xs font-mono text-[#D9D2C6]/80">
                {memorial.birthDate || '1948'} — {memorial.deathDate || '2026'}
              </p>
            </div>

            {/* Dynamic Grid Layout */}
            <div
              className={`grid gap-3 mb-6 ${
                mosaicLayout === '3'
                  ? 'grid-cols-3'
                  : mosaicLayout === '6'
                  ? 'grid-cols-3 grid-rows-2'
                  : 'grid-cols-3 grid-rows-3'
              }`}
            >
              {selectedImages.map((img, i) => (
                <div
                  key={img.id}
                  className="aspect-square rounded-xl overflow-hidden border border-[#B99452]/40 bg-[#1A1815] relative group"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[10px] text-white truncate font-medium">{img.title}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Card Footer */}
            <div className="relative z-10 text-center space-y-1">
              <p className="text-xs italic text-[#B99452] font-serif max-w-md mx-auto">
                “{memorial.shortEpitaph || 'A life remembered with timeless affection.'}”
              </p>
              <span className="text-[9px] font-mono tracking-widest text-[#9EA3AA] uppercase block pt-1">
                Pithros Remembrance Archive
              </span>
            </div>
          </div>

          {/* Photo Picker Drawer */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-serif font-medium">
              Choose Photos to Feature (Select up to {mosaicLayout}):
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {allImages.map((img) => {
                const isSelected = selectedPhotoIds.includes(img.id);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => toggleSelectPhoto(img.id)}
                    className={`aspect-square rounded-xl overflow-hidden border relative cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#B99452] ring-2 ring-[#B99452]'
                        : isDark
                        ? 'border-[#202C40] opacity-60 hover:opacity-100'
                        : 'border-[#E5DED2] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B99452] text-black flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
