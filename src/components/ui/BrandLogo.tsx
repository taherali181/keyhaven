export { BrandIcon } from './BrandIcon';
import { BrandIcon } from './BrandIcon';

export function BrandLogo() {
  return <span className="brand-logo" role="img" aria-label="KeyHaven">
    <span className="brand-logo-silhouette" aria-hidden="true" />
    <span className="brand-logo-mark" aria-hidden="true"><BrandIcon size={100} /></span>
  </span>;
}
