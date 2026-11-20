export type ProgrammeCatalogue = {
  slug: string;
  name: string;
  duration: string;
  structure: string;
  description: string;
  levels: { slug: string; name: string; modules: string[] }[];
};

export const PROGRAMME_CATALOGUE: ProgrammeCatalogue[] = [
  {
    slug: "purpose-program-adults",
    name: "Purpose Program for Adults",
    duration: "15 weeks",
    structure: "3 levels · 15 modules",
    description:
      "A progressive adult curriculum moving from foundational understanding to purpose discovery and purposeful influence.",
    levels: [
      {
        slug: "foundation",
        name: "Foundation – Understanding Purpose",
        modules: [
          "PURP 101 – Understanding Purpose",
          "PURP 102 – Becoming a Person of Value",
          "PURP 103 – Purpose and Career: Understanding the Concept of Work",
          "PURP 104 – Purpose and Predestination",
          "PURP 105 – Purpose, Ministry and Calling",
        ],
      },
      {
        slug: "intermediate",
        name: "Intermediate – Purpose Discovery and Clarity",
        modules: [
          "PURP 201 – Discovering Your Purpose",
          "PURP 202 – Understanding and Liberating Your Potential",
          "PURP 203 – How Will You Be Remembered?",
          "PURP 204 – Defining Your Purpose Statement",
          "PURP 205 – Walking in Dominion: Defining Your Transformation Story",
        ],
      },
      {
        slug: "advanced",
        name: "Advanced – Influence and Impact",
        modules: [
          "PURP 301 – Vision Building (Part 1): Understanding Vision",
          "PURP 302 – Vision Building (Part 2): Principles of Vision",
          "PURP 303 – Positioning for Emergence: Manifesting as Sons",
          "PURP 304 – Purpose, Time and Relationships",
          "PURP 305 – Becoming Relevant and Impactful",
        ],
      },
    ],
  },
  {
    slug: "purpose-program-students",
    name: "Purpose Program for Students",
    duration: "1 year",
    structure: "3 levels · 15 modules",
    description:
      "A student curriculum focused on purposeful education, personal development, leadership, service and positive influence.",
    levels: [
      {
        slug: "foundation",
        name: "Foundation – Understanding Purpose",
        modules: [
          "PURP 101 – Understanding Purpose",
          "PURP 102 – Becoming a Person of Value",
          "PURP 103 – Purpose and Career",
          "PURP 104 – Purpose and Predestination",
          "PURP 105 – Living Purposefully",
        ],
      },
      {
        slug: "intermediate",
        name: "Intermediate – Purpose Discovery and Clarity",
        modules: [
          "PURP 201 – Purposeful Planning",
          "PURP 202 – Stewardship of Gifts and Potential",
          "PURP 203 – Purpose and Relationships",
          "PURP 204 – Purpose and Influence",
          "PURP 205 – Building a Purpose Lifestyle",
        ],
      },
      {
        slug: "advanced",
        name: "Advanced – Purpose, Leadership and Impact",
        modules: [
          "PURP 301 – Purpose and Leadership",
          "PURP 302 – Purpose and Service",
          "PURP 303 – Purpose and Resilience",
          "PURP 304 – Purpose and Legacy",
          "PURP 305 – Purpose and Multiplication",
        ],
      },
    ],
  },
  {
    slug: "youlead",
    name: "YouLead!",
    duration: "9 months",
    structure: "3 levels · 12 modules · 48 topics",
    description:
      "Leadership formation through values, intentional actions and practical leadership for community contribution.",
    levels: [
      {
        slug: "values-index",
        name: "Level 1 – Values Index",
        modules: [
          "Choices, Growth, Attitude and Commitment",
          "Relationships, Character, Forgiveness and Self-worth",
          "Responsibility, Courage, Initiative and Priorities",
          "Teachability, Self-discipline, Resilience and Influence",
        ],
      },
      {
        slug: "actions-index",
        name: "Level 2 – Actions Index",
        modules: [
          "Questions, Values, Priorities and Thoughts Influence My Actions",
          "Friends, Experiences, Growth and Pain Influence My Actions",
          "Conversations, Self-image, Habits and Relationships Influence My Actions",
          "Listening, Health, Perspective and Dreams Influence My Actions",
        ],
      },
      {
        slug: "leadership-index",
        name: "Level 3 – Leadership Index",
        modules: [
          "The Definition, Foundation, Heart and Motives of Leadership",
          "Accountability, Teamwork, Passion and Courage in Leadership",
          "Communication, Strengths, Example and Priorities in Leadership",
          "Vision, Practice, Making a Difference and Hope in Leadership",
        ],
      },
    ],
  },
  {
    slug: "purpose-to-peace",
    name: "Purpose-to-Peace",
    duration: "9 modules",
    structure: "3 competency areas · 3 levels of peace leadership",
    description:
      "Peace leadership development across personal transformation, healthy relationships and constructive community engagement.",
    levels: [
      {
        slug: "personal-peace-leadership",
        name: "Personal Peace Leadership – Leading Self",
        modules: [
          "P2P 101 – Knowing Myself: Identity, Self-awareness and Peace",
          "P2P 102 – Discovering My Purpose for Peace",
          "P2P 103 – Character and Ethical Leadership",
        ],
      },
      {
        slug: "relational-peace-leadership",
        name: "Relational Peace Leadership – Leading Relationships",
        modules: [
          "P2P 104 – Leading with Values",
          "P2P 105 – Understanding Peace and Conflict",
          "P2P 201 – Dialogue and Nonviolent Communication",
        ],
      },
      {
        slug: "community-peace-leadership",
        name: "Community Peace Leadership – Leading Communities",
        modules: [
          "P2P 202 – Diversity, Inclusion and Social Cohesion",
          "P2P 203 – Conflict Transformation and Collaborative Problem-Solving",
          "P2P 204 – Community Mobilisation and Peace Advocacy",
        ],
      },
    ],
  },
];
