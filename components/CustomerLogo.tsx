import Image from 'next/image';

/**
 * A customer's logo, used as the tab itself. The button keeps the name in aria-label;
 * the text is not drawn beside the mark.
 *
 * <p>The files in public/customer-logos are the customers' own logos on white, trimmed to
 * their edges and 64 px tall (sharp at the 20 px shown, on a 3x screen too). They sit on
 * a small white badge rather than being made transparent: MK's lettering is white inside
 * its green band, and would vanish on the blue of a selected tab or in dark mode.
 */
const LOGOS = {
  mk: { src: '/customer-logos/mk.png', width: 108 },
  aot: { src: '/customer-logos/aot.png', width: 215 },
  pcs: { src: '/customer-logos/pcs.png', width: 87 },
  makro: { src: '/customer-logos/makro.png', width: 209 },
  ifs: { src: '/customer-logos/ifs.png', width: 64 },
} as const;

export type CustomerLogoKey = keyof typeof LOGOS;

/** Decorative: the tab button's aria-label names the customer, so alt is empty. */
export function CustomerLogo({ customer }: { customer: CustomerLogoKey }) {
  const logo = LOGOS[customer];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-white px-1 ring-1 ring-black/5">
      <Image src={logo.src} alt="" width={logo.width} height={64} className="h-5 w-auto" />
    </span>
  );
}
