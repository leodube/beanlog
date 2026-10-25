// Countries as ISO 3166-1 alpha-2 codes; names come from the browser/Node's
// built-in Intl data, so there's no country list to maintain.

/** Coffee-producing origins, for the coffee form's picker. */
export const ORIGIN_CODES = [
  "BO",
  "BR",
  "BI",
  "CN",
  "CO",
  "CR",
  "CD",
  "EC",
  "SV",
  "ET",
  "GT",
  "HN",
  "IN",
  "ID",
  "JM",
  "KE",
  "LA",
  "MW",
  "MX",
  "MM",
  "NP",
  "NI",
  "PA",
  "PG",
  "PE",
  "PH",
  "RW",
  "TZ",
  "TH",
  "TL",
  "UG",
  "US",
  "VN",
  "YE",
  "ZM",
  "ZW",
] as const;

/** Every assigned code, for the roaster's country. */
export const ALL_CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM " +
  "FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM " +
  "JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO " +
  "MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT " +
  "PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM " +
  "TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const OVERRIDES: Record<string, string> = {
  CD: "DR Congo",
  CG: "Republic of the Congo",
};
const names = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string | null | undefined) {
  if (!code) return "";
  return OVERRIDES[code] ?? names.of(code) ?? code;
}

/** [code, name] pairs sorted by name, for <select> options. */
export function countryOptions(codes: readonly string[]) {
  return codes
    .map((c) => [c, countryName(c)] as const)
    .sort((a, b) => a[1].localeCompare(b[1]));
}
