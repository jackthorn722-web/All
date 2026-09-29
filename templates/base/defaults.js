// Base template defaults. Every industry variant starts from these and
// overrides only what it needs (see templates/<variant>/variant.js).
//
// Copy strings can use these tokens, filled in from site.json at build time:
//   {business} {industry} {city} {state} {owner} {ownerFirst} {phone}
//   {cities}       every city: "Woodland Hills, Salem, Payson, and Elk Ridge"
//   {citiesShort}  at most three: "Woodland Hills, Salem, Payson, and nearby"

// Every section the base template can render, in the default order.
// Header, footer and the mobile call bar are always on and not listed here.
export const SECTION_IDS = [
  'hero',
  'trust',
  'services',
  'gallery',
  'reviews',
  'about',
  'area',
  'faq',
  'contact',
];

export const HERO_STYLES = ['photo', 'split', 'solid'];

export const TOKENS = ['business', 'industry', 'city', 'state', 'cities', 'citiesShort', 'owner', 'ownerFirst', 'phone'];

export const baseDefaults = {
  industry: 'Local Services',
  schemaType: 'LocalBusiness',
  heroStyle: 'split',
  sections: SECTION_IDS,
  // Colors `npm run new` puts in a fresh site.json (the client picks real ones on the call).
  exampleBrand: { primary: '#1e3a8a', accent: '#f59e0b', theme: 'light' },
  copy: {
    tagline: '{industry} in {city}, {state}',
    headline: '{industry} in {city} you can count on',
    subheadline: 'Fast, friendly, and done right the first time. Serving {citiesShort}.',
    trustBadge: 'Locally owned',
    servicesTitle: 'Services',
    servicesIntro: 'Straightforward pricing and work we stand behind.',
    galleryTitle: 'Recent work',
    galleryIntro: 'A few jobs from around {city}.',
    reviewsTitle: 'What customers are saying',
    reviewsIntro: 'Real reviews from neighbors in {city} and nearby.',
    aboutTitle: 'Meet {ownerFirst}',
    about:
      '{owner} started {business} to give people in {city} a local business they can actually reach. When you call, you talk to the owner, and every job gets the same care {ownerFirst} would want for their own home.',
    areaTitle: 'Proudly serving {city} and nearby',
    areaText:
      'We work across {cities}. Not sure if you are in range? Call or text and we will let you know right away.',
    faqTitle: 'Questions, answered',
    contactTitle: 'Get a free quote',
    contactText: 'Tell us what you need and we will get back to you quickly. Prefer to talk? Call or text {phone}.',
    ctaCall: 'Call now',
    ctaText: 'Text us',
    ctaBook: 'Book online',
    smsBody: "Hi! I'd like a quote.",
    metaDescription:
      '{business} offers {industry} in {city}, {state} and nearby. Friendly, local, and easy to reach. Call or text {phone} for a free quote.',
  },
  services: [
    {
      name: 'Standard service',
      description: 'Our most popular option, done right the first time.',
      features: ['Free quote', 'On-time arrival', 'Clean-up included'],
    },
  ],
  faq: [
    {
      q: 'How do I get a quote?',
      a: 'Call, text, or use the form on this page. Tell us a little about the job and we will get back to you quickly with a price.',
    },
    {
      q: 'What areas do you serve?',
      a: 'We serve {cities}. If you are just outside that area, ask anyway. We can often make it work.',
    },
  ],
  form: {
    // Optional extra field for the contact form, e.g. vehicle or property size.
    extraField: null,
    messagePlaceholder: 'What do you need done?',
  },
};

// Every copy key a site.json `copy` block may override.
export const COPY_KEYS = Object.keys(baseDefaults.copy);
