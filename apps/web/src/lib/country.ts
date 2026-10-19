const ZONES: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Lisbon': 'PT',
  'Europe/Helsinki': 'FI',
  'Europe/Athens': 'GR',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Warsaw': 'PL',
  'Europe/Zurich': 'CH',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Hong_Kong': 'HK',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Manila': 'PH',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA',
};

export function countryCode() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ZONES[zone]) return ZONES[zone];
  } catch {
    /* ignore */
  }
  const locale = typeof navigator !== 'undefined' ? navigator.language : '';
  const region = locale.split('-')[1] || '';
  if (/^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
  return 'US';
}
