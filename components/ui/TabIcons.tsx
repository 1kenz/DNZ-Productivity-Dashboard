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
    <path
      d="M12 2L14.2 8.3C14.6 9.4 15.6 10.4 16.7 10.8L23 13L16.7 15.2C15.6 15.6 14.6 16.6 14.2 17.7L12 24L9.8 17.7C9.4 16.6 8.4 15.6 7.3 15.2L1 13L7.3 10.8C8.4 10.4 9.4 9.4 9.8 8.3L12 2Z"
      fill="url(#aiIntelligenceGrad)"
    />
    <path
      d="M19 2L20.1 5.1C20.3 5.7 20.8 6.2 21.4 6.4L24.5 7.5L21.4 8.6C20.8 8.8 20.3 9.3 20.1 9.9L19 13L17.9 9.9C17.7 9.3 17.2 8.8 16.6 8.6L13.5 7.5L16.6 6.4C17.2 6.2 17.7 5.7 17.9 5.1L19 2Z"
      fill="url(#aiIntelligenceGrad2)"
    />
    <defs>
      <linearGradient id="aiIntelligenceGrad" x1="1" y1="2" x2="23" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A855F7" />
        <stop offset="0.5" stopColor="#6366F1" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id="aiIntelligenceGrad2" x1="13.5" y1="2" x2="24.5" y2="13" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EC4899" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);
