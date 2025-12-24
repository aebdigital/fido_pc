import React, { useEffect, useState } from 'react';
import { X, Send, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PDFPreviewModal = ({ isOpen, onClose, pdfUrl, onSend, title }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, pdfUrl]);

  if (!isOpen || !pdfUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[85vh] lg:h-[90vh] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title || t('Preview')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-800">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title="PDF Preview"
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {t('Download')}
            </button>
            {onSend && (
              <button
                onClick={onSend}
                className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {t('Send')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;
