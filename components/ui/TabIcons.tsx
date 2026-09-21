import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const DashboardTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="3" width="7" height="9" rx="2" fill="url(#dashGrad1)" />
    <rect x="14" y="3" width="7" height="5" rx="2" fill="url(#dashGrad2)" fillOpacity="0.8" />
    <rect x="14" y="12" width="7" height="9" rx="2" fill="url(#dashGrad1)" />
    <rect x="3" y="16" width="7" height="5" rx="2" fill="url(#dashGrad2)" fillOpacity="0.8" />
    <defs>
      <linearGradient id="dashGrad1" x1="3" y1="3" x2="10" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
      <linearGradient id="dashGrad2" x1="14" y1="3" x2="21" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818CF8" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
    </defs>
  </svg>
);

export const TimeTrackerTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <circle cx="12" cy="13" r="8" stroke="url(#timeGrad)" strokeWidth="2" />
    <path d="M12 9V13L15 15" stroke="url(#timeGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 2H14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 2V5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="timeGrad" x1="4" y1="5" x2="20" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

export const RecurringTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <path
      d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5"
      stroke="url(#recurGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M20 4.5V8.5H16" stroke="url(#recurGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M20 12a8 8 0 0 1-13.66 5.66L4 15.5"
      stroke="url(#recurGrad2)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4 19.5V15.5H8" stroke="url(#recurGrad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="recurGrad" x1="4" y1="4" x2="20" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EC4899" />
        <stop offset="1" stopColor="#F43F5E" />
      </linearGradient>
      <linearGradient id="recurGrad2" x1="20" y1="12" x2="4" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F43F5E" />
        <stop offset="1" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

export const AnalyticsTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="14" width="4" height="7" rx="1.5" fill="#10B981" fillOpacity="0.85" />
    <rect x="10" y="8" width="4" height="13" rx="1.5" fill="#06B6D4" />
    <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#6366F1" />
    <path
      d="M4 11L11 5L16 9L21 3"
      stroke="#10B981"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Friendly robot-head mark for the AI Assistant -- used both as this
// tab's icon and as the assistant's avatar on its chat bubbles (see
// MessageBubble.tsx). Deliberately painted with theme tokens rather than
// a fixed brand gradient (unlike this file's other tab icons): a solid
// black head would disappear against a dark background, so the head/ears/
// antenna use --color-text-primary (flips light/dark automatically) and
// the eyes/mouth punch through in --color-bg-secondary with a
// --color-primary pupil accent.
export const AiAssistantTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <line x1="12" y1="1.5" x2="12" y2="4.2" stroke="var(--color-text-primary)" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="1.4" r="1.3" fill="var(--color-text-primary)" />
    <rect x="0.8" y="9" width="2.6" height="6.5" rx="1.3" fill="var(--color-text-primary)" />
    <rect x="20.6" y="9" width="2.6" height="6.5" rx="1.3" fill="var(--color-text-primary)" />
    <rect x="3.8" y="4" width="16.4" height="15.5" rx="5.5" fill="var(--color-text-primary)" />
    <circle cx="9" cy="11.8" r="2" fill="var(--color-bg-secondary)" />
    <circle cx="9" cy="11.8" r="0.9" fill="var(--color-primary)" />
    <circle cx="15" cy="11.8" r="2" fill="var(--color-bg-secondary)" />
    <circle cx="15" cy="11.8" r="0.9" fill="var(--color-primary)" />
    <path d="M9 16 Q12 18.2 15 16" stroke="var(--color-bg-secondary)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

export const CalendarTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="4" width="18" height="17" rx="3" fill="url(#calGrad1)" />
    <rect x="3" y="4" width="18" height="5" rx="3" fill="url(#calGrad2)" />
    <rect x="7" y="1.5" width="2" height="5" rx="1" fill="#4F46E5" />
    <rect x="15" y="1.5" width="2" height="5" rx="1" fill="#4F46E5" />
    <rect x="6.5" y="12" width="3" height="3" rx="0.8" fill="#FFFFFF" fillOpacity="0.85" />
    <rect x="10.5" y="12" width="3" height="3" rx="0.8" fill="#FFFFFF" fillOpacity="0.6" />
    <rect x="14.5" y="12" width="3" height="3" rx="0.8" fill="#FFFFFF" fillOpacity="0.6" />
    <rect x="6.5" y="16" width="3" height="3" rx="0.8" fill="#FFFFFF" fillOpacity="0.6" />
    <rect x="10.5" y="16" width="3" height="3" rx="0.8" fill="#FFFFFF" fillOpacity="0.85" />
    <defs>
      <linearGradient id="calGrad1" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818CF8" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
      <linearGradient id="calGrad2" x1="3" y1="4" x2="21" y2="9" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4338CA" />
      </linearGradient>
    </defs>
  </svg>
);
