import React, { useState, useEffect } from 'react';
import { User, Building2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import RpoAutocomplete from './RpoAutocomplete';

const ClientForm = React.forwardRef(({ onSave, onCancel, initialData = null }, ref) => {
  const { t, isSlovak } = useLanguage();
  const isEditing = !!initialData;
  // iOS uses 'personal' and 'corporation', desktop used to use 'private' and 'business'
  // Normalize to iOS values for cross-platform compatibility
  const normalizeType = (type) => {
    if (type === 'private' || type === 'personal') return 'personal';
    if (type === 'business' || type === 'corporation') return 'corporation';
    return 'personal';
  };
  const [clientType, setClientType] = useState(normalizeType(initialData?.type));
  const [showRpoSearch, setShowRpoSearch] = useState(false);
  const [showAllFields, setShowAllFields] = useState(!initialData); // Collapsed by default when editing on mobile

  const [clientForm, setClientForm] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    street: initialData?.street || '',
    additionalInfo: initialData?.additionalInfo || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    country: initialData?.country || '',
    businessId: initialData?.businessId || '',
    taxId: initialData?.taxId || '',
    vatId: initialData?.vatId || '',
    contactPerson: initialData?.contactPerson || ''
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setClientForm({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        street: initialData.street || '',
        additionalInfo: initialData.additionalInfo || '',
        city: initialData.city || '',
        postalCode: initialData.postalCode || '',
        country: initialData.country || '',
        businessId: initialData.businessId || '',
        taxId: initialData.taxId || '',
        vatId: initialData.vatId || '',
        contactPerson: initialData.contactPerson || ''
      });
      setClientType(normalizeType(initialData.type));
    } else {
      // Reset to empty form when creating new client
      setClientForm({
        name: '',
        email: '',
        phone: '',
        street: '',
        additionalInfo: '',
        city: '',
        postalCode: '',
        country: '',
        businessId: '',
        taxId: '',
        vatId: '',
        contactPerson: ''
      });
      setClientType('personal');
    }
    setShowRpoSearch(false);
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setClientForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRpoSelect = (entity) => {
    const streetPart = entity.address?.street || '';
    const numberPart = entity.address?.buildingNumber || '';
    const fullStreet = [streetPart, numberPart].filter(Boolean).join(' ');

    setClientForm(prev => ({
      ...prev,
      name: entity.name || '',
      street: fullStreet,
      city: entity.address?.municipality || '',
      postalCode: entity.address?.postalCode || '',
      country: entity.address?.country || 'Slovensko',
      businessId: entity.ico || '',
      taxId: entity.dic || '',
      vatId: entity.dicDph || '', // IČ DPH from ApplyPark API
    }));
    setShowRpoSearch(false);
  };

  const handleSubmit = () => {
    if (clientForm.name.trim()) {
      const clientData = {
        ...clientForm,
        type: clientType
      };
      onSave(clientData);
    } else {
      alert(t('Name is required'));
    }
  };

  React.useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Client Type Selection */}
      <div className="lg:w-80 flex-shrink-0 mb-6 lg:mb-0">
        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Type of client?')}</h3>
        <div className="flex sm:flex-col gap-3 mb-6 lg:mb-8">
          <button
            className={`py-3 px-4 lg:px-6 rounded-2xl font-semibold transition-all text-left flex-1 sm:flex-none flex items-center gap-3 shadow-sm ${clientType === 'personal'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            onClick={() => setClientType('personal')}
          >
            <div className={`w-2 h-2 rounded-full ${clientType === 'personal' ? 'bg-blue-400' : 'bg-transparent'}`} />
            {t('Private')}
          </button>
          <button
            className={`py-3 px-4 lg:px-6 rounded-2xl font-semibold transition-all text-left flex-1 sm:flex-none flex items-center gap-3 shadow-sm ${clientType === 'corporation'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            onClick={() => setClientType('corporation')}
          >
            <div className={`w-2 h-2 rounded-full ${clientType === 'corporation' ? 'bg-blue-400' : 'bg-transparent'}`} />
            {t('Business')}
          </button>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 lg:w-10 lg:h-10 text-white dark:text-gray-900" />
          </div>
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
            {clientType === 'personal' ? t('Private entity') : t('Business entity')}
          </h2>
        </div>
      </div>

      {/* Form Fields */}
      <div className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* RPO Search Button / Component */}
          {clientType === 'corporation' && isSlovak && (
            <div className="col-span-1 lg:col-span-2 mb-2">
              {showRpoSearch ? (
                <div className="relative">
                  <RpoAutocomplete onSelect={handleRpoSelect} t={t} />
                  <button
                    onClick={() => setShowRpoSearch(false)}
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRpoSearch(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                >
                  <Building2 className="w-4 h-4" />
                  {t('Fill by company ID')}
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Name')}</label>
            <input
              type="text"
              value={clientForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={clientType === 'personal' ? t('Name and surname') : t('Name of company')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Email')}</label>
            <input
              type="email"
              value={clientForm.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder={t('Email address')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Mobile toggle for remaining fields - only on mobile when editing */}
          {isEditing && (
            <div className="col-span-full lg:hidden">
              <button
                type="button"
                onClick={() => setShowAllFields(!showAllFields)}
                className="flex items-center gap-2 w-full justify-center py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span>{showAllFields ? t('Show less') : t('Show more')}</span>
                {showAllFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Remaining fields - hidden on mobile when collapsed, always visible on desktop */}
          <div className={`${!showAllFields && isEditing ? 'hidden lg:contents' : 'contents'}`}>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Phone number')}</label>
              <input
                type="tel"
                value={clientForm.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder={t('Number')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Street')}</label>
              <input
                type="text"
                value={clientForm.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder={t('Street')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Additional info')}</label>
              <input
                type="text"
                value={clientForm.additionalInfo}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                placeholder={t('App #, Suite (optional)')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-900 dark:text-white">{t('City')}</label>
              <input
                type="text"
                value={clientForm.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t('City')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Postal code')}</label>
              <input
                type="text"
                value={clientForm.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder={t('ZIP Code')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Country')}</label>
              <input
                type="text"
                value={clientForm.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder={t('Country')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {clientType === 'corporation' && (
              <>
                <div className="space-y-2">
                  <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Business ID')}</label>
                  <input
                    type="text"
                    value={clientForm.businessId}
                    onChange={(e) => handleInputChange('businessId', e.target.value)}
                    placeholder={t('BID')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Tax ID')}</label>
                  <input
                    type="text"
                    value={clientForm.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder={t('TID')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-base font-medium text-gray-900 dark:text-white">{t('VAT ID number')}</label>
                  <input
                    type="text"
                    value={clientForm.vatId}
                    onChange={(e) => handleInputChange('vatId', e.target.value)}
                    placeholder={t('VAT ID')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-base font-medium text-gray-900 dark:text-white">{t('Contact person')}</label>
                  <input
                    type="text"
                    value={clientForm.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    placeholder={t('Name and surname')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 lg:mt-8 col-span-full flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-6 lg:px-8 py-3 rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm text-lg"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 lg:px-8 py-3 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-lg"
            >
              {isEditing ? t('Save') : t('Add client')}
            </button>
          </div>

          {initialData && initialData.invoices && initialData.invoices.length > 0 && (
            <div className="mt-8 col-span-full border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Invoices')}</h3>
              <div className="space-y-3">
                {initialData.invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{inv.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">{new Date(inv.issueDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {Number(inv.totalPrice || 0).toFixed(2)} €
                      </div>
                      {inv.projectName && (
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{inv.projectName}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ClientForm;
