'use client';

import React, { useState, useEffect } from 'react';

export default function OpenChatButton() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      // Hide button when user scrolls to top
      setIsVisible(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    // Open external support chat
    const chatUrl = process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL || 'https://support.phoenix-sportsbook.com/chat';
    window.open(chatUrl, 'supportChat', 'width=800,height=600');
  };

  const buttonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#f97316',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
    transition: 'all 0.3s',
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none',
    zIndex: 999,
  };

  const iconStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    color: '#0f1225',
    fontWeight: 'bold',
    fontSize: '20px',
  };

  return (
    <button
      onClick={handleClick}
      style={buttonStyle}
      title="Open support chat"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ea580c';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.4)';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f97316';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={iconStyle}>💬</span>
    </button>
  );
}
