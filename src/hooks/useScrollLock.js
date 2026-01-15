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
    // Use a ref to store the original style values to restore them later
    const originalStyle = useRef(null);

    // useLayoutEffect ensures style changes happen before paint to avoid flicker
    useLayoutEffect(() => {
        if (isLocked) {
            // 1. Calculate scrollbar width
            // Create a temporary div to measure scrollbar width
            const scrollDiv = document.createElement('div');
            scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
            document.body.appendChild(scrollDiv);
            const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
            document.body.removeChild(scrollDiv);

            // 2. Check strict iOS detection (iPadOS often masquerades as Mac/Desktop)
            // Check for 'MacIntel' plus touch points to catch iPad Pro
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            // 3. Store original styles
            originalStyle.current = {
                overflow: document.body.style.overflow,
                paddingRight: document.body.style.paddingRight,
            };

            // 4. Apply locking styles
            document.body.style.overflow = 'hidden';

            // 5. Apply padding compensation ONLY if:
            // - Not iOS/iPad (iOS handles overlay scrollbars natively)
            // - Scrollbar actually has width (> 0)
            if (!isIOS && scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        } else {
            // Restore original styles
            if (originalStyle.current) {
                document.body.style.overflow = originalStyle.current.overflow;
                document.body.style.paddingRight = originalStyle.current.paddingRight;
                originalStyle.current = null;
            }
        }

        // Cleanup function - normally handled by the 'else' block when isLocked changes,
        // but this ensures cleanup if the component unmounts while locked.
        return () => {
            if (originalStyle.current) {
                document.body.style.overflow = originalStyle.current.overflow;
                document.body.style.paddingRight = originalStyle.current.paddingRight;
                originalStyle.current = null;
            }
        };
    }, [isLocked]);
};
