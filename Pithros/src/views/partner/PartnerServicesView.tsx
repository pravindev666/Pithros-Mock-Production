import React, { useEffect, useState } from 'react';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { providersApi, type PartnerProfile, type PartnerService } from '../../services/api/providers';

interface ServiceItem {
  id: string;
  title: string;
  price: string;
  duration: string;
  description: string;
  active: boolean;
}

function mapService(service: PartnerService): ServiceItem {
  return {
    id: service.id,
    title: service.name,
    price: service.priceNote || 'Custom Quote',
    duration: service.estimatedTime || 'To be confirmed',
    description: service.description,
    active: service.active,
  };
}

export const PartnerServicesView: React.FC = () => {
  const { isDark } = useTheme();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [rows, partner] = await Promise.all([
        providersApi.listServices(),
        providersApi.getProfile(),
      ]);
      setServices(rows.map(mapService));
      setProfile(partner);
      setLoadError(null);
    } catch {
      setLoadError('Your service catalogue could not be loaded right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (service: ServiceItem) => {
    setBusyId(service.id);
    setActionError(null);
    try {
      const updated = await providersApi.updateService(service.id, { active: !service.active });
      setServices((prev) => prev.map((s) => (s.id === service.id ? mapService(updated) : s)));
    } catch {
      setActionError('That service could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  const removeService = async (service: ServiceItem) => {
    setBusyId(service.id);
    setActionError(null);
    try {
      await providersApi.deleteService(service.id);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch {
      setActionError('That service could not be removed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const created = await providersApi.createService({
        name: newTitle.trim(),
        description: newDesc.trim(),
        priceNote: newPrice.trim(),
        estimatedTime: newDuration.trim(),
      });
      setServices((prev) => [mapService(created), ...prev]);
      setShowAddModal(false);
      setNewTitle('');
      setNewPrice('');
      setNewDuration('');
      setNewDesc('');
    } catch {
      setActionError('That service could not be published.');
    } finally {
      setIsSaving(false);
    }
  };

  const coverage = profile?.serviceAreas ?? [];

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
            Services Catalog &amp; Pricing
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage your bereavement packages, floral offerings, and regional coverage on the Farewell Network.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
          Add New Service
        </Button>
      </div>

      {actionError && <p className="text-xs text-amber-500">{actionError}</p>}

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
            Loading your catalogue…
          </p>
        ) : loadError ? (
          <p className="text-xs text-amber-500">{loadError}</p>
        ) : services.length === 0 ? (
          <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
            No services published yet. Add your first package so families can find you.
          </p>
        ) : (
          services.map((srv) => (
            <div
              key={srv.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {profile?.category || 'Bereavement Service'}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === srv.id}
                    onClick={() => toggleActive(srv)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
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

                {coverage.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    {coverage.map((area, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-500/10 text-stone-400"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-inherit flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={busyId === srv.id}
                  onClick={() => removeService(srv)}
                  className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs disabled:opacity-50"
                  title="Delete service"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
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
                  <label className="block font-medium mb-1 text-stone-300">Turnaround</label>
                  <input
                    type="text"
                    placeholder="e.g. Same day"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isDark
                        ? 'border-[#202C40] bg-[#16120D] text-white'
                        : 'border-[#E5DED2] bg-white text-stone-900'
                    }`}
                  />
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
                <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                  {isSaving ? 'Publishing…' : 'Publish Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
