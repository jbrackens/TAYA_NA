'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { acceptTerms } from '../lib/api/auth-client';
import { apiClient } from '../lib/api/client';

interface AcceptTermsModalProps {
  open: boolean;
  onAccepted: () => void;
  onLogout: () => void;
  userId: string;
}

export default function AcceptTermsModal({
  open,
  onAccepted,
  onLogout,
  userId,
}: AcceptTermsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsContent, setTermsContent] = useState<string>('');
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchTermsContent();
    }
  }, [open]);

  const fetchTermsContent = async () => {
    setContentLoading(true);
    try {
      const response = await apiClient.get('/api/v1/content/terms');
      if (typeof response === 'object' && response !== null) {
        const content = (response as Record<string, any>).content || String(response);
        setTermsContent(content);
      } else {
        setTermsContent(String(response));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load terms';
      setError(errorMessage);
      setTermsContent('Terms and conditions unavailable');
    } finally {
      setContentLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom =
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight
      ) < 10;
    setIsScrolledToBottom(isAtBottom);
  };

  const handleAccept = async () => {
    if (!isScrolledToBottom) {
      setError('Please read and scroll to the end of the terms');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await acceptTerms({
        user_id: userId,
        terms_version: '1.0',
      });
      onAccepted();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept terms';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const contentWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const scrollContainerStyle: React.CSSProperties = {
    height: '300px',
    overflowY: 'auto',
    backgroundColor: '#0a0e18',
    border: '1px solid #1a1f3a',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.6',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  };

  const acceptButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: isScrolledToBottom ? '#f97316' : '#4b5563',
    color: isScrolledToBottom ? '#0f1225' : '#cbd5e1',
    border: 'none',
    borderRadius: '4px',
    cursor: isScrolledToBottom ? 'pointer' : 'not-allowed',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s',
    opacity: loading ? 0.6 : 1,
  };

  const logoutButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #64748b',
    color: '#64748b',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#f87171',
    padding: '8px 12px',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: '4px',
  };

  return (
    <Modal open={open} onClose={() => {}} title="Terms and Conditions">
      <div style={containerStyle}>
        <div style={contentWrapperStyle}>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
            Please review and accept our terms and conditions to continue.
          </p>

          {contentLoading ? (
            <div
              style={{
                ...scrollContainerStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              Loading terms...
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={scrollContainerStyle}
            >
              {termsContent}
            </div>
          )}

          {!contentLoading && !isScrolledToBottom && (
            <div style={{ fontSize: '12px', color: '#f97316' }}>
              Please scroll down to read the complete terms
            </div>
          )}

          {error && <div style={errorStyle}>{error}</div>}
        </div>

        <div style={buttonGroupStyle}>
          <button
            onClick={handleAccept}
            disabled={!isScrolledToBottom || loading}
            style={acceptButtonStyle}
            onMouseEnter={(e) => {
              if (isScrolledToBottom && !loading) {
                e.currentTarget.style.backgroundColor = '#ea580c';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isScrolledToBottom ? '#f97316' : '#4b5563';
            }}
          >
            {loading ? 'Accepting...' : 'Accept Terms'}
          </button>
          <button
            onClick={onLogout}
            disabled={loading}
            style={logoutButtonStyle}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = 'rgba(100, 116, 139, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </Modal>
  );
}
