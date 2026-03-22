export interface TransferPartner {
  name: string;
  type: 'airline' | 'hotel';
  ratio: string;
  ratioMultiplier: number;
  alliance?: string;
  valueTier: 'excellent' | 'good' | 'fair' | 'poor';
  bestFor: string[];
  notes: string;
  avoid?: boolean;
  avoidReason?: string;
}

export interface Recommendation {
  partner: string;
  strategy: string;
  pointsRange: string;
  estimatedCpp: number;
  difficulty: 'easy' | 'moderate' | 'advanced';
  tip: string;
}

export const TRANSFER_PARTNERS: TransferPartner[] = [
  // Airlines
  {
    name: 'Air Canada Aeroplan',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'Star Alliance',
    valueTier: 'excellent',
    bestFor: ['Europe business class', 'Asia business class', 'Transatlantic routes', 'No fuel surcharges on most partners'],
    notes: 'One of the best Amex partners. No fuel surcharges on United/Lufthansa/ANA awards. Distance-based pricing is predictable.',
  },
  {
    name: 'ANA Mileage Club',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'Star Alliance',
    valueTier: 'excellent',
    bestFor: ['Asia first/business class', 'Round-the-world awards', 'Lufthansa First Class', 'Best partner redemption sweet spots'],
    notes: 'Incredible value for premium cabin awards. Round-the-world Business: ~88k miles. No fuel surcharges on most partners.',
  },
  {
    name: 'Singapore KrisFlyer',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'Star Alliance',
    valueTier: 'excellent',
    bestFor: ['Singapore Suites (best first class in the world)', 'Singapore Business Class', 'Asia-Pacific routes'],
    notes: 'Best for Singapore Airlines own metal. Suites from NYC→Singapore ~95k miles one-way. KrisFlyer miles expire after 3 years.',
  },
  {
    name: 'British Airways Avios',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'Oneworld',
    valueTier: 'good',
    bestFor: ['Short-haul domestic US on AA/Alaska', 'Caribbean on AA', 'Short European hops', 'Distance-based sweet spots'],
    notes: 'Distance-based pricing makes short routes very cheap (7.5k for <650mi on AA). High fuel surcharges on British Airways own flights.',
  },
  {
    name: 'Air France/KLM Flying Blue',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'SkyTeam',
    valueTier: 'good',
    bestFor: ['Europe business class (Promo Rewards)', 'Transatlantic routes', 'Africa/Middle East via Paris hub', 'Monthly promo awards up to 50% off'],
    notes: 'Check monthly Promo Rewards — Europe business class as low as 50k miles round-trip. Good for Delta partners too.',
  },
  {
    name: 'Virgin Atlantic Flying Club',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    valueTier: 'good',
    bestFor: ['Delta One business class', 'ANA business/first class', 'Virgin Atlantic Upper Class'],
    notes: 'Great for booking Delta One — often cheaper than Delta miles. Also an excellent way into ANA First Class.',
  },
  {
    name: 'Iberia Plus',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'Oneworld',
    valueTier: 'good',
    bestFor: ['Cheap transatlantic business class (as low as 34k one-way)', 'Spain/Latin America routes', 'AA partner awards'],
    notes: 'Iberia often runs massive sales on transatlantic business (34-51k one-way). Must fly on Iberia metal. No fuel surcharges.',
  },
  {
    name: 'Emirates Skywards',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    valueTier: 'good',
    bestFor: ['Emirates Business Class', 'Emirates First Class with Shower Suite', 'Middle East routes'],
    notes: 'Emirates First Class is a bucket-list experience. NYC→Dubai First ~85k miles one-way. High fuel surcharges apply.',
  },
  {
    name: 'Etihad Guest',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    valueTier: 'fair',
    bestFor: ['American Airlines awards', 'Etihad The Residence (ultra-luxury)', 'Middle East hub connections'],
    notes: 'Useful for booking AA awards when Avios are unavailable. Etihad\'s own product is exceptional but pricey in miles.',
  },
  {
    name: 'Delta SkyMiles',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    alliance: 'SkyTeam',
    valueTier: 'poor',
    avoid: true,
    avoidReason: 'No award chart — Delta sets prices dynamically, often at poor value. Almost always better to use Flying Blue or Virgin Atlantic for Delta flights.',
    bestFor: ['Last resort for Delta flights'],
    notes: 'Transfer here only if no other options exist for a Delta flight. Other currencies book Delta at better rates.',
  },
  {
    name: 'JetBlue TrueBlue',
    type: 'airline',
    ratio: '1:0.8',
    ratioMultiplier: 0.8,
    valueTier: 'fair',
    bestFor: ['JetBlue Mint business class (Boston/NY to LA/SF)', 'Simple fixed-rate redemptions'],
    notes: '250 Amex points → 200 TrueBlue points. JetBlue Mint is an excellent domestic business product. Easy to use.',
  },
  {
    name: 'Hawaiian Airlines',
    type: 'airline',
    ratio: '1:1',
    ratioMultiplier: 1,
    valueTier: 'fair',
    bestFor: ['Hawaii routes', 'South Pacific connections'],
    notes: 'Good if you fly Hawaiian regularly. Limited network otherwise.',
  },
  // Hotels
  {
    name: 'Hilton Honors',
    type: 'hotel',
    ratio: '1:2',
    ratioMultiplier: 2,
    valueTier: 'good',
    bestFor: ['Aspirational properties (Conrad, Waldorf Astoria)', '5th night free on award stays', 'High-category redemptions'],
    notes: '1 Amex point → 2 Hilton points. Best value at aspirational properties where cash rates are very high. 5th night free on standard award stays.',
  },
  {
    name: 'Marriott Bonvoy',
    type: 'hotel',
    ratio: '1:1',
    ratioMultiplier: 1,
    valueTier: 'poor',
    avoid: true,
    avoidReason: 'Marriott points are generally worth less than 0.7 cents each. Transferring Amex points here is almost never the best use.',
    bestFor: ['Last resort for Marriott properties'],
    notes: 'Marriott has devalued significantly. Only transfer here if you need to top off for a specific redemption.',
  },
  {
    name: 'Choice Privileges',
    type: 'hotel',
    ratio: '1:1',
    ratioMultiplier: 1,
    valueTier: 'fair',
    bestFor: ['Suburban/roadside US hotels', 'Budget travel'],
    notes: 'Occasional sweet spots at Preferred Hotel Group properties, but generally lower value.',
  },
];

// --- Trip Recommender ---

export type DestinationRegion =
  | 'domestic'
  | 'caribbean-mexico'
  | 'europe'
  | 'asia'
  | 'middle-east'
  | 'south-america'
  | 'oceania';

export type TravelClass = 'economy' | 'premium-economy' | 'business' | 'first';

export const DESTINATION_LABELS: Record<DestinationRegion, string> = {
  'domestic': 'Domestic US',
  'caribbean-mexico': 'Caribbean / Mexico',
  'europe': 'Europe',
  'asia': 'Asia / Pacific',
  'middle-east': 'Middle East / Africa',
  'south-america': 'South America',
  'oceania': 'Australia / New Zealand',
};

export const CLASS_LABELS: Record<TravelClass, string> = {
  'economy': 'Economy',
  'premium-economy': 'Premium Economy',
  'business': 'Business Class',
  'first': 'First Class',
};

type TripMap = Record<DestinationRegion, Partial<Record<TravelClass, Recommendation[]>>>;

export const TRIP_MAP: TripMap = {
  domestic: {
    economy: [
      {
        partner: 'British Airways Avios',
        strategy: 'Book American Airlines or Alaska flights under 1,300 miles',
        pointsRange: '7,500 – 15,000 Avios one-way',
        estimatedCpp: 1.5,
        difficulty: 'easy',
        tip: 'Search AA.com for availability, then book through ba.com. Under 650 miles costs just 7,500 Avios.',
      },
      {
        partner: 'JetBlue TrueBlue',
        strategy: 'Book JetBlue at fixed cash-equivalent rates',
        pointsRange: '5,000 – 12,000 points one-way',
        estimatedCpp: 1.2,
        difficulty: 'easy',
        tip: 'Straightforward redemption on JetBlue.com. Good for routes JetBlue dominates (Boston, NY, Fort Lauderdale).',
      },
    ],
    'premium-economy': [
      {
        partner: 'British Airways Avios',
        strategy: 'Book AA Premium Economy on domestic routes',
        pointsRange: '15,000 – 25,000 Avios one-way',
        estimatedCpp: 1.6,
        difficulty: 'easy',
        tip: 'Good value for transcontinental routes (NYC→LA) in premium cabin.',
      },
    ],
    business: [
      {
        partner: 'British Airways Avios',
        strategy: 'Book American Airlines First/Business domestically',
        pointsRange: '15,000 – 25,000 Avios one-way',
        estimatedCpp: 2.0,
        difficulty: 'easy',
        tip: 'Domestic first on AA is often 15k Avios — outstanding value vs. the cash price.',
      },
      {
        partner: 'JetBlue TrueBlue',
        strategy: 'Book JetBlue Mint (best domestic business product)',
        pointsRange: '25,000 – 50,000 points one-way',
        estimatedCpp: 1.5,
        difficulty: 'easy',
        tip: 'JetBlue Mint on transcontinental routes offers lie-flat beds and is a huge upgrade over legacy carriers.',
      },
    ],
    first: [
      {
        partner: 'British Airways Avios',
        strategy: 'Book AA First Class on select routes',
        pointsRange: '22,500 – 30,000 Avios one-way',
        estimatedCpp: 2.0,
        difficulty: 'moderate',
        tip: 'AA domestic first availability can be limited. Search for saver awards 2+ weeks out.',
      },
    ],
  },

  'caribbean-mexico': {
    economy: [
      {
        partner: 'British Airways Avios',
        strategy: 'Book AA flights to Caribbean islands (all under 1,300 miles from US East Coast)',
        pointsRange: '7,500 – 15,000 Avios one-way',
        estimatedCpp: 1.6,
        difficulty: 'easy',
        tip: 'Most Caribbean islands are under 1,300 miles from Miami/NYC — often just 7,500–12,500 Avios.',
      },
      {
        partner: 'Air France/KLM Flying Blue',
        strategy: 'Book flights via Air France/KLM or Delta partners',
        pointsRange: '10,000 – 20,000 miles one-way',
        estimatedCpp: 1.4,
        difficulty: 'easy',
        tip: 'Check monthly Promo Rewards for discounted Caribbean routes.',
      },
    ],
    business: [
      {
        partner: 'Air France/KLM Flying Blue',
        strategy: 'Book business class on monthly Promo Rewards',
        pointsRange: '20,000 – 40,000 miles one-way',
        estimatedCpp: 2.0,
        difficulty: 'easy',
        tip: 'Flying Blue often discounts Caribbean business class by 25–50% in monthly promos. Check flyingblue.com on the 1st of each month.',
      },
      {
        partner: 'British Airways Avios',
        strategy: 'AA or BA business class to Caribbean',
        pointsRange: '25,000 – 35,000 Avios one-way',
        estimatedCpp: 1.8,
        difficulty: 'easy',
        tip: 'Great for business class on shorter hops where cash prices are disproportionately high.',
      },
    ],
  },

  europe: {
    economy: [
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book United or Star Alliance economy across the Atlantic',
        pointsRange: '30,000 – 35,000 miles one-way',
        estimatedCpp: 1.4,
        difficulty: 'easy',
        tip: 'No fuel surcharges on United or Lufthansa economy. Great for flexible dates.',
      },
      {
        partner: 'Iberia Plus',
        strategy: 'Book Iberia economy to Spain and connecting European cities',
        pointsRange: '17,000 – 25,000 Avios one-way',
        estimatedCpp: 1.5,
        difficulty: 'moderate',
        tip: 'Iberia\'s own flights to Madrid are very cheap in miles — good jumping-off point for Europe.',
      },
    ],
    'premium-economy': [
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book United Polaris Premium Plus (premium economy)',
        pointsRange: '55,000 miles one-way',
        estimatedCpp: 1.6,
        difficulty: 'moderate',
        tip: 'Aeroplan prices United Premium Plus at 55k — much better than booking with United miles.',
      },
      {
        partner: 'Air France/KLM Flying Blue',
        strategy: 'Book Flying Blue premium economy',
        pointsRange: '35,000 – 50,000 miles one-way',
        estimatedCpp: 1.5,
        difficulty: 'easy',
        tip: 'Watch Promo Rewards for steep premium economy discounts.',
      },
    ],
    business: [
      {
        partner: 'Air France/KLM Flying Blue',
        strategy: 'Watch monthly Promo Rewards for business class deals',
        pointsRange: '50,000 – 100,000 miles round-trip',
        estimatedCpp: 2.0,
        difficulty: 'easy',
        tip: 'Flying Blue\'s biggest value: transatlantic business round-trips as low as 50k on Promo Rewards. Check on the 1st of every month.',
      },
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book Lufthansa or United business class (no fuel surcharges)',
        pointsRange: '60,000 – 70,000 miles one-way',
        estimatedCpp: 2.2,
        difficulty: 'moderate',
        tip: 'Aeroplan is one of the few programs that books Lufthansa Business WITHOUT fuel surcharges. Outstanding value.',
      },
      {
        partner: 'Virgin Atlantic Flying Club',
        strategy: 'Book Delta One business class to Europe',
        pointsRange: '50,000 – 75,000 miles one-way',
        estimatedCpp: 2.0,
        difficulty: 'moderate',
        tip: 'Virgin Atlantic often prices Delta One cheaper than Delta SkyMiles. Check for saver availability on delta.com first.',
      },
    ],
    first: [
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book Lufthansa First Class via Aeroplan (no surcharges)',
        pointsRange: '87,500 miles one-way',
        estimatedCpp: 3.5,
        difficulty: 'advanced',
        tip: 'Lufthansa First is one of the world\'s best. Aeroplan books it WITHOUT fuel surcharges (saving $500–800). Availability opens at T-14 days.',
      },
      {
        partner: 'ANA Mileage Club',
        strategy: 'Book Lufthansa First Class via ANA',
        pointsRange: '110,000 miles one-way',
        estimatedCpp: 3.0,
        difficulty: 'advanced',
        tip: 'ANA prices this higher than Aeroplan but is often easier to find award space. Great option when Aeroplan space is gone.',
      },
    ],
  },

  asia: {
    economy: [
      {
        partner: 'Singapore KrisFlyer',
        strategy: 'Book Singapore Airlines economy to Asia',
        pointsRange: '37,500 – 62,500 miles one-way',
        estimatedCpp: 1.4,
        difficulty: 'easy',
        tip: 'Singapore\'s economy product is top-tier. Good value vs. cash on long-haul routes.',
      },
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book ANA or United economy to Japan/SE Asia',
        pointsRange: '35,000 – 45,000 miles one-way',
        estimatedCpp: 1.4,
        difficulty: 'easy',
        tip: 'Aeroplan prices are predictable and available on most Star Alliance partners.',
      },
    ],
    'premium-economy': [
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book ANA or United Premium Economy',
        pointsRange: '75,000 – 90,000 miles one-way',
        estimatedCpp: 1.5,
        difficulty: 'moderate',
        tip: 'ANA Premium Economy is excellent. Aeroplan pricing beats ANA\'s own program.',
      },
      {
        partner: 'Singapore KrisFlyer',
        strategy: 'Book Singapore Premium Economy',
        pointsRange: '67,500 miles one-way',
        estimatedCpp: 1.6,
        difficulty: 'easy',
        tip: 'Singapore\'s Premium Economy is one of the best in the sky. Very comfortable for ultra-long-haul.',
      },
    ],
    business: [
      {
        partner: 'Singapore KrisFlyer',
        strategy: 'Book Singapore Business Class (lie-flat, Book the Cook meals)',
        pointsRange: '67,500 – 100,000 miles one-way',
        estimatedCpp: 2.5,
        difficulty: 'moderate',
        tip: 'Singapore Business Class is consistently rated #1. Book the Cook lets you pre-order restaurant-quality meals.',
      },
      {
        partner: 'ANA Mileage Club',
        strategy: 'Book ANA Business Class — "The Room" product',
        pointsRange: '75,000 – 88,000 miles one-way',
        estimatedCpp: 2.5,
        difficulty: 'moderate',
        tip: 'ANA\'s "The Room" business class has a closing door and is phenomenal. ANA miles can be used to book ANA own flights.',
      },
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book ANA or Singapore Business Class via Aeroplan',
        pointsRange: '75,000 – 95,000 miles one-way',
        estimatedCpp: 2.2,
        difficulty: 'moderate',
        tip: 'Aeroplan is the only program that can book ANA Business without fuel surcharges.',
      },
    ],
    first: [
      {
        partner: 'Singapore KrisFlyer',
        strategy: 'Book Singapore Suites — the #1 first class product in aviation',
        pointsRange: '75,000 – 95,000 miles one-way',
        estimatedCpp: 4.0,
        difficulty: 'advanced',
        tip: 'Singapore Suites is the best first class in the world. Availability opens at T-355 days. NYC→Singapore in Suites is a bucket list experience.',
      },
      {
        partner: 'ANA Mileage Club',
        strategy: 'Book ANA First Class "The Suite"',
        pointsRange: '110,000 miles one-way',
        estimatedCpp: 3.5,
        difficulty: 'advanced',
        tip: 'ANA First Class is among the best. Very limited seats (8 per aircraft). Worth the point investment for a once-in-a-lifetime trip.',
      },
    ],
  },

  'middle-east': {
    economy: [
      {
        partner: 'Emirates Skywards',
        strategy: 'Book Emirates economy to Dubai and onward connections',
        pointsRange: '38,000 – 45,000 miles one-way',
        estimatedCpp: 1.3,
        difficulty: 'easy',
        tip: 'Emirates has great connectivity from Dubai to Africa, South Asia, and Oceania.',
      },
    ],
    business: [
      {
        partner: 'Emirates Skywards',
        strategy: 'Book Emirates Business Class — lie-flat with onboard bar',
        pointsRange: '72,000 – 85,000 miles one-way',
        estimatedCpp: 2.2,
        difficulty: 'moderate',
        tip: 'Emirates Business Class includes access to the onboard bar on wide-body aircraft. Fantastic experience.',
      },
      {
        partner: 'Etihad Guest',
        strategy: 'Book Etihad Business Class (The Business)',
        pointsRange: '60,000 – 80,000 miles one-way',
        estimatedCpp: 2.0,
        difficulty: 'moderate',
        tip: 'Etihad\'s "The Business" features a direct-aisle double bed option. Good alternative to Emirates.',
      },
    ],
    first: [
      {
        partner: 'Emirates Skywards',
        strategy: 'Book Emirates First Class with Private Suite and Shower',
        pointsRange: '85,000 – 120,000 miles one-way',
        estimatedCpp: 3.0,
        difficulty: 'advanced',
        tip: 'Emirates First Class includes a private suite, shower spa, and onboard bar. NYC→Dubai First is ~85k miles. High fuel surcharges apply.',
      },
    ],
  },

  'south-america': {
    economy: [
      {
        partner: 'Air France/KLM Flying Blue',
        strategy: 'Route through Paris hub to South America',
        pointsRange: '30,000 – 45,000 miles one-way',
        estimatedCpp: 1.3,
        difficulty: 'moderate',
        tip: 'Flying Blue covers South American routes well via AF/KLM codeshares. Check Promo Rewards monthly.',
      },
    ],
    business: [
      {
        partner: 'Air France/KLM Flying Blue',
        strategy: 'Book Air France business class on Promo Rewards',
        pointsRange: '80,000 – 120,000 miles one-way',
        estimatedCpp: 1.8,
        difficulty: 'moderate',
        tip: 'Air France Business offers the iconic lie-flat herringbone seat. Check Promo Rewards for discounts.',
      },
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book Copa or other Star Alliance business class',
        pointsRange: '60,000 – 75,000 miles one-way',
        estimatedCpp: 1.8,
        difficulty: 'moderate',
        tip: 'Aeroplan\'s Star Alliance coverage gives flexibility for South American routes.',
      },
    ],
  },

  oceania: {
    economy: [
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book United economy to Australia/NZ',
        pointsRange: '40,000 – 55,000 miles one-way',
        estimatedCpp: 1.4,
        difficulty: 'easy',
        tip: 'One of the longest routes in the world — points offset very high cash prices on these flights.',
      },
    ],
    business: [
      {
        partner: 'Air Canada Aeroplan',
        strategy: 'Book United Polaris business to Australia — outstanding value',
        pointsRange: '95,000 miles one-way',
        estimatedCpp: 2.5,
        difficulty: 'moderate',
        tip: 'Sydney/Melbourne routes have very high cash prices ($5k+). 95k Aeroplan miles is exceptional value. No fuel surcharges on United.',
      },
      {
        partner: 'ANA Mileage Club',
        strategy: 'Book ANA Business via Tokyo to Australia',
        pointsRange: '88,000 miles one-way',
        estimatedCpp: 2.3,
        difficulty: 'moderate',
        tip: 'If you\'re open to routing through Tokyo, ANA\'s round-the-world pricing makes this very competitive.',
      },
    ],
    first: [
      {
        partner: 'Singapore KrisFlyer',
        strategy: 'Book Singapore Suites or First Class via Singapore',
        pointsRange: '95,000 miles one-way',
        estimatedCpp: 3.5,
        difficulty: 'advanced',
        tip: 'Singapore flies daily to Sydney and Melbourne. Routing through Singapore in Suites turns a long haul into an experience.',
      },
    ],
  },
};

// --- Value Tiers ---

export interface ValueTier {
  label: string;
  cpp: number;
  description: string;
  verdict: 'avoid' | 'ok' | 'good' | 'excellent';
}

export const VALUE_TIERS: ValueTier[] = [
  {
    label: 'Statement Credit',
    cpp: 0.6,
    description: 'Redeem directly for purchases',
    verdict: 'avoid',
  },
  {
    label: 'Amex Travel Portal',
    cpp: 1.0,
    description: 'Book flights/hotels through Amex',
    verdict: 'ok',
  },
  {
    label: 'Smart Transfer',
    cpp: 1.5,
    description: 'Average transfer partner redemption',
    verdict: 'good',
  },
  {
    label: 'Best Case',
    cpp: 2.5,
    description: 'Premium cabin via top partners',
    verdict: 'excellent',
  },
];
