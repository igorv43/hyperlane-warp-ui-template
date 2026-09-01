import { geolocation } from '@vercel/functions';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // only run on the index
  matcher: '/',
};

const BLOCKED_COUNTRIES = [
  'CU', // Cuba
  'KP', // North Korea
  'RU', // Russia
  'AF', // Afghanistan
  'BY', // Belarus
  'BA', // Bosnia & Herzegovina
  'CF', // Central African Republic
  'CD', // Democratic Republic of the Congo
  'GN', // Guinea
  'GW', // Guinea-Bissau
  'HT', // Haiti
  'IQ', // Iraq
  'LB', // Lebanon
  'LY', // Libya
  'ML', // Mali
  'NI', // Nicaragua
  'SO', // Somalia
  'SS', // South Sudan
  'SD', // Sudan
  'VE', // Venezuela
  'YE', // Yemen
  'ZW', // Zimbabwe
  'MM', // Myanmar
  'SY', // Syria
];

const BLOCKED_REGIONS = [
  {
    country: 'UA', // Ukraine
    regions: [
      '43', // Crimea
      '14', // Donetsk
      '09', // Luhansk
    ],
  },
];

export function middleware(req: NextRequest) {
  try {
    // geolocation only works on Vercel; in other environments it returns undefined
    // We use try-catch so it doesn't break in other environments like EasyPanel
    const geo = geolocation(req);
    const country = geo?.country;
    const region = geo?.region;

    if (country && BLOCKED_COUNTRIES.includes(country)) {
      return NextResponse.redirect(new URL('/blocked', req.url));
    }

    if (
      country &&
      region &&
      BLOCKED_REGIONS.find((x) => x.country === country)?.regions.includes(region)
    ) {
      return NextResponse.redirect(new URL('/blocked', req.url));
    }
  } catch (error) {
    // If geolocation fails (e.g. in non-Vercel environments), just continue
    // This allows the application to work on EasyPanel and other hosts
    console.warn('Geolocation not available:', error);
  }

  return NextResponse.next();
}
