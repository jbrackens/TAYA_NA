'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

interface IdComplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  verificationType?: 'kba' | 'idpv' | 'auto';
}

interface KbaQuestion {
  questionId: string;
  question: string;
  options: string[];
}

/**
 * ID-Comply KBA/IDPV verification modal.
 *
 * In production, this component integrates with the ID-Comply third-party SDK
 * via a script tag injected at runtime. The SDK provides:
 *  - Knowledge-Based Authentication (KBA): presents identity questions
 *  - Identity Proofing & Verification (IDPV): document upload + selfie
 *
 * The component handles the UI flow, while the actual verification calls
 * go through our compliance API which proxies to ID-Comply.
 */
export const IdComplyModal: React.FC<IdComplyModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  verificationType = 'auto',
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'kba' | 'idpv' | 'processing' | 'success' | 'failed'>('select');
  const [kbaQuestions, setKbaQuestions] = useState<KbaQuestion[]>([]);
  const [kbaAnswers, setKbaAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startKba = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';
      const token = typeof window !== 'undefined' ? localStorage.getItem('phoenix_access_token') : null;
      const res = await fetch(`${apiUrl}/api/v1/compliance/kba/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) throw new Error('Failed to start KBA verification');
      const data = await res.json();
      setKbaQuestions(data.questions || []);
      setStep('kba');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitKba = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';
      const token = typeof window !== 'undefined' ? localStorage.getItem('phoenix_access_token') : null;
      const res = await fetch(`${apiUrl}/api/v1/compliance/kba/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?.id, answers: kbaAnswers }),
      });
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();
      if (data.verified) {
        setStep('success');
        setTimeout(() => onVerified(), 2000);
      } else {
        setStep('failed');
        setError(data.reason || 'Verification could not be completed');
      }
    } catch (err) {
      setStep('failed');
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [user, kbaAnswers, onVerified]);

  const startIdpv = useCallback(async () => {
    setStep('processing');
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';
      const token = typeof window !== 'undefined' ? localStorage.getItem('phoenix_access_token') : null;
      const res = await fetch(`${apiUrl}/api/v1/compliance/idpv/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) throw new Error('Failed to start IDPV');
      const data = await res.json();

      // In production, the ID-Comply SDK opens an iframe/redirect here
      // data.redirectUrl would point to the ID-Comply hosted verification page
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank', 'width=600,height=800');
      }

      // Poll for verification status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${apiUrl}/api/v1/compliance/idpv/status?userId=${user?.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const statusData = await statusRes.json();
          if (statusData.status === 'verified') {
            clearInterval(pollInterval);
            setStep('success');
            setTimeout(() => onVerified(), 2000);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setStep('failed');
            setError(statusData.reason || 'IDPV verification failed');
          }
        } catch {
          // Continue polling
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (step === 'processing') {
          setStep('failed');
          setError('Verification timed out. Please try again.');
        }
      }, 300000);
    } catch (err) {
      setStep('failed');
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    }
  }, [user, onVerified, step]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#111328', borderRadius: '16px', padding: '32px',
    maxWidth: '480px', width: '100%', border: '1px solid #1a1f3a',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {step === 'select' && (
          <>
            <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Identity Verification
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
              To comply with regulations, we need to verify your identity. Choose a verification method below.
            </p>
            {error && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={startKba}
                disabled={loading}
                style={{
                  padding: '16px', borderRadius: '10px', background: '#161a35',
                  border: '1px solid #1e2243', color: '#f1f5f9', cursor: 'pointer',
                  textAlign: 'left', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                  Knowledge-Based Authentication
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Answer a few questions to verify your identity
                </div>
              </button>
              <button
                onClick={startIdpv}
                disabled={loading}
                style={{
                  padding: '16px', borderRadius: '10px', background: '#161a35',
                  border: '1px solid #1e2243', color: '#f1f5f9', cursor: 'pointer',
                  textAlign: 'left', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                  Document Verification
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Upload a government-issued ID and take a selfie
                </div>
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: '16px', width: '100%', padding: '12px',
                borderRadius: '8px', background: 'transparent', border: '1px solid #1e2243',
                color: '#64748b', cursor: 'pointer', fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </>
        )}

        {step === 'kba' && (
          <>
            <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Answer Verification Questions
            </h2>
            {kbaQuestions.map((q) => (
              <div key={q.questionId} style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  {q.question}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setKbaAnswers((prev) => ({ ...prev, [q.questionId]: opt }))}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                        background: kbaAnswers[q.questionId] === opt ? 'rgba(249,115,22,0.1)' : '#161a35',
                        border: `1px solid ${kbaAnswers[q.questionId] === opt ? '#f97316' : '#1e2243'}`,
                        color: kbaAnswers[q.questionId] === opt ? '#f97316' : '#94a3b8',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {error && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <button
              onClick={submitKba}
              disabled={loading || Object.keys(kbaAnswers).length < kbaQuestions.length}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px',
                background: '#f97316', border: 'none', color: '#fff',
                fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                opacity: loading || Object.keys(kbaAnswers).length < kbaQuestions.length ? 0.4 : 1,
              }}
            >
              {loading ? 'Verifying...' : 'Submit Answers'}
            </button>
          </>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Verification In Progress
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Please complete the verification in the opened window. This page will update automatically.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h2 style={{ color: '#22c55e', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Verification Successful
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Your identity has been verified. You may now continue.
            </p>
          </div>
        )}

        {step === 'failed' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✗</div>
            <h2 style={{ color: '#f87171', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Verification Failed
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
              {error || 'Unable to verify your identity. Please try again or contact support.'}
            </p>
            <button
              onClick={() => { setStep('select'); setError(null); }}
              style={{
                padding: '12px 24px', borderRadius: '10px', background: '#f97316',
                border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdComplyModal;
