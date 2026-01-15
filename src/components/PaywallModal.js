import React from 'react';
import { X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * PaywallModal - Web Paywall with Direct Stripe Links
 *
 * Features:
 * - 2-Column Layout (Monthly vs Annual)
 * - Direct Stripe Payment Links
 * - User ID synchronization via client_reference_id
 */
const PaywallModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // State for selected plan: 'monthly' or 'yearly'
  const [selectedPlan, setSelectedPlan] = React.useState('monthly');
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen) return null;

  const PRICE_IDS = {
    monthly: 'price_1SpIC8LoNzpDaXh667ie8Nch',
    yearly: 'price_1SpIDDLoNzpDaXh6Z7mNufti'
  };

  const handleSubscribe = async () => {
    if (!user?.id) {
      console.error('User ID missing for subscription');
      return;
    }

    setIsLoading(true);
    try {
      const priceId = PRICE_IDS[selectedPlan];
      console.log('[Stripe] Creating checkout session for:', priceId);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: priceId,
          returnUrl: window.location.origin
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      console.log('[Stripe] Redirecting to:', data.url);
      window.location.href = data.url;

    } catch (err) {
      console.error('[Stripe] Checkout error:', err);
      setIsLoading(false);
    }
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

          {/* Features Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[30px] p-6 shadow-sm">
            <h3 className="text-[35px] font-semibold text-center text-gray-900 dark:text-white mb-6">{t('Pro Unlocks')}</h3>
            <div className="space-y-6">
              <FeatureRow
                title={t('change general prices')}
                subtitle={t('feature allows users to modify prices in the general price list, affecting all future projects')}
              />
              <FeatureRow
                title={t('adjust individual project prices')}
                subtitle={t('feature enables users to modify prices in a project\'s price list, influencing prices exclusively within the selected project')}
              />
              <FeatureRow
                title={t('export to PDF')}
                subtitle={t('feature enables the export of entire projects into PDF format, allowing direct sharing with clients')}
              />
              <FeatureRow
                title={t('create invoices')}
                subtitle={t('easily create and send invoices to your clients')}
              />
            </div>
          </div>

          {/* Options Header */}
          <h3 className="text-[25px] font-semibold text-center text-gray-900 dark:text-white pt-2">{t('Options')}</h3>

          {/* Monthly Option */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={`flex items-center gap-4 bg-white dark:bg-gray-800 rounded-[30px] p-4 pr-6 cursor-pointer shadow-sm relative overflow-hidden transition-all duration-200 ${selectedPlan === 'monthly'
              ? 'border-[4px] border-gray-900 dark:border-white'
              : 'border-[4px] border-transparent opacity-80 hover:opacity-100'
              }`}
          >
            {/* Checked Circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative transition-colors duration-200 ${selectedPlan === 'monthly' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
              {selectedPlan === 'monthly' && <Check className="w-5 h-5 text-white dark:text-gray-900 stroke-[3]" />}
            </div>

            <div className="flex-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">5.49 €</span>
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">/ {t('month')}</span>
              </div>
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1">
                {t('7 days of free trial, billed monthly')}
              </div>
            </div>
          </div>

          {/* Yearly Option */}
          <div
            onClick={() => setSelectedPlan('yearly')}
            className={`flex items-center gap-4 bg-white dark:bg-gray-800 rounded-[30px] p-4 pr-6 cursor-pointer shadow-sm relative overflow-hidden transition-all duration-200 ${selectedPlan === 'yearly'
              ? 'border-[4px] border-gray-900 dark:border-white'
              : 'border-[4px] border-transparent opacity-80 hover:opacity-100'
              }`}
          >
            {/* Checked Circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative transition-colors duration-200 ${selectedPlan === 'yearly' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
              {selectedPlan === 'yearly' && <Check className="w-5 h-5 text-white dark:text-gray-900 stroke-[3]" />}
            </div>

            <div className="flex-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">54.99 €</span>
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">/ {t('year')}</span>
              </div>
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1">
                {t('7 days of free trial, billed annually')}
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-[20px] text-[22px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mt-2 shadow-sm"
          >
            {isLoading ? t('Processing...') : t('Subscribe')}
          </button>

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
