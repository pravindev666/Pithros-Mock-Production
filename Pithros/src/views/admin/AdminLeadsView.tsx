import React, { useEffect, useState } from 'react';
import { Search, MapPin, Phone, Mail, Inbox } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { providersApi, type AdminLead } from '../../services/api/providers';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  contacted: 'Provider Contacted',
  quoted: 'Quote Received',
  in_discussion: 'In Discussion',
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const AdminLeadsView: React.FC = () => {
  const { isDark } = useTheme();

  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { leads: rows } = await providersApi.listAdminLeads();
        if (!cancelled) setLeads(rows);
      } catch {
        if (!cancelled) setLoadError('Family enquiries could not be loaded.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      lead.contactName.toLowerCase().includes(query) ||
      lead.providerName.toLowerCase().includes(query) ||
      lead.serviceNeeded.toLowerCase().includes(query) ||
      lead.city.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Farewell Network Enquiries
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Every family enquiry across the network, with the partner it was sent to and where it
            stands. Partners own the status; this desk is the oversight view.
          </p>
        </div>

        <span
          className={`px-3 py-1.5 rounded-full text-xs font-mono border ${
            isDark
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              : 'border-[#23324A]/30 bg-[#23324A]/10 text-[#23324A]'
          }`}
        >
          {leads.length} total enquiries
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search family, provider, service, or city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none ${
              isDark
                ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'submitted', 'contacted', 'quoted', 'booked', 'completed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all whitespace-nowrap ${
                statusFilter === status
                  ? isDark
                    ? 'bg-[#B99452] text-[#111820] font-medium'
                    : 'bg-[#23324A] text-white font-medium'
                  : isDark
                  ? 'border border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'border border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
            Loading enquiries…
          </p>
        ) : loadError ? (
          <p className="text-xs text-amber-500">{loadError}</p>
        ) : filtered.length === 0 ? (
          <div
            className={`p-10 rounded-2xl border text-center ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <Inbox className="w-6 h-6 mx-auto text-stone-400 mb-2" />
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              No family enquiries match this view.
            </p>
          </div>
        ) : (
          filtered.map((lead) => (
            <div
              key={lead.id}
              className={`p-5 rounded-2xl border space-y-3 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2
                    className={`text-sm font-medium ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {lead.contactName}
                    <span className="text-[11px] font-normal opacity-70">
                      {' '}
                      → {lead.providerName || 'Unrouted'}
                    </span>
                  </h2>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    {lead.serviceNeeded} • {lead.city || 'Location not supplied'} •{' '}
                    {formatDate(lead.createdAt)}
                  </p>
                </div>
                <span
                  className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                    lead.status === 'completed'
                      ? 'border-stone-500/30 text-stone-400 bg-stone-500/10'
                      : lead.status === 'cancelled'
                      ? 'border-red-500/30 text-red-400 bg-red-500/10'
                      : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                  }`}
                >
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-mono">{lead.contactPhone}</span>
                </div>
                {lead.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-mono">{lead.contactEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{lead.city || 'Location not supplied'}</span>
                </div>
              </div>

              {lead.message && (
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#3E3831]'
                  }`}
                >
                  “{lead.message}”
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
