import React from 'react';
import { X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useScrollLock } from '../hooks/useScrollLock';
import AppDataContext from '../context/AppDataContext';

/**
 * PaywallModal - Web Paywall with Direct Stripe Links
 *
 * Features:
 * - 2-Column Layout (Monthly vs Annual)
 * - Direct Stripe Payment Links
 * - User ID synchronization via client_reference_id
 */
const PaywallModal = ({ isOpen, onClose }) => {
  useScrollLock(true);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activateTrial, trialEndsAt, startTrialLoading, isPro } = React.useContext(AppDataContext);
  // Note: AppDataContext should trigger re-render if trialEndsAt changes. 
  // If useAppData is not available, try imports.
  // Actually, standard import is import AppDataContext from '../context/AppDataContext';
  // But here we need to use 'useContext(AppDataContext)' or custom hook?
  // User didn't show context import. I should check imports first.

  // Re-checking imports... 'useAuth' is there. 'useLanguage' is there.
  // I need to import AppDataContext to use useContext(AppDataContext) or if there is a useAppData hook?
  // src/context/AppDataContext.js default export is AppDataContext.

  // Wait, I cannot see imports in this localized replacement view easily.
  // I will assume I need to ADD the import if not present.
  // But I will stick to what I can see. I will replace the component logic.

  // State
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen) return null;

  const PRICE_IDS = {
    monthly: 'price_1SpIC8LoNzpDaXh667ie8Nch',
    yearly: 'price_1SpIDDLoNzpDaXh6Z7mNufti'
  };

  const handleSubscribe = async (plan) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const priceId = PRICE_IDS[plan];
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, returnUrl: window.location.origin }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleTrial = async () => {
    setIsLoading(true);
    const success = await activateTrial();
    setIsLoading(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
      <div className="bg-gray-100 dark:bg-gray-900 rounded-[35px] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200 border-8 border-gray-100 dark:border-gray-900 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-2 shrink-0">
          <h2 className="text-[33px] font-semibold text-gray-900 dark:text-white leading-tight">{t('Become Pro!')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <X className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto">

          {/* Features Card - Same as before */}
          <div className="bg-white dark:bg-gray-800 rounded-[30px] p-6 shadow-sm">
            <h3 className="text-[35px] font-semibold text-center text-gray-900 dark:text-white mb-6">{t('Pro Unlocks')}</h3>
            <div className="space-y-6">
              <FeatureRow title={t('change general prices')} subtitle={t('feature allows users to modify prices in the general price list, affecting all future projects')} />
              <FeatureRow title={t('adjust individual project prices')} subtitle={t('feature enables users to modify prices in a project\'s price list, influencing prices exclusively within the selected project')} />
              <FeatureRow title={t('export to PDF')} subtitle={t('feature enables the export of entire projects into PDF format, allowing direct sharing with clients')} />
              <FeatureRow title={t('create invoices')} subtitle={t('easily create and send invoices to your clients')} />
            </div>
            {/* Show timer inside modal if active? User said "show timer... in the pro status". */}
          </div>

          <h3 className="text-[25px] font-semibold text-center text-gray-900 dark:text-white pt-2">{t('Options')}</h3>

          <div className="flex flex-col gap-3">
            {/* Monthly Button */}
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={isLoading}
              className="w-full flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 p-5 rounded-[25px] shadow-sm transition-all border-2 border-transparent hover:border-gray-900 dark:hover:border-white group"
            >
              <div className="text-left">
                <div className="text-[22px] font-bold text-gray-900 dark:text-white">5.49 € <span className="text-[16px] font-medium text-gray-500">/ {t('month')}</span></div>
                <div className="text-[12px] text-gray-500 font-medium mt-0.5">{t('Billed monthly')}</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full group-hover:bg-gray-900 group-hover:dark:bg-white transition-colors">
                <Check className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-white group-hover:dark:text-gray-900" />
              </div>
            </button>

            {/* Yearly Button */}
            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={isLoading}
              className="w-full flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 p-5 rounded-[25px] shadow-sm transition-all border-2 border-transparent hover:border-gray-900 dark:hover:border-white group"
            >
              <div className="text-left">
                <div className="text-[22px] font-bold text-gray-900 dark:text-white">54.99 € <span className="text-[16px] font-medium text-gray-500">/ {t('year')}</span></div>
                <div className="text-[12px] text-gray-500 font-medium mt-0.5">{t('Billed annually')}</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full group-hover:bg-gray-900 group-hover:dark:bg-white transition-colors">
                <Check className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-white group-hover:dark:text-gray-900" />
              </div>
            </button>

            {/* Trial Button */}
            {!isPro && (
              <button
                onClick={handleTrial}
                disabled={isLoading}
                className="w-full mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-[20px] text-[18px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
              >
                {t('Vyskúšať 14 dní zadarmo')}
              </button>
            )}

            {/* If isPro but mostly checking if trial is active? No, logic is simple: 3 options. */}
          </div>

          {/* Legal Links */}
          <div className="flex justify-center flex-wrap gap-x-1 text-[11px] font-semibold text-gray-900 dark:text-white mt-2 mb-4 opacity-80">
            <button onClick={() => window.open('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', '_blank')} className="hover:underline">{t('Terms of Use')}</button>
            <span>•</span>
            <button className="hover:underline">{t('Restore Purchases')}</button>
            <span>•</span>
            <button onClick={() => window.open('https://fido.sk/privacy-policy', '_blank')} className="hover:underline">{t('Privacy Policy')}</button>
          </div>

        </div>
      </div>
    </div>
  );
};

// Feature Row Component
const FeatureRow = ({ title, subtitle }) => (
  <div className="flex gap-3">
    <div className="mt-1">
      <div className="w-[17px] h-[17px] bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
        <Check size={10} className="text-white dark:text-gray-900 stroke-[4]" />
      </div>
    </div>
    <div>
      <div className="text-[20px] font-semibold text-gray-900 dark:text-white leading-tight">{title}</div>
      <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-1 leading-snug">{subtitle}</div>
    </div>
  </div>
);

export default PaywallModal;
