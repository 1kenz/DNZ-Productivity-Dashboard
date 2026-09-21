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
// MessageBubble.tsx). Proportions are traced from the reference robot
// mascot artwork the user supplied (rounded square head, thick top/bottom
// screen bezel with thin side bezels, round ear bumps, ball antenna).
// The plastic body (head/ears/antenna) uses --color-primary so it stays
// on-brand and adapts across themes, while the screen stays a fixed dark
// tone with pure-white eyes/mouth -- matching the reference art and
// keeping the face legible at small tab-icon sizes in either theme.
export const AiAssistantTabIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <rect x="1.6" y="14.1" width="4.3" height="7.7" rx="2.15" fill="var(--color-primary)" />
    <rect x="26.1" y="14.1" width="4.3" height="7.7" rx="2.15" fill="var(--color-primary)" />
    <line x1="16.17" y1="7.9" x2="16.17" y2="8.6" stroke="var(--color-primary)" strokeWidth="1.1" strokeLinecap="round" />
    <circle cx="16.17" cy="5.6" r="2.35" fill="var(--color-primary)" />
    <rect x="4.7" y="8.3" width="23" height="20" rx="5.3" fill="var(--color-primary)" />
    <rect x="5.5" y="11.6" width="21.2" height="13" rx="3" fill="#181b24" />
    <ellipse cx="11.9" cy="17.1" rx="1.45" ry="1.75" fill="#ffffff" />
    <ellipse cx="20.35" cy="17.05" rx="1.45" ry="1.75" fill="#ffffff" />
    <path d="M12 21 Q16.17 23 20.3 21" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" fill="none" />
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
