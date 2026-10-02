import React, { useState, useRef } from 'react';
import { Memorial, VoiceMemory } from '../../types';
import { MediaUploader } from '../../components/ui/MediaUploader';
import { AudioPlayer } from '../../components/ui/AudioPlayer';
import { Button } from '../../components/ui/Button';
import { Image, Volume2, Plus, Trash2, Mic, Check, AlertCircle, UploadCloud, Globe, Lock } from 'lucide-react';
import { api } from '../../services/api';
import { mediaApi } from '../../services/api/media';
import { useTheme } from '../../context/ThemeContext';

interface DashboardMediaVoiceViewProps {
  memorial: Memorial;
  onUpdate: () => void;
  onNavigate?: (route: string) => void;
}

export const DashboardMediaVoiceView: React.FC<DashboardMediaVoiceViewProps> = ({
  memorial,
  onUpdate,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'photos' | 'voice'>('photos');

  // New Voice Memory Form
  const [showAddVoice, setShowAddVoice] = useState(false);
  const [voiceTitle, setVoiceTitle] = useState('');
  const [voiceRelation, setVoiceRelation] = useState('Daughter');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUploadProgress, setVoiceUploadProgress] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const photoMedia = memorial.media.filter((m) => m.type === 'photo');

  // Synthesize voice memories from both memorial.voiceMemories and uploaded media with kind='voice'
  const audioFromMedia: VoiceMemory[] = memorial.media
    .filter((m) => m.type === 'voice')
    .map((m) => ({
      id: m.id,
      title: m.title || 'Spoken Memory',
      speakerName: m.uploadedBy || memorial.stewardName,
      relationship: 'Family Contributor',
      duration: '02:30',
      audioUrl: m.url,
      transcript: m.caption,
      waveformPattern: [15, 30, 60, 85, 45, 90, 70, 40, 25, 55, 75, 40, 20],
      dateRecorded: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    }));

  const allVoices: VoiceMemory[] = [...(memorial.voiceMemories || []), ...audioFromMedia];

  const handleVoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceTitle.trim()) return;
    setVoiceError(null);
    setIsUploadingVoice(true);

    try {
      if (voiceFile) {
        // Direct-to-storage Cloudflare R2 pipeline for real audio
        await mediaApi.uploadFile(memorial.id, voiceFile, {
          kind: 'voice',
          title: voiceTitle.trim(),
          caption: voiceTranscript.trim() || undefined,
          onProgress: (p) => setVoiceUploadProgress(p),
        });
      } else {
        // Voice memory metadata record
        const newVoice: VoiceMemory = {
          id: `vm-${Date.now()}`,
          title: voiceTitle.trim(),
          speakerName: memorial.stewardName,
          relationship: voiceRelation.trim(),
          duration: '02:45',
          audioUrl: '',
          transcript: voiceTranscript.trim() || undefined,
          waveformPattern: [15, 30, 60, 85, 45, 90, 70, 40, 25, 55, 75, 40, 20],
          dateRecorded: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
        };

        const currentVoices = memorial.voiceMemories || [];
        await api.updateMemorial(memorial.id, {
          voiceMemories: [newVoice, ...currentVoices],
        });
      }

      setShowAddVoice(false);
      setVoiceTitle('');
      setVoiceTranscript('');
      setVoiceFile(null);
      setVoiceUploadProgress(null);
      onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save voice memory';
      setVoiceError(msg);
    } finally {
      setIsUploadingVoice(false);
      setVoiceUploadProgress(null);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    setPhotoError(null);
    try {
      await mediaApi.remove(memorial.id, id);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'The photograph could not be removed. Please try again.',
      );
      return;
    }
    onUpdate();
  };

  const handleTogglePhotoVisibility = async (id: string, makePublic: boolean) => {
    setPhotoError(null);
    try {
      await mediaApi.update(memorial.id, id, { privacy: makePublic ? 'public' : 'private' });
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'The photo visibility could not be changed.',
      );
      return;
    }
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[11px] uppercase tracking-widest font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Archival Storage
          </span>
          <h2
            className={`text-2xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Media & Spoken Memories
          </h2>
        </div>

        {/* Sub-tabs */}
        <div
          className={`flex items-center gap-1.5 p-1 rounded-xl border ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#E5DED2] border-[#E5DED2]'
          }`}
        >
          <button
            onClick={() => setActiveSubTab('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'photos'
                ? isDark
                  ? 'bg-[#182337] text-[#B99452]'
                  : 'bg-[#FCFAF5] text-[#23324A] shadow-xs'
                : isDark
                ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'text-[#554F48] hover:text-[#20242A]'
            }`}
          >
            Photos ({photoMedia.length})
          </button>
          <button
            onClick={() => setActiveSubTab('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeSubTab === 'voice'
                ? isDark
                  ? 'bg-[#182337] text-[#B99452]'
                  : 'bg-[#FCFAF5] text-[#23324A] shadow-xs'
                : isDark
                ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'text-[#554F48] hover:text-[#20242A]'
            }`}
          >
            Voice Memories ({allVoices.length})
          </button>
        </div>
      </div>

      {/* PHOTOS VIEW */}
      {activeSubTab === 'photos' && (
        <div className="space-y-6">
          {photoMedia.length >= 3 && (
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isDark
                  ? 'border-[#B99452]/40 bg-[#16120E] text-[#F8F5EE]'
                  : 'border-[#23324A]/30 bg-[#FCFAF5] text-[#20242A]'
              }`}
            >
              <div className="space-y-1">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                    isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
                  }`}
                >
                  Your memorial is growing ({photoMedia.length}/3 Photos)
                </span>
                <p className="text-xs leading-relaxed max-w-xl">
                  Free Memorial includes 3 photographs. Memorial Care lets your family preserve up to 30 photographs, along with voice memories, archival downloads, and family preservation features.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('/checkout?plan=plan_care_annual');
                  } else {
                    window.location.href = '/checkout?plan=plan_care_annual';
                  }
                }}
              >
                Preserve with Memorial Care (₹999/yr)
              </Button>
            </div>
          )}

          {/* Real Direct-to-Storage Cloudflare R2 Uploader */}
          <MediaUploader
            label="Upload high-resolution photographs directly to Cloudflare R2"
            accept="image/*"
            onUploadFile={async (file, onProgress) => {
              await mediaApi.uploadFile(memorial.id, file, {
                kind: 'photo',
                title: file.name.replace(/\.[^/.]+$/, ''),
                onProgress,
              });
              onUpdate();
            }}
          />

          {photoError && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                isDark
                  ? 'bg-[#3A1414] border-[#7F1D1D] text-[#FCA5A5]'
                  : 'bg-[#FEF2F2] border-[#F87171] text-[#991B1B]'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{photoError}</span>
            </div>
          )}

          {photoMedia.length === 0 ? (
            <div
              className={`p-10 rounded-2xl border text-center space-y-2.5 transition-colors ${
                isDark ? 'border-[#202C40] bg-[#182337]/50 text-[#9EA3AA]' : 'border-[#E5DED2] bg-[#FCFAF5] text-[#7D766D]'
              }`}
            >
              <Image className={`w-8 h-8 mx-auto opacity-50 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
              <p className={`text-sm font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                No archival photographs preserved yet.
              </p>
              <p className="text-xs max-w-md mx-auto">
                Use the uploader above to preserve cherished family photographs, vintage portraits, and scanned documents for posterity.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {photoMedia.map((photo) => (
                <div
                  key={photo.id}
                  className={`group relative rounded-2xl border overflow-hidden transition-colors ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337]'
                      : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
                  }`}
                >
                  <div
                    className={`aspect-[4/3] w-full overflow-hidden ${
                      isDark ? 'bg-[#111820]' : 'bg-[#EFE8DC]'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="truncate">
                      <h5
                        className={`text-xs font-medium truncate ${
                          isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                        }`}
                      >
                        {photo.title}
                      </h5>
                      <span
                        className={`text-[10px] block ${
                          isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                        }`}
                      >
                        {photo.year || 'Preserved photo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePhotoVisibility(photo.id, !photo.isPublic)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          photo.isPublic
                            ? 'text-[#2D7A5F] hover:bg-[#2D7A5F]/10'
                            : 'text-[#9EA3AA] hover:text-[#23324A] hover:bg-[#23324A]/10'
                        }`}
                        title={
                          photo.isPublic
                            ? 'Shown on the public memorial — click to make family only'
                            : 'Family only — click to show on the public memorial'
                        }
                      >
                        {photo.isPublic ? (
                          <Globe className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="p-1.5 rounded-lg text-[#9EA3AA] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VOICE MEMORIES VIEW */}
      {activeSubTab === 'voice' && (
        <div className="space-y-6">
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              isDark
                ? 'border-[#B99452]/40 bg-[#16120E] text-[#F8F5EE]'
                : 'border-[#23324A]/30 bg-[#FCFAF5] text-[#20242A]'
            }`}
          >
            <div className="space-y-1">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                  isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
                }`}
              >
                Memorial Care Flagship Feature
              </span>
              <h4 className="text-sm font-serif font-semibold">
                Preserve their voice & oral histories
              </h4>
              <p className={`text-xs max-w-xl leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                A photograph shows someone; a voice recording lets your family hear them. Memorial Care includes up to 60 minutes of voice memories (100 MB audio • 50 MB/file), waveform visualizations, and transcripts.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="whitespace-nowrap flex-shrink-0"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/checkout?plan=plan_care_annual');
                } else {
                  window.location.href = '/checkout?plan=plan_care_annual';
                }
              }}
            >
              Preserve Their Voice (₹999/yr)
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              Record their laugh, stories, bedtime tales, or memories told in their own words.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Mic}
              onClick={() => setShowAddVoice(!showAddVoice)}
            >
              {showAddVoice ? 'Close Form' : 'Add Voice Memory'}
            </Button>
          </div>

          {showAddVoice && (
            <form
              onSubmit={handleVoiceSubmit}
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark
                  ? 'border-[#2D3D56] bg-[#182337]'
                  : 'border-[#E5DED2] bg-[#FCFAF5] shadow-sm'
              }`}
            >
              <h4
                className={`text-base font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Upload or Record Voice Memory
              </h4>

              {voiceError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border text-xs bg-[#3A1414] border-[#7F1D1D] text-[#FCA5A5]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{voiceError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Memory Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={voiceTitle}
                    onChange={(e) => setVoiceTitle(e.target.value)}
                    placeholder="e.g. Explaining the Monsoon Winds (1998)"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Speaker / Storyteller
                  </label>
                  <input
                    type="text"
                    value={voiceRelation}
                    onChange={(e) => setVoiceRelation(e.target.value)}
                    placeholder="e.g. In His Own Voice or Recounted by Sister"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>
              </div>

              {/* Audio File Selection */}
              <div>
                <label
                  className={`block text-xs mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Audio File (MP3, WAV, M4A, OGG)
                </label>
                <div
                  onClick={() => audioFileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                    isDark
                      ? 'border-[#202C40] bg-[#111820]/40 hover:border-[#B99452]'
                      : 'border-[#E5DED2] bg-[#F3EEE4]/40 hover:border-[#23324A]'
                  }`}
                >
                  <input
                    type="file"
                    ref={audioFileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setVoiceFile(e.target.files[0]);
                      }
                    }}
                    accept="audio/*"
                    className="hidden"
                  />
                  <UploadCloud className="w-4 h-4 mx-auto mb-1 text-[#B99452]" />
                  <p className="text-xs font-medium">
                    {voiceFile ? voiceFile.name : 'Click to select audio recording'}
                  </p>
                  <p className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    {voiceFile
                      ? `${(voiceFile.size / 1024 / 1024).toFixed(2)} MB • Ready for cloud upload`
                      : 'Up to 50 MB per recording'}
                  </p>
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Spoken Transcript
                </label>
                <textarea
                  rows={3}
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Include a transcript for those who wish to read along..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              {voiceUploadProgress !== null && (
                <div className="w-full rounded-full h-1.5 overflow-hidden bg-[#182337]">
                  <div
                    className="h-1.5 transition-all duration-200 bg-[#B99452]"
                    style={{ width: `${voiceUploadProgress}%` }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddVoice(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isUploadingVoice}>
                  {isUploadingVoice ? 'Uploading to R2...' : 'Save Voice Memory'}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {allVoices.length > 0 ? (
              allVoices.map((vm) => (
                <AudioPlayer key={vm.id} memory={vm} />
              ))
            ) : (
              <div
                className={`py-12 text-center text-xs rounded-2xl border ${
                  isDark
                    ? 'text-[#9EA3AA] bg-[#182337] border-[#202C40]'
                    : 'text-[#554F48] bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                No voice memories preserved yet. Add an audio file or voice note above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
