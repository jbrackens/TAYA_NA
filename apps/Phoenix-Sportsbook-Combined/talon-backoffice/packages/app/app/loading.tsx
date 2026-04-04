export default function Loading() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0b0e1c;
          padding: 20px;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }

        .phoenix-logo-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .phoenix-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulseLogo 2s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(249, 115, 22, 0.3);
        }

        .phoenix-letter {
          font-size: 64px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        @keyframes pulseLogo {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.85;
          }
        }

        .loading-text {
          font-size: 18px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.05em;
        }

        .skeleton-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 500px;
        }

        .skeleton-card {
          background: linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%);
          background-size: 200% 100%;
          animation: shimmerCard 1.5s infinite;
          border-radius: 14px;
          height: 160px;
          border: 1px solid #0f1225;
        }

        @keyframes shimmerCard {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}} />

      <div className="loading-container">
        <div className="loading-content">
          <div className="phoenix-logo-wrapper">
            <div className="phoenix-circle">
              <div className="phoenix-letter">P</div>
            </div>
          </div>

          <div className="loading-text">Loading...</div>

          <div className="skeleton-cards">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        </div>
      </div>
    </>
  );
}
