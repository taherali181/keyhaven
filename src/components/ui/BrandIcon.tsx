import React from 'react';

interface BrandIconProps {
  className?: string;
  size?: number;
}

/**
 * KeyHaven canonical typewriter mark.
 * Uses currentColor so every site-wide theme can supply its own accent.
 */
export function BrandIcon({ className = '', size = 22 }: BrandIconProps) {
  return (
    <span
      className={`brand-icon ${className}`.trim()}
      role="img"
      aria-label="KeyHaven typewriter"
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg
        viewBox="-6 -6 112 112"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      >
        <g fill="currentColor">
          <path
            d="M20 31V2H80V31"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect x="12" y="34" width="76" height="11" rx="3" />
          <path d="M2 32H6Q10 32 10 36V45Q10 49 6 49H2Q-2 49 -2 45V36Q-2 32 2 32ZM94 32H98Q102 32 102 36V45Q102 49 98 49H94Q90 49 90 45V36Q90 32 94 32Z" />
          <path
            fillRule="evenodd"
            d="M20 49H80Q87 49 90 57L100 87Q105 100 91 100H9Q-5 100 0 87L10 57Q13 49 20 49Z M21 69a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z M43 69a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z M65 69a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z M22 81H78a4.5 4.5 0 0 1 0 9H22a4.5 4.5 0 0 1 0-9Z"
          />
        </g>
      </svg>
    </span>
  );
}
