import React, { useState, useRef } from 'react';
import { Building2, Upload, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { compressImage } from '../utils/imageCompression';
import RpoAutocomplete from './RpoAutocomplete';
import { useScrollLock } from '../hooks/useScrollLock';

const ContractorProfileModal = ({ onClose, onSave, editingContractor = null }) => {
  useScrollLock(true);
  const { t, isSlovak } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [showIcoSearch, setShowIcoSearch] = useState(false);
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    // Contact details
    name: editingContractor?.name || '',
    contactPerson: editingContractor?.contactPerson || editingContractor?.contact_person_name || '',
    email: editingContractor?.email || '',
    phone: editingContractor?.phone || '',
    website: editingContractor?.website || editingContractor?.web || '',

    // Address
    street: editingContractor?.street || '',
    additionalInfo: editingContractor?.additionalInfo || editingContractor?.second_row_street || '',
    city: editingContractor?.city || '',
    postalCode: editingContractor?.postalCode || editingContractor?.postal_code || '',
    country: editingContractor?.country || '',

    // Business information
    businessId: editingContractor?.businessId || editingContractor?.business_id || '',
    taxId: editingContractor?.taxId || editingContractor?.tax_id || '',
    vatNumber: editingContractor?.vatNumber || editingContractor?.vat_registration_number || '',

    // Banking details
    bankAccount: editingContractor?.bankAccount || editingContractor?.bank_account_number || '',
    bankCode: editingContractor?.bankCode || editingContractor?.swift_code || '',
    legalAppendix: editingContractor?.legalAppendix || editingContractor?.legal_notice || '',

    // Images
    logo: editingContractor?.logo || editingContractor?.logo_url || null,
    signature: editingContractor?.signature || editingContractor?.signature_url || null
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIcoSelect = (entity) => {
    const streetPart = entity.address?.street || '';
    const numberPart = entity.address?.buildingNumber || '';
    const fullStreet = [streetPart, numberPart].filter(Boolean).join(' ');

    setFormData(prev => ({
      ...prev,
      name: entity.name || '',
      street: fullStreet,
      city: entity.address?.municipality || '',
      postalCode: entity.address?.postalCode || '',
      country: entity.address?.country || 'Slovensko',
      businessId: entity.ico || '',
      taxId: entity.dic || '',
      vatNumber: entity.dicDph || '', // IČ DPH from ApplyPark API
    }));
    setShowIcoSearch(false);
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Compress image before storing (max 800px for logo/signature, 80% quality)
        const compressedBase64 = await compressImage(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.8
        });
        setFormData(prev => ({
          ...prev,
          [field]: compressedBase64
        }));
      } catch (error) {
        console.error('Failed to compress image:', error);
        // Fallback to original if compression fails
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            [field]: reader.result
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: null
    }));
    // Reset file input
    if (field === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
    if (field === 'signature' && signatureInputRef.current) signatureInputRef.current.value = '';
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

    // Map form fields to App format (camelCase)
    // AppDataContext will handle transformation to DB format (snake_case)
    const contractorData = {
      name: formData.name,
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      street: formData.street,
      additionalInfo: formData.additionalInfo,
      city: formData.city,
      postalCode: formData.postalCode,
      country: formData.country,
      businessId: formData.businessId,
      taxId: formData.taxId,
      vatNumber: formData.vatNumber,
      bankAccount: formData.bankAccount,
      bankCode: formData.bankCode,
      legalAppendix: formData.legalAppendix,
      logo: formData.logo,
      signature: formData.signature
    };

    // Only add id for editing (new contractors get ID from database)
    if (editingContractor?.id) {
      contractorData.id = editingContractor.id;
    }

    onSave(contractorData);
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-hidden ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={(e) => {
        // Only trigger if clicking the backdrop directly
        if (e.target === e.currentTarget) {
          handleSave();
        }
      }}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col ${isClosing ? 'animate-slide-out' : 'animate-slide-in'} my-0 sm:my-auto`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            {editingContractor ? t('Edit contractor') : t('Create contractor')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">

          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-24 h-24 lg:w-32 lg:h-32 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 overflow-hidden relative cursor-pointer group border-2 border-gray-200 dark:border-gray-600"
              onClick={() => logoInputRef.current?.click()}
            >
              {formData.logo ? (
                <>
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <Building2 className="w-8 h-8 lg:w-12 lg:h-12 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <input
              type="file"
              ref={logoInputRef}
              onChange={(e) => handleImageUpload(e, 'logo')}
              className="hidden"
              accept="image/*"
            />
            <div className="flex gap-2">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {formData.logo ? t('Change logo') : t('Upload logo')}
              </button>
              {formData.logo && (
                <button
                  onClick={() => removeImage('logo')}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-full text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Contractor Details */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('Contractor details')}</h3>
            <div className="space-y-4">

              {/* IČO Search Button / Component - Only for Slovak language */}
              {isSlovak && (
                <div className="mb-4">
                  {showIcoSearch ? (
                    <div className="relative">
                      <RpoAutocomplete onSelect={handleIcoSelect} t={t} />
                      <button
                        onClick={() => setShowIcoSearch(false)}
                        className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowIcoSearch(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                    >
                      <Building2 className="w-4 h-4" />
                      {t('Fill by company ID')}
                    </button>
                  )}
                </div>
              )}

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
                  {t('BID')}
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
                  {t('TID')}
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
                  {t('VAT ID')}
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
            <div
              className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4 overflow-hidden relative cursor-pointer group border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              onClick={() => signatureInputRef.current?.click()}
            >
              {formData.signature ? (
                <>
                  <img src={formData.signature} alt="Signature" className="h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-sm">{t('Upload signature image')}</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={signatureInputRef}
              onChange={(e) => handleImageUpload(e, 'signature')}
              className="hidden"
              accept="image/*"
            />
            <div className="flex gap-2">
              <button
                onClick={() => signatureInputRef.current?.click()}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg"
              >
                {formData.signature ? t('Change signature') : t('Add signature')}
              </button>
              {formData.signature && (
                <button
                  onClick={() => removeImage('signature')}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 lg:mt-8">
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-6 lg:px-8 py-3 rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm text-lg"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 lg:px-8 py-3 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-lg"
            >
              {editingContractor ? t('Save') : t('Add contractor')}
            </button>
          </div>

        </div>
      </div>
    </div >
  );
};

export default ContractorProfileModal;