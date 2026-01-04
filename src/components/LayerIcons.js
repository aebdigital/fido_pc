import React, { useId } from 'react';

/**
 * Layer icons for plasterboard types (Simple, Double, Triple)
 * Exact replicas matching iOS design
 */

// Simple Layer - single parallelogram (one layer only)
export const SimpleLayerIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path
      d="M18 8 L11 11 L11 19 L18 16 Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

// Double Layer - two stacked parallelograms with mask
export const DoubleLayerIcon = ({ className = "w-6 h-6" }) => {
  const id = useId();
  const maskId = `double-cut-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white"/>
          <path d="M18 8 L11 11 L11 19 L18 16 Z" fill="black"/>
        </mask>
      </defs>

      {/* back (up-left) */}
      <path
        d="M16 6 L9 9 L9 17 L16 14 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        mask={`url(#${maskId})`}
      />

      {/* front (whole) */}
      <path
        d="M18 8 L11 11 L11 19 L18 16 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Triple Layer - three stacked parallelograms with masks
export const TripleLayerIcon = ({ className = "w-6 h-6" }) => {
  const id = useId();
  const maskMiddleId = `triple-middle-${id}`;
  const maskBackId = `triple-back-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <defs>
        {/* middle hidden only where front covers it */}
        <mask id={maskMiddleId}>
          <rect width="24" height="24" fill="white"/>
          <path d="M18 8 L11 11 L11 19 L18 16 Z" fill="black"/>
        </mask>

        {/* back hidden where middle OR front cover it */}
        <mask id={maskBackId}>
          <rect width="24" height="24" fill="white"/>
          <path d="M16 6 L9 9 L9 17 L16 14 Z" fill="black"/>
          <path d="M18 8 L11 11 L11 19 L18 16 Z" fill="black"/>
        </mask>
      </defs>

      {/* back (furthest) */}
      <path
        d="M14 4 L7 7 L7 15 L14 12 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        mask={`url(#${maskBackId})`}
      />

      {/* middle */}
      <path
        d="M16 6 L9 9 L9 17 L16 14 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        mask={`url(#${maskMiddleId})`}
      />

      {/* front (whole) */}
      <path
        d="M18 8 L11 11 L11 19 L18 16 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Active layers icon for complementary works
// Shows empty circle for 0, SimpleLayerIcon in circle for 1, DoubleLayerIcon in circle for 2
export const ActiveLayersIcon = ({ activeLayers = 0, className = "w-6 h-6" }) => {
  const id = useId();
  const maskId = `active-double-${id}`;

  if (activeLayers === 0) {
    // Empty circle
    return (
      <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  if (activeLayers === 1) {
    // Filled circle with single layer icon inside (bigger)
    return (
      <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M17 7 L9 10.5 L9 18 L17 14.5 Z"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="dark:stroke-gray-900"
        />
      </svg>
    );
  }

  // activeLayers >= 2 - Filled circle with double layer icon inside (bigger)
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white"/>
          <path d="M17 7 L9 10.5 L9 18 L17 14.5 Z" fill="black"/>
        </mask>
      </defs>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      {/* back layer */}
      <path
        d="M14.5 5 L6.5 8.5 L6.5 16 L14.5 12.5 Z"
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        mask={`url(#${maskId})`}
        className="dark:stroke-gray-900"
      />
      {/* front layer */}
      <path
        d="M17 7 L9 10.5 L9 18 L17 14.5 Z"
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="dark:stroke-gray-900"
      />
    </svg>
  );
};

const LayerIcons = {
  SimpleLayerIcon,
  DoubleLayerIcon,
  TripleLayerIcon,
  ActiveLayersIcon
};

export default LayerIcons;
