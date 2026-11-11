export type InstrumentDimensionSeed = {
  slug: string;
  name: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  items: { prompt: string; reverse?: boolean }[];
};

export type InstrumentSeed = {
  slug: string;
  title: string;
  category: "identity" | "values" | "strengths" | "skills" | "purpose" | "vision" | "goals" | "development";
  construct: string;
  description: string;
  methodology: string;
  limitations: string;
  interpretationGuide: string;
  dataProtection: string;
  consentSummary: string;
  estimatedMinutes: number;
  dimensions: InstrumentDimensionSeed[];
};

const METHOD_STANDARD =
  "Nine items across three domains, answered on a five-point frequency scale. Items were written by the Purpose Course faculty against the PURP curriculum outcomes, reviewed by two facilitators for clarity and construct coverage, and piloted with a cohort before release. This is a formative, curriculum-aligned instrument: it has content validity for our programme and internal consistency checks, but it is not a clinically validated psychometric test.";

const LIMITS_STANDARD =
  "Self-report instruments measure how you describe yourself today, not an objective capacity. Scores move with mood, season and recent events. They are not diagnostic, not suitable for selection or employment decisions, and should not be used to label a person. Small differences (under 8 points) are not meaningful. Use the result to start a conversation, not to close one.";

const DATA_STANDARD =
  "Responses are stored against your learner profile with the instrument version. Only you and your assigned mentor or coach can see individual results; aggregated, de-identified averages may inform curriculum review. You can retake an instrument at any time, and a new attempt is stored separately so your development can be tracked over time.";

const GUIDE_STANDARD =
  "Scores are reported as a percentage of the possible range from the five-point scale, grouped into four interpretive bands. Domain scores are independent — a strong overall score can hide a weak domain, so read all three domains before drawing conclusions. Compare your own results over time rather than against other people.";

function item(prompt: string, reverse = false) {
  return { prompt, reverse };
}

export const INSTRUMENTS: InstrumentSeed[] = [
  {
    slug: "identity-anchoring",
    title: "Identity Anchoring",
    category: "identity",
    construct:
      "Identity anchoring is the degree to which a person's sense of worth and direction rests on who they are rather than on performance, titles or approval. It is the Foundation level's first construct (PURP 101–102).",
    description:
      "How secure your sense of self is when your output, title or approval is removed for a season.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I understand this is a formative reflection tool for the Purpose Course, not a psychological diagnosis, and that my individual result is visible to my assigned mentor.",
    estimatedMinutes: 7,
    dimensions: [
      {
        slug: "self-knowledge",
        name: "Self-knowledge",
        description: "How clearly you can describe your own gifts, limits and story without borrowed language.",
        lowLabel: "Borrowed definition",
        highLabel: "Named and owned",
        items: [
          item("I can describe my strengths without needing someone else's words."),
          item("I know the story that shaped how I see myself."),
          item("I can name what I am not, without apologising for it."),
        ],
      },
      {
        slug: "security",
        name: "Security",
        description: "How stable your sense of worth is when performance or approval is removed.",
        lowLabel: "Performance-linked",
        highLabel: "Grounded",
        items: [
          item("My sense of worth changes when I receive criticism.", true),
          item("I can rest without proving I deserve to."),
          item("Being overlooked for a role costs me more than I admit.", true),
        ],
      },
      {
        slug: "congruence",
        name: "Congruence",
        description: "The gap between the person you present publicly and the person you actually are.",
        lowLabel: "Two versions of me",
        highLabel: "One person",
        items: [
          item("The person my closest friends know matches the person my work knows."),
          item("I say yes to things I should refuse.", true),
          item("I can name what I am genuinely pursuing this year."),
        ],
      },
    ],
  },
  {
    slug: "values-priority",
    title: "Values Priority & Consistency",
    category: "values",
    construct:
      "Values clarity is the ability to name a small set of governing commitments and to act on them when they conflict with convenience. This covers PURP 102 and 201.",
    description:
      "Whether your stated values are actually the values governing your calendar, money and relationships.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I agree to complete a values reflection for the Purpose Course and understand its scoring is transparent and formative only.",
    estimatedMinutes: 7,
    dimensions: [
      {
        slug: "clarity",
        name: "Priority clarity",
        description: "Whether you have a short, ordered list of commitments rather than a vague set of virtues.",
        lowLabel: "Everything matters",
        highLabel: "Ordered commitments",
        items: [
          item("I could name my three governing values in one minute."),
          item("I have a written record of what I have decided matters most."),
          item("My values list is long enough to excuse almost any choice.", true),
        ],
      },
      {
        slug: "consistency",
        name: "Consistency",
        description: "The alignment between what you say you value and how you spend time and money.",
        lowLabel: "Values on paper",
        highLabel: "Values in practice",
        items: [
          item("My calendar reflects what I say matters most."),
          item("I spend money in line with my stated priorities."),
          item("I notice when my choices contradict my stated values."),
        ],
      },
      {
        slug: "tension",
        name: "Tension management",
        description: "How you handle competing goods rather than pretending the conflict does not exist.",
        lowLabel: "Avoided conflicts",
        highLabel: "Named trade-offs",
        items: [
          item("When two good options compete, I name the trade-off out loud."),
          item("I avoid decisions that force me to disappoint someone.", true),
          item("I can say no without inventing an excuse."),
        ],
      },
    ],
  },
  {
    slug: "strengths-awareness",
    title: "Strengths Awareness & Deployment",
    category: "strengths",
    construct:
      "Strengths awareness measures whether you can recognise your evidenced capacity and whether you actually deploy it in service. This is the Foundation of PURP 202.",
    description:
      "The difference between knowing your gifts and putting them to work where they are needed.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I understand that strengths results are evidence prompts for coaching, and that I can re-take this instrument as my experience grows.",
    estimatedMinutes: 6,
    dimensions: [
      {
        slug: "recognition",
        name: "Recognition",
        description: "Whether you can name evidenced strengths rather than aspirations or compliments.",
        lowLabel: "Fuzzy gifts",
        highLabel: "Evidenced strengths",
        items: [
          item("I can give a concrete example of each strength I claim."),
          item("I ask other people what they see in me."),
          item("I describe my strengths mostly in adjectives.", true),
        ],
      },
      {
        slug: "deployment",
        name: "Deployment",
        description: "Whether your strengths are used regularly in roles where they are valuable.",
        lowLabel: "Undeployed",
        highLabel: "In service",
        items: [
          item("Most weeks, I use my strongest ability for someone else's benefit."),
          item("My current responsibilities let me work from my strengths."),
          item("I spend a lot of energy on work that someone else is better placed to do.", true),
        ],
      },
      {
        slug: "stewardship",
        name: "Stewardship",
        description: "Whether you are developing and protecting the capacity you have been given.",
        lowLabel: "Unmanaged capacity",
        highLabel: "Tended capacity",
        items: [
          item("I have a plan to develop my strongest ability this year."),
          item("I protect the hours where I do my best work."),
          item("I know when to hand something over."),
        ],
      },
    ],
  },
  {
    slug: "skills-inventory",
    title: "Skills Inventory",
    category: "skills",
    construct:
      "A skills inventory is not a personality measure. It tracks self-assessed proficiency across technical, relational and adaptive skill domains that the programme requires, and is used to plan practice rather than to rank people.",
    description:
      "Self-assessed proficiency across the technical, relational and adaptive skills the programme practises.",
    methodology:
      "Nine proficiency statements rated on a five-point scale, mapped to observable curriculum skills. The faculty reviews ratings with the learner against submitted work when possible, because self-rated skill is systematically imprecise without evidence.",
    limitations: `${LIMITS_STANDARD} Skills self-rating is especially vulnerable to over- and under-confidence; treat it as a hypothesis to test with submitted work and mentor feedback.`,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I understand this is a self-assessment of skills for planning my practice, and that it is not an examination result.",
    estimatedMinutes: 6,
    dimensions: [
      {
        slug: "technical",
        name: "Technical practice",
        description: "Planning, writing and the craft disciplines in your field.",
        lowLabel: "Needs structure",
        highLabel: "Reliable craft",
        items: [
          item("I can plan a project and hold it to a deadline."),
          item("I can write a clear, structured document without heavy editing."),
          item("I have a repeatable process for my most important work."),
        ],
      },
      {
        slug: "relational",
        name: "Relational practice",
        description: "Listening, feedback, conflict and the ability to build trust.",
        lowLabel: "Avoids friction",
        highLabel: "Builds trust",
        items: [
          item("I can give direct feedback without damaging the relationship."),
          item("I listen to understand rather than to reply."),
          item("I repair a relationship quickly after I get it wrong."),
        ],
      },
      {
        slug: "adaptive",
        name: "Adaptive practice",
        description: "Learning, adjusting and leading through uncertainty.",
        lowLabel: "Wants certainty",
        highLabel: "Learns in motion",
        items: [
          item("I can make a decision with incomplete information."),
          item("I seek feedback that might prove me wrong."),
          item("I adjust a plan without abandoning the goal."),
        ],
      },
    ],
  },
  {
    slug: "purpose-clarity",
    title: "Purpose Clarity",
    category: "purpose",
    construct:
      "Purpose clarity is the ability to articulate a specific, evidence-backed direction for your life that shapes decisions. It is the core construct of PURP 204.",
    description:
      "Whether your purpose is articulated, evidenced and actually influencing your decisions.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I agree to reflect on my sense of purpose and understand that clarity is measured formatively, not graded.",
    estimatedMinutes: 7,
    dimensions: [
      {
        slug: "articulation",
        name: "Articulation",
        description: "Whether your purpose can be stated specifically enough to be tested.",
        lowLabel: "General sense",
        highLabel: "Testable statement",
        items: [
          item("I can state my purpose in one sentence a stranger would understand."),
          item("My statement names who I serve."),
          item("My purpose is something I would say to anyone, not only in church.", true),
        ],
      },
      {
        slug: "evidence",
        name: "Evidence",
        description: "Whether your sense of purpose is confirmed by gifts, story and fruit.",
        lowLabel: "Untested",
        highLabel: "Evidenced",
        items: [
          item("The work I do shows the direction I claim."),
          item("I have asked two people to test my purpose statement."),
          item("My sense of purpose has never been tested by another person.", true),
        ],
      },
      {
        slug: "alignment",
        name: "Alignment",
        description: "Whether purpose actually shapes your calendar, money and decisions.",
        lowLabel: "Weekend clarity",
        highLabel: "Governs decisions",
        items: [
          item("My biggest time commitments serve my stated purpose."),
          item("I have declined a good opportunity because it was not mine."),
          item("I would need to change very little to live out my purpose.", true),
        ],
      },
    ],
  },
  {
    slug: "vision-capacity",
    title: "Vision Capacity",
    category: "vision",
    construct:
      "Vision capacity measures whether you hold a describable future with a pathway, a cost and a way to review it — the PURP 301–302 construct.",
    description: "The strength of your picture, plan and counted cost for the next season.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I agree to complete a vision reflection and understand that results are for my own planning and coaching conversations.",
    estimatedMinutes: 6,
    dimensions: [
      {
        slug: "picture",
        name: "Picture",
        description: "Whether the future you describe is specific enough to picture on a normal day.",
        lowLabel: "Slogan",
        highLabel: "Describable",
        items: [
          item("I can describe a normal Tuesday in the life I am building."),
          item("My vision names real people and real outcomes."),
          item("My vision sounds better than it looks.", true),
        ],
      },
      {
        slug: "pathway",
        name: "Pathway",
        description: "Whether there are named first steps and people responsible.",
        lowLabel: "No next step",
        highLabel: "Sequenced",
        items: [
          item("I can name the next three steps of my vision."),
          item("Each step has a person and a date attached."),
          item("I am waiting for clarity before I start.", true),
        ],
      },
      {
        slug: "cost",
        name: "Cost",
        description: "Whether you have named what the vision will require and what it will cost others.",
        lowLabel: "Unpriced",
        highLabel: "Counted",
        items: [
          item("I know what my vision will cost in time and money."),
          item("I have told someone close to me what this will require of them."),
          item("There is a stop-doing list attached to my vision."),
        ],
      },
    ],
  },
  {
    slug: "goal-setting",
    title: "Goal-setting & Review",
    category: "goals",
    construct:
      "Goal-setting capacity measures whether commitments are specific, owned, scheduled and reviewed — the practical discipline behind PURP 302–305.",
    description: "How specific, owned and reviewed your commitments actually are.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I agree to reflect on how I set and review goals, and to share results with my mentor if I choose to.",
    estimatedMinutes: 6,
    dimensions: [
      {
        slug: "specificity",
        name: "Specificity",
        description: "Whether goals are measurable and time-bound rather than aspirational.",
        lowLabel: "Intentions",
        highLabel: "Measurable goals",
        items: [
          item("My current goals have a number or a visible outcome."),
          item("I know the date by which each goal should be finished."),
          item("My goals are broad enough that I cannot fail them.", true),
        ],
      },
      {
        slug: "commitment",
        name: "Commitment",
        description: "Whether goals are few enough and owned enough to be pursued seriously.",
        lowLabel: "Scattered",
        highLabel: "Focused",
        items: [
          item("I am pursuing three goals or fewer this quarter."),
          item("I can explain why each goal is mine rather than inherited."),
          item("My goals change whenever they get difficult.", true),
        ],
      },
      {
        slug: "review",
        name: "Review",
        description: "Whether progress is checked on a rhythm and adjusted honestly.",
        lowLabel: "Set and forgotten",
        highLabel: "Reviewed weekly",
        items: [
          item("I review progress on a weekly or fortnightly rhythm."),
          item("I tell another person what I committed to."),
          item("I adjust a goal when the evidence says I should."),
        ],
      },
    ],
  },
  {
    slug: "personal-development",
    title: "Personal Development Practice",
    category: "development",
    construct:
      "Personal development practice measures the habits that turn insight into formation: reflection, receiving feedback and sustained practice.",
    description: "The habits that convert insight into formation over a season.",
    methodology: METHOD_STANDARD,
    limitations: LIMITS_STANDARD,
    interpretationGuide: GUIDE_STANDARD,
    dataProtection: DATA_STANDARD,
    consentSummary:
      "I agree to complete a development-practice reflection and understand the result belongs to my own learning record.",
    estimatedMinutes: 7,
    dimensions: [
      {
        slug: "reflection",
        name: "Reflection",
        description: "Whether you process experience deliberately rather than merely accumulating it.",
        lowLabel: "Experiencing only",
        highLabel: "Reflective rhythm",
        items: [
          item("I write or speak about what I am learning at least weekly."),
          item("I notice patterns in how I react under pressure."),
          item("I rarely pause to process what just happened.", true),
        ],
      },
      {
        slug: "feedback",
        name: "Feedback",
        description: "Whether you invite correction and act on it.",
        lowLabel: "Defended",
        highLabel: "Correctable",
        items: [
          item("I have asked for feedback in the last month."),
          item("I can receive correction without explaining it away."),
          item("People tell me what I want to hear.", true),
        ],
      },
      {
        slug: "practice",
        name: "Practice",
        description: "Whether you sustain a discipline long enough for it to change you.",
        lowLabel: "Restless",
        highLabel: "Sustained",
        items: [
          item("I have kept one practice for more than ninety days."),
          item("I finish what I begin, even after the novelty fades."),
          item("I start more than I finish.", true),
        ],
      },
    ],
  },
];

export const BANDS = [
  {
    min: 0,
    max: 39,
    label: "Emerging",
    interpretation:
      "This domain is still forming. Awareness may be present, but the pattern is not yet established in ordinary decisions.",
    recommendation:
      "Begin with the Foundation level and the weekly reflection practice. Choose one small, observable commitment for the next 30 days rather than a whole-life overhaul.",
    sortOrder: 1,
  },
  {
    min: 40,
    max: 69,
    label: "Developing",
    interpretation:
      "There is real movement here, held in some contexts and not others. Progress tends to be uneven rather than absent.",
    recommendation:
      "Bring this domain to your next clarity session with one specific example where it held and one where it did not. Ask your mentor for one practice to close the gap.",
    sortOrder: 2,
  },
  {
    min: 70,
    max: 84,
    label: "Established",
    interpretation:
      "This is a settled pattern you can rely on in pressure. The risk at this level is maintenance and quiet drift.",
    recommendation:
      "Protect it with a review rhythm and teach it to someone else. Consider leading a group-work session in this area.",
    sortOrder: 3,
  },
  {
    min: 85,
    max: 100,
    label: "Strong",
    interpretation:
      "This domain is a mature strength. It is likely visible to others and already serving them.",
    recommendation:
      "Convert it into contribution: mentor someone, teach the practice, or build the structure that lets others benefit. Guard against using strength as an excuse for inattention elsewhere.",
    sortOrder: 4,
  },
];
