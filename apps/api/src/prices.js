const BOOK = {
  US: { currency: 'USD', month_cents: 200, year_cents: 1000 },
  IN: { currency: 'INR', month_cents: 20000, year_cents: 100000 },
  GB: { currency: 'GBP', month_cents: 200, year_cents: 1000 },
  EU: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  DE: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  FR: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  ES: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  IT: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  NL: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  IE: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  PT: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  AT: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  BE: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  FI: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  GR: { currency: 'EUR', month_cents: 200, year_cents: 1000 },
  AU: { currency: 'AUD', month_cents: 300, year_cents: 1500 },
  CA: { currency: 'CAD', month_cents: 300, year_cents: 1500 },
  NZ: { currency: 'NZD', month_cents: 300, year_cents: 1500 },
  SG: { currency: 'SGD', month_cents: 300, year_cents: 1500 },
  AE: { currency: 'AED', month_cents: 800, year_cents: 4000 },
  SA: { currency: 'SAR', month_cents: 800, year_cents: 4000 },
  JP: { currency: 'JPY', month_cents: 30000, year_cents: 150000 },
  KR: { currency: 'KRW', month_cents: 300000, year_cents: 1500000 },
  BR: { currency: 'BRL', month_cents: 1000, year_cents: 5000 },
  MX: { currency: 'MXN', month_cents: 4000, year_cents: 20000 },
  ZA: { currency: 'ZAR', month_cents: 4000, year_cents: 20000 },
  PH: { currency: 'PHP', month_cents: 10000, year_cents: 50000 },
  MY: { currency: 'MYR', month_cents: 1000, year_cents: 5000 },
  TH: { currency: 'THB', month_cents: 7000, year_cents: 35000 },
  ID: { currency: 'IDR', month_cents: 3000000, year_cents: 15000000 },
  PK: { currency: 'PKR', month_cents: 50000, year_cents: 250000 },
  BD: { currency: 'BDT', month_cents: 20000, year_cents: 100000 },
  LK: { currency: 'LKR', month_cents: 60000, year_cents: 300000 },
  NP: { currency: 'NPR', month_cents: 25000, year_cents: 120000 },
  NG: { currency: 'NGN', month_cents: 300000, year_cents: 1500000 },
  KE: { currency: 'KES', month_cents: 30000, year_cents: 150000 },
  CH: { currency: 'CHF', month_cents: 200, year_cents: 1000 },
  SE: { currency: 'SEK', month_cents: 2000, year_cents: 10000 },
  NO: { currency: 'NOK', month_cents: 2000, year_cents: 10000 },
  DK: { currency: 'DKK', month_cents: 1500, year_cents: 7500 },
  PL: { currency: 'PLN', month_cents: 800, year_cents: 4000 },
  HK: { currency: 'HKD', month_cents: 1600, year_cents: 8000 },
};

export function savePercent(monthCents, yearCents) {
  const full = monthCents * 12;
  if (!full) return 0;
  return Math.round((1 - yearCents / full) * 100);
}

export function quoteCountry(code) {
  const country = String(code || '').trim().toUpperCase();
  const row = BOOK[country] || BOOK.US;
  const resolved = BOOK[country] ? country : 'US';
  return {
    country: resolved,
    currency: row.currency,
    month_cents: row.month_cents,
    year_cents: row.year_cents,
    save_percent: savePercent(row.month_cents, row.year_cents),
  };
}
