export const IMAGES = {
  heroWorkshop: "/images/hero-workshop.jpg",
  roundTable: "/images/community.jpg",
  mentorship: "/images/mentorship.jpg",
  conversation: "/images/mentorship.jpg",
  study: "/images/student-study.jpg",
  journal: "/images/journal-purpose.jpg",
  summit: "/images/level-advanced.jpg",
  summitSunrise: "/images/level-advanced.jpg",
  gardenTable: "/images/level-foundation.jpg",
  listening: "/images/community.jpg",
  foundation: "/images/level-foundation.jpg",
  intermediate: "/images/level-intermediate.jpg",
  advanced: "/images/level-advanced.jpg",
  identity: "/images/journal-identity.jpg",
  team: "/images/about-team.jpg",
} as const;

export const PRINCIPLES = [
  {
    name: "Identity",
    question: "Who Am I?",
    accent: "navy",
    color: "#122a4d",
    icon: "user",
    description:
      "You discover the person God made you to be — distinct gifts, story and design — before the roles you perform.",
  },
  {
    name: "Source",
    question: "Where Am I From?",
    accent: "green",
    color: "#2f6b40",
    icon: "home",
    description:
      "You trace your origin, heritage and gifting to their source so that purpose is rooted rather than borrowed.",
  },
  {
    name: "Purpose",
    question: "Why Am I Here?",
    accent: "gold",
    color: "#b98a1f",
    icon: "target",
    description:
      "You move from a vague sense of calling to a clear, articulated purpose statement you can live and lead from.",
  },
  {
    name: "Potential",
    question: "What Can I Do?",
    accent: "purple",
    color: "#5a3a8a",
    icon: "star",
    description:
      "You name the capacity God placed inside you and convert it into competence, contribution and craft.",
  },
  {
    name: "Destiny",
    question: "Where Am I Going?",
    accent: "teal",
    color: "#155e63",
    icon: "compass",
    description:
      "You build a vision for the road ahead — positioning, timing and influence aligned with your assignment.",
  },
] as const;

export type PrincipleAccent = (typeof PRINCIPLES)[number]["accent"];

export const PRINCIPLE_COLORS: Record<string, string> = {
  navy: "#122a4d",
  green: "#2f6b40",
  gold: "#b98a1f",
  purple: "#5a3a8a",
  teal: "#155e63",
  stone: "#57534e",
};
