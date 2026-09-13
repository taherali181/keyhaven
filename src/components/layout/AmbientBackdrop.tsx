// Slowly drifting light behind the whole app — gives the glass surfaces something to frost.
export function AmbientBackdrop() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient-blob a" />
      <span className="ambient-blob b" />
      <span className="ambient-blob c" />
      <span className="ambient-grain" />
    </div>
  );
}
