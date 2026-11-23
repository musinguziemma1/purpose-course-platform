export type AcademicModule = {
  code: string;
  title: string;
  summary: string;
  concepts: [string, string, string, string, string];
};

export type AcademicLevel = {
  slug: string;
  digitalLevelSlug: string;
  courseSlug: string;
  name: string;
  tagline: string;
  introduction: string;
  outcomes: string[];
  weeks: number;
  passMark: number;
  accent: string;
  icon: string;
  modules: AcademicModule[];
};

export type AcademicProgramme = {
  slug: string;
  name: string;
  duration: string;
  structure: string;
  description: string;
  levels: AcademicLevel[];
};

export type AcademicSessionDesign = {
  summary: string;
  focusQuestions: [string, string, string, string, string];
  format: string;
  durationMinutes: number;
};

const academicModule = (
  code: string,
  title: string,
  concepts: AcademicModule["concepts"],
): AcademicModule => ({ code, title, summary: concepts[0], concepts });

export const ACADEMIC_PROGRAMMES: AcademicProgramme[] = [
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
        digitalLevelSlug: "foundation",
        courseSlug: "understanding-purpose",
        name: "Foundation – Understanding Purpose",
        tagline: "Understanding Purpose",
        introduction:
          "Participants establish a coherent understanding of purpose and examine its relationship to identity, value, work, responsibility, calling and service.",
        outcomes: [
          "Explain purpose and distinguish it from roles, ambition and social recognition",
          "Relate identity, character and personal value to purposeful living",
          "Evaluate work, destiny, choice and calling through responsible agency",
          "Develop an evidence-based commitment to intentional living and service",
        ],
        weeks: 5,
        passMark: 80,
        accent: "navy",
        icon: "user",
        modules: [
          academicModule("PURP 101", "Understanding Purpose", [
            "Purpose gives enduring meaning and direction beyond a temporary role or circumstance.",
            "Identity, values and lived experience provide evidence for understanding purpose.",
            "Intentional choices translate purpose from an idea into a way of living.",
            "External expectations should be evaluated rather than adopted as a definition of purpose.",
            "A purposeful life can be demonstrated through coherent decisions, priorities and contribution.",
          ]),
          academicModule("PURP 102", "Becoming a Person of Value", [
            "Personal value is developed through character, integrity, growth and contribution rather than status.",
            "Self-worth and social recognition are related experiences but are not equivalent measures of value.",
            "Reliable attitudes and conduct allow a person to contribute value consistently.",
            "Achievement, wealth and visibility cannot substitute for ethical character.",
            "Growth in responsibility, honesty and service provides evidence of becoming a person of value.",
          ]),
          academicModule("PURP 103", "Purpose and Career: Understanding the Concept of Work", [
            "Work is a field for expressing purpose and contribution, not merely a source of income or status.",
            "Interests, abilities, values and social needs should inform responsible career decisions.",
            "Employment, enterprise and community service can each become forms of purposeful work.",
            "A job title should not be treated as the complete definition of a person's purpose.",
            "Career alignment is demonstrated when work develops capacity and creates responsible value for others.",
          ]),
          academicModule("PURP 104", "Purpose and Predestination", [
            "Belief in destiny should strengthen responsible choice rather than remove personal agency.",
            "Purpose develops through the interaction of conviction, opportunity, circumstance and decision.",
            "Wise action combines faith, reflection, preparation and accountability.",
            "Predestination should not be used to excuse passivity or avoid responsibility for consequences.",
            "Purposeful agency is evidenced by deliberate responses to both opportunities and constraints.",
          ]),
          academicModule("PURP 105", "Purpose, Ministry and Calling", [
            "Calling is a focused expression of purpose through service and responsible contribution.",
            "Ministry includes service beyond formal positions, institutions or religious titles.",
            "Gifts, convictions and community needs help a person discern practical opportunities to serve.",
            "A claim of calling should be tested by character, responsibility and beneficial fruit.",
            "Calling becomes credible through sustained service that strengthens people and communities.",
          ]),
        ],
      },
      {
        slug: "intermediate",
        digitalLevelSlug: "intermediate",
        courseSlug: "purpose-discovery-clarity",
        name: "Intermediate – Purpose Discovery and Clarity",
        tagline: "Purpose Discovery and Clarity",
        introduction:
          "Participants move from conceptual understanding to evidence-based discovery, articulation and personal transformation.",
        outcomes: [
          "Synthesize identity, experience, gifts, convictions and opportunity as purpose evidence",
          "Identify and develop potential through disciplined learning and responsible practice",
          "Articulate a clear, personal and actionable purpose statement",
          "Construct a credible transformation story and legacy commitment",
        ],
        weeks: 5,
        passMark: 80,
        accent: "green",
        icon: "compass",
        modules: [
          academicModule("PURP 201", "Discovering Your Purpose", [
            "Purpose discovery is an evidence-based inquiry into identity, experience, gifts, convictions and contribution.",
            "Repeated patterns across a person's story can reveal enduring concerns and capacities.",
            "Reflection, feedback and practical experiments strengthen purpose clarity.",
            "Purpose should not be borrowed from social pressure or another person's expectations.",
            "A credible purpose hypothesis connects personal evidence with a real group or need to serve.",
          ]),
          academicModule("PURP 202", "Understanding and Liberating Your Potential", [
            "Potential is undeveloped capacity that requires stewardship, practice and opportunity.",
            "Gifts, skills, habits and access each influence how potential becomes useful competence.",
            "Learning plans, feedback and disciplined practice can remove avoidable limits on capacity.",
            "Fear, comparison and passive self-belief can prevent potential from becoming contribution.",
            "Liberated potential is evidenced by growing competence applied responsibly to meaningful work.",
          ]),
          academicModule("PURP 203", "How Will You Be Remembered?", [
            "Legacy is the durable effect of character, relationships, choices and contribution over time.",
            "Everyday decisions accumulate into the way a life influences other people and institutions.",
            "Legacy planning aligns present conduct with the contribution a person hopes to leave.",
            "Temporary recognition should not be confused with lasting beneficial influence.",
            "A credible legacy intention names the people served, the values practised and actions begun now.",
          ]),
          academicModule("PURP 204", "Defining Your Purpose Statement", [
            "A purpose statement expresses identity, audience, contribution and intended transformation with clarity.",
            "Values, gifts, experience and social need provide evidence for each part of the statement.",
            "Peer testing and revision make a purpose statement more specific, truthful and actionable.",
            "Vague aspiration and impressive language should not replace observable contribution.",
            "A strong statement can guide priorities while acknowledging the limits of a person's assignment.",
          ]),
          academicModule("PURP 205", "Walking in Dominion: Defining Your Transformation Story", [
            "Dominion is responsible stewardship and constructive influence rather than control over others.",
            "A transformation story connects past experience, present change and intended contribution.",
            "Honest narrative allows learning to become service for families, organisations and communities.",
            "Influence becomes harmful when power, image or certainty displaces humility and responsibility.",
            "A credible transformation story names evidence of change and the next accountable action.",
          ]),
        ],
      },
      {
        slug: "advanced",
        digitalLevelSlug: "advanced",
        courseSlug: "vision-deployment-impact",
        name: "Advanced – Influence and Impact",
        tagline: "Influence and Impact",
        introduction:
          "Participants translate purpose and clarity into vision, strategic positioning, responsible relationships and measurable contribution.",
        outcomes: [
          "Develop a coherent vision with priorities, milestones and accountable action",
          "Prepare ethically for opportunities to exercise influence",
          "Steward time, relationships and resources in support of purpose",
          "Design and evaluate a practical contribution with sustainable impact",
        ],
        weeks: 5,
        passMark: 85,
        accent: "purple",
        icon: "star",
        modules: [
          academicModule("PURP 301", "Vision Building (Part 1): Understanding Vision", [
            "Vision translates purpose into a clear picture of a preferred and responsible future.",
            "A meaningful vision connects present reality, desired change and the people affected.",
            "Vision becomes useful when it guides decisions, priorities and resource allocation.",
            "A slogan or private aspiration should not be mistaken for a testable vision.",
            "A credible vision can describe a normal future practice and the change it will produce.",
          ]),
          academicModule("PURP 302", "Vision Building (Part 2): Principles of Vision", [
            "Clarity, commitment, preparation, focus and perseverance sustain the pursuit of vision.",
            "Goals and milestones translate a future picture into sequenced, accountable action.",
            "Risk review and adaptation help a vision survive changing conditions without losing purpose.",
            "Activity without priorities, ownership or measures should not be treated as progress.",
            "A viable vision plan identifies actions, owners, resources, dates and evidence of progress.",
          ]),
          academicModule("PURP 303", "Positioning for Emergence: Manifesting as Sons", [
            "Positioning is ethical preparation to carry responsibility when an opportunity to contribute emerges.",
            "Identity, maturity, competence and evidence shape readiness for greater influence.",
            "Mentors, peers, builders and truth-tellers strengthen preparation and accountability.",
            "Visibility and self-promotion should not substitute for character or demonstrated capacity.",
            "Readiness is evidenced by credible work, clear language, teachable posture and responsible relationships.",
          ]),
          academicModule("PURP 304", "Purpose, Time and Relationships", [
            "Time and relationships are finite resources that reveal and shape a person's priorities.",
            "Purposeful scheduling protects important work, rest, learning and service.",
            "Healthy boundaries and mutual accountability help relationships support responsible growth.",
            "Urgency, access or loyalty should not justify neglect, exploitation or chronic overcommitment.",
            "Alignment is evidenced by a realistic calendar and relationships that strengthen shared purpose.",
          ]),
          academicModule("PURP 305", "Becoming Relevant and Impactful", [
            "Relevance is the capacity to respond competently and ethically to real needs and opportunities.",
            "Impact combines purpose, service, innovation, collaboration and responsible influence.",
            "Needs analysis and feedback help a contribution remain useful to the people it intends to serve.",
            "Visibility, activity and personal achievement should not be reported as impact without evidence of change.",
            "Sustainable impact is demonstrated through outcomes, learning, accountability and capacity transferred to others.",
          ]),
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
        digitalLevelSlug: "students-foundation",
        courseSlug: "students-understanding-purpose",
        name: "Foundation – Understanding Purpose",
        tagline: "Understanding Purpose",
        introduction:
          "Students establish age-appropriate foundations for identity, value, purposeful decisions, career exploration and responsible daily conduct.",
        outcomes: [
          "Explain purpose in relation to identity, education and future direction",
          "Recognise personal value beyond performance, possessions and popularity",
          "Make responsible decisions about learning, habits and future preparation",
          "Develop practical commitments for purposeful living at home, school and in community",
        ],
        weeks: 12,
        passMark: 75,
        accent: "navy",
        icon: "book-open",
        modules: [
          academicModule("STU 101", "Understanding Purpose", [
            "Purpose helps students make intentional decisions about who they are becoming and what they can contribute.",
            "Identity, interests, values and aspirations provide early evidence for future direction.",
            "Questions, reflection and responsible experiments help students explore purpose safely.",
            "Peer pressure and external expectations should not define a student's whole future.",
            "Purposeful growth is evidenced by responsible choices in learning, relationships and service.",
          ]),
          academicModule("STU 102", "Becoming a Person of Value", [
            "A student's value is expressed through character, respect, integrity and contribution rather than popularity.",
            "Academic performance is important evidence of effort but is not the full measure of personal worth.",
            "Honesty, responsibility and empathy build trust within families, schools and communities.",
            "Possessions, grades and social approval should not determine how a student treats self or others.",
            "Personal growth is demonstrated through consistent conduct and positive contribution.",
          ]),
          academicModule("STU 103", "Purpose and Career", [
            "Career exploration connects interests, abilities, values, learning and social contribution.",
            "Education and skills development expand the options available for purposeful work.",
            "Research, conversations and practical exposure support informed career decisions.",
            "Income and status should not be the only criteria used to choose a career.",
            "A purposeful career plan identifies learning needs, possible pathways and intended contribution.",
          ]),
          academicModule("STU 104", "Purpose and Predestination", [
            "Beliefs about destiny can coexist with responsibility for present choices and preparation.",
            "Today's habits and decisions influence the opportunities a student can use tomorrow.",
            "Faith, wise counsel and intentional action can work together in future planning.",
            "Predestination should not be used to excuse avoidable neglect or harmful choices.",
            "Responsible agency is demonstrated through disciplined preparation and reflection on consequences.",
          ]),
          academicModule("STU 105", "Living Purposefully", [
            "Purposeful living aligns everyday habits, choices and responsibilities with meaningful goals and values.",
            "Home, school and community each provide opportunities to practise purpose through contribution.",
            "Simple routines and accountability help students sustain constructive behaviour.",
            "Knowing a goal without consistent action should not be confused with purposeful living.",
            "A purposeful lifestyle is evidenced by specific commitments practised over time.",
          ]),
        ],
      },
      {
        slug: "intermediate",
        digitalLevelSlug: "students-intermediate",
        courseSlug: "students-purpose-discovery-clarity",
        name: "Intermediate – Purpose Discovery and Clarity",
        tagline: "Purpose Discovery and Clarity",
        introduction:
          "Students plan intentionally, develop their abilities, build healthy relationships and use influence responsibly.",
        outcomes: [
          "Create realistic goals and action plans informed by purpose",
          "Steward gifts and potential through disciplined development",
          "Build relationships and boundaries that support healthy growth",
          "Practise consistent, constructive influence in school and community",
        ],
        weeks: 12,
        passMark: 75,
        accent: "green",
        icon: "compass",
        modules: [
          academicModule("STU 201", "Purposeful Planning", [
            "Purposeful planning connects direction to realistic goals, priorities, actions and review.",
            "Goals describe intended results while action plans identify the steps, resources and dates required.",
            "Time and resource choices should reflect the student's most important learning and development priorities.",
            "Wishful thinking and overloaded schedules should not be treated as responsible plans.",
            "A credible plan includes a clear goal, sequenced actions, support and evidence of progress.",
          ]),
          academicModule("STU 202", "Stewardship of Gifts and Potential", [
            "Gifts and potential are capacities that require responsible development and constructive use.",
            "Practice, discipline, feedback and continuous learning turn strengths into reliable skills.",
            "Students can use their abilities to support both personal growth and the wellbeing of others.",
            "Neglect, misuse and comparison can prevent gifts from becoming responsible contribution.",
            "Good stewardship is evidenced by a development plan and practical service using growing ability.",
          ]),
          academicModule("STU 203", "Purpose and Relationships", [
            "Relationships can strengthen or undermine identity, decisions, wellbeing and purpose development.",
            "Respect, trust, communication, boundaries and responsibility support healthy relationships.",
            "Students should evaluate peer influence and seek relationships that encourage growth and contribution.",
            "Popularity, control and dependency should not be confused with friendship or support.",
            "Healthy relationships are evidenced by mutual respect, honest communication and safe boundaries.",
          ]),
          academicModule("STU 204", "Purpose and Influence", [
            "Influence is the effect of a person's words, attitudes, decisions and example on others.",
            "Positive influence uses credibility and responsibility to support constructive change.",
            "Students can exercise influence through service, example, encouragement and ethical leadership.",
            "Manipulation, popularity and coercion should not be treated as positive influence.",
            "Responsible influence is evidenced by beneficial choices that respect the agency of other people.",
          ]),
          academicModule("STU 205", "Building a Purpose Lifestyle", [
            "A purpose lifestyle consistently aligns values, habits, relationships and decisions with meaningful contribution.",
            "Accountability and regular reflection help students maintain constructive behaviour across settings.",
            "Challenges should be anticipated through routines, support and realistic recovery plans.",
            "Occasional inspiration should not be confused with a sustainable purposeful lifestyle.",
            "Consistency is evidenced by practical commitments, review and improvement over time.",
          ]),
        ],
      },
      {
        slug: "advanced",
        digitalLevelSlug: "students-advanced",
        courseSlug: "students-purpose-leadership-impact",
        name: "Advanced – Purpose, Leadership and Impact",
        tagline: "Purpose, Leadership and Impact",
        introduction:
          "Students express purpose through self-leadership, service, resilience, legacy and multiplication of positive contribution.",
        outcomes: [
          "Exercise self-leadership grounded in character and responsibility",
          "Design and participate in service responding to a real community need",
          "Use resilient strategies to learn from setbacks and sustain purpose",
          "Build a positive legacy by developing and enabling other people",
        ],
        weeks: 12,
        passMark: 80,
        accent: "purple",
        icon: "star",
        modules: [
          academicModule("STU 301", "Purpose and Leadership", [
            "Leadership is responsible influence directed towards constructive shared purposes.",
            "Self-leadership, values and character establish credibility before formal responsibility.",
            "Students can lead through initiative, example, service and ethical decision-making.",
            "A title, popularity or control should not be confused with responsible leadership.",
            "Purposeful leadership is evidenced by beneficial action, accountability and respect for others.",
          ]),
          academicModule("STU 302", "Purpose and Service", [
            "Service uses personal ability and shared effort to respond responsibly to the needs of others.",
            "Empathy, humility and community consultation improve the relevance of a service response.",
            "Students can identify needs, plan realistic activities and evaluate their contribution.",
            "Recognition-seeking and unrequested intervention should not define service.",
            "Credible service is evidenced by participation, learning and beneficial results for the intended community.",
          ]),
          academicModule("STU 303", "Purpose and Resilience", [
            "Resilience is the capacity to adapt, learn and continue constructive action through difficulty.",
            "Perseverance, support, reflection and flexible problem-solving strengthen resilient responses.",
            "Setbacks can become sources of learning when students evaluate causes and adjust their approach.",
            "Resilience should not mean tolerating harm, hiding distress or refusing appropriate help.",
            "A resilient response is evidenced by safe support, learning and a realistic next action.",
          ]),
          academicModule("STU 304", "Purpose and Legacy", [
            "Legacy is built through repeated choices, character, relationships, service and responsible contribution.",
            "Students begin shaping long-term influence through the conduct they practise today.",
            "A legacy intention can guide decisions about learning, relationships and community participation.",
            "Temporary attention and individual success should not be confused with positive legacy.",
            "A credible legacy plan names values, people served and actions that can begin now.",
          ]),
          academicModule("STU 305", "Purpose and Multiplication", [
            "Multiplication extends impact by helping other people recognise, develop and use their abilities.",
            "Teaching, mentoring, collaboration and opportunity creation enable shared growth.",
            "Purposeful leaders transfer knowledge and responsibility rather than keeping contribution dependent on them.",
            "Personal achievement without development of others should not be described as multiplication.",
            "Multiplication is evidenced when another person grows in competence, confidence and responsible action.",
          ]),
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
        digitalLevelSlug: "youlead-values",
        courseSlug: "youlead-values-index",
        name: "Level 1 – Values Index",
        tagline: "Values Index",
        introduction:
          "Participants examine the values and disciplines that shape character, self-leadership and trustworthy relationships.",
        outcomes: [
          "Evaluate personal choices, attitudes and commitments through explicit values",
          "Practise character, forgiveness and healthy self-worth in relationships",
          "Demonstrate responsibility, courage, initiative and clear priorities",
          "Use teachability, discipline and resilience to sustain positive influence",
        ],
        weeks: 12,
        passMark: 75,
        accent: "navy",
        icon: "heart",
        modules: [
          academicModule("YL 101", "Choices, Growth, Attitude and Commitment", [
            "Choices, growth orientation, attitude and commitment jointly shape personal development and leadership.",
            "A growth orientation treats feedback and experience as opportunities for responsible improvement.",
            "Constructive attitudes help people respond to challenge without denying difficulty.",
            "Verbal intention without consistent action should not be counted as commitment.",
            "Values become credible when repeated choices demonstrate learning and sustained responsibility.",
          ]),
          academicModule("YL 102", "Relationships, Character, Forgiveness and Self-worth", [
            "Healthy relationships are strengthened by character, forgiveness and a secure sense of self-worth.",
            "Character establishes consistency and credibility across private and public conduct.",
            "Forgiveness can release resentment while retaining truth, boundaries and accountability.",
            "Self-worth should not depend on control, approval or comparison with others.",
            "Relational maturity is evidenced by respect, repair, boundaries and responsible communication.",
          ]),
          academicModule("YL 103", "Responsibility, Courage, Initiative and Priorities", [
            "Responsibility, courage, initiative and priorities enable constructive ownership of leadership challenges.",
            "Courage supports ethical action despite uncertainty, discomfort or social pressure.",
            "Initiative begins appropriate action while remaining accountable to people and context.",
            "Urgency should not displace responsibility, consultation or important priorities.",
            "Leadership ownership is evidenced by a clear decision, justified priority and completed next action.",
          ]),
          academicModule("YL 104", "Teachability, Self-discipline, Resilience and Influence", [
            "Teachability, self-discipline and resilience create the conditions for trustworthy influence.",
            "Feedback becomes useful when it is examined, applied and reviewed rather than merely received.",
            "Self-discipline turns important intentions into consistent behaviour and preparation.",
            "Influence should not be pursued through image, pressure or resistance to correction.",
            "Positive influence is evidenced by learning, dependable action and constructive responses to setbacks.",
          ]),
        ],
      },
      {
        slug: "actions-index",
        digitalLevelSlug: "youlead-actions",
        courseSlug: "youlead-actions-index",
        name: "Level 2 – Actions Index",
        tagline: "Actions Index",
        introduction:
          "Participants analyse the internal, relational and contextual influences that shape behaviour and learn to act more intentionally.",
        outcomes: [
          "Analyse how questions, values, priorities and thoughts influence decisions",
          "Evaluate the effects of peers, experience, growth and pain on behaviour",
          "Strengthen self-image, habits, conversations and relationships",
          "Use listening, wellbeing, perspective and aspiration to support responsible action",
        ],
        weeks: 12,
        passMark: 75,
        accent: "green",
        icon: "compass",
        modules: [
          academicModule("YL 201", "Questions, Values, Priorities and Thoughts Influence My Actions", [
            "Questions, values, priorities and thought patterns shape interpretation, decisions and action.",
            "Constructive questions widen understanding and clarify responsibility before action.",
            "Priorities become meaningful when time and behaviour reflect stated values.",
            "Unexamined assumptions should not be allowed to govern important decisions.",
            "Intentional action is evidenced by a decision that can be traced to explicit values and priorities.",
          ]),
          academicModule("YL 202", "Friends, Experiences, Growth and Pain Influence My Actions", [
            "Peers, experience, growth and pain can each influence present behaviour and future decisions.",
            "Peer influence should be evaluated by its effects on values, wellbeing and responsibility.",
            "Reflection and support can help painful experience become learning rather than repeated harm.",
            "Past experience should not be treated as an unchangeable command for present action.",
            "Growth is evidenced when a person recognises an influence and chooses a more responsible response.",
          ]),
          academicModule("YL 203", "Conversations, Self-image, Habits and Relationships Influence My Actions", [
            "Conversations, self-image, habits and relationships reinforce patterns of behaviour over time.",
            "Language received and repeated can shape confidence, expectations and decision-making.",
            "Healthy habits and relationships can be designed to support values-consistent action.",
            "A negative self-image should not be accepted as an objective or permanent identity.",
            "Behaviour change is evidenced through revised self-talk, supportive relationships and repeated new habits.",
          ]),
          academicModule("YL 204", "Listening, Health, Perspective and Dreams Influence My Actions", [
            "Listening, wellbeing, perspective and aspiration influence the quality and direction of action.",
            "Active listening improves understanding and reduces avoidable conflict or misjudgment.",
            "Physical and emotional wellbeing affect capacity for attention, responsibility and decision-making.",
            "Dreams should not justify neglect of health, evidence or the perspectives of others.",
            "Responsible aspiration is evidenced by attentive relationships, healthy practices and practical next steps.",
          ]),
        ],
      },
      {
        slug: "leadership-index",
        digitalLevelSlug: "youlead-leadership",
        courseSlug: "youlead-leadership-index",
        name: "Level 3 – Leadership Index",
        tagline: "Leadership Index",
        introduction:
          "Participants integrate values and actions into responsible influence, teamwork, communication, vision and community contribution.",
        outcomes: [
          "Explain leadership as values-grounded service and influence",
          "Use accountability, teamwork, passion and courage in shared work",
          "Communicate effectively while recognising strengths and leading by example",
          "Develop a prepared, hopeful leadership response to a community challenge",
        ],
        weeks: 12,
        passMark: 80,
        accent: "purple",
        icon: "star",
        modules: [
          academicModule("YL 301", "The Definition, Foundation, Heart and Motives of Leadership", [
            "Leadership is responsible influence grounded in values, service, character and ethical motives.",
            "Servant leadership directs power and responsibility towards the wellbeing and growth of others.",
            "Leaders should examine motives because private intention affects public decision and credibility.",
            "Position, privilege and attention should not be treated as the purpose of leadership.",
            "Responsible leadership is evidenced by values-consistent choices that serve a shared purpose.",
          ]),
          academicModule("YL 302", "Accountability, Teamwork, Passion and Courage in Leadership", [
            "Accountability, teamwork, passion and courage sustain responsible collective leadership.",
            "Accountability accepts answerability for decisions, conduct, learning and outcomes.",
            "Teamwork coordinates diverse strengths, roles and communication around a shared goal.",
            "Passion and courage should not excuse poor preparation, domination or avoidance of review.",
            "Effective teamwork is evidenced by clear roles, honest review and completed shared commitments.",
          ]),
          academicModule("YL 303", "Communication, Strengths, Example and Priorities in Leadership", [
            "Communication, strengths, personal example and priorities enable leaders to guide collective action.",
            "Effective communication creates shared understanding through clarity, listening and feedback.",
            "Recognising strengths helps distribute responsibility and develop other people.",
            "Instructions without personal example or consistent priorities weaken leadership credibility.",
            "Leadership effectiveness is evidenced by aligned understanding, responsible roles and values-consistent conduct.",
          ]),
          academicModule("YL 304", "Vision, Practice, Making a Difference and Hope in Leadership", [
            "Vision, preparation, contribution and hope give leadership direction and social purpose.",
            "Practice and preparation develop the competence required to carry leadership responsibility.",
            "Hope communicates a credible possibility and mobilises constructive action during difficulty.",
            "Optimism without evidence, preparation or participation should not be presented as leadership hope.",
            "Leadership impact is evidenced by a prepared initiative that engages people and addresses a real challenge.",
          ]),
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
        digitalLevelSlug: "peace-personal",
        courseSlug: "purpose-to-peace-personal",
        name: "Personal Peace Leadership – Leading Self",
        tagline: "Leading Self",
        introduction:
          "Participants build personal peace leadership through identity, self-awareness, purpose, character and ethical responsibility.",
        outcomes: [
          "Use self-awareness to understand personal responses to conflict",
          "Connect personal purpose and abilities to responsible peace contribution",
          "Apply integrity, fairness and accountability to ethical leadership decisions",
          "Develop a personal peace leadership commitment grounded in behaviour",
        ],
        weeks: 9,
        passMark: 75,
        accent: "navy",
        icon: "heart",
        modules: [
          academicModule("P2P 101", "Knowing Myself: Identity, Self-awareness and Peace", [
            "Self-awareness helps peace leaders understand how identity, belief, emotion and experience shape behaviour.",
            "Recognising strengths, limits and triggers supports responsible responses to difficult situations.",
            "Reflection and feedback can interrupt harmful patterns before they escalate conflict.",
            "Self-knowledge should not become self-justification or avoidance of accountability.",
            "Personal peace leadership is evidenced by an identified pattern and a practised constructive response.",
          ]),
          academicModule("P2P 102", "Discovering My Purpose for Peace", [
            "Purpose for peace connects personal gifts, values, experience and influence to constructive peacebuilding.",
            "Peace contribution begins with personal responsibility and can occur outside formal institutions.",
            "Community needs and affected voices should inform the design of peace action.",
            "Good intentions should not replace consultation, competence or ethical responsibility.",
            "A credible purpose-for-peace statement names the issue, people served, contribution and next action.",
          ]),
          academicModule("P2P 103", "Character and Ethical Leadership", [
            "Ethical peace leadership is grounded in honesty, integrity, fairness and responsibility.",
            "Character shapes how leaders use power, make decisions and build or damage trust.",
            "Ethical analysis considers duties, affected people, consequences and accountable alternatives.",
            "Personal interest, prejudice and expediency should not override human dignity or responsibility.",
            "Ethical credibility is evidenced by transparent reasoning and consistent conduct under pressure.",
          ]),
        ],
      },
      {
        slug: "relational-peace-leadership",
        digitalLevelSlug: "peace-relational",
        courseSlug: "purpose-to-peace-relational",
        name: "Relational Peace Leadership – Leading Relationships",
        tagline: "Leading Relationships",
        introduction:
          "Participants practise values-based relationships, conflict analysis, dialogue, active listening and nonviolent communication.",
        outcomes: [
          "Demonstrate respect, fairness, empathy and responsibility across difference",
          "Distinguish positive peace from the absence of overt violence",
          "Analyse causes, effects and escalation patterns in interpersonal conflict",
          "Facilitate dialogue using active listening and nonviolent communication",
        ],
        weeks: 9,
        passMark: 75,
        accent: "green",
        icon: "users",
        modules: [
          academicModule("P2P 104", "Leading with Values", [
            "Values such as respect, honesty, fairness, empathy and responsibility guide peaceful relationships.",
            "Values become trustworthy when behaviour remains consistent during disagreement or pressure.",
            "Respectful conduct protects dignity while allowing honest difference and accountability.",
            "Professed values should not be used to conceal discrimination, manipulation or harmful conduct.",
            "Values-based leadership is evidenced by a difficult interaction handled with fairness and respect.",
          ]),
          academicModule("P2P 105", "Understanding Peace and Conflict", [
            "Positive peace includes just, trusting and inclusive conditions rather than only the absence of violence.",
            "Conflict arises from differences, unmet needs, interests, relationships, structures and interpretations.",
            "Conflict analysis examines actors, causes, dynamics, harms and opportunities for constructive response.",
            "Disagreement should not automatically be labelled destructive or suppressed without analysis.",
            "Constructive response is evidenced by reduced harm and improved capacity to address underlying issues.",
          ]),
          academicModule("P2P 201", "Dialogue and Nonviolent Communication", [
            "Dialogue seeks mutual understanding through listening, inquiry, respectful expression and engagement across difference.",
            "Active listening attends to content, emotion, need and perspective before responding.",
            "Nonviolent communication distinguishes observation, feeling, need and request.",
            "Dialogue should not become coerced agreement, hidden accusation or avoidance of unequal power.",
            "Constructive communication is evidenced by clearer understanding, specific requests and reduced escalation.",
          ]),
        ],
      },
      {
        slug: "community-peace-leadership",
        digitalLevelSlug: "peace-community",
        courseSlug: "purpose-to-peace-community",
        name: "Community Peace Leadership – Leading Communities",
        tagline: "Leading Communities",
        introduction:
          "Participants apply personal and relational peace leadership to inclusion, conflict transformation, collaborative problem-solving and community action.",
        outcomes: [
          "Promote diversity, inclusion and social cohesion through meaningful participation",
          "Distinguish conflict transformation from short-term settlement",
          "Use stakeholder analysis and collaborative problem-solving for community challenges",
          "Design an ethical community mobilisation and peace advocacy initiative",
        ],
        weeks: 9,
        passMark: 80,
        accent: "purple",
        icon: "globe",
        modules: [
          academicModule("P2P 202", "Diversity, Inclusion and Social Cohesion", [
            "Diversity, inclusion and social cohesion strengthen communities when difference is respected and participation is meaningful.",
            "Exclusion, discrimination and prejudice damage trust, safety and shared belonging.",
            "Inclusive leadership identifies barriers and creates fair routes into decision-making.",
            "Symbolic presence without voice, access or influence should not be reported as inclusion.",
            "Social cohesion is evidenced by participation, trust and cooperation across relevant differences.",
          ]),
          academicModule("P2P 203", "Conflict Transformation and Collaborative Problem-Solving", [
            "Conflict transformation addresses relationships, structures and narratives that sustain conflict beyond an immediate dispute.",
            "Shared analysis helps stakeholders distinguish symptoms, causes, harms and leverage points.",
            "Collaborative problem-solving involves affected people in designing, testing and reviewing responses.",
            "A quick settlement should not be treated as transformation when underlying harms remain unchanged.",
            "Sustainable progress is evidenced by improved relationships, fairer conditions and capacity to manage future conflict.",
          ]),
          academicModule("P2P 204", "Community Mobilisation and Peace Advocacy", [
            "Community mobilisation coordinates local participation, leadership and resources around a shared peace concern.",
            "Peace advocacy uses evidence, communication and collective voice to influence attitudes, practices and decisions.",
            "Stakeholder mapping clarifies interests, influence, responsibilities and appropriate forms of participation.",
            "Mobilisation should not exploit fear, exclude affected groups or promise outcomes beyond local capacity.",
            "A credible peace initiative identifies the issue, participants, objectives, activities, safeguards and expected results.",
          ]),
        ],
      },
    ],
  },
];

export function academicModuleKey(programmeSlug: string, levelSlug: string, moduleCode: string) {
  return `${programmeSlug}:${levelSlug}:${moduleCode.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
}

const SESSION_FORMATS = [
  "Concept seminar + diagnostic reflection",
  "Case analysis + facilitated dialogue",
  "Applied workshop + peer consultation",
  "Guided reflection + action planning",
] as const;

const withoutTerminalPunctuation = (value: string) => value.replace(/[.!?]+$/, "");

export function academicSessionDesign(
  module: AcademicModule,
  moduleIndex: number,
  moduleCount: number,
): AcademicSessionDesign {
  const title = module.title.toLowerCase();
  const concepts = module.concepts.map(withoutTerminalPunctuation);
  const format =
    moduleIndex === moduleCount - 1
      ? "Integration studio + peer-reviewed action plan"
      : SESSION_FORMATS[moduleIndex % SESSION_FORMATS.length];

  return {
    summary: `${module.summary} In this facilitated 90-minute session, learners clarify the module's five aligned principles, test them against a realistic case, evaluate ethical consequences and translate the learning into an evidence-based action commitment. Particular attention is given to ${concepts[1].toLowerCase()} and ${concepts[2].toLowerCase()}.`,
    focusQuestions: [
      `How should ${title} be defined, and which common misconception must be rejected?`,
      `What evidence supports or challenges this principle: ${concepts[0]}?`,
      `How would you apply this principle in a realistic personal, educational, organisational or community context: ${concepts[1]}?`,
      `Which ethical risk appears when this issue is misunderstood or neglected: ${concepts[3]}?`,
      `What accountable action would demonstrate this outcome in practice: ${concepts[4]}?`,
    ],
    format,
    durationMinutes: 90,
  };
}
