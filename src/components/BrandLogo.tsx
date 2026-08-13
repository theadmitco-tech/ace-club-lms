import Image from 'next/image';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  preload?: boolean;
  variant: 'dark' | 'light';
};

export function BrandLogo({
  alt = '',
  className = '',
  preload = false,
  variant,
}: BrandLogoProps) {
  return (
    <Image
      className={`brand-logo ${className}`.trim()}
      src={variant === 'dark' ? '/5.svg' : '/6.svg'}
      alt={alt}
      width={500}
      height={500}
      preload={preload}
      unoptimized
    />
  );
}
