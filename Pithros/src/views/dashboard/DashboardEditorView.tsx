import React, { useState } from 'react';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import { MediaUploader } from '../../components/ui/MediaUploader';
import { Save, Check, RefreshCw, Camera } from 'lucide-react';
import { api } from '../../services/api';
import { mediaApi } from '../../services/api/media';
import { useTheme } from '../../context/ThemeContext';

interface DashboardEditorViewProps {
  memorial: Memorial;
  onUpdate: () => void;
}

export const DashboardEditorView: React.FC<DashboardEditorViewProps> = ({
  memorial,
  onUpdate,
}) => {
  const { isDark } = useTheme();
  const [displayPortraitUrl, setDisplayPortraitUrl] = useState(memorial.portraitUrl || '');
  const [manualPortraitUrl, setManualPortraitUrl] = useState('');
  const [fullName, setFullName] = useState(memorial.fullName);
  const [preferredName, setPreferredName] = useState(memorial.preferredName || '');
  const [birthDate, setBirthDate] = useState(memorial.birthDate);
  const [deathDate, setDeathDate] = useState(memorial.deathDate);
  const [birthPlace, setBirthPlace] = useState(memorial.birthPlace || '');
  const [restingPlace, setRestingPlace] = useState(memorial.restingPlace || '');
  const [shortEpitaph, setShortEpitaph] = useState(memorial.shortEpitaph);

  const [overview, setOverview] = useState(memorial.story.overview);
  const [earlyLife, setEarlyLife] = useState(memorial.story.earlyLife || '');
  const [passions, setPassions] = useState(memorial.story.passionsAndValues || '');
  const [legacy, setLegacy] = useState(memorial.story.enduringLegacy || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await api.updateMemorial(memorial.id, {
      fullName: fullName.trim(),
      preferredName: preferredName.trim() || undefined,
      ...(manualPortraitUrl.trim()
        ? { portraitUrl: manualPortraitUrl.trim(), portraitMediaId: null }
        : {}),
      birthDate: birthDate.trim(),
      deathDate: deathDate.trim(),
      birthPlace: birthPlace.trim() || 'India',
      restingPlace: restingPlace.trim() || undefined,
      shortEpitaph: shortEpitaph.trim(),
      story: {
        ...memorial.story,
        overview: overview.trim(),
        earlyLife: earlyLife.trim() || '',
        passionsAndValues: passions.trim() || '',
        enduringLegacy: legacy.trim() || '',
      },
    });

    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    onUpdate();
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
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
            Content & Biography
          </span>
          <h2
            className={`text-2xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Memorial Editor
          </h2>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Update vital dates, resting places, epitaph, and chapter narratives.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={saving}
          icon={savedSuccess ? Check : Save}
        >
          {savedSuccess ? 'Saved Changes' : 'Save Changes'}
        </Button>
      </div>

      {/* Vital Details */}
      <div
        className={`p-6 rounded-2xl border space-y-4 transition-colors ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
        }`}
      >
        <h3
          className={`text-base font-serif ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Essential Details
        </h3>

        {/* Portrait Photograph */}
        <div className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <label
              className={`block text-xs font-medium ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Portrait Photograph
            </label>
            <span className="text-[11px] opacity-75 font-mono">Preserved in Memorial Sanctuary</span>
          </div>

          <div
            className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border transition-colors ${
              isDark ? 'border-[#202C40] bg-[#111820]' : 'border-[#E5DED2] bg-[#F3EEE4]/50'
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full overflow-hidden border-2 flex-shrink-0 relative shadow-sm ${
                isDark ? 'border-[#B99452]/50 bg-[#182337]' : 'border-[#23324A]/50 bg-[#E5DED2]'
              }`}
            >
              {displayPortraitUrl ? (
                <img
                  src={displayPortraitUrl}
                  alt={fullName || 'Memorial Portrait'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <Camera className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <MediaUploader
                label="Upload new photograph from device (JPG, PNG)"
                accept="image/*"
                className="w-full"
                onUploadFile={async (file, onProgress) => {
                  const { mediaId } = await mediaApi.uploadFile(memorial.id, file, {
                    kind: 'photo',
                    title: 'Portrait',
                    onProgress,
                  });
                  const updated = await api.updateMemorial(memorial.id, {
                    portraitMediaId: mediaId,
                  });
                  setDisplayPortraitUrl(updated?.portraitUrl || '');
                  setManualPortraitUrl('');
                  onUpdate();
                  return {
                    name: file.name,
                    url: updated?.portraitUrl || URL.createObjectURL(file),
                    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                  };
                }}
              />
              <input
                type="text"
                value={manualPortraitUrl}
                onChange={(e) => {
                  setManualPortraitUrl(e.target.value);
                  setDisplayPortraitUrl(e.target.value);
                }}
                placeholder="Or paste direct image URL (https://...)"
                className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
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
              Preferred Name
            </label>
            <input
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                  : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Date of Birth
            </label>
            <input
              type="text"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
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
              Date of Passing
            </label>
            <input
              type="text"
              value={deathDate}
              onChange={(e) => setDeathDate(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                  : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Birthplace
            </label>
            <input
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
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
              Resting Place
            </label>
            <input
              type="text"
              value={restingPlace}
              onChange={(e) => setRestingPlace(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                  : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
              }`}
            />
          </div>
        </div>

        <div>
          <label
            className={`block text-xs font-medium mb-1 ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
            }`}
          >
            Short Epitaph Line
          </label>
          <input
            type="text"
            value={shortEpitaph}
            onChange={(e) => setShortEpitaph(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
            }`}
          />
        </div>
      </div>

      {/* Chapters of Story */}
      <div
        className={`p-6 rounded-2xl border space-y-4 transition-colors ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
        }`}
      >
        <h3
          className={`text-base font-serif ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Story Chapters
        </h3>

        <div>
          <label
            className={`block text-xs font-medium mb-1 ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
            }`}
          >
            Overview / In Remembrance *
          </label>
          <textarea
            rows={5}
            required
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
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
            Early Years & Roots
          </label>
          <textarea
            rows={4}
            value={earlyLife}
            onChange={(e) => setEarlyLife(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
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
            Values, Work & Passions
          </label>
          <textarea
            rows={4}
            value={passions}
            onChange={(e) => setPassions(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
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
            Enduring Legacy
          </label>
          <textarea
            rows={4}
            value={legacy}
            onChange={(e) => setLegacy(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
            }`}
          />
        </div>
      </div>
    </form>
  );
};

