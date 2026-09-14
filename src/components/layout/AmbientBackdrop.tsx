// Soft light behind the whole app, painted once as static gradients so the glass has something to frost
// without the GPU cost of animated, blurred layers.
export function AmbientBackdrop() {
  return <div className="ambient" aria-hidden="true" />;
}
