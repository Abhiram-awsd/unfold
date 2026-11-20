/**
 * The Unfold mark as a loader: three panels fold shut and open again, like a page unfolding.
 * Pure CSS (runs off the main thread while the next page streams in). Static under reduced motion.
 */
export function UnfoldLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="ul-wrap" role="status" aria-live="polite">
      <div className="ul-mark" aria-hidden="true">
        <i className="ul-p ul-p1" />
        <i className="ul-p ul-p2" />
        <i className="ul-p ul-p3" />
      </div>
      <span className="ul-label">{label}<span className="ul-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></span>
    </div>
  );
}
