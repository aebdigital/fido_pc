import React, { useState } from 'react';
import { X, Check, Loader2, CreditCard, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';

/**
 * PaywallModal - Stripe-integrated paywall for Pro subscription
 *
 * Features:
 * - Shows Pro benefits
 * - Stripe Payment Link integration
 * - Try Pro (promotional) option
 */
const PaywallModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { grantPromotionalEntitlement, refreshProStatus, stripePublishableKey } = useAppData();
  const [loading, setLoading] = useState(false);
  const [loadingTrial, setLoadingTrial] = useState(false);

  if (!isOpen) return null;

  const proFeatures = [
    t('Export projects to PDF'),
    t('Unlimited projects'),
    t('Custom price lists'),
    t('Invoice generation'),
    t('Cash receipts'),
    t('Priority support')
  ];

  const handleTryPro = async () => {
    setLoadingTrial(true);
    const success = await grantPromotionalEntitlement();
    setLoadingTrial(false);
    if (success) {
      await refreshProStatus();
      onClose();
    } else {
      alert(t('Failed to activate trial. Please try again.'));
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);

    // Stripe Payment Link
    const stripePaymentLink = 'https://buy.stripe.com/dRmbJ20AuaiK9Xd2qd5kk00';

    window.open(stripePaymentLink, '_blank');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h2 className="text-2xl font-bold">{t('Become Pro!')}</h2>
          </div>
          <p className="text-white/90">{t('Unlock all features and grow your business')}</p>
        </div>

        {/* Features list */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('Pro includes:')}</h3>
          <ul className="space-y-3 mb-6">
            {proFeatures.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">€4.99</span>
              <span className="text-gray-600 dark:text-gray-400">/ {t('month')}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Cancel anytime')}</p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  {t('Subscribe Now')}
                </>
              )}
            </button>

            <button
              onClick={handleTryPro}
              disabled={loadingTrial}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingTrial ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('Try Pro Free (6 months)')
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full text-gray-500 dark:text-gray-400 py-2 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {t('Maybe later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
