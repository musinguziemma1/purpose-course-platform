/**
 * Purpose Journey rules (README §2): Identity → Source → Purpose → Potential →
 * Destiny, then Vision → Goals → Action → Impact. Pure functions so the
 * dashboard, mentor views and tests agree on exactly what each figure means.
 */

export const PRINCIPLE_KEYS = ["identity", "source", "purpose", "potential", "destiny"] as const;
export type PrincipleKey = (typeof PRINCIPLE_KEYS)[number];

export const PRINCIPLE_INFO: Record<PrincipleKey, { name: string; question: string; color: string; focus: string }> = {
  identity: { name: "Identity", question: "Who am I?", color: "#122a4d", focus: "Identity, values, strengths and self-understanding" },
  source: { name: "Source", question: "Where am I from?", color: "#2f6b40", focus: "Foundations, experiences, influences and worldview" },
  purpose: { name: "Purpose", question: "Why am I here?", color: "#b98a1f", focus: "Purpose discovery, meaning and contribution" },
  potential: { name: "Potential", question: "What can I do?", color: "#5a3a8a", focus: "Skills, capabilities, talents and growth" },
  destiny: { name: "Destiny", question: "Where am I going?", color: "#155e63", focus: "Vision, direction, goals and impact" },
};

export function isPrincipleKey(value: unknown): value is PrincipleKey {
  return typeof value === "string" && (PRINCIPLE_KEYS as readonly string[]).includes(value);
}

/** Ordered from most to least specific: nearly every title also says "purpose". */
const INFERENCE_RULES: [PrincipleKey, RegExp][] = [
  ["destiny", /vision|\bdestin|legacy|remembered|impact|emergence|positioning|multiplicat|dream|future|planning|advoca|mobilis|mobiliz|social cohesion|making a difference|relevant/i],
  ["source", /\bsource|origin|heritage|\bstory\b|roots|predestination|experiences|foundation|upbringing|worldview/i],
  ["potential", /potential|gift|talent|strength|skill|competen|stewardship|teachab|self-discipline|growth|resilien|capacit/i],
  ["identity", /identity|self-awareness|knowing myself|self-worth|self-image|person of value|character|values|who am i/i],
  ["purpose", /purpose|calling|ministry|career|\bwork\b|meaning|why am i/i],
];

/** Best-effort principle for an untagged module or reflection; staff can set it explicitly. */
export function inferPrinciple(text: string | null | undefined): PrincipleKey | null {
  if (!text) return null;
  for (const [principle, pattern] of INFERENCE_RULES) if (pattern.test(text)) return principle;
  return null;
}

/** Which Purpose Course assessments evidence which principle. Source has no instrument yet. */
export const INSTRUMENT_PRINCIPLES: Record<string, PrincipleKey> = {
  "identity-anchoring": "identity",
  "values-priority": "identity",
  "purpose-clarity": "purpose",
  "strengths-awareness": "potential",
  "skills-inventory": "potential",
  "personal-development": "potential",
  "vision-capacity": "destiny",
  "goal-setting": "destiny",
};

export type PurposeProfileFields = {
  identityStatement: string | null;
  coreValues: string[];
  strengths: string[];
  interests: string[];
  story: string | null;
  influences: string | null;
  purposeStatement: string | null;
  contribution: string | null;
  skills: string[];
  developmentAreas: string[];
  developmentObjectives: string | null;
  vision: string | null;
  careerDirection: string | null;
  impactAspirations: string | null;
};

export const EMPTY_PURPOSE_PROFILE: PurposeProfileFields = {
  identityStatement: null, coreValues: [], strengths: [], interests: [], story: null, influences: null,
  purposeStatement: null, contribution: null, skills: [], developmentAreas: [], developmentObjectives: null,
  vision: null, careerDirection: null, impactAspirations: null,
};

const filled = (value: string | null | undefined, minimum = 20) => Boolean(value && value.trim().length >= minimum);
const listed = (values: string[], minimum: number) => values.filter((value) => value.trim()).length >= minimum;

/** Profile checks per principle, each a plain-language requirement. */
export function profileChecks(profile: PurposeProfileFields): Record<PrincipleKey, { label: string; done: boolean }[]> {
  return {
    identity: [
      { label: "Write an identity statement", done: filled(profile.identityStatement) },
      { label: "Name at least three core values", done: listed(profile.coreValues, 3) },
      { label: "Name at least three strengths", done: listed(profile.strengths, 3) },
    ],
    source: [
      { label: "Tell the story of your formative experiences", done: filled(profile.story, 40) },
      { label: "Describe the people and influences that shaped you", done: filled(profile.influences) },
    ],
    purpose: [
      { label: "Draft your purpose statement", done: filled(profile.purposeStatement) },
      { label: "Describe the contribution you are here to make", done: filled(profile.contribution) },
    ],
    potential: [
      { label: "List at least three skills", done: listed(profile.skills, 3) },
      { label: "Name areas you want to develop", done: listed(profile.developmentAreas, 1) },
      { label: "Set development objectives", done: filled(profile.developmentObjectives) },
    ],
    destiny: [
      { label: "Describe your vision", done: filled(profile.vision, 40) },
      { label: "Describe your career or life direction", done: filled(profile.careerDirection) },
      { label: "Write your impact aspirations", done: filled(profile.impactAspirations) },
    ],
  };
}

export const EVIDENCE_WEIGHTS = { learn: 0.4, profile: 0.25, assess: 0.2, reflect: 0.15 } as const;
export type EvidenceKind = keyof typeof EVIDENCE_WEIGHTS;
/** null means the evidence type does not apply to this learner yet (excluded, not scored zero). */
export type EvidenceScores = Record<EvidenceKind, number | null>;

/** Weighted progress over the evidence types that apply, as a whole percentage. */
export function principleScore(evidence: EvidenceScores) {
  let weight = 0, total = 0;
  for (const kind of Object.keys(EVIDENCE_WEIGHTS) as EvidenceKind[]) {
    const value = evidence[kind];
    if (value === null) continue;
    weight += EVIDENCE_WEIGHTS[kind];
    total += EVIDENCE_WEIGHTS[kind] * Math.max(0, Math.min(1, value));
  }
  return weight ? Math.round((total / weight) * 100) : 0;
}

export type GoalSignal = { status: string; progress: number };

export function goalIsDone(goal: GoalSignal) {
  return goal.status === "achieved" || goal.status === "completed" || goal.progress >= 100;
}

/** The action stages that follow the five principles. */
export function journeyStages(profile: PurposeProfileFields, goals: GoalSignal[]) {
  const open = goals.filter((goal) => goal.status !== "cancelled" && goal.status !== "archived");
  return [
    { key: "vision", label: "Vision", done: filled(profile.vision, 40), hint: "Describe the future you are building toward." },
    { key: "goals", label: "Goals", done: open.length > 0, hint: "Set a goal with your mentor that serves your vision." },
    { key: "action", label: "Action", done: open.some((goal) => goal.progress >= 25 || goalIsDone(goal)), hint: "Make visible progress on a goal." },
    { key: "impact", label: "Impact", done: filled(profile.impactAspirations) && open.some(goalIsDone), hint: "Complete a goal and name the impact you want to make." },
  ] as const;
}
