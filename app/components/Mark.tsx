/** The Unfold logo: three panels of a page opening out. */
export function Mark({ href = "/" }: { href?: string }) {
  return (
    <a className="mark" href={href} aria-label="Unfold home">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 5.5 9.5 3v16L3 21.5z" fill="#bdbdc3" />
        <path d="M9.5 3 15 5.5v16L9.5 19z" fill="#6c6c73" />
        <path d="M15 5.5 21 3v16l-6 2.5z" fill="#f2f2f4" />
      </svg>
      Unfold
    </a>
  );
}
