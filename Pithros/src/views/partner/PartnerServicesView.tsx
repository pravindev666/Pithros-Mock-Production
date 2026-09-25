import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarCheck,
  Plus,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  price: string;
  duration: string;
  description: string;
  active: boolean;
  coverageAreas: string[];
}

export const PartnerServicesView: React.FC = () => {
  const { isDark } = useTheme();

  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'srv-1',
      title: 'Dignified Floral & Sanctuary Lamp Offering',
      category: 'Ceremony Care',
      price: '₹18,500',
      duration: 'Same-day (Within 4 hours)',
      description:
        'White lilies, tuberose strings, ceremonial oil lamps, and fragrant sandalwood paste setup for home or community hall memorial vigils.',
      active: true,
      coverageAreas: ['Bengaluru Central', 'Indiranagar', 'Koramangala', 'Malleshwaram'],
    },
    {
      id: 'srv-2',
      title: 'Sacred Grove Native Tree Planting Memorial',
      category: 'Living Remembrance',
      price: '₹24,000',
      duration: '48 hours planning',
      description:
        'Planting 10 protected native trees in the Western Ghats buffer zone with GPS coordinates and permanent digital certificate etched into Pithros.',
      active: true,
      coverageAreas: ['Western Ghats Sanctuary Zone', 'Coorg Foothills', 'Wayanad'],
    },
    {
      id: 'srv-3',
      title: 'Memorial Keepsake Stone & Tablet Engraving',
      category: 'Masonry & Keepsakes',
      price: '₹38,000',
      duration: '5 to 7 days',
      description:
        'Handcrafted granite and marble plaques engraved with custom multilingual calligraphy, life dates, and dignified family verses.',
      active: true,
      coverageAreas: ['All India Dispatch', 'Direct Cemetery Installation'],
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Ceremony Care');
  const [newDesc, setNewDesc] = useState('');

  const toggleActive = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newItem: ServiceItem = {
      id: `srv-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      price: newPrice || 'Custom Quote',
      duration: '24-48 hours',
      description: newDesc || 'Custom bereavement service provided with reverence.',
      active: true,
      coverageAreas: ['Bengaluru Metro'],
    };
    setServices((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewTitle('');
    setNewPrice('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Services Catalog & Pricing
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage your bereavement packages, floral offerings, and regional coverage on the Farewell Network.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowAddModal(true)}
        >
          Add New Service
        </Button>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((srv) => (
          <div
            key={srv.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {srv.category}
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive(srv.id)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                    srv.active
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      : 'border-stone-600 text-stone-500 bg-stone-800/30'
                  }`}
                >
                  {srv.active ? 'Published' : 'Hidden'}
                </button>
              </div>

              <h2
                className={`text-base font-serif font-medium ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {srv.title}
              </h2>

              <p
                className={`text-xs mt-2 leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                {srv.description}
              </p>

              <div
                className={`mt-4 p-3 rounded-xl border text-xs space-y-1.5 ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#EAE1D3] bg-[#F7F2E8]'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-stone-400">Starting fee:</span>
                  <span className="font-medium text-amber-400">{srv.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Turnaround:</span>
                  <span>{srv.duration}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3 h-3 text-stone-400" />
                {srv.coverageAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-500/10 text-stone-400"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-inherit flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setServices((prev) => prev.filter((s) => s.id !== srv.id))}
                className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                title="Delete service"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-5 ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <h2
              className={`text-lg font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Add Farewell Care Service
            </h2>

            <form onSubmit={handleAddService} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 text-stone-300">Service Title</label>
                <input
                  type="text"
                  placeholder="e.g. Cremation Urn Keepsake"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-white'
                      : 'border-[#E5DED2] bg-white text-stone-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-stone-300">Price / Fee</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹15,000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isDark
                        ? 'border-[#202C40] bg-[#16120D] text-white'
                        : 'border-[#E5DED2] bg-white text-stone-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-stone-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isDark
                        ? 'border-[#202C40] bg-[#16120D] text-white'
                        : 'border-[#E5DED2] bg-white text-stone-900'
                    }`}
                  >
                    <option value="Ceremony Care">Ceremony Care</option>
                    <option value="Living Remembrance">Living Remembrance</option>
                    <option value="Masonry & Keepsakes">Masonry & Keepsakes</option>
                    <option value="Grief Concierge">Grief Concierge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-stone-300">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detail the package contents, respectful handling..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-white'
                      : 'border-[#E5DED2] bg-white text-stone-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Publish Service
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
