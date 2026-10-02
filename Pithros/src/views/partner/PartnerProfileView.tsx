import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Save, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { providersApi, type PartnerProfile } from '../../services/api/providers';

export const PartnerProfileView: React.FC = () => {
  const { isDark } = useTheme();

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [serviceAreas, setServiceAreas] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [bio, setBio] = useState('');

  const applyProfile = (partner: PartnerProfile) => {
    setProfile(partner);
    setCompanyName(partner.businessName);
    setDirectorName(partner.contactName);
    setTagline(partner.tagline);
    setCategory(partner.category);
    setCity(partner.city);
    setServiceAreas(partner.serviceAreas.join(', '));
    setPhone(partner.phone);
    setWhatsapp(partner.whatsapp);
    setEmail(partner.email);
    setAddress(partner.address);
    setOperatingHours(partner.operatingHours);
    setBio(partner.description);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [partner, gallery] = await Promise.all([
          providersApi.getProfile(),
          providersApi.listMedia('photo'),
        ]);
        if (cancelled) return;
        applyProfile(partner);
        setPhotos(gallery.map((item) => ({ id: item.id, url: item.url, title: item.title })));
      } catch {
        if (!cancelled) setLoadError('Your profile could not be loaded right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await providersApi.updateProfile({
        businessName: companyName.trim(),
        contactName: directorName.trim(),
        tagline: tagline.trim(),
        category: category.trim(),
        city: city.trim(),
        serviceAreas: serviceAreas
          .split(',')
          .map((area) => area.trim())
          .filter(Boolean),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        address: address.trim(),
        operatingHours: operatingHours.trim(),
        description: bio.trim(),
      });
      applyProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Your profile changes could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const setLogo = async (mediaId: string) => {
    setSaveError(null);
    try {
      const updated = await providersApi.updateProfile({ logoMediaId: mediaId });
      applyProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('That image could not be set as your logo.');
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
    isDark
      ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
  }`;
  const labelClass = `block text-xs font-medium mb-1.5 ${
    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
  }`;

  if (isLoading) {
    return (
      <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
        Loading your partner profile…
      </p>
    );
  }

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
            Care Partner Company Profile
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage public directory details visible to families on the Pithros Farewell Network.
          </p>
        </div>
        {profile && (
          <span className="px-3 py-1.5 rounded-full text-[10px] font-mono border border-amber-500/30 bg-amber-500/10 text-amber-400 capitalize">
            {profile.status} • {profile.slug}
          </span>
        )}
      </div>

      {loadError && <p className="text-xs text-amber-500">{loadError}</p>}
      {saveError && <p className="text-xs text-amber-500">{saveError}</p>}

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Profile saved. Approved partners appear in the public directory with these details.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h2
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Company &amp; Licensed Director
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Organization / Provider Brand</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Lead Funeral Director / Specialist</label>
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Direct Bereavement Helpline</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Official Dispatch Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Operating Hours</label>
              <input
                type="text"
                placeholder="e.g. 24 hours"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h2
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Directory Listing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Service Category</label>
              <input
                type="text"
                placeholder="e.g. Farewell Coordinators"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Primary City</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Service Areas (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Bengaluru, Mysuru, Coorg"
              value={serviceAreas}
              onChange={(e) => setServiceAreas(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tagline</label>
            <input
              type="text"
              placeholder="One calm line families will see first"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Physical Address &amp; Parlour Location</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Public Bereavement Statement / Biography</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {photos.length > 0 && (
          <div
            className={`p-6 rounded-2xl border space-y-3 ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <h2
              className={`text-base font-serif flex items-center gap-2 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Directory logo
            </h2>
            <p className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Choose one gallery image to represent your organisation in the directory.
            </p>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo) => {
                const isLogo = profile?.logoUrl === photo.url;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setLogo(photo.id)}
                    className={`w-24 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      isLogo ? 'border-[#B99452]' : 'border-transparent hover:border-stone-400'
                    }`}
                    title={isLogo ? 'Current logo' : 'Set as logo'}
                  >
                    <img src={photo.url} alt={photo.title || 'Gallery image'} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" icon={Save} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};
