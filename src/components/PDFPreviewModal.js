import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Send, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker and other options globally
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

// Fix for some characters not rendering correctly and potential orientation issues
const CMAP_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`;
const STANDARD_FONT_DATA_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`;

const PDFPreviewModal = ({ isOpen, onClose, pdfUrl, onSend, title }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Touch/pinch zoom state
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialPinchScale, setInitialPinchScale] = useState(1);
  const lastTapRef = useRef(0);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Calculate initial scale to fit width (edge-to-edge on mobile)
  const calculateFitScale = useCallback((page) => {
    if (!containerRef.current) return 1;
    // On mobile, use full container width; on desktop, add small padding
    const padding = isMobile ? 0 : 32;
    const containerWidth = containerRef.current.clientWidth - padding;
    const viewport = page.getViewport({ scale: 1 });
    return containerWidth / viewport.width;
  }, [isMobile]);

  // Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPdfDoc(null);
      setCurrentPage(1);
      setTotalPages(0);
      setScale(1);
      setBaseScale(1);
      setError(null);
      setIsLoading(true);
    }
  }, [isOpen]);

  // Load PDF document
  useEffect(() => {
    if (!isOpen || !pdfUrl) return;

    // Reset state before loading new PDF
    setPdfDoc(null);
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    setTotalPages(0);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: CMAP_URL,
          cMapPacked: true,
          standardFontDataUrl: STANDARD_FONT_DATA_URL,
        });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        // Calculate initial scale to fit width
        const page = await pdf.getPage(1);
        const fitScale = calculateFitScale(page);
        setBaseScale(fitScale);
        setScale(fitScale);

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(t('Failed to load PDF'));
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [isOpen, pdfUrl, calculateFitScale, t]);

  // Render current page with high DPI support
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);

        // Get device pixel ratio for sharp rendering on high DPI screens
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * pixelRatio });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions at higher resolution
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Scale down the canvas display size
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Render PDF page
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Pinch-to-zoom handlers
  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch start
      setIsPinching(true);
      setInitialPinchDistance(getDistance(e.touches));
      setInitialPinchScale(scale);
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      if (timeSinceLastTap < 300) {
        // Double-tap detected - toggle between fit and 2x zoom
        e.preventDefault();
        if (scale <= baseScale * 1.1) {
          setScale(baseScale * 2);
        } else {
          setScale(baseScale);
          // Reset scroll position
          if (containerRef.current) {
            containerRef.current.scrollTo(0, 0);
          }
        }
      }
      lastTapRef.current = now;
    }
  }, [scale, baseScale]);

  const handleTouchMove = useCallback((e) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const pinchRatio = currentDistance / initialPinchDistance;
      const newScale = Math.min(Math.max(initialPinchScale * pinchRatio, 0.5), 4);
      setScale(newScale);
    }
  }, [isPinching, initialPinchDistance, initialPinchScale]);

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setScale(baseScale);
    // Scroll back to top-left
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Calculate zoom percentage relative to fit-to-width
  const zoomPercentage = baseScale > 0 ? Math.round((scale / baseScale) * 100) : 100;

  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      {/* Modal - fullscreen on mobile, centered on desktop */}
      <div className={`bg-white dark:bg-gray-900 flex flex-col overflow-hidden ${isMobile
        ? 'w-full h-full rounded-none'
        : 'rounded-2xl w-full max-w-4xl max-h-[90dvh] m-4'
        }`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 lg:px-6 py-2 lg:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base lg:text-xl font-bold text-gray-900 dark:text-white truncate flex-1 mr-2">
            {title || t('Preview')}
          </h2>
          <div className="flex items-center gap-1">
            {/* Open in new tab button - useful for native PDF viewer */}
            <button
              onClick={handleOpenInNewTab}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title={t('Open in new tab')}
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          {/* Page Navigation */}
          {totalPages > 1 && (
            <>
              <div className="flex items-center gap-0.5 lg:gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 min-w-[50px] lg:min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
              <div className="w-px h-5 lg:h-6 bg-gray-300 dark:bg-gray-600 mx-1 lg:mx-2" />
            </>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 lg:gap-1">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ZoomOut className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 min-w-[40px] lg:min-w-[50px] text-center">
              {zoomPercentage}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ZoomIn className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ml-0.5"
              title={t('Reset zoom')}
            >
              <RotateCcw className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Mobile hint */}
          {isMobile && (
            <span className="text-[10px] text-gray-400 ml-2 hidden sm:inline">
              {t('Pinch to zoom')}
            </span>
          )}
        </div>

        {/* PDF Viewer - with touch gesture support */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-300 dark:bg-gray-800"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: isPinching ? 'none' : 'pan-x pan-y'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          {!isLoading && !error && (
            <div className={`inline-block min-w-full ${isMobile ? 'p-0' : 'p-4'}`}>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className={`bg-white ${isMobile ? '' : 'shadow-lg'}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-3 lg:px-6 py-3 lg:py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex gap-2 lg:gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm lg:text-base"
            >
              <Download className="w-4 h-4 lg:w-5 lg:h-5" />
              {t('Download')}
            </button>
            {onSend && (
              <button
                onClick={onSend}
                className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm lg:text-base"
              >
                <Send className="w-4 h-4 lg:w-5 lg:h-5" />
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
