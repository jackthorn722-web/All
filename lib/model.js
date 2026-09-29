// Turns a validated site.json into everything the templates render:
// merged copy (client overrides > variant > base), formatted phone/hours,
// CTA buttons, theme tokens and LocalBusiness JSON-LD.
import { getVariant } from '../templates/index.js';
import { baseDefaults } from '../templates/base/defaults.js';
import { phoneDigits, DAYS } from './schema.js';
import { themeTokens } from './colors.js';

const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export function listJoin(items, word = 'and') {
  if (items.length <= 2) return items.join(` ${word} `);
  return `${items.slice(0, -1).join(', ')}, ${word} ${items.at(-1)}`;
}

function fill(template, tokens) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (key in tokens ? tokens[key] : m));
}

// "08:00" -> "8am", "17:30" -> "5:30pm"
function time12(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

// Consecutive days with the same hours become one row: "Mon-Fri 8am-6pm".
export function groupHours(hours) {
  const groups = [];
  for (const day of DAYS) {
    const last = groups.at(-1);
    if (last && last.value === hours[day]) last.days.push(day);
    else groups.push({ days: [day], value: hours[day] });
  }
  return groups.map(({ days, value }) => ({
    days,
    label: days.length === 1 ? DAY_SHORT[days[0]] : `${DAY_SHORT[days[0]]}–${DAY_SHORT[days.at(-1)]}`,
    value: value === 'closed' ? 'Closed' : value.split('-').map(time12).join('–'),
    closed: value === 'closed',
    opens: value === 'closed' ? null : value.slice(0, 5),
    closes: value === 'closed' ? null : value.slice(6),
  }));
}

export function buildModel(spec, { slug, siteUrl, formKey = '' }) {
  const variant = getVariant(spec.template);
  const b = spec.business;
  const digits = phoneDigits(b.phone);
  const phoneDisplay = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  const e164 = `+1${digits}`;
  const cities = [b.serviceArea.homeCity, ...b.serviceArea.nearbyCities];
  const industry = b.industry ?? variant.industry;
  const ownerFirst = b.ownerName.split(/\s+/)[0];
  const years = b.foundedYear ? new Date().getFullYear() - b.foundedYear : null;

  const tokens = {
    business: b.name,
    industry,
    city: b.serviceArea.homeCity,
    state: b.serviceArea.state,
    cities: listJoin(cities),
    citiesShort: cities.length > 3 ? `${cities.slice(0, 3).join(', ')}, and nearby` : listJoin(cities),
    callOrText: b.textsOk ? 'Call or text' : 'Call',
    owner: b.ownerName,
    ownerFirst,
    // Word joiners keep "(801) 555-0142" on one line inside running text.
    phone: phoneDisplay.replace(' ', '\u00a0').replace('-', '\u2060-\u2060'),
  };
  // Meta text gets the plain phone number (no invisible word joiners).
  const plainTokens = { ...tokens, phone: phoneDisplay };
  const rawCopy = { ...variant.copy, ...(b.tagline ? { tagline: b.tagline } : {}), ...spec.copy };
  // A variant's "Before and after" title makes no sense without any pairs.
  if (!spec.gallery.beforeAfter.length && !spec.copy.galleryTitle) rawCopy.galleryTitle = baseDefaults.copy.galleryTitle;
  const copy = Object.fromEntries(Object.entries(rawCopy).map(([k, v]) => [k, fill(v, tokens)]));

  const services = spec.services ?? variant.services;
  const faq = (spec.faq ?? variant.faq).map((f) => ({ q: fill(f.q, tokens), a: fill(f.a, tokens) }));
  const sections = spec.sections ?? variant.sections;

  const telHref = `tel:${e164}`;
  // "?&body=" works on both iOS and Android.
  const smsHref = `sms:${e164}?&body=${encodeURIComponent(copy.smsBody)}`;
  const buttons = [
    { kind: 'call', label: copy.ctaCall, href: telHref, icon: 'phone' },
    ...(b.textsOk ? [{ kind: 'text', label: copy.ctaText, href: smsHref, icon: 'message' }] : []),
    ...(spec.cta.bookingUrl ? [{ kind: 'book', label: copy.ctaBook, href: spec.cta.bookingUrl, icon: 'calendar', external: true }] : []),
  ];
  // The chosen primary action goes first and gets the filled button style.
  buttons.sort((x, y) => (y.kind === spec.cta.primary) - (x.kind === spec.cta.primary));
  buttons.forEach((btn, i) => (btn.primary = i === 0));

  const hours = groupHours(b.hours);
  const theme = themeTokens(spec.brand);
  const keyword = spec.seo.keywords[0];
  const title = spec.seo.title ? fill(spec.seo.title, plainTokens) : `${b.name} | ${capitalize(keyword)} in ${b.serviceArea.homeCity}, ${b.serviceArea.state}`;
  const description = fill(spec.seo.metaDescription ?? rawCopy.metaDescription, plainTokens);

  const trust = [];
  if (spec.reviews.googleRating)
    trust.push({
      icon: 'star',
      text: `${spec.reviews.googleRating.toFixed(1)} on Google${spec.reviews.googleReviewCount ? ` (${spec.reviews.googleReviewCount} reviews)` : ''}`,
      href: spec.reviews.googleReviewsUrl,
    });
  if (years !== null) trust.push({ icon: 'award', text: years >= 1 ? `${years}+ year${years === 1 ? '' : 's'} in business` : `Est. ${b.foundedYear}` });
  const shortCities = cities.length > 3 ? `${cities.slice(0, 3).join(', ')} & more` : listJoin(cities, '&');
  trust.push({ icon: 'pin', text: `Serving ${shortCities}` });
  if (b.licensed || b.insured)
    trust.push({ icon: 'shield', text: b.licensed && b.insured ? 'Licensed & insured' : b.licensed ? 'Licensed' : 'Fully insured' });
  if (copy.trustBadge) trust.push({ icon: 'truck', text: copy.trustBadge });

  const socials = Object.entries(spec.socials).map(([key, href]) => ({ key, href, label: SOCIAL_LABELS[key] }));

  return {
    slug,
    template: spec.template,
    siteUrl,
    heroStyle: variant.heroStyle,
    sections,
    theme: { mode: spec.brand.theme, tokens: theme },
    business: { ...b, industry, phoneDisplay, e164, telHref, smsHref, email: b.email, ownerFirst, years, cities },
    copy,
    services,
    faq,
    reviews: spec.reviews,
    gallery: spec.gallery,
    images: { ...spec.images, logo: spec.brand.logo },
    socials,
    buttons,
    hours,
    trust,
    seo: { title, description, keywords: spec.seo.keywords },
    form: { key: formKey, ...variant.form, subject: `New quote request from the ${b.name} website`, reach: b.textsOk ? 'call or text' : 'call' },
    variant,
  };
}

const SOCIAL_LABELS = {
  googleBusinessProfile: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  yelp: 'Yelp',
  nextdoor: 'Nextdoor',
  x: 'X',
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// LocalBusiness structured data. Review stars are left out on purpose:
// Google ignores ratings a business publishes about itself.
export function jsonLd(site, { imageUrl, logoUrl }) {
  const b = site.business;
  const prices = site.services.map((s) => s.startingPrice).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': site.variant.schemaType,
    '@id': `${site.siteUrl}/#business`,
    name: b.name,
    description: site.seo.description,
    url: `${site.siteUrl}/`,
    telephone: b.e164,
    email: b.email,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(prices.length ? { priceRange: `From $${Math.min(...prices)}` } : {}),
    address: b.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: b.address.street,
          addressLocality: b.address.city,
          addressRegion: b.address.state,
          postalCode: b.address.zip,
          addressCountry: 'US',
        }
      : { '@type': 'PostalAddress', addressLocality: b.serviceArea.homeCity, addressRegion: b.serviceArea.state, addressCountry: 'US' },
    areaServed: b.cities.map((c) => ({ '@type': 'City', name: `${c}, ${b.serviceArea.state}` })),
    openingHoursSpecification: site.hours
      .filter((h) => !h.closed)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.days.map((d) => DAY_NAMES[d]),
        opens: h.opens,
        closes: h.closes,
      })),
    ...(site.socials.length ? { sameAs: site.socials.map((s) => s.href) } : {}),
    ...(b.foundedYear ? { foundingDate: String(b.foundedYear) } : {}),
    founder: { '@type': 'Person', name: b.ownerName },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: site.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, description: s.description },
        ...(s.startingPrice ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: s.startingPrice, priceCurrency: 'USD' } } : {}),
      })),
    },
  };
}
