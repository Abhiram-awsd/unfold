/** Dashboard skeleton: same layout as the real page, so nothing jumps when data arrives. */
export default function DashboardLoading() {
  return (
    <div className="db-skel" role="status" aria-label="Loading your dashboard">
      <div className="db-hero">
        <div>
          <span className="sk sk-t" style={{ width: 110 }} />
          <span className="sk sk-h1" />
          <span className="sk sk-pill" />
        </div>
        <div className="db-hero-actions">
          <span className="sk sk-btn" /><span className="sk sk-btn" /><span className="sk sk-btn sk-btn-l" />
        </div>
      </div>
      <div className="db-stats">
        {[0, 1, 2].map(i => <div key={i}><span className="sk sk-t" style={{ width: 120 }} /><span className="sk sk-num" /></div>)}
      </div>
      <div className="db-layout">
        <div className="db-card sk-card">
          {[60, 100, 100, 80, 100, 70].map((w, i) => <span key={i} className="sk sk-field" style={{ width: `${w}%` }} />)}
        </div>
        <div className="db-projects">
          {[0, 1].map(i => (
            <div key={i} className="db-card sk-card">
              <span className="sk sk-t" style={{ width: 70 }} />
              <span className="sk sk-field" /><span className="sk sk-field" style={{ width: "85%" }} /><span className="sk sk-area" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
