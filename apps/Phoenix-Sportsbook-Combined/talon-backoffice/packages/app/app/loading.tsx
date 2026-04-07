export default function Loading() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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

        .taya-logo-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .taya-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #39ff14 0%, #ea580c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulseLogo 2s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(57, 255, 20, 0.3);
        }

        .taya-letter {
          font-size: 46px;
          font-weight: 900;
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
      `,
        }}
      />

      <div className="loading-container">
        <div className="loading-content">
          <div className="taya-logo-wrapper">
            <div className="taya-circle">
              <div className="taya-letter">TN</div>
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
