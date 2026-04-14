export const COUNTRIES: { value: string; label: string; flag: string }[] = [
  { value: "any",          flag: "🌍", label: "Any / Worldwide" },
  { value: "India",        flag: "🇮🇳", label: "India" },
  { value: "USA",          flag: "🇺🇸", label: "USA" },
  { value: "UK",           flag: "🇬🇧", label: "UK" },
  { value: "Germany",      flag: "🇩🇪", label: "Germany" },
  { value: "France",       flag: "🇫🇷", label: "France" },
  { value: "Japan",        flag: "🇯🇵", label: "Japan" },
  { value: "South Korea",  flag: "🇰🇷", label: "South Korea" },
  { value: "Brazil",       flag: "🇧🇷", label: "Brazil" },
  { value: "Canada",       flag: "🇨🇦", label: "Canada" },
  { value: "Australia",    flag: "🇦🇺", label: "Australia" },
  { value: "Mexico",       flag: "🇲🇽", label: "Mexico" },
  { value: "Russia",       flag: "🇷🇺", label: "Russia" },
  { value: "China",        flag: "🇨🇳", label: "China" },
  { value: "Indonesia",    flag: "🇮🇩", label: "Indonesia" },
  { value: "Philippines",  flag: "🇵🇭", label: "Philippines" },
  { value: "Turkey",       flag: "🇹🇷", label: "Turkey" },
  { value: "Spain",        flag: "🇪🇸", label: "Spain" },
  { value: "Italy",        flag: "🇮🇹", label: "Italy" },
  { value: "Poland",       flag: "🇵🇱", label: "Poland" },
  { value: "Netherlands",  flag: "🇳🇱", label: "Netherlands" },
  { value: "Sweden",       flag: "🇸🇪", label: "Sweden" },
  { value: "Norway",       flag: "🇳🇴", label: "Norway" },
  { value: "Denmark",      flag: "🇩🇰", label: "Denmark" },
  { value: "Finland",      flag: "🇫🇮", label: "Finland" },
  { value: "Belgium",      flag: "🇧🇪", label: "Belgium" },
  { value: "Portugal",     flag: "🇵🇹", label: "Portugal" },
  { value: "Czech Republic", flag: "🇨🇿", label: "Czech Republic" },
  { value: "Romania",      flag: "🇷🇴", label: "Romania" },
  { value: "Hungary",      flag: "🇭🇺", label: "Hungary" },
  { value: "Greece",       flag: "🇬🇷", label: "Greece" },
  { value: "Ukraine",      flag: "🇺🇦", label: "Ukraine" },
  { value: "Switzerland",  flag: "🇨🇭", label: "Switzerland" },
  { value: "Austria",      flag: "🇦🇹", label: "Austria" },
  { value: "Argentina",    flag: "🇦🇷", label: "Argentina" },
  { value: "Chile",        flag: "🇨🇱", label: "Chile" },
  { value: "Colombia",     flag: "🇨🇴", label: "Colombia" },
  { value: "Peru",         flag: "🇵🇪", label: "Peru" },
  { value: "Thailand",     flag: "🇹🇭", label: "Thailand" },
  { value: "Vietnam",      flag: "🇻🇳", label: "Vietnam" },
  { value: "Malaysia",     flag: "🇲🇾", label: "Malaysia" },
  { value: "Singapore",    flag: "🇸🇬", label: "Singapore" },
  { value: "Taiwan",       flag: "🇹🇼", label: "Taiwan" },
  { value: "Saudi Arabia", flag: "🇸🇦", label: "Saudi Arabia" },
  { value: "UAE",          flag: "🇦🇪", label: "UAE" },
  { value: "Israel",       flag: "🇮🇱", label: "Israel" },
  { value: "Egypt",        flag: "🇪🇬", label: "Egypt" },
  { value: "South Africa", flag: "🇿🇦", label: "South Africa" },
  { value: "Nigeria",      flag: "🇳🇬", label: "Nigeria" },
  { value: "Kenya",        flag: "🇰🇪", label: "Kenya" },
  { value: "Pakistan",     flag: "🇵🇰", label: "Pakistan" },
  { value: "Bangladesh",   flag: "🇧🇩", label: "Bangladesh" },
];

export const GENDERS: { value: string; label: string; icon: string }[] = [
  { value: "any",       icon: "✨", label: "Any / No preference" },
  { value: "male",      icon: "♂",  label: "Male" },
  { value: "female",    icon: "♀",  label: "Female" },
  { value: "non_binary",icon: "⚧",  label: "Non-binary" },
  { value: "no_say",    icon: "🔒", label: "Prefer not to say" },
];

export const REGIONS: { value: string; label: string; icon: string }[] = [
  { value: "any",           icon: "🌍", label: "Any Region" },
  { value: "Asia",          icon: "🌏", label: "Asia" },
  { value: "North America", icon: "🌎", label: "North America" },
  { value: "Europe",        icon: "🌍", label: "Europe" },
  { value: "South America", icon: "🌎", label: "South America" },
  { value: "Middle East",   icon: "🕌", label: "Middle East" },
  { value: "Africa",        icon: "🌍", label: "Africa" },
  { value: "Oceania",       icon: "🌏", label: "Oceania" },
  { value: "Other",         icon: "🌐", label: "Other" },
];

export const COUNTRY_TO_REGION: Record<string, string> = {
  "India":          "Asia",
  "Japan":          "Asia",
  "South Korea":    "Asia",
  "China":          "Asia",
  "Indonesia":      "Asia",
  "Philippines":    "Asia",
  "Thailand":       "Asia",
  "Vietnam":        "Asia",
  "Malaysia":       "Asia",
  "Singapore":      "Asia",
  "Taiwan":         "Asia",
  "Pakistan":       "Asia",
  "Bangladesh":     "Asia",
  "USA":            "North America",
  "Canada":         "North America",
  "Mexico":         "North America",
  "UK":             "Europe",
  "Germany":        "Europe",
  "France":         "Europe",
  "Spain":          "Europe",
  "Italy":          "Europe",
  "Poland":         "Europe",
  "Netherlands":    "Europe",
  "Sweden":         "Europe",
  "Norway":         "Europe",
  "Denmark":        "Europe",
  "Finland":        "Europe",
  "Belgium":        "Europe",
  "Portugal":       "Europe",
  "Czech Republic": "Europe",
  "Romania":        "Europe",
  "Hungary":        "Europe",
  "Greece":         "Europe",
  "Ukraine":        "Europe",
  "Switzerland":    "Europe",
  "Austria":        "Europe",
  "Russia":         "Europe",
  "Brazil":         "South America",
  "Argentina":      "South America",
  "Chile":          "South America",
  "Colombia":       "South America",
  "Peru":           "South America",
  "Turkey":         "Middle East",
  "Saudi Arabia":   "Middle East",
  "UAE":            "Middle East",
  "Israel":         "Middle East",
  "Egypt":          "Africa",
  "South Africa":   "Africa",
  "Nigeria":        "Africa",
  "Kenya":          "Africa",
  "Australia":      "Oceania",
};

export const COUNTRY_MAP = Object.fromEntries(
  COUNTRIES.map((c) => [c.value, c])
) as Record<string, { value: string; flag: string; label: string }>;

export const GENDER_MAP = Object.fromEntries(
  GENDERS.map((g) => [g.value, g])
) as Record<string, { value: string; icon: string; label: string }>;

export const REGION_MAP = Object.fromEntries(
  REGIONS.map((r) => [r.value, r])
) as Record<string, { value: string; icon: string; label: string }>;

export function countryLabel(v: string | null | undefined): string {
  if (!v || v === "any") return "";
  return `${COUNTRY_MAP[v]?.flag ?? ""} ${COUNTRY_MAP[v]?.label ?? v}`.trim();
}

export function genderLabel(v: string | null | undefined): string {
  if (!v || v === "any") return "";
  return GENDER_MAP[v]?.label ?? v;
}

export function regionLabel(v: string | null | undefined): string {
  if (!v || v === "any") return "";
  return REGION_MAP[v]?.label ?? v;
}

export function getRegion(country: string | null | undefined): string {
  if (!country) return "Other";
  return COUNTRY_TO_REGION[country] ?? "Other";
}
