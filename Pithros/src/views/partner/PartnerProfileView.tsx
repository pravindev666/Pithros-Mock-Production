import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

export const PartnerProfileView: React.FC = () => {
  const { isDark } = useTheme();

  const [companyName, setCompanyName] = useState('Shanti Memorial Care & Sacred Groves');
  const [directorName, setDirectorName] = useState('Rajesh Varma, Certified Bereavement Director');
  const [phone, setPhone] = useState('+91 80 2345 6789');
  const [email, setEmail] = useState('care@shantimemorials.org');
  const [address, setAddress] = useState('42, 5th Cross, Lavelle Road, Bengaluru, Karnataka 560001');
  const [bio, setBio] = useState(
    'Dedicated to sacred digital remembrance, traditional ceremonies, and ecological native grove plantings across Southern India for over two decades.'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
      </div>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Profile changes saved and updated in the Farewell Network directory.</span>
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
            Company & Licensed Director
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Organization / Provider Brand
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Lead Funeral Director / Specialist
              </label>
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Direct Bereavement Helpline
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Official Dispatch Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Physical Address & Parlour Location
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                  : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Public Bereavement Statement / Biography
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                  : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
              }`}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" icon={Save}>
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
