import React, { useState, useEffect } from 'react';
import { FarewellLead } from '../../types';
import { api } from '../../services/api';
import { providersApi, type PartnerProfile } from '../../services/api/providers';
import { Button } from '../../components/ui/Button';
import {
  Users,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  AlertCircle,
  Building2,
  Calendar,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const PartnerDashboardView: React.FC = () => {
  const { isDark } = useTheme();
  const [leads, setLeads] = useState<FarewellLead[]>([]);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const [list, partner] = await Promise.all([
        api.getFarewellLeads(),
        providersApi.getProfile(),
      ]);
      setLeads(list);
      setProfile(partner);
      setLoadError(null);
    } catch {
      setLoadError('The partner console could not be loaded right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeads = async () => {
    const list = await api.getFarewellLeads();
    setLeads(list);
  };

  const handleUpdateStatus = async (leadId: string, status: FarewellLead['status']) => {
    await api.updateLeadStatus(leadId, status);
    loadLeads();
  };

  const statusLabel =
    profile?.status === 'approved'
      ? 'Accepting Requests'
      : profile?.status === 'suspended'
      ? 'Listing Paused'
      : profile?.status === 'rejected'
      ? 'Application Declined'
      : 'Awaiting Approval';

  const openLeadCount = leads.filter(
    (lead) => lead.status === 'new' || lead.status === 'contacted' || lead.status === 'in_service',
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
          isDark
            ? 'border-[#202C40] bg-gradient-to-r from-[#14120E] via-[#182337] to-[#14120E]'
            : 'border-[#E5DED2] bg-gradient-to-r from-[#FFF8EE] via-[#FCFAF5] to-[#FFF8EE] shadow-xs'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                isDark ? 'text-[#6EE7B7]' : 'text-[#1B4D3E]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isDark ? 'bg-[#6EE7B7]' : 'bg-[#2D7A5F]'
                }`}
              />
              Farewell Partner Portal
            </span>
            <span className={`text-xs ${isDark ? 'text-[#737982]' : 'text-[#C5BBAE]'}`}>•</span>
            <span className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              {profile?.businessName ?? 'Loading partner profile…'}
            </span>
          </div>
          <h1
            className={`text-2xl font-serif mt-1 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Provider Operations Desk
          </h1>
          <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            {profile?.description ||
              (profile?.city
                ? `Assisting families in ${profile.city}.`
                : 'Complete your profile so families know how you can help.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3.5 py-1.5 rounded-xl border text-right ${
              isDark
                ? 'bg-[#182337] border-[#202C40]'
                : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <span
              className={`text-[10px] block ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Service Status
            </span>
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-[#6EE7B7]' : 'text-[#1B4D3E]'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <div
            className={`px-3.5 py-1.5 rounded-xl border text-right ${
              isDark
                ? 'bg-[#182337] border-[#202C40]'
                : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <span
              className={`text-[10px] block ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Open Enquiries
            </span>
            <span
              className={`text-xs font-semibold ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              {openLeadCount}
            </span>
          </div>
        </div>
      </div>

      {/* Leads Pipeline */}
      <div className="space-y-4">
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
          }`}
        >
          <div>
            <h3
              className={`text-lg font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Incoming Family Requests & Leads
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              Families who requested assistance through the Farewell Network.
            </p>
          </div>
          <span
            className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
              isDark
                ? 'text-[#B99452] bg-[#B99452]/10 border-[#B99452]/20'
                : 'text-[#8C5C0F] bg-[#E5DED2] border-[#D9941E]/30'
            }`}
          >
            {leads.filter((l) => l.status === 'new').length} New Urgent
          </span>
        </div>

        <div className="space-y-3">
          {isLoading && (
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              Loading family requests…
            </p>
          )}
          {loadError && (
            <p className="text-xs text-amber-500">{loadError}</p>
          )}
          {!isLoading && !loadError && leads.length === 0 && (
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              No family requests yet. Enquiries from the Farewell Network appear here.
            </p>
          )}
          {leads.map((lead) => (
            <div
              key={lead.id}
              className={`p-5 rounded-2xl border transition-all ${
                lead.status === 'new'
                  ? isDark
                    ? 'border-[#B99452]/50 bg-[#16120E]'
                    : 'border-[#23324A]/50 bg-[#E5DED2] shadow-xs'
                  : isDark
                  ? 'border-[#202C40] bg-[#182337]'
                  : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      isDark
                        ? 'bg-[#182337] text-[#B99452]'
                        : 'bg-[#E5DED2] text-[#23324A]'
                    }`}
                  >
                    {lead.familyStewardName.slice(0, 1)}
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-serif font-medium ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {lead.familyStewardName}
                    </h4>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      {lead.city} • Requested {lead.serviceNeeded}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                      lead.status === 'new'
                        ? isDark
                          ? 'bg-[#B99452]/20 text-[#B99452] border border-[#B99452]/40'
                          : 'bg-[#E5DED2] text-[#8C5C0F] border border-[#D9941E]/40'
                        : lead.status === 'contacted'
                        ? isDark
                          ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : lead.status === 'in_service'
                        ? isDark
                          ? 'bg-purple-950/40 text-purple-300 border border-purple-800/40'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                        : isDark
                        ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border border-[#2D7A5F]/40'
                        : 'bg-[#2D7A5F]/15 text-[#1B4D3E] border border-[#2D7A5F]/30'
                    }`}
                  >
                    {lead.status.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      isDark ? 'text-[#737982]' : 'text-[#7D766D]'
                    }`}
                  >
                    {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {lead.notes && (
                <p
                  className={`text-xs p-3 rounded-xl border mb-3 leading-relaxed ${
                    isDark
                      ? 'text-[#D9D2C6] bg-[#182337]/70 border-[#202C40]'
                      : 'text-[#554F48] bg-[#E5DED2] border-[#E5DED2]'
                  }`}
                >
                  “{lead.notes}”
                </p>
              )}

              {/* Action row */}
              <div
                className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                <div
                  className={`flex items-center gap-3 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 font-medium ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    <Phone
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    />{' '}
                    {lead.familyContactPhone}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${lead.familyContactPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                      isDark
                        ? 'bg-[#2D7A5F]/20 hover:bg-[#2D7A5F]/30 text-[#6EE7B7] border-[#2D7A5F]/40'
                        : 'bg-[#2D7A5F]/15 hover:bg-[#2D7A5F]/25 text-[#1B4D3E] border-[#2D7A5F]/30'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Family</span>
                  </a>

                  {lead.status === 'new' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateStatus(lead.id, 'contacted')}
                    >
                      Mark Contacted
                    </Button>
                  )}
                  {lead.status === 'contacted' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus(lead.id, 'in_service')}
                    >
                      Start Service
                    </Button>
                  )}
                  {lead.status === 'in_service' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus(lead.id, 'completed')}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

