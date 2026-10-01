import { DiscordIcon, GithubIcon, HyperlaneLogo, TwitterIcon } from '@hyperlane-xyz/widgets';
import Link from 'next/link';
import { ReactNode } from 'react';
import { links } from '../../consts/links';
import { Color } from '../../styles/Color';

type FooterLink = {
  title: string;
  url: string;
  external: boolean;
  icon?: ReactNode;
};

const footerLinks: FooterLink[] = [
  { title: 'Docs', url: links.docs, external: true },
  { title: 'Terms', url: links.tos, external: true },
  { title: 'Twitter', url: links.twitter, external: true, icon: <TwitterIcon color="#fff" /> },
  { title: 'Homepage', url: links.home, external: true },
  { title: 'Privacy', url: links.privacyPolicy, external: true },
  { title: 'Discord', url: links.discord, external: true, icon: <DiscordIcon color="#fff" /> },
  { title: 'Explorer', url: links.explorer, external: true },
  { title: 'Bounty', url: links.bounty, external: true },
  { title: 'Github', url: links.github, external: true, icon: <GithubIcon color="#fff" /> },
];

export function Footer() {
  return (
    <footer className="relative px-4 pb-6 pt-4 text-white">
      <div className="flex flex-col items-center gap-4">
        <FooterLogo />
        <FooterNav />
      </div>
    </footer>
  );
}

function FooterLogo() {
  return (
    <div className="flex flex-col items-center gap-1.5 opacity-80">
      <div className="h-6 w-6">
        <HyperlaneLogo color={Color.white} />
      </div>
      <div className="text-center text-xs leading-tight text-gray-400">
        <div>Powered by</div>
        <div className="font-medium text-white">Hyperlane</div>
      </div>
    </div>
  );
}

function FooterNav() {
  return (
    <nav>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-gray-400">
        {footerLinks.map((item) => (
          <li key={item.title}>
            <Link
              className="flex items-center gap-1.5 capitalize transition-colors hover:text-white"
              target={item.external ? '_blank' : '_self'}
              href={item.url}
            >
              {item?.icon && <div className="w-3.5 opacity-80">{item?.icon}</div>}
              <span>{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
