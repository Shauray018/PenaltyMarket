const TEAM_COUNTRY_CODES: Record<string, string> = {
  argentina: "AR",
  belgium: "BE",
  brazil: "BR",
  canada: "CA",
  "cabo verde": "CV",
  "cape verde": "CV",
  chile: "CL",
  colombia: "CO",
  croatia: "HR",
  denmark: "DK",
  england: "GB",
  france: "FR",
  germany: "DE",
  ghana: "GH",
  italy: "IT",
  japan: "JP",
  mexico: "MX",
  morocco: "MA",
  netherlands: "NL",
  norway: "NO",
  paraguay: "PY",
  portugal: "PT",
  "south africa": "ZA",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  uruguay: "UY",
  usa: "US",
  "united states": "US"
};

export function countryCodeForTeam(name?: string) {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  return TEAM_COUNTRY_CODES[normalized] ?? null;
}

export function flagUrlForTeam(name?: string, size = 64) {
  const code = countryCodeForTeam(name);
  return code ? `https://flagsapi.com/${code}/flat/${size}.png` : null;
}
