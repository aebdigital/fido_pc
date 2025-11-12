import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ContractorProfileModal = ({ onClose, onSave, editingContractor = null }) => {
  const { t } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Contact details
    name: editingContractor?.name || '',
    contactPerson: editingContractor?.contactPerson || '',
    email: editingContractor?.email || '',
    phone: editingContractor?.phone || '',
    website: editingContractor?.website || '',
    
    // Address
    street: editingContractor?.street || '',
    additionalInfo: editingContractor?.additionalInfo || '',
    city: editingContractor?.city || '',
    postalCode: editingContractor?.postalCode || '',
    country: editingContractor?.country || '',
    
    // Business information
    businessId: editingContractor?.businessId || '',
    taxId: editingContractor?.taxId || '',
    vatNumber: editingContractor?.vatNumber || '',
    
    // Banking details
    bankAccount: editingContractor?.bankAccount || '',
    bankCode: editingContractor?.bankCode || '',
    legalAppendix: editingContractor?.legalAppendix || '',
    
    // Signature (placeholder for now)
    signature: editingContractor?.signature || null
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert(t('Name is required'));
      return;
    }
    
    const contractorData = {
      ...formData,
      id: editingContractor?.id || `contractor_${Date.now()}`
    };
    
    onSave(contractorData);
    handleClose();
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[95vh] lg:h-[90vh] flex flex-col ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-lg"
          >
            {t('Cancel')}
          </button>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            {editingContractor ? t('Edit contractor') : t('Create contractor')}
          </h2>
          <button
            onClick={handleSave}
            className="text-blue-600 hover:text-blue-700 transition-colors text-lg font-medium"
          >
            {t('Save')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          
          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 lg:w-12 lg:h-12 text-gray-600 dark:text-gray-400" />
            </div>
            <button className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm">
              {t('Change photo')}
            </button>
          </div>

          {/* Contractor Details */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('Contractor details')}</h3>
            <div className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('Name of company')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Contact person')}
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder={t('Name and surname')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('Email address')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Phone number')}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={t('Number')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Web page')}
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder={t('Link')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

            </div>
          </div>

          {/* Location */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('Location')}</h3>
            <div className="space-y-4">
              
              {/* Street */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Street')}
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder={t('Street')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Additional Info */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Additional info')}
                </label>
                <input
                  type="text"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder={t('App #, Suite (optional)')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* City and Postal Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {t('City')}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={t('City')}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {t('Postal code')}
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder={t('ZIP Code')}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Country')}
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder={t('Country')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

            </div>
          </div>

          {/* Business Information */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('Business information')}</h3>
            <div className="space-y-4">
              
              {/* Business ID */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Business ID')}
                </label>
                <input
                  type="text"
                  value={formData.businessId}
                  onChange={(e) => handleInputChange('businessId', e.target.value)}
                  placeholder={t('BID')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Tax ID')}
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  placeholder={t('TID')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* VAT Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('VAT Registration Number')}
                </label>
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  placeholder={t('VAT ID')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

            </div>
          </div>

          {/* Banking and Legal */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('Banking and legal')}</h3>
            <div className="space-y-4">
              
              {/* Bank Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Bank account number')}
                </label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                  placeholder={t('Number')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Bank Code */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Bank Code')}
                </label>
                <input
                  type="text"
                  value={formData.bankCode}
                  onChange={(e) => handleInputChange('bankCode', e.target.value)}
                  placeholder={t('Code')}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                />
              </div>

              {/* Legal Appendix */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('Legal appendix')}
                </label>
                <textarea
                  value={formData.legalAppendix}
                  onChange={(e) => handleInputChange('legalAppendix', e.target.value)}
                  placeholder={t('Note')}
                  rows="3"
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg resize-none"
                />
              </div>

            </div>
          </div>

          {/* Signature */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('Signature')}</h3>
            <button className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg">
              {t('Add signature')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContractorProfileModal;