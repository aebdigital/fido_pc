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
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isLocked) {
            // 1. Calculate scrollbar width (Desktop only)
            const scrollDiv = document.createElement('div');
            scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
            document.body.appendChild(scrollDiv);
            const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
            document.body.removeChild(scrollDiv);

            // 2. Store current scroll position
            scrollOffset.current = window.scrollY;

            // 3. Store original styles
            originalStyle.current = {
                htmlOverflow: document.documentElement.style.overflow,
                overflow: document.body.style.overflow,
                paddingRight: document.body.style.paddingRight,
                position: document.body.style.position,
                top: document.body.style.top,
                width: document.body.style.width
            };

            // 4. Apply locking styles
            if (isIOS) {
                // iOS: use overflow hidden on both html and body.
                // Avoids position:fixed which breaks input focus and keyboard scroll.
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';
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
                const { htmlOverflow, overflow, paddingRight, position, top, width } = originalStyle.current;

                document.documentElement.style.overflow = htmlOverflow;
                document.body.style.overflow = overflow;
                document.body.style.paddingRight = paddingRight;
                document.body.style.position = position;
                document.body.style.top = top;
                document.body.style.width = width;

                originalStyle.current = null;
            }
        }

        return () => {
            // Cleanup: ensure we restore if component unmounts
            if (originalStyle.current) {
                const { htmlOverflow, overflow, paddingRight, position, top, width } = originalStyle.current;
                document.documentElement.style.overflow = htmlOverflow;
                document.body.style.overflow = overflow;
                document.body.style.paddingRight = paddingRight;
                document.body.style.position = position;
                document.body.style.top = top;
                document.body.style.width = width;

                originalStyle.current = null;
            }
        };
    }, [isLocked]);
};
