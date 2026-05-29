import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  variant?: 'navy' | 'white';
  className?: string;
  href?: string;
  priority?: boolean;
};

export function BrandLogo({
  variant = 'navy',
  className,
  href,
  priority = false,
}: BrandLogoProps) {
  const src =
    variant === 'white' ? '/brand/gerimalp-logo-white.svg' : '/brand/gerimalp-logo-navy.svg';

  const image = (
    <Image
      src={src}
      alt="Gerimalp"
      width={180}
      height={50}
      priority={priority}
      className={cn('h-10 w-auto', className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {image}
      </Link>
    );
  }

  return image;
}

export function BrandPictogram({
  variant = 'navy',
  className,
}: {
  variant?: 'navy' | 'white';
  className?: string;
}) {
  const src =
    variant === 'white'
      ? '/brand/gerimalp-g-pictogram-white.svg'
      : '/brand/gerimalp-g-pictogram.svg';

  return (
    <Image
      src={src}
      alt=""
      width={40}
      height={40}
      aria-hidden
      className={cn('h-10 w-10', className)}
    />
  );
}
