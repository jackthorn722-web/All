// The site.json spec. One zod schema is the single source of truth for:
//   - `npm run check` / dev / build validation (exact field paths in errors)
//   - the intake checklist `npm run new` prints (from each field's .describe())
//   - lib/site.schema.json (editor autocomplete; regenerate with `npm run schema`)
import { z } from 'zod';
import { VARIANT_IDS } from '../templates/index.js';
import { SECTION_IDS, COPY_KEYS } from '../templates/base/defaults.js';

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const SOCIAL_KEYS = ['googleBusinessProfile', 'facebook', 'instagram', 'tiktok', 'youtube', 'yelp', 'nextdoor', 'x'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'];

const TIME_RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DOMAIN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const text = (desc) => z.string().trim().min(1, 'is empty').describe(desc);

const url = (desc) =>
  z.url({ protocol: /^https?$/, error: 'must be a full link starting with https://' }).describe(desc);

export function phoneDigits(v) {
  const d = String(v).replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
}

const phone = z
  .string()
  .refine((v) => /^[\d\s().+-]+$/.test(v) && phoneDigits(v).length === 10, {
    error: 'must be a 10-digit US phone number, like (801) 555-1234',
  })
  .describe('Main phone number customers call, e.g. (801) 555-1234');

// Paths are relative to clients/<slug>/images/, e.g. "hero.jpg" or "before-after/1.jpg".
const imageFile = (desc) =>
  z
    .string()
    .superRefine((v, ctx) => {
      const ext = v.split('.').pop().toLowerCase();
      if (v.includes('\\')) ctx.addIssue({ code: 'custom', message: 'use forward slashes (/) in image paths, not backslashes' });
      else if (v.startsWith('/') || v.split('/').includes('..') || v.startsWith('images/'))
        ctx.addIssue({ code: 'custom', message: 'give the file name inside the images/ folder, e.g. "hero.jpg"' });
      else if (ext === 'heic' || ext === 'heif')
        ctx.addIssue({
          code: 'custom',
          message:
            'HEIC photos (iPhone default) are not supported: convert to JPG first (Windows Photos: "Save as" JPG, or iPhone Settings > Camera > Formats > Most Compatible)',
        });
      else if (!IMAGE_EXTENSIONS.includes(ext))
        ctx.addIssue({ code: 'custom', message: `must be an image file (${IMAGE_EXTENSIONS.join(', ')})` });
    })
    .describe(desc);

const hours = z
  .string()
  .regex(new RegExp(`${TIME_RANGE.source}|^closed$`), 'use 24-hour "08:00-18:00", or "closed"')
  .refine((v) => v === 'closed' || v.slice(0, 5) < v.slice(6), 'closing time must be after opening time');

const service = z.strictObject({
  name: text('Service name, e.g. "Full Detail"'),
  description: text('One or two sentences on what is included'),
  startingPrice: z.number().positive('must be more than 0').optional().describe('Starting price in dollars, e.g. 149 (shown as "From $149")'),
  features: z.array(text('A bullet point')).default([]).describe('3-5 short bullet points of what is included'),
});

const review = z.strictObject({
  name: text('Reviewer name as shown on the review, e.g. "Sarah M."'),
  text: text('The review text, copied word for word'),
  rating: z.int('must be a whole number from 1 to 5').min(1, 'must be 1-5').max(5, 'must be 1-5').describe('Star rating 1-5'),
  source: text('Where the review is from: Google, Facebook, Yelp, Nextdoor...').default('Google'),
});

const socials = z
  .strictObject(
    Object.fromEntries(
      SOCIAL_KEYS.map((k) => [
        k,
        url(k === 'googleBusinessProfile' ? 'Google Business Profile link (the Maps listing)' : `${k} page link`).optional(),
      ]),
    ),
  )
  .default({})
  .describe('Social links (all optional) + Google Business Profile');

export const siteSchema = z
  .strictObject({
    $schema: z.string().optional(),
    template: z
      .enum(VARIANT_IDS, { error: `must be one of: ${VARIANT_IDS.join(', ')}` })
      .describe('Industry template (variant) this site is built from'),
    business: z
      .strictObject({
        name: text('Business name exactly as customers know it'),
        tagline: text('Short slogan; leave out to use the template default').optional(),
        industry: text('What they do, e.g. "Mobile Auto Detailing"; leave out to use the template default').optional(),
        phone,
        textsOk: z.boolean().describe('Does that number take texts? (shows the Text buttons)'),
        email: z.email('must be a valid email address').describe('Email for customers and quote requests'),
        serviceArea: z
          .strictObject({
            homeCity: text('Home base city, e.g. "Woodland Hills"'),
            state: z
              .string()
              .regex(/^[A-Z]{2}$/, 'must be a 2-letter state code like "UT"')
              .describe('2-letter state code, e.g. "UT"'),
            nearbyCities: z.array(text('City name')).default([]).describe('Other cities they serve (no state), e.g. ["Salem", "Payson"]'),
          })
          .describe('Where they work'),
        hours: z
          .strictObject(Object.fromEntries(DAYS.map((d) => [d, hours.describe(`${d} hours, "08:00-18:00" or "closed"`)])))
          .describe('Opening hours per day, 24-hour "08:00-18:00" or "closed"'),
        hoursNote: text('Extra note shown with hours, e.g. "Evenings by appointment"').optional(),
        address: z
          .strictObject({
            street: text('Street address'),
            city: text('City'),
            state: z.string().regex(/^[A-Z]{2}$/, 'must be a 2-letter state code like "UT"').describe('State'),
            zip: z.string().regex(/^\d{5}$/, 'must be a 5-digit ZIP').describe('ZIP code'),
          })
          .optional()
          .describe('Street address; leave out for mobile businesses (most are)'),
        foundedYear: z
          .int('must be a year like 2019')
          .min(1900, 'must be a year like 2019')
          .max(new Date().getFullYear(), 'cannot be in the future')
          .optional()
          .describe('Year the business started (shows years in business)'),
        ownerName: text('Owner first and last name (the About section)'),
        licensed: z.boolean().describe('Licensed? Only true if they really are (shown as a trust badge)'),
        insured: z.boolean().describe('Insured? Only true if they really are (shown as a trust badge)'),
      })
      .describe('The business'),
    brand: z
      .strictObject({
        primary: z.string().regex(HEX, 'must be a hex color like "#2563eb"').describe('Main brand color, hex like "#2563eb"'),
        accent: z.string().regex(HEX, 'must be a hex color like "#f59e0b"').describe('Button color, hex like "#f59e0b"'),
        logo: imageFile('Logo file in images/ (png or svg); also becomes the favicon').optional(),
        theme: z.enum(['light', 'dark'], { error: 'must be "light" or "dark"' }).default('light').describe('"light" or "dark" site'),
      })
      .describe('Look and feel'),
    images: z
      .strictObject({
        hero: imageFile('Big top-of-page photo (best: their best work, landscape)').optional(),
        owner: imageFile('Photo of the owner for the About section').optional(),
      })
      .default({})
      .describe('Hero and owner photos'),
    services: z
      .array(service)
      .min(1, 'needs at least 1 service')
      .optional()
      .describe('Services offered; leave out to use the template defaults'),
    reviews: z
      .strictObject({
        googleRating: z.number().min(1, 'must be 1-5').max(5, 'must be 1-5').optional().describe('Overall Google rating, e.g. 4.9'),
        googleReviewCount: z.int('must be a whole number').min(0).optional().describe('Number of Google reviews, e.g. 37'),
        googleReviewsUrl: url('Link to their Google reviews').optional(),
        items: z.array(review).min(1, 'needs at least 1 real review').describe('3-6 of their best reviews'),
      })
      .describe('Reviews'),
    gallery: z
      .strictObject({
        beforeAfter: z
          .array(
            z.strictObject({
              before: imageFile('Before photo'),
              after: imageFile('After photo'),
              caption: text('Short caption, e.g. "Pet hair removal, Salem"').optional(),
            }),
          )
          .default([])
          .describe('Before/after photo pairs'),
        photos: z
          .array(
            z.strictObject({
              src: imageFile('Photo file'),
              alt: text('What the photo shows (for screen readers and Google)').optional(),
              caption: text('Short caption').optional(),
            }),
          )
          .default([])
          .describe('Photos of their work'),
      })
      .refine((g) => g.beforeAfter.length + g.photos.length > 0, 'needs at least 1 photo or before/after pair')
      .describe('Work photos'),
    socials,
    cta: z
      .strictObject({
        primary: z
          .enum(['call', 'text', 'book'], { error: 'must be "call", "text" or "book"' })
          .default('call')
          .describe('Main button: "call", "text" or "book"'),
        bookingUrl: url('Online booking link (adds a Book button)').optional(),
      })
      .default({ primary: 'call' })
      .describe('How customers should reach them'),
    faq: z
      .array(z.strictObject({ q: text('Question'), a: text('Answer') }))
      .min(1, 'needs at least 1 question')
      .optional()
      .describe('FAQ; leave out to use the template defaults'),
    seo: z
      .strictObject({
        keywords: z
          .array(text('Keyword'))
          .min(1, 'needs at least 1 keyword')
          .describe('What customers search for, most important first, e.g. ["mobile detailing"]'),
        title: text('Browser tab / Google title; leave out for the default').max(70, 'must be 70 characters or fewer').optional(),
        metaDescription: text('Google snippet text; leave out for the template default')
          .max(170, 'must be 170 characters or fewer')
          .optional(),
      })
      .describe('Search engine basics'),
    domain: z
      .string()
      .regex(DOMAIN, 'must be just the domain in lowercase, like "twintuneddetailing.com" (no https://, no slash)')
      .optional()
      .describe('Custom domain, e.g. "twintuneddetailing.com"; leave out until there is one'),
    copy: z
      .strictObject(Object.fromEntries(COPY_KEYS.map((k) => [k, text(`Override the "${k}" text`).optional()])))
      .default({})
      .describe('Optional text overrides: headline, subheadline, about, ... (anything left out uses the template copy)'),
    sections: z
      .array(z.enum(SECTION_IDS, { error: `must be one of: ${SECTION_IDS.join(', ')}` }))
      .min(1)
      .refine((s) => new Set(s).size === s.length, 'lists a section twice')
      .optional()
      .describe('Section order; leave out for the template order. Leave a section out to hide it'),
  })
  .superRefine((spec, ctx) => {
    if (spec.cta?.primary === 'text' && spec.business?.textsOk === false)
      ctx.addIssue({ code: 'custom', path: ['cta', 'primary'], message: 'is "text" but business.textsOk is false' });
    if (spec.cta?.primary === 'book' && !spec.cta?.bookingUrl)
      ctx.addIssue({ code: 'custom', path: ['cta', 'bookingUrl'], message: 'is missing (cta.primary is "book")' });
  });

// Friendlier messages for zod's built-in issues. Schema-level messages above win.
export function errorMap(iss) {
  if (iss.code === 'invalid_type') {
    if (iss.input === undefined) return 'is missing';
    const want = { boolean: 'true or false', number: 'a number', int: 'a whole number', string: 'text in quotes', array: 'a list [ ... ]', object: 'an object { ... }' };
    return `must be ${want[iss.expected] ?? iss.expected}, not ${JSON.stringify(iss.input)}`;
  }
  if (iss.code === 'invalid_value') return `must be one of: ${iss.values.map((v) => JSON.stringify(v)).join(', ')}`;
  if (iss.code === 'too_small' && iss.origin === 'array') return `needs at least ${iss.minimum} item(s)`;
  return undefined;
}

export function jsonSchema() {
  return z.toJSONSchema(siteSchema, { io: 'input', unrepresentable: 'any' });
}
