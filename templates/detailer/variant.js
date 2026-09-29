// Mobile auto detailing. Only what differs from templates/base/defaults.js.
export default {
  id: 'detailer',
  label: 'Mobile auto detailing',
  industry: 'Mobile Auto Detailing',
  // schema.org type for the LocalBusiness JSON-LD.
  schemaType: 'AutoWash',
  heroStyle: 'photo',
  sections: ['hero', 'trust', 'services', 'gallery', 'reviews', 'about', 'area', 'faq', 'contact'],
  exampleBrand: { primary: '#2563eb', accent: '#22d3ee', theme: 'dark' },
  copy: {
    tagline: 'Showroom shine, right in your driveway',
    headline: 'Mobile detailing in {city}. We come to you.',
    subheadline:
      'Interior deep cleans, wash and wax, and paint protection done at your home or office. Serving {citiesShort}.',
    trustBadge: 'We come to you',
    servicesTitle: 'Detailing packages',
    servicesIntro: 'Every package is done by hand, at your place, on your schedule.',
    galleryTitle: 'Before and after',
    galleryIntro: 'Real cars from around {city}.',
    reviewsIntro: 'Drivers in {city} and nearby on what it is like to have their car detailed at home.',
    about:
      '{ownerFirst} started {business} to give drivers in {city} something better than the drive-through car wash: careful, hands-on detailing without leaving home. Every vehicle gets the same attention {ownerFirst} gives their own.',
    areaTitle: 'Mobile detailing around {city}',
    areaText:
      'We bring the detail shop to your driveway, office parking lot, or apartment complex anywhere in {cities}. Not sure if you are in range? Just ask.',
    contactTitle: 'Get a detailing quote',
    contactText:
      'Tell us about your vehicle and what it needs. We will reply with a price and the next open time. Prefer to talk? {callOrText} {phone}.',
    smsBody: "Hi! I'd like a quote for detailing my car.",
    metaDescription:
      'Mobile car detailing in {city}, {state}. {business} comes to your home or office. {callOrText} {phone} for a free quote.',
  },
  services: [
    {
      name: 'Maintenance Wash',
      description: 'A careful hand wash that keeps a clean car clean.',
      features: [
        'Foam pre-wash and two-bucket hand wash',
        'Wheels, tires, and door jambs',
        'Windows inside and out',
        'Quick interior vacuum and wipe-down',
      ],
    },
    {
      name: 'Interior Detail',
      description: 'A deep clean for the inside: pet hair, kid messes, coffee spills and all.',
      features: [
        'Full vacuum including trunk and mats',
        'Carpets and seats shampooed',
        'Leather cleaned and conditioned',
        'Dash, console, and vents detailed',
      ],
    },
    {
      name: 'Full Detail',
      description: 'Inside and out. The full reset for your vehicle.',
      features: [
        'Everything in the Interior Detail',
        'Hand wash and clay bar decontamination',
        'Hand-applied wax or sealant',
        'Tires dressed and trim restored',
      ],
    },
    {
      name: 'Ceramic Coating',
      description: 'Long-lasting gloss and protection that makes every future wash easier.',
      features: [
        'Paint prep and polish',
        'Professional-grade ceramic coating',
        'Water beads and sheets off',
        'Multi-year protection options',
      ],
    },
  ],
  faq: [
    {
      q: 'Do I need to be home?',
      a: 'No. As long as we can get to the vehicle and it is unlocked (or you leave us the keys), you can go about your day. We will let you know when it is done.',
    },
    {
      q: 'Do you need water or power from me?',
      a: 'Usually not. We bring our own equipment. If a job needs an outdoor outlet or spigot, we will tell you when you book.',
    },
    {
      q: 'How long does a detail take?',
      a: 'A maintenance wash takes about an hour. Interior and full details usually take 2 to 4 hours, depending on the size and condition of the vehicle.',
    },
    {
      q: 'What if the weather is bad?',
      a: 'If rain or snow rolls in, we will reach out and reschedule at no charge.',
    },
    {
      q: 'Where do you work?',
      a: 'We come to homes, offices, and apartment complexes in {cities}. Outside that area? Ask anyway.',
    },
    {
      q: 'Is ceramic coating worth it?',
      a: 'If you want your paint to stay glossy and easier to wash for years, usually yes. We will look at your paint and give you an honest recommendation.',
    },
  ],
  form: {
    extraField: { name: 'vehicle', label: 'Vehicle (year, make, model)', placeholder: '2019 Toyota 4Runner' },
    messagePlaceholder: 'What does it need? Anything we should know (pet hair, stains, scratches)?',
  },
};
