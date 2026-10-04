import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, MapPin, Calendar, X } from 'lucide-react';
import { Memorial } from '../types';
import { VerificationBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { memorialsApi } from '../services/api/memorials';
import { mapVerificationStatus, type ApiSearchResult } from '../services/api/mappers';

interface ExploreMemorialsViewProps {
  memorials: Memorial[];
  onOpenMemorial: (slug: string) => void;
  onNavigate: (route: string) => void;
}

export const ExploreMemorialsView: React.FC<ExploreMemorialsViewProps> = ({
  memorials,
  onOpenMemorial,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const { t, metadata } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [activeList, setActiveList] = useState<Memorial[]>(memorials && memorials.length > 0 ? memorials : []);

  useEffect(() => {
    if (memorials && memorials.length > 0) {
      setActiveList(memorials);
    } else {
      memorialsApi.search().then((results) => {
        if (results && results.length > 0) {
          const mapped: Memorial[] = results.map((r: ApiSearchResult) => ({
            id: r.slug,
            slug: r.slug,
            fullName: r.fullName,
            birthDate: r.birthDate || '',
            deathDate: r.deathDate || '',
            birthPlace: r.birthPlace || '',
            restingPlace: r.restingPlace || undefined,
            shortEpitaph: r.shortEpitaph || '',
            portraitUrl: r.portraitUrl || '',
            privacy: 'public',
            verificationStatus: mapVerificationStatus(r.verificationStatus),
            verificationBadgeType: (r.verificationBadgeType as any) || (r.verificationStatus === 'approved' ? 'Document Reviewed' : undefined),
            story: { overview: '', favoriteQuotes: [] },
            timeline: [],
            family: [],
            media: [],
            voiceMemories: [],
            tributes: [],
            offerings: [],
            legacyLinks: [],
            stewardId: '',
            stewardName: '',
            stewardEmail: '',
            completenessPercent: 100,
            createdAt: '',
            updatedAt: '',
          }));
          setActiveList(mapped);
        } else {
          // No public results. Never fall back to the signed-in user's own
          // memorials — this is a public explore page.
          setActiveList([]);
        }
      }).catch(() => {
        setActiveList([]);
      });
    }
  }, [memorials]);

  const filtered = activeList.filter((m) => {
    // Only show public memorials in explore
    if (m.privacy !== 'public') return false;

    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.shortEpitaph.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.birthPlace && m.birthPlace.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCity =
      selectedCity === 'all' ||
      (m.birthPlace && m.birthPlace.toLowerCase().includes(selectedCity.toLowerCase())) ||
      (m.restingPlace && m.restingPlace.toLowerCase().includes(selectedCity.toLowerCase()));

    const matchesVerif =
      verificationFilter === 'all' ||
      (verificationFilter === 'reviewed' && m.verificationStatus === 'approved') ||
      (verificationFilter === 'family' && m.verificationBadgeType === 'Family Managed');

    return matchesSearch && matchesCity && matchesVerif;
  }).sort((a, b) => {
    if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
    if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
    if (sortBy === 'birth_date_asc') return a.birthDate.localeCompare(b.birthDate);
    if (sortBy === 'death_date_desc') return b.deathDate.localeCompare(a.deathDate);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const cities = ['Bengaluru', 'Kochi', 'Mumbai', 'Amritsar', 'Pune', 'Chennai'];

  return (
    <div
      className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-10 space-y-3">
          <span
            className={`text-[11px] uppercase tracking-widest font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Memorial Registry
          </span>
          <h1
            className={`text-3xl sm:text-4xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Explore Public Memorials
          </h1>
          <p
            className={`text-xs sm:text-sm ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Discover life stories, milestone archives, and memories shared openly with the community.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div
          data-ui-component="form"
          style={{ fontFamily: metadata.uiFontFamily }}
          className="max-w-3xl mx-auto mb-12 space-y-4"
        >
          <div className="relative">
            <Search
              className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            />
            <input
              type="text"
              aria-label="Search memorials"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, life quote, or city..."
              style={{ fontFamily: metadata.uiFontFamily }}
              className={`w-full pl-12 pr-10 py-3.5 rounded-2xl border text-sm transition-colors shadow-sm focus:outline-none ${
                isDark
                  ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] placeholder-[#737982] focus:border-[#B99452]'
                  : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] placeholder-[#7D766D] focus:border-[#23324A]'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-400 hover:text-neutral-200"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-col gap-3 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar py-1 sm:w-auto">
              <span className={`mr-1 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                City:
              </span>
              <button
                onClick={() => setSelectedCity('all')}
                className={`px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                  selectedCity === 'all'
                    ? isDark
                      ? 'border-[#B99452] bg-[#B99452]/10 text-[#B99452]'
                      : 'border-[#23324A] bg-[#E5DED2] text-[#8C5C0F]'
                    : isDark
                    ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                    : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                }`}
              >
                All
              </button>
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCity(c)}
                  className={`px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                    selectedCity === c
                      ? isDark
                        ? 'border-[#B99452] bg-[#B99452]/10 text-[#B99452]'
                        : 'border-[#23324A] bg-[#E5DED2] text-[#8C5C0F]'
                      : isDark
                      ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                      : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Sort memorials"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#554F48]'
                }`}
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="name_asc">Sort: Name (A–Z)</option>
                <option value="name_desc">Sort: Name (Z–A)</option>
                <option value="birth_date_asc">Sort: Birth Year (Earliest)</option>
                <option value="death_date_desc">Sort: Passing Year (Latest)</option>
              </select>

              <select
                aria-label="Filter by verification"
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#554F48]'
                }`}
              >
                <option value="all">All Memorials</option>
                <option value="reviewed">Document Reviewed Only</option>
                <option value="family">Family Managed Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Memorial Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p
              className={`text-base font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              No public memorials found
            </p>
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Try searching with a different name or clear the filters.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {(searchQuery || selectedCity !== 'all' || verificationFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCity('all');
                    setVerificationFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('/create-memorial')}
              >
                Create a Memorial
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((m) => (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={`Open memorial for ${m.fullName}`}
                onClick={() => onOpenMemorial(m.slug)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenMemorial(m.slug);
                  }
                }}
                data-ui-component="card"
                style={{ fontFamily: metadata.uiFontFamily }}
                className={`group rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99452] ${
                  isDark
                    ? 'border-[#202C40] bg-[#182337] hover:border-[#B99452]/40'
                    : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#23324A]/50'
                }`}
              >
                <div>
                  {/* Photo & Badges */}
                  <div
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden mb-4 border ${
                      isDark
                        ? 'border-[#182337] bg-[#111820]'
                        : 'border-[#E5DED2] bg-[#E5DED2]'
                    }`}
                  >
                    <img
                      src={m.portraitUrl}
                      alt={m.fullName}
                      className="w-full h-full object-cover grayscale-[15%] group-hover:scale-103 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <VerificationBadge
                        type={m.verificationBadgeType}
                        status={m.verificationStatus}
                      />
                    </div>
                  </div>

                  {/* Title & Dates */}
                  <h3
                    className={`text-xl font-serif transition-colors ${
                      isDark
                        ? 'text-[#F8F5EE] group-hover:text-[#B99452]'
                        : 'text-[#20242A] group-hover:text-[#23324A]'
                    }`}
                  >
                    {m.fullName}
                  </h3>
                  <div
                    className={`flex items-center gap-2 text-xs font-sans font-medium mt-1 ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {m.birthDate.slice(-4)} – {m.deathDate.slice(-4)}
                    </span>
                    {m.birthPlace && (
                      <>
                        <span className={isDark ? 'text-[#737982]' : 'text-[#C4B7A5]'}>•</span>
                        <span
                          className={`flex items-center gap-1 ${
                            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                          }`}
                        >
                          <MapPin className="w-3 h-3" /> {m.birthPlace}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Quote */}
                  <p
                    className={`text-xs italic font-serif leading-relaxed line-clamp-2 mt-3 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    “{m.shortEpitaph}”
                  </p>
                </div>

                <div
                  className={`pt-4 mt-4 border-t flex items-center justify-between text-xs ${
                    isDark
                      ? 'border-[#202C40] text-[#9EA3AA]'
                      : 'border-[#E5DED2] text-[#7D766D]'
                  }`}
                >
                  <span>{m.offerings?.length || 0} offerings placed</span>
                  <span
                    className={`group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    View Memorial <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Banner */}
        <div
          className={`mt-16 p-8 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div>
            <h3
              className={`text-xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Create a memorial for your loved one
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Start for free with quiet, private-by-default remembrance.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('/create-memorial')}
            className="flex-shrink-0"
          >
            Create a Memorial
          </Button>
        </div>
      </div>
    </div>
  );
};
