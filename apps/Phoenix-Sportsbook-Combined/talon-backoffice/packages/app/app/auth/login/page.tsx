'use client';

import Link from 'next/link';
import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: '#0f1225',
        border: '1px solid #1a1f3a',
        borderRadius: '8px',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#ffffff',
          }}>
            Phoenix
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#a0a0a0',
          }}>
            Sportsbook Platform
          </p>
        </div>

        <LoginForm onSuccess={() => window.location.href = '/'} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '24px 0',
          gap: '12px',
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: '#0f3460',
          }} />
          <span style={{
            color: '#a0a0a0',
            fontSize: '12px',
          }}>
            or continue with
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: '#0f3460',
          }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <button type="button" style={{
            padding: '10px',
            backgroundColor: '#0f3460',
            border: '1px solid #4a7eff',
            color: '#4a7eff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4a7eff';
              e.currentTarget.style.color = '#1a1a2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0f3460';
              e.currentTarget.style.color = '#4a7eff';
            }}
          >
            Google
          </button>
          <button type="button" style={{
            padding: '10px',
            backgroundColor: '#0f3460',
            border: '1px solid #4a7eff',
            color: '#4a7eff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4a7eff';
              e.currentTarget.style.color = '#1a1a2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0f3460';
              e.currentTarget.style.color = '#4a7eff';
            }}
          >
            Apple
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          color: '#a0a0a0',
          fontSize: '14px',
        }}>
          Don't have an account?
          <Link href="/auth/signup" style={{
            color: '#4a7eff',
            textDecoration: 'none',
            fontWeight: 600,
            marginLeft: '4px',
          }}>
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
