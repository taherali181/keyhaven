import Image from 'next/image';

export { BrandIcon } from './BrandIcon';

export function BrandLogo() {
  return <span className="brand-logo" role="img" aria-label="KeyHaven">
    <Image className="brand-logo-light" src="/brand/logo.svg" width={1540} height={475} alt="" unoptimized loading="eager" />
    <Image className="brand-logo-dark" src="/brand/logo-dark.svg" width={1540} height={475} alt="" unoptimized loading="eager" />
  </span>;
}

