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

export const COUNTRY_MAP = Object.fromEntries(
  COUNTRIES.map((c) => [c.value, c])
) as Record<string, { value: string; flag: string; label: string }>;

export const GENDER_MAP = Object.fromEntries(
  GENDERS.map((g) => [g.value, g])
) as Record<string, { value: string; icon: string; label: string }>;

export function countryLabel(v: string | null | undefined): string {
  if (!v || v === "any") return "";
  return `${COUNTRY_MAP[v]?.flag ?? ""} ${COUNTRY_MAP[v]?.label ?? v}`.trim();
}

export function genderLabel(v: string | null | undefined): string {
  if (!v || v === "any") return "";
  return GENDER_MAP[v]?.label ?? v;
}
