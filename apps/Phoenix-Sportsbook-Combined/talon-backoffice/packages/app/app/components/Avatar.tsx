'use client';

import React from 'react';

interface AvatarProps {
  name?: string;
  size?: number;
  src?: string;
}

export default function Avatar({ name = '', size = 40, src }: AvatarProps) {
  // Generate color from name hash
  const getColorFromHash = (str: string): string => {
    if (!str) return '#f97316';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    const colors = [
      '#f97316', // orange
      '#3b82f6', // blue
      '#ec4899', // pink
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
    ];

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get initials from name
  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const backgroundColor = getColorFromHash(name);
  const initials = getInitials(name);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: src ? 'transparent' : backgroundColor,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${size * 0.4}px`,
    fontWeight: '600',
    color: '#ffffff',
  };

  return (
    <div style={containerStyle}>
      {src ? (
        <img src={src} alt={name} style={imageStyle} />
      ) : (
        <span style={textStyle}>{initials || '?'}</span>
      )}
    </div>
  );
}
