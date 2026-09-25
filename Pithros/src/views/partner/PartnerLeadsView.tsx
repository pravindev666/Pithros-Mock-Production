import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface Lead {
  id: string;
  familyContact: string;
  phone: string;
  email: string;
  deceasedName: string;
  serviceRequested: string;
  status: 'new' | 'contacted' | 'in_consultation' | 'confirmed' | 'completed';
  dateReceived: string;
  location: string;
  budgetRange: string;
  notes: string;
}

export const PartnerLeadsView: React.FC = () => {
  const { isDark } = useTheme();

  const [leads, setLeads] = useState<Lead[]>([
    {
      id: 'lead-101',
      familyContact: 'Smt. Radhika Nair',
      phone: '+91 98451 22910',
      email: 'radhika.nair@example.com',
      deceasedName: 'Late K. G. Nair',
      serviceRequested: 'Traditional Kerala Memorial & Floral Tribute Ceremony',
      status: 'new',
      dateReceived: '2 hours ago',
      location: 'Kochi, Kerala (Within 25km)',
      budgetRange: '₹35,000 – ₹50,000',
      notes:
        'Family requests white marigold garlands, brass oil lamps (Nilavilakku), and morning ceremony coordination for 60 guests.',
    },
    {
      id: 'lead-102',
      familyContact: 'Vikram & Sunita Krishnan',
      phone: '+91 98450 11223',
      email: 'anita.k@example.com',
      deceasedName: 'Dr. Arun Krishnan',
      serviceRequested: 'Bio-Degradable Sacred Grove Sapling Planting Memorial',
      status: 'in_consultation',
      dateReceived: 'Yesterday',
      location: 'Bengaluru / Western Ghats Nursery',
      budgetRange: '₹20,000 – ₹30,000',
      notes:
        'Planting 10 native Western Ghats saplings in honor of botanist research work. Coordinated with Bangalore Horticulture trust.',
    },
    {
      id: 'lead-103',
      familyContact: 'Devashish Roy',
      phone: '+91 98200 44551',
      email: 'devashish.roy@example.com',
      deceasedName: 'Subhasish Roy',
      serviceRequested: 'Memorial Keepsake Urn & Stone Engraving',
      status: 'confirmed',
      dateReceived: 'March 18, 2026',
      location: 'Mumbai Suburban',
      budgetRange: '₹45,000',
      notes: 'Custom granite plaque engraved with poem in Bengali script. Production underway.',
    },
    {
      id: 'lead-104',
      familyContact: 'Farhan Qureshi',
      phone: '+91 97110 33882',
      email: 'farhan.q@example.com',
      deceasedName: 'Begum Zubaida Qureshi',
      serviceRequested: 'Dignified Floral Spray & Quiet Chamber Arrangement',
      status: 'completed',
      dateReceived: 'March 12, 2026',
      location: 'Hyderabad Old City',
      budgetRange: '₹25,000',
      notes: 'Ceremony completed with dignified feedback from family.',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newStatus, setNewStatus] = useState<Lead['status']>('new');
  const [callNote, setCallNote] = useState('');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.familyContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.deceasedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.serviceRequested.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            New Request
          </span>
        );
      case 'contacted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Contacted
          </span>
        );
      case 'in_consultation':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
            In Consultation
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-500/15 text-stone-400 border border-stone-500/30">
            Completed
          </span>
        );
    }
  };

  const handleUpdateStatus = (leadId: string, status: Lead['status']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status } : null));
    }
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
            Family Inquiries & Bereavement Leads
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage and respond to bereavement care requests received through the Pithros Farewell Network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-mono border ${
              isDark
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-[#23324A]/30 bg-[#23324A]/10 text-[#23324A]'
            }`}
          >
            {leads.filter((l) => l.status === 'new').length} Uncontacted Inquiries
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by family name, deceased, or service…"
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
          {['all', 'new', 'in_consultation', 'confirmed', 'completed'].map((status) => (
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
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table / Cards */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="divide-y divide-inherit">
          {filteredLeads.length === 0 ? (
            <p
              className={`p-10 text-center text-xs ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              No family inquiries match your search.
            </p>
          ) : (
            filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-[#1A150F]' : 'hover:bg-[#F9F4EB]'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2
                      className={`text-sm font-medium ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {lead.familyContact}
                    </h2>
                    {getStatusBadge(lead.status)}
                    <span
                      className={`text-[10px] font-mono ${
                        isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'
                      }`}
                    >
                      Received {lead.dateReceived}
                    </span>
                  </div>

                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    In memory of: <span className="font-serif italic font-medium">{lead.deceasedName}</span>
                  </p>

                  <p
                    className={`text-[11px] leading-relaxed line-clamp-1 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Service: {lead.serviceRequested} • {lead.location}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4">
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-medium block ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      {lead.budgetRange}
                    </span>
                    <span
                      className={`text-[10px] block ${
                        isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'
                      }`}
                    >
                      Estimated Budget
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 ${
                isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className={`text-lg font-serif ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {selectedLead.familyContact}
                    </h2>
                    {getStatusBadge(selectedLead.status)}
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Inquiry for: {selectedLead.deceasedName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 text-xs ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <a href={`tel:${selectedLead.phone}`} className="hover:underline">
                    {selectedLead.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <a href={`mailto:${selectedLead.email}`} className="hover:underline">
                    {selectedLead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{selectedLead.location}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="font-medium text-stone-400 uppercase tracking-wider text-[10px]">
                  Service Details
                </span>
                <p
                  className={`p-3.5 rounded-xl border leading-relaxed ${
                    isDark ? 'border-[#202C40] bg-[#16120D] text-[#D9D2C6]' : 'border-[#E5DED2] bg-white text-[#3E3831]'
                  }`}
                >
                  {selectedLead.notes}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <span className="font-medium text-stone-400 uppercase tracking-wider text-[10px]">
                  Update Lead Status
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['contacted', 'in_consultation', 'confirmed', 'completed'] as Lead['status'][]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedLead.id, st)}
                        className={`p-2 rounded-xl border text-[11px] capitalize transition-all ${
                          selectedLead.status === st
                            ? isDark
                              ? 'border-[#B99452] bg-[#B99452]/15 text-[#B99452]'
                              : 'border-[#23324A] bg-[#23324A]/15 text-[#23324A]'
                            : isDark
                            ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                            : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedLead(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
