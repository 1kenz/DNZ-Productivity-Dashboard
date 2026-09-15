import React from 'react';

interface AppleNotesIconProps {
  size?: number;
  className?: string;
}

export const AppleNotesIcon: React.FC<AppleNotesIconProps> = ({ size = 20, className }) => {
  const headerHeight = Math.max(4, Math.round(size * 0.24));
  const borderRadius = Math.max(3, Math.round(size * 0.2));

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        background: '#f8fafc',
        borderRadius: borderRadius,
        overflow: 'hidden',
        display: 'inline-flex',
        flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
        border: '0.5px solid rgba(0, 0, 0, 0.15)',
        position: 'relative',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: headerHeight,
          width: '100%',
          background: 'linear-gradient(180deg, #f59e0b 0%, #eab308 100%)',
        }}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          padding: '1px 3px',
          background: '#ffffff',
        }}
      >
        <span style={{ height: '1px', width: '100%', background: '#cbd5e1', borderRadius: '1px' }} />
        <span style={{ height: '1px', width: '100%', background: '#cbd5e1', borderRadius: '1px' }} />
        <span style={{ height: '1px', width: '75%', background: '#cbd5e1', borderRadius: '1px' }} />
      </div>
    </div>
  );
};
