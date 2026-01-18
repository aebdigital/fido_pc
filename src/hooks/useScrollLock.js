import { useRef, useLayoutEffect } from 'react';

/**
 * useScrollLock hook
 * Locks the body scroll while preserving layout stability.
 * 
 * Features:
 * - Prevents layout shift by compensating for scrollbar width on desktop.
 * - Detects iOS/iPadOS and devices with 0-width scrollbars (like Mac with overlay scrollbars)
 *   to avoid adding unnecessary padding (addressing the "blank right side" issue).
 * 
 * @param {boolean} isLocked - Whether scroll should be locked
 */
export const useScrollLock = (isLocked) => {
    const scrollOffset = useRef(0);
    const originalStyle = useRef(null);

    useLayoutEffect(() => {
        if (isLocked) {
            // 1. Calculate scrollbar width (Desktop only)
            const scrollDiv = document.createElement('div');
            scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
            document.body.appendChild(scrollDiv);
            const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
            document.body.removeChild(scrollDiv);

            // 2. Detect iOS/Mobile
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            // 3. Store current scroll position
            scrollOffset.current = window.scrollY;

            // 4. Store original styles
            originalStyle.current = {
                overflow: document.body.style.overflow,
                paddingRight: document.body.style.paddingRight,
                position: document.body.style.position,
                top: document.body.style.top,
                width: document.body.style.width
            };

            // 5. Apply locking styles
            if (isIOS) {
                // Robust iOS lock: Fix body position and offset top by scroll amount
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollOffset.current}px`;
                document.body.style.width = '100%';
                document.body.style.overflow = 'hidden'; // Also hide overflow
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
                const { overflow, paddingRight, position, top, width } = originalStyle.current;

                document.body.style.overflow = overflow;
                document.body.style.paddingRight = paddingRight;
                document.body.style.position = position;
                document.body.style.top = top;
                document.body.style.width = width;

                // Restore scroll position for iOS
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                if (isIOS) {
                    window.scrollTo(0, scrollOffset.current);
                }

                originalStyle.current = null;
            }
        }

        return () => {
            // Cleanup: ensure we restore if component unmounts
            if (originalStyle.current) {
                const { overflow, paddingRight, position, top, width } = originalStyle.current;
                document.body.style.overflow = overflow;
                document.body.style.paddingRight = paddingRight;
                document.body.style.position = position;
                document.body.style.top = top;
                document.body.style.width = width;

                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                if (isIOS) {
                    window.scrollTo(0, scrollOffset.current);
                }
                originalStyle.current = null;
            }
        };
    }, [isLocked]);
};
