import React, { useState } from 'react';
import { Memorial, TimelineEvent } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Plus, Trash2, Edit3 } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface DashboardTimelineViewProps {
  memorial: Memorial;
  onUpdate: () => void;
  onNavigate?: (route: string) => void;
}

export const DashboardTimelineView: React.FC<DashboardTimelineViewProps> = ({
  memorial,
  onUpdate,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!year.trim() || !title.trim()) return;

    const newMilestone: TimelineEvent = {
      id: `tl-${Date.now()}`,
      year: year.trim(),
      title: title.trim(),
      location: location.trim() || undefined,
      description: description.trim(),
    };

    const sortedTimeline = [...memorial.timeline, newMilestone].sort(
      (a, b) => parseInt(a.year || '0') - parseInt(b.year || '0')
    );

    await api.updateMemorial(memorial.id, {
      timeline: sortedTimeline,
    });

    setShowAddForm(false);
    setYear('');
    setTitle('');
    setLocation('');
    setDescription('');
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    const updated = memorial.timeline.filter((t) => t.id !== id);
    await api.updateMemorial(memorial.id, { timeline: updated });
    onUpdate();
  };

  return (
    <div className="space-y-6">
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
            Chapters of Life
          </span>
          <h2
            className={`text-2xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Timeline Milestones
          </h2>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Capture pivotal moments, career breakthroughs, weddings, and journeys.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Close Form' : 'Add Milestone'}
        </Button>
      </div>

      {memorial.timeline.length >= 5 && (
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
              Free Memorial Limit ({memorial.timeline.length}/5 Milestones)
            </span>
            <p className="text-xs leading-relaxed max-w-xl">
              Free Memorial includes 5 timeline milestones. Preserve a comprehensive life story across decades (up to 100 milestones) with Memorial Care.
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
            Extend Timeline (₹999/yr)
          </Button>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddMilestone}
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
            New Life Milestone
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                className={`block text-xs font-medium mb-1 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Year / Date *
              </label>
              <input
                type="text"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1975 or May 1975"
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className={`block text-xs font-medium mb-1 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Milestone Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Marriage to Meenakshi at Palakkad"
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
              Location (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kerala, India"
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
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the occasion, who attended, and why it was memorable..."
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
                isDark
                  ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                  : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
              }`}
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Milestone
            </Button>
          </div>
        </form>
      )}

      {/* Milestones List */}
      <div className="space-y-3">
        {memorial.timeline.map((evt) => (
          <div
            key={evt.id}
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 text-xs transition-colors ${
              isDark
                ? 'border-[#202C40] bg-[#182337]'
                : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
            }`}
          >
            <div className="space-y-1">
              <span
                className={`font-mono text-xs font-semibold ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                {evt.year}
              </span>
              <h5
                className={`text-sm font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {evt.title}
              </h5>
              {evt.location && (
                <p
                  className={`text-[11px] ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  {evt.location}
                </p>
              )}
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                {evt.description}
              </p>
            </div>
            <button
              onClick={() => handleDelete(evt.id)}
              className="p-1 rounded text-[#9EA3AA] hover:text-red-500 flex-shrink-0 cursor-pointer"
              title="Delete milestone"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

