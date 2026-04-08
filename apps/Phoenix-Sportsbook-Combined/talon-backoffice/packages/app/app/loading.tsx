export default function Loading() {
  return (
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
  );
}
