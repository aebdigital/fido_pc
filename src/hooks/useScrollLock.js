import { useRef, useLayoutEffect } from 'react';

/**
 * useScrollLock hook
 * Locks the body scroll while preserving layout stability.
 *
 * Features:
 * - Prevents layout shift by compensating for scrollbar width on desktop.
 * - Detects iOS/iPadOS and devices with 0-width scrollbars (like Mac with overlay scrollbars)
 *   to avoid adding unnecessary padding (addressing the "blank right side" issue).
 * - On iOS, uses touchmove prevention to stop background scroll without position:fixed
 *   (which breaks input focus and keyboard scroll).
 * - Resets window scroll to 0 on unlock to prevent "stuck offset" after modal close.
 *
 * @param {boolean} isLocked - Whether scroll should be locked
 */
export const useScrollLock = (isLocked) => {
    const originalStyle = useRef(null);
    const touchHandlerRef = useRef(null);

    useLayoutEffect(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isLocked) {
            // 1. Calculate scrollbar width (Desktop only)
            const scrollDiv = document.createElement('div');
            scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
            document.body.appendChild(scrollDiv);
            const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
            document.body.removeChild(scrollDiv);

            // 2. Store original styles
            originalStyle.current = {
                htmlOverflow: document.documentElement.style.overflow,
                overflow: document.body.style.overflow,
                paddingRight: document.body.style.paddingRight,
            };

            // 3. Apply locking styles
            if (isIOS) {
                // iOS: overflow hidden on html+body + touchmove prevention.
                // Avoids position:fixed which breaks input focus and keyboard scroll.
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';

                // Prevent touchmove on body to stop iOS rubber-band scrolling.
                // Allow scrolling inside modal scroll containers (overflow-y-auto).
                const preventTouchMove = (e) => {
                    let target = e.target;
                    while (target && target !== document.body) {
                        const style = window.getComputedStyle(target);
                        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                            // Allow scroll inside scrollable containers
                            return;
                        }
                        target = target.parentElement;
                    }
                    e.preventDefault();
                };
                touchHandlerRef.current = preventTouchMove;
                document.body.addEventListener('touchmove', preventTouchMove, { passive: false });
            } else {
                // Desktop/Android: Standard overflow hidden
                document.body.style.overflow = 'hidden';
                if (scrollbarWidth > 0) {
                    document.body.style.paddingRight = `${scrollbarWidth}px`;
                }
            }
        } else {
            // Restore original styles
            if (originalStyle.current) {
                const { htmlOverflow, overflow, paddingRight } = originalStyle.current;

                document.documentElement.style.overflow = htmlOverflow;
                document.body.style.overflow = overflow;
                document.body.style.paddingRight = paddingRight;

                originalStyle.current = null;
            }
            // Remove iOS touch handler
            if (touchHandlerRef.current) {
                document.body.removeEventListener('touchmove', touchHandlerRef.current);
                touchHandlerRef.current = null;
            }

            // Reset any accidental body-level scroll offset on iOS.
            // The actual content scrolls inside Layout's overflow-y-auto div,
            // so window.scrollY should always be 0.
            if (window.scrollY !== 0) {
                window.scrollTo(0, 0);
            }
        }

        return () => {
            // Cleanup: ensure we restore if component unmounts
            if (originalStyle.current) {
                const { htmlOverflow, overflow, paddingRight } = originalStyle.current;
                document.documentElement.style.overflow = htmlOverflow;
                document.body.style.overflow = overflow;
                document.body.style.paddingRight = paddingRight;

                originalStyle.current = null;
            }
            if (touchHandlerRef.current) {
                document.body.removeEventListener('touchmove', touchHandlerRef.current);
                touchHandlerRef.current = null;
            }
        };
    }, [isLocked]);
};
