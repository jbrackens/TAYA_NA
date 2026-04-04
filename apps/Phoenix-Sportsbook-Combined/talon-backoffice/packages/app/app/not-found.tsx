import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .not-found-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0b0e1c;
          padding: 20px;
        }

        .not-found-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          max-width: 500px;
          text-align: center;
        }

        .not-found-code {
          font-size: 120px;
          font-weight: 800;
          color: #39ff14;
          line-height: 1;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
        }

        .not-found-title {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 8px;
        }

        .not-found-message {
          font-size: 16px;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .home-button {
          margin-top: 16px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #39ff14 0%, #ea580c 100%);
          color: #ffffff;
          text-decoration: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(57, 255, 20, 0.25);
        }

        .home-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(57, 255, 20, 0.35);
        }

        .home-button:active {
          transform: translateY(0);
        }
      `,
        }}
      />

      <div className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-code">404</div>
          <h1 className="not-found-title">Page Not Found</h1>
          <p className="not-found-message">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/" className="home-button">
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
