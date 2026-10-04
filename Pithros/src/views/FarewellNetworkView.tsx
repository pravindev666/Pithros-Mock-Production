import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MapPin,
  Star,
  Clock,
  ShieldCheck,
  Phone,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  ArrowLeft,
  X,
  ExternalLink,
  Calendar,
  Send,
  Camera,
  Sparkles,
  SlidersHorizontal,
  Info,
  Check,
  Building,
  Truck,
  FileText,
  Flower2,
  Layers,
} from 'lucide-react';
import { ServiceProvider, ProviderServiceItem, ProviderReview } from '../types';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

interface FarewellNetworkViewProps {
  onNavigate: (route: string) => void;
  currentRoute?: string;
}

export const FarewellNetworkView: React.FC<FarewellNetworkViewProps> = ({
  onNavigate,
  currentRoute = '/farewell',
}) => {
  const { isDark } = useTheme();
  const { t, metadata } = useLocale();

  // Route slug detection: /farewell/providers/:slug
  const routeSlug = useMemo(() => {
    if (currentRoute.startsWith('/farewell/providers/')) {
      const parts = currentRoute.split('/farewell/providers/');
      return parts[1] || null;
    }
    return null;
  }, [currentRoute]);

  // Active provider profile state (supports both URL slug and in-memory selection)
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<string | null>(routeSlug);

  useEffect(() => {
    if (routeSlug) {
      setSelectedProviderSlug(routeSlug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSelectedProviderSlug(null);
    }
  }, [routeSlug]);

  // Live directory. Only admin-approved providers are ever returned.
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);

  // Slugs whose full detail payload (services, photos, description) has been fetched.
  const detailedSlugs = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getProviders();
        if (cancelled) return;
        // The directory summary must never clobber a provider whose full detail has
        // already arrived. On a deep-link load both requests fire together and the
        // list can resolve last, which previously wiped the services list.
        setProviders((previous) => {
          const detailed = new Map(
            previous.filter((p) => detailedSlugs.current.has(p.slug)).map((p) => [p.slug, p]),
          );
          return list.map((p) => detailed.get(p.slug) ?? p);
        });
      } catch {
        if (!cancelled) {
          setProvidersError('The Farewell Network could not be loaded right now.');
        }
      } finally {
        if (!cancelled) setIsLoadingProviders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The directory list carries summaries; a profile needs the full detail payload
  // (services, gallery, description). Fetch it for whichever provider is open.
  useEffect(() => {
    const slug = routeSlug ?? selectedProviderSlug;
    if (!slug || detailedSlugs.current.has(slug)) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.getProviderBySlug(slug);
        if (cancelled || !detail) return;
        detailedSlugs.current.add(slug);
        setProviders((previous) => [...previous.filter((p) => p.slug !== slug), detail]);
      } catch (err) {
        console.error('Failed to load provider detail', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeSlug, selectedProviderSlug]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'rating' | 'response' | 'price'>('recommended');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterResponseTime, setFilterResponseTime] = useState<string>('all');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Profile Tab State
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'services' | 'photos' | 'reviews' | 'faqs' | 'location'>('overview');
  const [activePhotoCategory, setActivePhotoCategory] = useState<string>('all');
  const [activeGalleryModalPhoto, setActiveGalleryModalPhoto] = useState<string | null>(null);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<ProviderServiceItem | null>(null);

  // Request Quote Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteTargetProvider, setQuoteTargetProvider] = useState<ServiceProvider | null>(null);
  const [quoteTargetService, setQuoteTargetService] = useState<string>('');
  const [quoteDate, setQuoteDate] = useState('Immediate (Today/Tomorrow)');
  const [quoteCity, setQuoteCity] = useState('Bengaluru');
  const [quoteUrgency, setQuoteUrgency] = useState<'Immediate' | 'Within 3 Days' | 'This Week' | 'Planning Ahead'>('Immediate');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteContactName, setQuoteContactName] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteContactPref, setQuoteContactPref] = useState<'WhatsApp' | 'Phone' | 'Email'>('WhatsApp');
  const [quotePhoneError, setQuotePhoneError] = useState<string | null>(null);
  const [quoteSubmitError, setQuoteSubmitError] = useState<string | null>(null);
  const [isQuoteSubmitting, setIsQuoteSubmitting] = useState(false);
  const [quoteSuccessRef, setQuoteSuccessRef] = useState<string | null>(null);

  const cities = ['All Cities', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi NCR', 'Kochi', 'Pune'];

  const categoryPresets = [
    { id: 'all', label: 'All Services', icon: Layers },
    { id: 'Farewell Coordinators', label: 'Coordination', icon: Building },
    { id: 'Transport & Repatriation', label: 'Transport & Transit', icon: Truck },
    { id: 'Documentation Assistance', label: 'Documentation', icon: FileText },
    { id: 'Floral & Memorial Decor', label: 'Organic Florals', icon: Flower2 },
    { id: 'Memorial Makers & Plaques', label: 'Memorial Plaques', icon: Sparkles },
  ];

  // Currently viewed provider if in profile mode
  const activeProvider = useMemo(() => {
    if (!selectedProviderSlug) return null;
    return providers.find((provider) => provider.slug === selectedProviderSlug) ?? null;
  }, [selectedProviderSlug, providers]);

  // Filtered & Sorted Providers
  const filteredProviders = useMemo(() => {
    let list = providers.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.services?.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCity = selectedCity === 'all' || selectedCity === 'All Cities' || p.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesCategory = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesRating = !filterRating || p.rating >= filterRating;
      const matchesResponse =
        filterResponseTime === 'all' ||
        (filterResponseTime === 'fast' && (p.responseTime.includes('15') || p.responseTime.includes('20')));

      return matchesSearch && matchesCity && matchesCategory && matchesRating && matchesResponse;
    });

    // Sorting
    list.sort((a, b) => {
      if (selectedSort === 'rating') return b.rating - a.rating;
      if (selectedSort === 'response') {
        const getMins = (str: string) => parseInt(str.replace(/\D/g, ''), 10) || 60;
        return getMins(a.responseTime) - getMins(b.responseTime);
      }
      if (selectedSort === 'price') {
        const getPrice = (str: string) => parseInt(str.replace(/\D/g, ''), 10) || 99999;
        return getPrice(a.startingPrice) - getPrice(b.startingPrice);
      }
      // default: recommended (reviews + rating)
      return b.reviewCount * b.rating - a.reviewCount * a.rating;
    });

    return list;
  }, [providers, searchQuery, selectedCity, selectedCategory, selectedSort, filterRating, filterResponseTime]);

  const handleOpenProviderProfile = (slug: string) => {
    setSelectedProviderSlug(slug);
    onNavigate(`/farewell/providers/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToResults = () => {
    setSelectedProviderSlug(null);
    onNavigate('/farewell');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenQuoteModal = (provider?: ServiceProvider, serviceName?: string) => {
    const target = provider ?? activeProvider ?? providers[0] ?? null;
    if (!target) return;
    setQuoteTargetProvider(target);
    setQuoteTargetService(serviceName || 'General Farewell Coordination');
    setQuotePhoneError(null);
    setQuoteSubmitError(null);
    setQuoteSuccessRef(null);
    setIsQuoteModalOpen(true);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteContactName.trim() || !quotePhone.trim()) return;

    const cleanPhone = quotePhone.trim().replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      setQuotePhoneError('Please enter a valid phone number with 7 to 15 digits.');
      return;
    }
    if (!quoteTargetProvider) {
      setQuoteSubmitError('Choose a provider before sending an enquiry.');
      return;
    }
    setQuotePhoneError(null);
    setQuoteSubmitError(null);

    setIsQuoteSubmitting(true);
    try {
      const newLead = await api.createFarewellLead({
        familyStewardName: quoteContactName.trim(),
        familyContactPhone: quotePhone.trim(),
        city: quoteCity,
        serviceNeeded: quoteTargetService || 'General Consultation',
        notes: `Urgency: ${quoteUrgency}. Date: ${quoteDate}. Pref: ${quoteContactPref}. Note: ${quoteDescription}`,
        providerId: quoteTargetProvider.id,
      });
      setQuoteSuccessRef(newLead.id.slice(-6).toUpperCase());
    } catch {
      // A failed enquiry must say so — never invent a reference number.
      setQuoteSubmitError(
        'Your enquiry could not be sent. Please try again in a moment.',
      );
    } finally {
      setIsQuoteSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: PROVIDER PROFILE VIEW (/farewell/providers/:slug)
  // ──────────────────────────────────────────────────────────────────────────
  if (activeProvider) {
    return (
      <div
        className={`min-h-screen transition-colors ${
          isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#111820]'
        }`}
      >
        {/* Navigation Breadcrumb / Back Bar */}
        <div
          className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
            isDark ? 'bg-[#111820]/95 border-[#202C40]' : 'bg-[#F3EEE4]/95 border-[#E5DED2]'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <button
              onClick={handleBackToResults}
              className={`inline-flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                isDark ? 'text-[#9CA3AF] hover:text-[#F8F5EE]' : 'text-[#6B7280] hover:text-[#111820]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Providers</span>
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                {activeProvider.city}
              </span>
              <span className="opacity-40">•</span>
              <span className="text-xs font-semibold text-[#B99452]">
                ★ {activeProvider.rating.toFixed(1)} ({activeProvider.reviewCount})
              </span>
            </div>
          </div>
        </div>

        {/* Profile Hero Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          {/* Cover Photo Banner */}
          <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-3xl overflow-hidden border shadow-sm group">
            <img
              src={activeProvider.photoUrl}
              alt={activeProvider.businessName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            
            {/* Overlay Badges */}
            <div className="absolute top-4 right-4 flex flex-wrap gap-2">
              {activeProvider.verifiedBadges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-md border border-white/20"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B99452]" />
                  {b}
                </span>
              ))}
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-white">
              <div className="flex items-center gap-4">
                {activeProvider.logoUrl && (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/60 shadow-lg bg-black/40 flex-shrink-0">
                    <img
                      src={activeProvider.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#D1B477] font-semibold">
                    {activeProvider.category}
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white mt-0.5">
                    {activeProvider.businessName}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
                    {activeProvider.tagline}
                  </p>
                </div>
              </div>

              {/* Price & Rating quick card */}
              <div className="flex sm:flex-col items-baseline sm:items-end gap-3 sm:gap-0 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex-shrink-0">
                <span className="text-[11px] uppercase tracking-wider text-white/70">Starting from</span>
                <span className="text-xl sm:text-2xl font-bold text-[#D1B477]">{activeProvider.startingPrice}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Direct Contact Actions */}
          <div
            className={`mt-6 p-5 sm:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2] shadow-xs'
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div>
                <span className={`block text-[11px] uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  Rating
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-4 h-4 fill-[#B99452] text-[#B99452]" />
                  <span className="text-base font-bold">{activeProvider.rating.toFixed(1)}</span>
                  <span className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                    ({activeProvider.reviewCount})
                  </span>
                </div>
              </div>

              <div>
                <span className={`block text-[11px] uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  Response Time
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-[#B99452]" />
                  <span className="text-sm font-semibold">
                    {activeProvider.responseTime || 'Response time not stated'}
                  </span>
                </div>
              </div>

              <div>
                <span className={`block text-[11px] uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  Location
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#B99452]" />
                  <span className="text-sm font-semibold">{activeProvider.city}</span>
                </div>
              </div>

              <div>
                <span className={`block text-[11px] uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  Availability
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold">Open Now</span>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => handleOpenQuoteModal(activeProvider)}
                className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm cursor-pointer bg-[#B99452] text-[#111820] hover:bg-[#D1B477]"
              >
                Request Quote
              </button>
              <a
                href={`https://wa.me/${activeProvider.whatsapp.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(activeProvider.businessName)},%20I%20found%20you%20on%20Pithros%20and%20would%20like%20to%20inquire%20about%20your%20services.`}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#202C40] hover:bg-[#111820] text-emerald-400'
                    : 'border-[#E5DED2] hover:bg-[#F3EEE4] text-emerald-700'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:${activeProvider.phone}`}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#202C40] text-[#9CA3AF] hover:text-[#F8F5EE] hover:bg-[#111820]'
                    : 'border-[#E5DED2] text-[#6B7280] hover:text-[#111820] hover:bg-[#F3EEE4]'
                }`}
                title={`Call ${activeProvider.phone}`}
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Profile Content Tabs */}
          <div className="mt-8 border-b border-[#E5DED2] dark:border-[#202C40] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'services', label: `Services (${activeProvider.services?.length || 0})` },
              { id: 'photos', label: `Photos (${activeProvider.photos.length})` },
              { id: 'reviews', label: `Reviews (${activeProvider.reviewCount})` },
              { id: 'faqs', label: 'FAQs' },
              { id: 'location', label: 'Location' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id as any)}
                className={`pb-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                  activeProfileTab === tab.id
                    ? 'border-[#B99452] text-[#B99452] font-semibold'
                    : isDark
                    ? 'border-transparent text-[#9CA3AF] hover:text-[#F8F5EE]'
                    : 'border-transparent text-[#6B7280] hover:text-[#111820]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeProfileTab === 'overview' && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-2">About {activeProvider.businessName}</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                    {activeProvider.description}
                  </p>
                </div>

                {/* Service areas */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                  }`}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3">Service Areas & Zones Covered</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeProvider.serviceAreas.map((area) => (
                      <span
                        key={area}
                        className={`text-xs px-3 py-1 rounded-full border ${
                          isDark
                            ? 'bg-[#111820] border-[#202C40] text-[#D1D5DB]'
                            : 'bg-[#F3EEE4] border-[#E5DED2] text-[#4B5563]'
                        }`}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Verification & Compliance */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                  }`}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3">Verified Credentials & Standards</h4>
                  <div className="space-y-2.5">
                    {activeProvider.verifiedBadges.map((badge) => (
                      <div key={badge} className="flex items-center gap-3 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="font-medium">{badge}</span>
                        <span className={`text-[11px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          — Verified on Pithros registry
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Quick Card */}
              <div className="space-y-6">
                <div
                  className={`p-6 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                  }`}
                >
                  <h4 className="text-sm font-semibold">Operating Hours & Contact</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>Hours:</span>
                      <span className="font-medium">{activeProvider.operatingHours}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>Phone:</span>
                      <span className="font-medium">{activeProvider.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>Address:</span>
                      <span className="font-medium text-right max-w-[180px]">{activeProvider.address || activeProvider.city}</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => handleOpenQuoteModal(activeProvider)}
                  >
                    Request a Direct Quote
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Structured Services Menu */}
          {activeProfileTab === 'services' && (
            <div className="mt-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-serif font-semibold">Service Menu & Offerings</h3>
                  <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                    Transparent pricing with itemized options. Click any service to view full inclusions and request a customized quote.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenQuoteModal(activeProvider)}
                >
                  Request Custom Package
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProvider.services?.map((srv) => (
                  <div
                    key={srv.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] hover:border-[#B99452]/50'
                        : 'bg-[#FCFAF5] border-[#E5DED2] hover:border-[#B99452]/70 shadow-xs'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-base font-serif font-semibold">{srv.name}</h4>
                        <span className="text-sm font-bold text-[#B99452] whitespace-nowrap">
                          {srv.startingPrice}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                        {srv.description}
                      </p>

                      {srv.estimatedTime && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#B99452] pt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Estimated time: {srv.estimatedTime}</span>
                        </div>
                      )}

                      {srv.included && srv.included.length > 0 && (
                        <div className="pt-2 space-y-1">
                          <span className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                            What’s Included:
                          </span>
                          <ul className="text-xs space-y-1">
                            {srv.included.map((inc, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span>{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#E5DED2] dark:border-[#202C40] flex items-center justify-between">
                      <button
                        onClick={() => setSelectedServiceDetail(srv)}
                        className={`text-xs font-semibold underline transition-colors cursor-pointer ${
                          isDark ? 'text-[#D1B477] hover:text-[#B99452]' : 'text-[#B45309] hover:text-[#78350F]'
                        }`}
                      >
                        View details →
                      </button>
                      <button
                        onClick={() => handleOpenQuoteModal(activeProvider, srv.name)}
                        className="text-xs px-3.5 py-1.5 rounded-xl font-medium bg-[#B99452] text-[#111820] hover:bg-[#D1B477] transition-colors cursor-pointer"
                      >
                        Request Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Photos Gallery */}
          {activeProfileTab === 'photos' && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-semibold">Provider Photo Gallery</h3>
                  <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                    Authentic facility, transport, ceremony setups, and service coordination photos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {activeProvider.photos.map((photo, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveGalleryModalPhoto(photo)}
                    className="group relative aspect-square rounded-2xl overflow-hidden border border-[#E5DED2] dark:border-[#202C40] cursor-pointer"
                  >
                    <img
                      src={photo}
                      alt={`Gallery item ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Reviews & Ratings */}
          {activeProfileTab === 'reviews' && (
            <div className="mt-8 space-y-8">
              {/* Rating Summary & Distribution */}
              <div
                className={`p-6 rounded-2xl border grid grid-cols-1 md:grid-cols-3 gap-6 items-center ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="text-center md:text-left space-y-1">
                  <div className="text-4xl sm:text-5xl font-serif font-bold text-[#B99452]">
                    {activeProvider.rating.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-1 text-[#B99452]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                    Based on {activeProvider.reviewCount} verified community reviews
                  </p>
                </div>

                {/* Rating Distribution Bar Chart */}
                <div className="md:col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = activeProvider.ratingDistribution?.[stars] || 0;
                    const percent = Math.round((count / activeProvider.reviewCount) * 100) || 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-medium flex items-center gap-1">
                          {stars} <Star className="w-3 h-3 text-[#B99452] fill-current" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-[#B99452] rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className={`w-10 text-right ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Demo Mode Notice */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  isDark ? 'bg-[#111820] border-[#202C40] text-[#9CA3AF]' : 'bg-[#F3EEE4] border-[#E5DED2] text-[#6B7280]'
                }`}
              >
                <Info className="w-4 h-4 text-[#B99452] flex-shrink-0" />
                <span>
                  Demo Mode Active: Reviews displayed here illustrate family feedback patterns. Real-world claims are verified per booking.
                </span>
              </div>

              {/* Review Cards */}
              <div className="space-y-4">
                {activeProvider.reviews?.map((rev) => (
                  <div
                    key={rev.id}
                    className={`p-5 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#B99452]/20 text-[#B99452] font-bold text-xs flex items-center justify-center">
                          {rev.author[0]}
                        </div>
                        <div>
                          <span className="text-sm font-semibold block">{rev.author}</span>
                          <span className={`text-[11px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                            Used: {rev.serviceUsed || 'Farewell Service'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[#B99452]">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                      “{rev.comment}”
                    </p>
                    <span className={`text-[10px] block pt-1 ${isDark ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
                      {rev.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: FAQs */}
          {activeProfileTab === 'faqs' && (
            <div className="mt-8 max-w-3xl space-y-4">
              <h3 className="text-lg font-serif font-semibold mb-4">Frequently Asked Questions</h3>
              {activeProvider.faqs?.map((faq, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border space-y-1.5 ${
                    isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                  }`}
                >
                  <h4 className="text-sm font-semibold">{faq.q}</h4>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 6: Location */}
          {activeProfileTab === 'location' && (
            <div className="mt-8 max-w-3xl space-y-4">
              <h3 className="text-lg font-serif font-semibold mb-2">Office & Operational Base</h3>
              <div
                className={`p-6 rounded-2xl border space-y-4 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#B99452] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold block">{activeProvider.businessName}</span>
                    <p className={`text-xs mt-1 ${isDark ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                      {activeProvider.address || `${activeProvider.city}, India`}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                      Dispatches across: {activeProvider.serviceAreas.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Abstract Stylized Map Card */}
                <div className="h-48 rounded-xl bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <MapPin className="w-8 h-8 text-[#B99452] animate-bounce" />
                  <span className="text-xs font-semibold">{activeProvider.city} Central Hub</span>
                  <span className={`text-[11px] max-w-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                    Immediate family response radius: 35 km around {activeProvider.city} metro area.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Service Details View */}
        {selectedServiceDetail && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`max-w-lg w-full rounded-3xl border p-6 space-y-5 ${
                isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#111820]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#B99452] uppercase tracking-wider">Service Inclusions</span>
                  <h3 className="text-xl font-serif font-bold mt-1">{selectedServiceDetail.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedServiceDetail(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                {selectedServiceDetail.description}
              </p>

              {selectedServiceDetail.estimatedTime && (
                <div className="text-xs text-[#B99452] flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Estimated Response Time: {selectedServiceDetail.estimatedTime}</span>
                </div>
              )}

              {selectedServiceDetail.included && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold block">Full Package Inclusions:</span>
                  <ul className="text-xs space-y-1.5">
                    {selectedServiceDetail.included.map((inc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-[#E5DED2] dark:border-[#202C40] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase block opacity-60">Price Estimate</span>
                  <span className="text-lg font-bold text-[#B99452]">{selectedServiceDetail.startingPrice}</span>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    const srvName = selectedServiceDetail.name;
                    setSelectedServiceDetail(null);
                    handleOpenQuoteModal(activeProvider, srvName);
                  }}
                >
                  Request Quote for this Service
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Fullscreen Photo Lightbox */}
        {activeGalleryModalPhoto && (
          <div
            onClick={() => setActiveGalleryModalPhoto(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <button
              onClick={() => setActiveGalleryModalPhoto(null)}
              className="absolute top-6 right-6 text-white/80 hover:text-white p-2"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={activeGalleryModalPhoto}
              alt="Expanded view"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        )}

        {/* Shared Request Quote Modal Component */}
        {renderQuoteModal()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: FAREWELL NETWORK MARKETPLACE LANDING
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#111820]'
      }`}
    >
      {/* Search Header Banner */}
      <div
        className={`border-b pt-12 pb-10 px-4 sm:px-6 lg:px-8 transition-colors ${
          isDark
            ? 'bg-[#182337] border-[#202C40]'
            : 'bg-gradient-to-b from-[#FCFAF5] to-[#F3EEE4] border-[#E5DED2]'
        }`}
      >
        <div className="max-w-5xl mx-auto space-y-6 text-center">
          <div className="space-y-2">
            <span
              className={`text-xs uppercase tracking-[0.2em] font-semibold text-[#B99452]`}
            >
              Verified Farewell & Remembrance Marketplace
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">
              How can we help?
            </h1>
            <p className={`text-sm sm:text-base max-w-xl mx-auto ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              Find compassionate local service providers for dignified ceremonies, temperature-controlled transit, memorial plaques, and legal assistance.
            </p>
          </div>

          {/* Unified Marketplace Search Bar (Swiggy/Airbnb pattern) */}
          <div
            data-ui-component="form"
            style={{ fontFamily: metadata.uiFontFamily }}
            className={`p-2.5 rounded-2xl border shadow-lg max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-2 transition-colors ${
              isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            {/* Search Input */}
            <div className="flex items-center gap-2.5 px-3 flex-1 w-full">
              <Search className="w-5 h-5 text-[#B99452] flex-shrink-0" />
              <input
                type="text"
                aria-label={t('form_search_provider_label', 'Search farewell providers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('form_search_provider', 'Search service or provider (e.g. Serene Transitions, Transit)...')}
                style={{ fontFamily: metadata.uiFontFamily }}
                className="w-full text-sm bg-transparent focus:outline-none placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-[#E5DED2] dark:border-[#202C40] px-3 py-1.5 w-full md:w-auto">
              <MapPin className="w-4 h-4 text-[#B99452] flex-shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label={t('form_select_city', 'Filter by City')}
                style={{ fontFamily: metadata.uiFontFamily }}
                className={`text-xs sm:text-sm font-medium bg-transparent focus:outline-none cursor-pointer ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#111820]'
                }`}
              >
                {cities.map((city) => (
                  <option key={city} value={city} className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                    {city === 'All Cities' ? t('form_all_cities', 'All Cities') : city}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-[#E5DED2] dark:border-[#202C40] px-3 py-1.5 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by Service Category"
                className={`text-xs sm:text-sm font-medium bg-transparent focus:outline-none cursor-pointer ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#111820]'
                }`}
              >
                <option value="all" className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                  All Services
                </option>
                <option value="Farewell Coordinators" className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                  Farewell Coordination
                </option>
                <option value="Transport & Repatriation" className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                  Transport & Repatriation
                </option>
                <option value="Documentation Assistance" className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                  Documentation
                </option>
                <option value="Floral & Memorial Decor" className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                  Floral Tributes
                </option>
                <option value="Memorial Makers & Plaques" className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                  Memorial Plaques
                </option>
              </select>
            </div>

            {/* Concierge Help CTA */}
            <button
              onClick={() => handleOpenQuoteModal()}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#B99452] text-[#111820] hover:bg-[#D1B477] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              Get Guidance
            </button>
          </div>

          {/* Browse Services Category Pills */}
          <div className="pt-2">
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
              {categoryPresets.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#B99452] text-[#111820] border-[#B99452] font-semibold shadow-xs'
                        : isDark
                        ? 'bg-[#111820] border-[#202C40] text-[#9CA3AF] hover:text-[#F8F5EE] hover:border-[#B99452]/40'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#4B5563] hover:text-[#111820] hover:border-[#B99452]/60 shadow-2xs'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Results Toolbar: Count, Sorting & Filter Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED2] dark:border-[#202C40]">
          <div className="flex items-center gap-3">
            <span className="text-base font-serif font-bold">
              {filteredProviders.length}{' '}
              {filteredProviders.length === 1 ? 'provider' : 'providers'} available
            </span>
            {selectedCity !== 'all' && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'}`}>
                Near {selectedCity}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>Sort by:</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as any)}
                aria-label="Sort providers"
                className={`text-xs font-semibold px-2 py-1 rounded-lg border bg-transparent focus:outline-none cursor-pointer ${
                  isDark ? 'border-[#202C40] text-[#F8F5EE]' : 'border-[#E5DED2] text-[#111820]'
                }`}
              >
                <option value="recommended" className={isDark ? 'bg-[#182337]' : 'bg-white'}>Recommended</option>
                <option value="rating" className={isDark ? 'bg-[#182337]' : 'bg-white'}>Highest Rating</option>
                <option value="response" className={isDark ? 'bg-[#182337]' : 'bg-white'}>Fastest Response</option>
                <option value="price" className={isDark ? 'bg-[#182337]' : 'bg-white'}>Starting Price</option>
              </select>
            </div>

            {/* Quick Response Filter */}
            <button
              onClick={() => setFilterResponseTime(filterResponseTime === 'fast' ? 'all' : 'fast')}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                filterResponseTime === 'fast'
                  ? 'bg-[#B99452] text-[#111820] border-[#B99452] font-semibold'
                  : isDark
                  ? 'border-[#202C40] text-[#9CA3AF]'
                  : 'border-[#E5DED2] text-[#6B7280]'
              }`}
            >
              &lt; 20m Response
            </button>

            {/* 4.8+ Rating Filter */}
            <button
              onClick={() => setFilterRating(filterRating === 4.8 ? null : 4.8)}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                filterRating === 4.8
                  ? 'bg-[#B99452] text-[#111820] border-[#B99452] font-semibold'
                  : isDark
                  ? 'border-[#202C40] text-[#9CA3AF]'
                  : 'border-[#E5DED2] text-[#6B7280]'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>4.8+</span>
            </button>
          </div>
        </div>

        {/* Provider Cards Grid (Image-First, Swiggy/Zomato consumer discovery pattern) */}
        {isLoadingProviders ? (
          <div
            className={`py-16 text-center rounded-2xl border ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <p className="text-base font-serif">Loading verified providers…</p>
          </div>
        ) : providersError ? (
          <div
            className={`py-16 text-center rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <p className="text-base font-serif">{providersError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mx-auto"
            >
              Try again
            </Button>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div
            className={`py-16 text-center rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <p className="text-base font-serif">No verified providers matching your exact filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('all');
                setSelectedCategory('all');
                setFilterRating(null);
                setFilterResponseTime('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                data-ui-component="card"
                style={{ fontFamily: metadata.uiFontFamily }}
                className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between group ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] hover:border-[#B99452]/40'
                    : 'bg-[#FCFAF5] border-[#E5DED2] hover:border-[#B99452]/60 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Photo Cover with Badges */}
                  <div
                    onClick={() => handleOpenProviderProfile(provider.slug)}
                    className="relative h-48 w-full overflow-hidden cursor-pointer"
                  >
                    <img
                      src={provider.photoUrl}
                      alt={provider.businessName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

                    {/* Category pill */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/20">
                        {provider.category}
                      </span>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#111820]/80 text-[#D1B477] backdrop-blur-md border border-white/20">
                      <Star className="w-3.5 h-3.5 fill-[#B99452] text-[#B99452]" />
                      <span>{provider.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-white/70 font-normal">({provider.reviewCount})</span>
                    </div>

                    {/* Response Time & City */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#B99452]" />
                        <span>{provider.city}</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-[#D1B477]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {provider.responseTime
                            ? `${provider.responseTime} ${t('card_response_time', 'response')}`
                            : provider.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content (2-3 lines max) */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      {provider.logoUrl && (
                        <img
                          src={provider.logoUrl}
                          alt="Logo"
                          className="w-10 h-10 rounded-xl object-cover border border-neutral-300 dark:border-neutral-700 flex-shrink-0"
                        />
                      )}
                      <div>
                        <h3
                          onClick={() => handleOpenProviderProfile(provider.slug)}
                          className="text-base font-serif font-bold cursor-pointer hover:underline line-clamp-1"
                        >
                          {provider.businessName}
                        </h3>
                        <p className={`text-xs line-clamp-2 mt-0.5 leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          {provider.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Verified Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {provider.verifiedBadges.slice(0, 2).map((b) => (
                        <span
                          key={b}
                          className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                            isDark
                              ? 'bg-[#111820] border-[#202C40] text-neutral-300'
                              : 'bg-[#F3EEE4] border-[#E5DED2] text-neutral-700'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3 text-[#B99452]" />
                          <span>{b}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Starting Price & CTAs */}
                <div className="px-5 pb-5 pt-2 border-t border-[#E5DED2] dark:border-[#202C40] flex items-center justify-between gap-3">
                  <div>
                    <span className={`block text-[10px] uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                      {t('card_starting_from', 'Starting from')}
                    </span>
                    <span className="text-base font-bold text-[#B99452]">
                      {provider.startingPrice}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenQuoteModal(provider)}
                      style={{ fontFamily: metadata.uiFontFamily }}
                      className={`text-xs px-3 py-2 rounded-xl font-medium border transition-colors cursor-pointer ${
                        isDark
                          ? 'border-[#202C40] hover:bg-[#111820] text-neutral-200'
                          : 'border-[#E5DED2] hover:bg-[#F3EEE4] text-neutral-800'
                      }`}
                    >
                      {t('card_request_quote', 'Quote')}
                    </button>
                    <button
                      onClick={() => handleOpenProviderProfile(provider.slug)}
                      style={{ fontFamily: metadata.uiFontFamily }}
                      className="text-xs px-3.5 py-2 rounded-xl font-semibold bg-[#B99452] text-[#111820] hover:bg-[#D1B477] transition-colors cursor-pointer shadow-2xs"
                    >
                      {t('card_view_profile', 'View Profile')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Partner Onboarding Banner */}
        <div
          className={`mt-16 p-8 sm:p-10 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-colors ${
            isDark
              ? 'bg-gradient-to-br from-[#182337] to-[#111820] border-[#202C40]'
              : 'bg-gradient-to-br from-[#FCFAF5] to-[#EAE4D7] border-[#E5DED2]'
          }`}
        >
          <div className="space-y-2 text-center md:text-left">
            <span
              className={`text-xs uppercase tracking-widest font-semibold ${
                isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
              }`}
            >
              Are you a Bereavement Service Provider?
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold">
              Join the Pithros Farewell Partner Network
            </h3>
            <p className={`text-xs sm:text-sm max-w-xl ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Offer compassionate, accredited bereavement care, transit coordination, or memorial keepsakes. Receive verified family leads and manage requests directly through the Partner Platform.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => onNavigate('/signup?role=partner')}
            >
              Register as Care Partner
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => onNavigate('/partner')}
            >
              Partner Portal Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Shared Request Quote Modal */}
      {renderQuoteModal()}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SHARED REQUEST QUOTE MODAL HELPER
  // ──────────────────────────────────────────────────────────────────────────
  function renderQuoteModal() {
    if (!isQuoteModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div
          className={`max-w-lg w-full rounded-3xl border p-6 sm:p-7 space-y-5 my-8 ${
            isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#111820]'
          }`}
        >
          {quoteSuccessRef ? (
            /* Success confirmation */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold">Your request has been sent.</h3>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  {quoteTargetProvider?.businessName} has received your inquiry.
                </p>
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-[#B99452]/20 text-[#B99452] text-xs font-mono font-semibold">
                  Reference: #{quoteSuccessRef}
                </div>
              </div>
              <p className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                Typical response time: {quoteTargetProvider?.responseTime || '< 20 minutes'}. They will reach out via your preferred method ({quoteContactPref}).
              </p>
              <div className="pt-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsQuoteModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Request Quote Form */
            <form
              onSubmit={handleQuoteSubmit}
              data-ui-component="form"
              style={{ fontFamily: metadata.uiFontFamily }}
              className="space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#B99452] uppercase tracking-wider">Fast Concierge Request</span>
                  <h3 className="text-xl font-serif font-bold mt-0.5">
                    Request Quote from {quoteTargetProvider?.businessName || 'Verified Provider'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Service Required */}
              <div>
                <label className="block text-xs font-medium mb-1">Service Needed *</label>
                <input
                  type="text"
                  required
                  value={quoteTargetService}
                  onChange={(e) => setQuoteTargetService(e.target.value)}
                  placeholder="e.g. Farewell Coordination, Immediate Transit, Plaque..."
                  style={{ fontFamily: metadata.uiFontFamily }}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-[#F3EEE4] border-[#E5DED2]'
                  }`}
                />
              </div>

              {/* Urgency & City Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">{t('form_urgency', 'Service Urgency')}</label>
                  <select
                    value={quoteUrgency}
                    onChange={(e) => setQuoteUrgency(e.target.value as any)}
                    style={{ fontFamily: metadata.uiFontFamily }}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-[#F3EEE4] border-[#E5DED2]'
                    }`}
                  >
                    <option value="Immediate">{t('form_immediate', 'Immediate (Today/Tomorrow)')}</option>
                    <option value="Within 3 Days">Within 3 Days</option>
                    <option value="This Week">This Week</option>
                    <option value="Planning Ahead">Planning Ahead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">City / Area</label>
                  <input
                    type="text"
                    required
                    value={quoteCity}
                    onChange={(e) => setQuoteCity(e.target.value)}
                    placeholder="e.g. Bengaluru, Indiranagar"
                    style={{ fontFamily: metadata.uiFontFamily }}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-[#F3EEE4] border-[#E5DED2]'
                    }`}
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-medium mb-1">{t('form_description', 'Brief Description or Special Requests')}</label>
                <textarea
                  rows={3}
                  value={quoteDescription}
                  onChange={(e) => setQuoteDescription(e.target.value)}
                  placeholder="Number of family members expected, special cultural/religious customs, timings..."
                  style={{ fontFamily: metadata.uiFontFamily }}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none resize-none ${
                    isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-[#F3EEE4] border-[#E5DED2]'
                  }`}
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">{t('form_full_name', 'Your Name')} *</label>
                  <input
                    type="text"
                    required
                    value={quoteContactName}
                    onChange={(e) => setQuoteContactName(e.target.value)}
                    placeholder="e.g. Aditi Sharma"
                    style={{ fontFamily: metadata.uiFontFamily }}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-[#F3EEE4] border-[#E5DED2]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">{t('form_phone', 'Phone Number')} *</label>
                  <input
                    type="tel"
                    required
                    value={quotePhone}
                    onChange={(e) => {
                      setQuotePhone(e.target.value);
                      if (quotePhoneError) setQuotePhoneError(null);
                    }}
                    placeholder="+91 98450 00000"
                    style={{ fontFamily: metadata.uiFontFamily }}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none ${
                      quotePhoneError
                        ? 'border-amber-500 focus:border-amber-500'
                        : isDark
                        ? 'bg-[#111820] border-[#202C40]'
                        : 'bg-[#F3EEE4] border-[#E5DED2]'
                    }`}
                  />
                  {quotePhoneError && (
                    <p className="text-[11px] text-amber-500 mt-1">{quotePhoneError}</p>
                  )}
                </div>
              </div>

              {/* Preferred Contact Method */}
              <div>
                <label className="block text-xs font-medium mb-1.5">{t('form_contact_pref', 'Preferred Contact Method')}</label>
                <div className="flex gap-4 text-xs">
                  {(['WhatsApp', 'Phone', 'Email'] as const).map((method) => (
                    <label key={method} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="contactPref"
                        checked={quoteContactPref === method}
                        onChange={() => setQuoteContactPref(method)}
                        className="text-[#B99452] focus:ring-[#B99452]"
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {quoteSubmitError && (
                <p className="text-xs text-amber-500 text-center">{quoteSubmitError}</p>
              )}

              <div className="pt-3 border-t border-[#E5DED2] dark:border-[#202C40] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  style={{ fontFamily: metadata.uiFontFamily }}
                  className={`text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'text-[#9CA3AF] hover:text-[#F8F5EE]' : 'text-[#6B7280] hover:text-[#111820]'
                  }`}
                >
                  {t('form_cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isQuoteSubmitting}
                  style={{ fontFamily: metadata.uiFontFamily }}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-[#B99452] text-[#111820] hover:bg-[#D1B477] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isQuoteSubmitting ? 'Sending Request…' : t('form_submit', 'Send Quote Request')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }
};
