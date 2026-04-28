// Heuristic detection of sensitive attributes from a resume row.
// These are intentionally rule-based / dictionary-based — production systems
// would replace these with proper inference services, but for an audit
// dashboard the heuristics are deterministic and explainable.

export type Ethnicity = "European" | "Asian" | "Hispanic" | "African" | "MiddleEastern" | "Other";
export type Gender = "Male" | "Female" | "Nonbinary" | "Unknown";
export type AgeBracket = "<30" | "30-50" | ">50";

const SURNAME_HINTS: Record<Ethnicity, string[]> = {
  European: [
    "smith", "johnson", "williams", "brown", "jones", "miller", "davis",
    "wilson", "moore", "taylor", "anderson", "thomas", "jackson", "white",
    "harris", "martin", "thompson", "garcia", "martinez", "robinson", "clark",
    "rodriguez", "lewis", "lee", "walker", "hall", "allen", "young", "king",
    "wright", "scott", "green", "baker", "adams", "nelson", "carter", "mitchell",
    "perez", "roberts", "turner", "phillips", "campbell", "parker", "evans",
    "edwards", "collins", "stewart", "morris", "murphy", "cook", "rogers",
    "morgan", "peterson", "cooper", "reed", "bailey", "bell", "kelly", "howard",
    "kowalski", "novak", "schmidt", "muller", "fischer", "weber", "meyer",
    "becker", "wagner", "schulz", "hoffmann", "richter", "bauer", "klein",
    "wolf", "schroder", "neumann", "schwarz", "zimmermann", "braun", "krause",
  ],
  Asian: [
    "wang", "li", "zhang", "liu", "chen", "yang", "huang", "zhao", "wu",
    "zhou", "xu", "sun", "ma", "zhu", "hu", "guo", "lin", "he", "gao", "luo",
    "kim", "park", "choi", "jung", "kang", "cho", "yoon", "jang", "lim",
    "tanaka", "suzuki", "sato", "watanabe", "ito", "yamamoto", "nakamura",
    "kobayashi", "saito", "kato", "yoshida", "yamada", "sasaki", "yamaguchi",
    "matsumoto", "inoue", "kimura", "shimizu", "hayashi", "ikeda", "takahashi",
    "patel", "shah", "kumar", "singh", "gupta", "sharma", "reddy", "rao",
    "agarwal", "mehta", "joshi", "iyer", "menon", "nair", "desai", "mishra",
    "nguyen", "tran", "le", "pham", "huynh", "phan", "vu", "vo", "dang", "bui",
  ],
  Hispanic: [
    "gonzalez", "hernandez", "lopez", "perez", "sanchez", "ramirez", "torres",
    "flores", "rivera", "gomez", "diaz", "reyes", "morales", "cruz", "ortiz",
    "gutierrez", "chavez", "ramos", "ruiz", "alvarez", "mendoza", "vargas",
    "castillo", "jimenez", "moreno", "romero", "herrera", "medina", "aguilar",
    "fernandez", "santiago", "marquez", "delgado", "rojas", "vasquez",
    "santos", "silva", "costa", "ferreira", "almeida", "pereira",
  ],
  African: [
    "okafor", "okonkwo", "adeyemi", "adebayo", "okoye", "nwosu", "abiola",
    "afolayan", "balogun", "chukwu", "diallo", "kone", "traore", "toure",
    "sall", "ndiaye", "fall", "mensah", "asante", "boateng", "owusu",
    "mwangi", "kamau", "njoroge", "ochieng", "wanjiru", "nyong", "achebe",
    "mbeki", "mandela", "tutu", "zulu", "khumalo", "ndlovu", "dlamini",
  ],
  MiddleEastern: [
    "hassan", "hussein", "ali", "ahmad", "ahmed", "mohammed", "mohamed",
    "youssef", "yousef", "ibrahim", "khalil", "saleh", "rahman", "kamal",
    "farouk", "fares", "haddad", "saad", "mansour", "nasser", "omar",
    "abdullah", "abbas", "rashid", "karim", "naser", "shams", "tariq",
    "zaidi", "qureshi", "siddiqui", "abadi", "tehrani", "isfahani",
  ],
  Other: [],
};

const SURNAME_TO_ETHNICITY: Map<string, Ethnicity> = new Map();
for (const [eth, names] of Object.entries(SURNAME_HINTS) as [Ethnicity, string[]][]) {
  for (const n of names) SURNAME_TO_ETHNICITY.set(n, eth);
}

export function detectEthnicity(name: string): Ethnicity {
  if (!name) return "Other";
  const parts = name.trim().toLowerCase().split(/\s+/);
  // Try last name first
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]!.replace(/[^a-z]/g, "");
    const hit = SURNAME_TO_ETHNICITY.get(p);
    if (hit) return hit;
  }
  return "Other";
}

const MALE_PRONOUNS = /\b(he|him|his|himself)\b/gi;
const FEMALE_PRONOUNS = /\b(she|her|hers|herself)\b/gi;
const NEUTRAL_PRONOUNS = /\b(they|them|their|theirs|themself|themselves)\b/gi;

const MALE_NAMES = new Set([
  "james", "john", "robert", "michael", "william", "david", "richard", "joseph",
  "thomas", "charles", "christopher", "daniel", "matthew", "anthony", "mark",
  "donald", "steven", "paul", "andrew", "joshua", "kenneth", "kevin", "brian",
  "george", "edward", "ronald", "timothy", "jason", "jeffrey", "ryan", "jacob",
  "gary", "nicholas", "eric", "jonathan", "stephen", "larry", "justin", "scott",
  "brandon", "frank", "benjamin", "gregory", "samuel", "raymond", "patrick",
  "alexander", "jack", "dennis", "jerry", "tyler", "aaron", "jose", "henry",
  "douglas", "peter", "adam", "nathan", "zachary", "walter", "kyle", "harold",
  "carl", "jeremy", "keith", "roger", "gerald", "ethan", "arthur", "terry",
  "mohammed", "ahmed", "ali", "omar", "hassan", "ibrahim", "yousef",
  "wei", "jun", "ming", "hiroshi", "takeshi", "kenji", "raj", "rahul", "amit",
]);

const FEMALE_NAMES = new Set([
  "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan",
  "jessica", "sarah", "karen", "lisa", "nancy", "betty", "sandra", "margaret",
  "ashley", "kimberly", "emily", "donna", "michelle", "carol", "amanda",
  "dorothy", "melissa", "deborah", "stephanie", "rebecca", "laura", "sharon",
  "cynthia", "kathleen", "amy", "shirley", "angela", "helen", "anna", "brenda",
  "pamela", "nicole", "samantha", "katherine", "christine", "emma", "ruth",
  "hannah", "olivia", "sophia", "isabella", "mia", "charlotte", "ava", "amelia",
  "fatima", "aisha", "khadija", "zainab", "mei", "yan", "ling", "priya", "anjali",
]);

export function detectGender(resumeText: string, name?: string): Gender {
  const text = resumeText || "";
  const male = (text.match(MALE_PRONOUNS) || []).length;
  const female = (text.match(FEMALE_PRONOUNS) || []).length;
  const neutral = (text.match(NEUTRAL_PRONOUNS) || []).length;
  if (male > female && male > neutral) return "Male";
  if (female > male && female > neutral) return "Female";
  if (neutral > 0 && neutral >= male && neutral >= female) return "Nonbinary";
  if (name) {
    const first = name.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "");
    if (first) {
      if (MALE_NAMES.has(first)) return "Male";
      if (FEMALE_NAMES.has(first)) return "Female";
    }
  }
  return "Unknown";
}

export function ageFromGraduation(graduationYear: number, currentYear = new Date().getFullYear()): number {
  // Assume bachelor's at age 22.
  return currentYear - graduationYear + 22;
}

export function ageBracket(age: number): AgeBracket {
  if (age < 30) return "<30";
  if (age <= 50) return "30-50";
  return ">50";
}

export interface SensitiveAttributes {
  ethnicity: Ethnicity;
  gender: Gender;
  age: number;
  ageBracket: AgeBracket;
}

export function detectAttributes(row: { name: string; resume_text: string; graduation_year: number | string }): SensitiveAttributes {
  const ethnicity = detectEthnicity(row.name || "");
  const gender = detectGender(row.resume_text || "", row.name);
  const gy = typeof row.graduation_year === "string" ? parseInt(row.graduation_year, 10) : row.graduation_year;
  const age = Number.isFinite(gy) ? ageFromGraduation(gy) : 30;
  return { ethnicity, gender, age, ageBracket: ageBracket(age) };
}
