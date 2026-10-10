/**
 * Comprehensive world country list — all 195 UN-recognised states.
 * Used in the country filter dropdown on the search page.
 */
export const ALL_COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile",
  "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
  "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

/** Return countries that match the search string */
export function filterCountries(search: string): string[] {
  const q = search.toLowerCase();
  if (!q) return ALL_COUNTRIES;
  return ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
}

/**
 * The words papers use for a country, where the adjective differs from the
 * noun. Used to scope a search to a country and to tell local studies from
 * foreign ones.
 */
export const COUNTRY_TERMS: Record<string, string[]> = {
  "Philippines":    ["Philippines", "Filipino", "Philippine", "Filipina"],
  "United States":  ["United States", "American", "USA", "U.S.A", "U.S."],
  "United Kingdom": ["United Kingdom", "British", "UK", "England", "Wales", "Scotland"],
  "Australia":      ["Australia", "Australian"],
  "Canada":         ["Canada", "Canadian"],
  "Japan":          ["Japan", "Japanese"],
  "China":          ["China", "Chinese"],
  "India":          ["India", "Indian"],
  "Germany":        ["Germany", "German"],
  "France":         ["France", "French"],
  "Brazil":         ["Brazil", "Brazilian"],
  "South Korea":    ["South Korea", "Korean", "Korea"],
  "Indonesia":      ["Indonesia", "Indonesian"],
  "Malaysia":       ["Malaysia", "Malaysian"],
  "Singapore":      ["Singapore", "Singaporean"],
  "Thailand":       ["Thailand", "Thai"],
  "Vietnam":        ["Vietnam", "Vietnamese"],
  "Nigeria":        ["Nigeria", "Nigerian"],
  "South Africa":   ["South Africa", "South African"],
  "Pakistan":       ["Pakistan", "Pakistani"],
  "Bangladesh":     ["Bangladesh", "Bangladeshi"],
  "Egypt":          ["Egypt", "Egyptian"],
  "Kenya":          ["Kenya", "Kenyan"],
  "Mexico":         ["Mexico", "Mexican"],
  "Argentina":      ["Argentina", "Argentine"],
  "Netherlands":    ["Netherlands", "Dutch"],
  "Sweden":         ["Sweden", "Swedish"],
  "Norway":         ["Norway", "Norwegian"],
  "Switzerland":    ["Switzerland", "Swiss"],
  "Spain":          ["Spain", "Spanish"],
  "Italy":          ["Italy", "Italian"],
  "Poland":         ["Poland", "Polish"],
  "Turkey":         ["Turkey", "Turkish"],
  "Iran":           ["Iran", "Iranian"],
  "Saudi Arabia":   ["Saudi Arabia", "Saudi"],
  "Israel":         ["Israel", "Israeli"],
  "New Zealand":    ["New Zealand", "New Zealander"],
};

/** Names a paper may use for `country`: the map's words, or just the name. */
export function countryTerms(country: string): string[] {
  return COUNTRY_TERMS[country] ?? [country];
}
