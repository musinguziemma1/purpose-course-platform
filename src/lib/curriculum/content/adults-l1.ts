import type { ModuleContent } from "../types";
import { lesson, q } from "./helpers";

/** Purpose Program for Adults · Level 1: Foundation – Understanding Purpose. */
export const ADULTS_LEVEL_1: Record<string, ModuleContent> = {
  "PURP 101": {
    lessons: [
      lesson({
        hook: "Most adults can describe their job, their responsibilities and their worries in detail. Far fewer can say, in one clear sentence, why they are here. That silence is not failure. It is the place where this programme begins.",
        teaching: [
          "Purpose is the reason for which something exists: the intended contribution a life is designed to make. It is not the same as a goal, which you can finish, or a role, which you can lose. A goal is an event; purpose is a direction. A role describes what you do in a season; purpose describes why you do it and for whom.",
          "A purposeful life has three working parts. Identity answers who you are. Meaning answers why your life matters. Direction answers where you are going and what you will contribute along the way. When all three are present, ordinary days stop feeling random, because each decision can be weighed against something larger than convenience.",
        ],
        inPractice: [
          "A nurse who sees her shifts as caring for people at their most fragile works the same hours as a colleague who only counts the time, but she brings different energy and attention.",
          "A father who understands his purpose as raising responsible, confident children makes different choices about his evenings and weekends.",
          "When an opportunity arrives, a person with a clear purpose asks \"Does this move me in my direction?\", not only \"Does this pay?\"",
        ],
        insight: "Purpose is not something you invent at the end of life; it is the thread that gives every season its meaning.",
        practice: "Write a first, unpolished answer to the question \"Why do I exist?\" in three sentences. Do not aim for perfection. Date it and keep it: you will return to it at the end of this level and see how far your thinking has moved.",
      }),
      lesson({
        hook: "Think back over the last seven days. How many of your hours did you choose on purpose, and how many simply happened to you? Many capable adults discover that most of their week was a reaction to other people's urgency.",
        teaching: [
          "Passive existence is life on autopilot. Decisions are made by habit, pressure or fear, and the days are filled with survival: paying bills, answering demands and recovering from exhaustion. It is not laziness. Many passive lives are extremely busy. The difference is that the person is being carried by events rather than steering through them.",
          "Intentional living means deciding in advance what matters and arranging time, energy and money around it. It does not remove responsibilities; it changes how you hold them. The intentional person still works, still serves the family and still faces hardship, but asks \"What am I building through this?\" and acts on the answer.",
        ],
        inPractice: [
          "Planning tomorrow's three most important tasks before sleeping, instead of letting the morning's messages set the agenda.",
          "Saying no to a commitment that fills your diary but does not fit your values, even when you could technically fit it in.",
          "Reviewing each month's spending against your priorities and adjusting deliberately rather than by accident.",
        ],
        insight: "Busyness is not proof of purpose; direction is.",
        practice: "Track one ordinary day in half-hour blocks. Mark each block R (reaction) or I (intention). Count both, then choose one block for tomorrow that you will turn from R to I.",
      }),
      lesson({
        hook: "If someone asked you to describe yourself without mentioning your job title, your family role or your possessions, what would you say? The difficulty most of us feel shows how much of our identity we have borrowed from outside.",
        teaching: [
          "Identity is your settled understanding of who you are: your core values, your natural strengths, your convictions and your story. Purpose grows out of identity the way fruit grows out of a tree. When identity is borrowed from status, other people's approval or a single role, purpose becomes fragile. Lose the job or the approval, and the sense of meaning collapses with it.",
          "Meaning is the bridge between identity and direction. You find it where your values meet a real need you care about. Direction follows: once you know who you are and what matters to you, you can choose where to invest your life. Self-understanding is therefore not self-absorption. It is the groundwork for serving others well.",
        ],
        inPractice: [
          "Naming your top five values (for example faith, family, honesty, excellence, generosity) and checking whether your calendar reflects them.",
          "Asking three trusted people what strengths they consistently see in you, and noticing where their answers agree.",
          "Recognising that a painful chapter of your story may be the source of the compassion that now drives you.",
        ],
        insight: "You cannot live on purpose while living as someone else.",
        practice: "List your five core values and three natural strengths. Beside each, write one recent example of when you acted on it. Where you cannot find an example, note what that tells you.",
      }),
      lesson({
        hook: "Many people already sense what they are meant to do. What stops them is rarely ignorance. It is the quiet voices: \"Who do you think you are?\", \"What will people say?\", \"It's too late for me.\"",
        teaching: [
          "Barriers to purpose fall into four common groups. Fear of failure, rejection or the unknown keeps people in familiar but empty places. Comparison makes another person's path the measure of yours. Societal pressure from family, culture or peers can push you towards a life that looks respectable but is not yours. Limiting mindsets, beliefs formed in past disappointment, quietly decide what you will never attempt.",
          "Barriers lose power when they are named. Fear becomes manageable when you break the next step into something small enough to take this week. Comparison weakens when you remember that you are running a different race. Pressure can be honoured respectfully without being obeyed blindly. Limiting beliefs can be tested against evidence instead of accepted as facts.",
        ],
        inPractice: [
          "Writing down the exact sentence your fear says, then writing the evidence for and against it.",
          "Unfollowing or limiting the accounts that make you feel behind, and replacing them with sources that build you.",
          "Having one honest, respectful conversation with a family member about a direction you feel called to.",
        ],
        insight: "A barrier you can name is a barrier you can begin to move.",
        practice: "Identify your single biggest barrier to purpose. Write it as a sentence, write where it came from, and write one small action this week that contradicts it.",
      }),
      lesson({
        hook: "Purpose is not sustained by one inspiring moment. It is sustained by what you do on an ordinary Tuesday, when no one is watching and you do not feel especially inspired.",
        teaching: [
          "Intentionality is built on two foundations: mindset and routine. The mindset shift is from \"What happens to me?\" to \"What will I make of what happens?\" It moves you from victim to steward. Routines are the structures that carry that mindset when emotion fades: regular reflection, planning, learning and service.",
          "Small daily disciplines matter more than occasional grand gestures. Ten minutes of morning reflection, a weekly review of your priorities and a monthly conversation with a mentor or accountability partner will move you further over a year than a single dramatic resolution. Purposeful people are not those with the most motivation, but those who have built a life that keeps them pointed in the right direction.",
        ],
        inPractice: [
          "A daily anchor: ten quiet minutes each morning to pray or reflect, read and choose the day's priorities.",
          "A weekly review: thirty minutes on Sunday evening to look back, give thanks, learn and plan the week ahead.",
          "An accountability partner: one person you meet monthly who will ask the hard questions about your direction.",
        ],
        insight: "Routines are how a decision you made once becomes a life you live daily.",
        practice: "Design your personal \"intentionality routine\": one daily habit, one weekly habit and one monthly habit. Write when, where and for how long you will practise each, and start the daily habit tomorrow.",
      }),
    ],
    quiz: [
      q(
        "Which statement best describes purpose as this module defines it?",
        [
          "A long-term goal that can be completed and ticked off",
          "The intended contribution a life is designed to make, which gives direction to every season",
          "The job title or role a person currently holds",
          "A feeling of happiness that comes and goes",
        ],
        1,
        "Purpose is a direction, not an event or a role. Goals can be completed and roles can be lost, but purpose gives meaning across every season.",
      ),
      q(
        "A manager works long hours, answers every request immediately and feels constantly exhausted, but cannot say what they are building. This is best described as:",
        ["Intentional living", "Purposeful ambition", "Passive existence despite being busy", "Healthy work ethic"],
        2,
        "Passive existence is not the same as laziness. A very busy life can still be reactive, carried by other people's urgency rather than steered by chosen priorities.",
      ),
      q(
        "Why does purpose become fragile when identity is borrowed from status or approval?",
        [
          "Because status and approval can be lost, and meaning collapses with them",
          "Because status always leads to pride",
          "Because people with status cannot have purpose",
          "Because approval is never genuine",
        ],
        0,
        "Purpose grows out of identity. When identity rests on things outside you, losing them removes the foundation your sense of meaning was built on.",
      ),
      q(
        "Which of the following is a limiting mindset rather than an external barrier?",
        [
          "A family expecting you to take over the family business",
          "A community that values only certain professions",
          "Social media that constantly shows other people's success",
          "The belief, formed after a past failure, that \"people like me never succeed\"",
        ],
        3,
        "Limiting mindsets are internal beliefs formed in past disappointment. The other options describe external pressures and comparison.",
      ),
      q(
        "According to the module, what sustains purposeful living over time?",
        [
          "Waiting for strong motivation before acting",
          "One dramatic life-changing resolution",
          "A mindset of stewardship carried by simple daily, weekly and monthly routines",
          "Avoiding all responsibilities that do not feel meaningful",
        ],
        2,
        "Motivation fades. Routines such as daily reflection, weekly review and monthly accountability keep a person pointed in the right direction.",
      ),
    ],
    exam: [
      q(
        "Grace has achieved every goal she set ten years ago: a degree, a promotion and a house. Yet she feels empty. What does PURP 101 suggest is missing?",
        [
          "More ambitious goals",
          "A sense of purpose that connects identity, meaning and direction beyond completed goals",
          "A different job with a higher salary",
          "Less time spent reflecting",
        ],
        1,
        "Goals are events; purpose is a direction. Grace has completed goals but lacks the thread of identity, meaning and direction that makes them significant.",
      ),
      q(
        "Which practice most directly turns a reactive week into an intentional one?",
        [
          "Answering every message as soon as it arrives",
          "Taking on more commitments to stay productive",
          "Choosing each day's most important tasks in advance and protecting time for them",
          "Waiting for a quieter season of life to plan",
        ],
        2,
        "Intentional living means deciding in advance what matters and arranging time around it, rather than letting the day's demands set the agenda.",
      ),
      q(
        "A participant says, \"I know what I should do, but my family expects something else.\" Which response reflects the module's guidance on societal pressure?",
        [
          "Honour the family respectfully while still taking ownership of your direction",
          "Ignore the family completely",
          "Always obey family expectations, whatever your convictions",
          "Wait until the family changes its mind before acting",
        ],
        0,
        "Pressure can be honoured respectfully without being obeyed blindly. Purpose requires ownership of your direction, handled with respect.",
      ),
      q(
        "Which combination best represents the \"foundations of intentionality\"?",
        [
          "Inspiration and talent",
          "Wealth and connections",
          "Luck and timing",
          "A stewardship mindset and consistent routines",
        ],
        3,
        "The module names mindset (from victim to steward) and routine (daily, weekly, monthly practices) as the foundations that carry intentional living.",
      ),
    ],
  },

  "PURP 102": {
    lessons: [
      lesson({
        hook: "Two people walk into a room. One arrives in an expensive car with a long title; the other arrives quietly and is known by everyone as the one you can trust. Which of them is the person of value? Our culture often answers too quickly.",
        teaching: [
          "External status is what other people can see and measure: wealth, titles, possessions, connections and public applause. It is not wrong to have these things, but they are not the same as worth. Status can be inherited, bought, borrowed or lost overnight. When we measure people by it, we flatter the powerful, overlook the humble and eventually measure ourselves the same way.",
          "True worth is intrinsic. Every person carries dignity simply by being human, and personal value grows from character and contribution: what you are and what you add to others. A person of value is someone whose presence makes situations better, whose word can be relied on and whose influence outlasts any title. This kind of worth cannot be taken from you by a market crash or a change of government.",
        ],
        inPractice: [
          "Noticing how you treat a cleaner, a security guard or a junior colleague compared with how you treat a director.",
          "Refusing to inflate your achievements or possessions to win respect in a conversation.",
          "Celebrating people in your family or team for their character, not only for their results.",
        ],
        insight: "Status is what people see; value is what people can depend on.",
        practice: "Write down how you have measured your own worth over the past year. Circle anything that depends on other people's opinion, and rewrite one of those measures in terms of character or contribution.",
      }),
      lesson({
        hook: "When you need someone to keep a secret, look after your children or handle money on your behalf, you do not choose the most famous person you know. You choose the one with character. That instinct reveals what value really is.",
        teaching: [
          "This module names five pillars of personal value. Integrity means your private life and public words match. Reliability means you do what you said you would do, when you said you would do it. Empathy means you take other people's experience seriously. Accountability means you own your mistakes instead of hiding or blaming. Competence means you are good at what you do and keep improving.",
          "The pillars hold each other up. Competence without integrity becomes dangerous; integrity without competence becomes ineffective; empathy without accountability becomes sentimental. A person of value works on all five, knowing that a weakness in one will eventually weaken the others. None of them depends on talent or wealth, so every person can build them.",
        ],
        inPractice: [
          "Integrity: returning the extra change a shopkeeper gave you by mistake.",
          "Reliability: arriving at a meeting on time and prepared, even when it is an informal one.",
          "Accountability: telling your team, \"That mistake was mine; here is how I will fix it.\"",
        ],
        insight: "Character is the part of you that people can build on.",
        practice: "Score yourself from 1 to 5 on each pillar: integrity, reliability, empathy, accountability and competence. Ask one trusted person to score you as well, then choose the pillar with the biggest gap to strengthen this month.",
      }),
      lesson({
        hook: "Trust is rarely destroyed by one dramatic betrayal. More often it erodes through small things: a careless comment, a sarcastic reply, a job half done, a promise casually forgotten.",
        teaching: [
          "Attitude is the posture of the heart that shows up in behaviour. It is visible in how you speak, how you respond to correction, how you handle disappointment and how you treat people who can do nothing for you. Conduct is attitude made concrete: punctuality, courtesy, work ethic, and the way you speak about people when they are not present.",
          "Every interaction either deposits trust or withdraws it. Speech that encourages, work that is done thoroughly and a teachable response to feedback are deposits. Gossip, complaining, shortcuts and defensiveness are withdrawals. Over time the balance becomes your reputation, and your reputation determines the doors that open to you and the influence you are trusted with.",
        ],
        inPractice: [
          "Choosing to respond to criticism with \"Thank you, help me understand\" rather than defending yourself immediately.",
          "Refusing to join a conversation that runs down an absent colleague.",
          "Finishing an unglamorous task to the same standard as a visible one.",
        ],
        insight: "Your daily conduct is writing the reference that others will one day give about you.",
        practice: "For three days, notice your speech. Each evening, note one sentence that built trust and one that may have eroded it. On the third evening, write the habit you will change.",
      }),
      lesson({
        hook: "The person you will be in five years is being shaped by what you read, who you spend time with and how you respond to discomfort today. Growth does not happen by accident in adult life; it has to be chosen.",
        teaching: [
          "Lifelong personal growth rests on three practices. Discipline is the ability to do what is right and necessary even when you do not feel like it. Emotional maturity is the ability to recognise and manage your emotions so that they inform your decisions without controlling them. Continuous learning is the humility to keep acquiring knowledge and skill, recognising that you have not arrived.",
          "Many adults stop growing once they reach a stable job or position. Yet the world keeps changing, and the people who remain valuable are those who keep developing. Growth also requires feedback. A person who cannot receive correction cannot grow, because they cannot see their own blind spots.",
        ],
        inPractice: [
          "Reading one book or completing one short course each quarter in an area connected to your purpose.",
          "Pausing before replying when you are angry, and naming the emotion before you act on it.",
          "Asking a mentor every few months, \"What is one thing I could do better?\"",
        ],
        insight: "The day you stop growing is the day your value begins to shrink.",
        practice: "Write a 90-day growth plan with three parts: one discipline you will build, one emotional pattern you will work on and one area you will study. Share it with someone who will ask you about it.",
      }),
      lesson({
        hook: "People often ask, \"How can I find more opportunities to serve?\" A better question is, \"Am I becoming the kind of person opportunities look for?\"",
        teaching: [
          "Value creation is the link between who you are and what you can give. As you build character, competence and maturity on the inside, you become able to carry more responsibility on the outside. Opportunities to lead, serve and influence tend to find people who are trustworthy and prepared, because others feel safe placing responsibility in their hands.",
          "This is why becoming a person of value is not a private self-improvement project. It is fuel for purpose. Your growth multiplies your capacity to help your family, your workplace and your community. Each new skill and each strengthened virtue becomes a gift you can offer to someone else.",
        ],
        inPractice: [
          "A teacher who keeps learning becomes the colleague others turn to for guidance and is invited to mentor new staff.",
          "A trader known for honest scales and fair prices gains loyal customers and the trust of the local business association.",
          "A volunteer who is consistently reliable is the first one asked to lead the next community initiative.",
        ],
        insight: "Become valuable on the inside, and you will be useful on the outside.",
        practice: "Identify one person or group you want to serve better. Write down the quality or skill that would make the greatest difference to them, and one step you will take this week to develop it.",
      }),
    ],
    quiz: [
      q(
        "What is the key difference between personal value and external status?",
        [
          "Status comes from character, while value comes from wealth",
          "There is no real difference between them",
          "Value is intrinsic and built through character and contribution, while status depends on outside measures that can be lost",
          "Value can only be earned through public recognition",
        ],
        2,
        "Status rests on outside measures such as wealth and titles that can disappear. Personal value comes from dignity, character and contribution.",
      ),
      q(
        "Which list matches the five pillars of personal value named in this module?",
        [
          "Integrity, reliability, empathy, accountability and competence",
          "Wealth, titles, influence, connections and fame",
          "Talent, beauty, intelligence, luck and timing",
          "Popularity, confidence, charm, ambition and speed",
        ],
        0,
        "The module names integrity, reliability, empathy, accountability and competence as the pillars of personal value.",
      ),
      q(
        "According to the lesson on attitude and conduct, how is trust usually lost?",
        [
          "Only through a single dramatic betrayal",
          "Through small, repeated withdrawals such as gossip, shortcuts and defensiveness",
          "Only when someone breaks the law",
          "Trust cannot be lost once it is earned",
        ],
        1,
        "Every interaction deposits or withdraws trust. Small, repeated withdrawals wear down a reputation over time.",
      ),
      q(
        "Why does the module say feedback is essential to personal growth?",
        [
          "Because feedback makes people feel good",
          "Because only managers can identify growth areas",
          "Because growth happens automatically with age",
          "Because without correction we cannot see our own blind spots",
        ],
        3,
        "Growth requires seeing what we cannot see on our own. A person who refuses correction cannot address their blind spots.",
      ),
      q(
        "How does becoming a person of value fuel purpose?",
        [
          "It increases your capacity and trustworthiness, so you can carry more responsibility in serving others",
          "It guarantees wealth and promotion",
          "It allows you to avoid serving others",
          "It replaces the need for character",
        ],
        0,
        "As character and competence grow, people trust you with more responsibility, which multiplies your ability to serve.",
      ),
    ],
    exam: [
      q(
        "A respected businessman is generous in public but known by his staff for unpaid wages and harsh treatment. Which pillar of value is most clearly missing?",
        ["Competence", "Integrity", "Ambition", "Visibility"],
        1,
        "Integrity means your private life and public image match. A gap between public generosity and private mistreatment shows a lack of integrity.",
      ),
      q(
        "Which response to criticism best reflects the attitude of a person of value?",
        [
          "Explaining immediately why the criticism is unfair",
          "Ignoring the criticism and moving on",
          "Listening, asking questions and owning what is true in it",
          "Criticising the other person in return",
        ],
        2,
        "A teachable response to feedback is a trust deposit and an expression of accountability and emotional maturity.",
      ),
      q(
        "Samuel has kept the same skills for fifteen years and resists new methods at work. What risk does PURP 102 highlight?",
        [
          "He will become too busy",
          "He will be promoted too quickly",
          "He will lose his integrity",
          "His value and usefulness to others will shrink as the world changes",
        ],
        3,
        "Lifelong growth keeps a person valuable. When learning stops, capacity to contribute falls behind a changing world.",
      ),
      q(
        "Which statement best captures the link between inner value and outer opportunity?",
        [
          "Opportunities tend to come to people who are trustworthy and prepared",
          "Opportunities come only through family connections",
          "Inner character has no effect on outward opportunities",
          "Opportunities should be pursued before character is developed",
        ],
        0,
        "The module teaches that opportunities to lead and serve tend to find people who are trustworthy and prepared.",
      ),
    ],
  },

  "PURP 103": {
    lessons: [
      lesson({
        hook: "Ask a room of adults why they work, and most will say, \"To pay the bills.\" That answer is true, but it is incomplete, and believing it is the whole truth makes millions of people miserable for most of their waking hours.",
        teaching: [
          "Work is any sustained effort that creates value for others: cultivating, building, organising, healing, teaching, selling, caring. It existed before wages and it continues beyond them. Earning an income is a legitimate and important part of work, but when income becomes its only meaning, work turns into a burden to be endured until the weekend or retirement.",
          "Seen rightly, work is dignified human contribution. Through it we provide for our families, develop our abilities and serve the needs of society. A road builder, an accountant and a farmer each meet real human needs. When you understand this, even demanding or repetitive work can be done with dignity, because it is connected to the good of others.",
        ],
        inPractice: [
          "A bus driver who sees the job as getting students, workers and patients safely to where they need to be.",
          "An accountant who understands that accurate books protect jobs, livelihoods and trust.",
          "A homemaker who recognises that running a household is skilled, valuable work, whether or not it is paid.",
        ],
        insight: "Work is not only how you make a living; it is one of the main ways you make a contribution.",
        practice: "Write a short description of your current work (paid or unpaid) without mentioning money. Answer: whose needs does it meet, what problems does it solve and what would be missing if no one did it?",
      }),
      lesson({
        hook: "Some people are good at their jobs but find no meaning in them. Others love their causes but cannot sustain themselves. Purpose-career alignment is the search for the place where both are true.",
        teaching: [
          "Alignment happens where four things overlap: your gifts (what you do well), your values (what you believe matters), your interests (what energises you) and real-world needs (what people will value and pay for). When work draws on all four, you tend to perform well, grow steadily and remain motivated through difficulty.",
          "Perfect alignment is rare and usually develops over time rather than arriving all at once. Most people move towards alignment in steps: taking on projects that use their strengths, building skills in areas they care about, or shifting roles within an organisation. The aim is not to find a perfect job tomorrow, but to make each career decision move you closer to the overlap.",
        ],
        inPractice: [
          "An engineer with a heart for rural communities moves towards projects that bring clean water to villages.",
          "A sales professional who values honesty seeks a company whose products she can recommend with integrity.",
          "A teacher with a gift for organisation volunteers to coordinate the school's examination process.",
        ],
        insight: "Alignment is rarely found in one leap; it is built through a series of wise steps.",
        practice: "Draw four overlapping circles labelled Gifts, Values, Interests and Needs. Fill each one for yourself, then write two kinds of work that sit in the overlap. Note one step you could take towards one of them.",
      }),
      lesson({
        hook: "Purpose does not live only in a corporate office. It can be expressed through a market stall, a classroom, a farm, a household, a ministry or a start-up. The question is not where you work, but how you use that place.",
        teaching: [
          "This module recognises several avenues of productive work. Formal employment lets you contribute within an organisation's mission. Business and entrepreneurship let you create value by solving problems and creating jobs. Household stewardship (raising children, caring for relatives, managing a home) is work that sustains society. Social enterprise and community initiatives meet needs that markets and governments overlook.",
          "Many adults express purpose through more than one avenue at the same time: a job during the week, a small enterprise on the side and service in the community. Each is a valid platform. None should be dismissed as \"just\" a job or \"just\" staying at home. The key is to bring the same purpose, values and excellence into each one.",
        ],
        inPractice: [
          "A civil servant who also runs a weekend tutoring programme for children in her neighbourhood.",
          "A mother who manages her household budget carefully and teaches her children financial discipline.",
          "A young entrepreneur whose recycling business cleans the environment and employs local youth.",
        ],
        insight: "Every honest avenue of work can become an altar of contribution.",
        practice: "List every avenue through which you currently work (employment, business, household, community). For each, write one sentence on how it already expresses your purpose and one way it could express it more fully.",
      }),
      lesson({
        hook: "Retrenchment, a business closing, a new technology or a sudden family responsibility can turn a stable career upside down overnight. How you respond in those moments often shapes the next decade of your life.",
        teaching: [
          "Career transitions are inevitable in a changing economy. Some are chosen, such as a promotion, a new venture or a career change. Others are imposed, such as job loss or illness. In both cases, the temptation is to make decisions based only on fear or immediate financial pressure. Those factors are real and must be taken seriously, but they should not be the only voices in the room.",
          "A value-driven transition asks better questions. What are my non-negotiable values? Which of my skills are transferable? What needs are growing in my community? Who can advise me? It also takes practical steps: building savings, investing in new skills before they are needed, and keeping a network of relationships that can open doors.",
        ],
        inPractice: [
          "A retrenched clerk who uses her organisational skills to start a small events-planning service.",
          "A professional who declines a higher-paying offer from a company whose practices conflict with his values.",
          "An employee who takes an evening course in a growing field while still in a secure job.",
        ],
        insight: "In seasons of change, let your values hold the steering wheel and let fear sit in the passenger seat.",
        practice: "Write your three non-negotiable values for any future work and your five most transferable skills. Then name one action you could take this month to prepare for your next career transition, whether or not one is in sight.",
      }),
      lesson({
        hook: "Two people can do exactly the same job. One leaves a trail of grateful customers and well-trained colleagues; the other leaves a pile of incomplete tasks. The difference is not the job. It is the way it is done.",
        teaching: [
          "Excellence is doing your work to the best of your ability because the work and the people it serves deserve it. It is not perfectionism, which is driven by fear of failure. Excellence is driven by respect for others. It shows up in preparation, attention to detail, honesty and a willingness to go a little further than required.",
          "Impact happens when excellent work is pointed at people. A receptionist who greets every visitor warmly, a mechanic who explains the problem honestly and a manager who develops her team are all turning everyday tasks into meaningful service. Over time, this kind of work builds reputation, opens opportunities and, most importantly, makes a real difference in people's lives.",
        ],
        inPractice: [
          "Double-checking a report not because your supervisor will review it, but because others will rely on it.",
          "Learning the names of the customers or clients you serve regularly.",
          "Taking time to train a new colleague well, even though it slows you down this week.",
        ],
        insight: "Excellence turns a task into a service and a job into a contribution.",
        practice: "Choose one routine task you will do this week. Before starting, write who it ultimately serves and what excellence would look like. Afterwards, note what changed in the way you did it.",
      }),
    ],
    quiz: [
      q(
        "How does this module redefine work?",
        [
          "As a necessary evil endured for money",
          "As dignified human contribution that creates value for others",
          "As only formal, salaried employment",
          "As something that should be avoided whenever possible",
        ],
        1,
        "Work is any sustained effort that creates value for others. Income matters, but work is also dignified contribution.",
      ),
      q(
        "Purpose-career alignment happens at the overlap of which four elements?",
        [
          "Salary, location, title and benefits",
          "Family pressure, trends, salary and status",
          "Gifts, values, interests and real-world needs",
          "Luck, timing, connections and qualifications",
        ],
        2,
        "Alignment is found where your gifts, values and interests meet needs that others value.",
      ),
      q(
        "Which of these is recognised in the module as a valid avenue of productive work?",
        [
          "Only work in large organisations",
          "Only paid work",
          "Only entrepreneurship",
          "Formal employment, entrepreneurship, household stewardship and social enterprise",
        ],
        3,
        "The module recognises formal jobs, business, household stewardship and social enterprise as legitimate ways to express purpose.",
      ),
      q(
        "During a career transition, what does the module advise?",
        [
          "Let values guide the decision while taking practical financial and skill steps seriously",
          "Make decisions purely on immediate financial pressure",
          "Avoid planning because change is unpredictable",
          "Accept the first offer to reduce uncertainty",
        ],
        0,
        "Financial pressure is real, but value-driven transitions also weigh values, transferable skills, growing needs and wise counsel.",
      ),
      q(
        "How does excellence differ from perfectionism?",
        [
          "They are exactly the same",
          "Excellence is motivated by respect for the people the work serves; perfectionism is driven by fear of failure",
          "Perfectionism is healthier than excellence",
          "Excellence means never making mistakes",
        ],
        1,
        "Excellence is driven by respect for others and the work. Perfectionism is driven by fear.",
      ),
    ],
    exam: [
      q(
        "Ruth stays at home raising three children and caring for her elderly mother. A friend says she \"doesn't work\". How would PURP 103 respond?",
        [
          "Her friend is right, because unpaid work is not real work",
          "Household stewardship is skilled, valuable work that sustains society",
          "Ruth should only count paid work",
          "Caregiving is a hobby rather than work",
        ],
        1,
        "The module recognises household stewardship as a valid avenue of productive work that meets real human needs.",
      ),
      q(
        "A high-paying job offer requires practices that conflict with your core values. What does the module's approach to transitions suggest?",
        [
          "Accept it, since money is the main purpose of work",
          "Accept it and hope the conflict disappears",
          "Weigh it against your non-negotiable values, and be willing to decline it if it would compromise them",
          "Accept the offer and keep the conflict secret",
        ],
        2,
        "Value-driven transitions keep values in the driving seat. Compromising core values undermines purpose, whatever the pay.",
      ),
      q(
        "Which statement best describes how most people move towards purpose-career alignment?",
        [
          "Through a single perfect career choice early in life",
          "By waiting until they find a perfect job",
          "By ignoring their interests",
          "Through a series of wise steps that move them closer to the overlap over time",
        ],
        3,
        "Perfect alignment is rare and usually develops through gradual, intentional steps.",
      ),
      q(
        "Which example best shows a task being turned into service through excellence?",
        [
          "A mechanic who honestly explains the fault and fixes it thoroughly",
          "An employee who works quickly to finish early",
          "A clerk who completes forms with minimum effort",
          "A worker who only performs well when supervised",
        ],
        0,
        "Excellence aimed at people, through honesty, thoroughness and care, turns everyday tasks into meaningful service.",
      ),
    ],
  },

  "PURP 104": {
    lessons: [
      lesson({
        hook: "\"Whatever will be, will be.\" \"It was written.\" \"God's plan cannot be changed.\" Phrases like these can bring great comfort in grief, and they can also, quietly, become reasons not to act.",
        teaching: [
          "Predestination is the idea that a life's design or outcome is determined in advance by God, fate or the order of the universe. Different traditions understand it differently. Many faith traditions teach that God has intentions and a plan for each person's life. Some philosophical views emphasise cause and effect. Many cultures speak of destiny as something written at birth.",
          "Destiny, in the sense this module uses, is the intended end that a life is designed to reach: the potential and contribution woven into a person. Understanding destiny can give a deep sense of security and significance: your life is not an accident. The key question is not whether destiny exists, but how our beliefs about it shape the way we live.",
        ],
        inPractice: [
          "A believer who finds courage in the conviction that her life has a divine design.",
          "A person who interprets a setback as \"just my fate\" and stops trying.",
          "A family that speaks over a child, \"You were born for something great\", and then invests in developing that child.",
        ],
        insight: "Belief in destiny should give you confidence to act, never an excuse to wait.",
        practice: "Write down what you were taught about destiny and predestination as a child. Then write how that teaching has influenced your choices: where has it strengthened you, and where might it have made you passive?",
      }),
      lesson({
        hook: "A seed contains the full design of a tree, but it will not become one if it stays in a jar. Potential needs soil, water, time and care. Human destiny works in much the same way.",
        teaching: [
          "Human agency is the capacity to make choices and act on them. Even within a divinely designed life, people make real decisions that shape outcomes: what to study, whom to marry, how to use money, whether to forgive. Most faith traditions hold together divine intention and human responsibility. People are called to choose, labour, steward and obey, not merely to wait.",
          "Purpose therefore requires active participation. Discipline turns intention into habit. Stewardship means managing what you have been given (time, gifts, resources and relationships) with care and accountability. Passive waiting may feel like humility, but it often leaves gifts undeveloped and opportunities unclaimed.",
        ],
        inPractice: [
          "A student who believes she is called to medicine, and therefore studies diligently rather than assuming she will be admitted.",
          "A farmer who prays for rain and also prepares the soil and plants on time.",
          "An adult who believes he is called to lead and so begins serving faithfully in small roles now.",
        ],
        insight: "Destiny is the design; your choices are the construction.",
        practice: "Identify one area where you have been \"waiting\" for something to happen. Write the active steps of stewardship you could take this month, and commit to the first one.",
      }),
      lesson({
        hook: "No one chooses the family, country or circumstances they are born into. Some start with abundant opportunity, others with poverty, loss or injustice. Yet the story of every life is shaped as much by response as by starting point.",
        teaching: [
          "Circumstances are the conditions you did not choose: your birthplace, early experiences, health, economic setting and many events along the way. Opportunities are openings that appear within those circumstances: a scholarship, an introduction, a need you are equipped to meet. Response is the part you own: how you interpret what happens and what you do next.",
          "Owning your response does not mean pretending that circumstances do not matter or that injustice is acceptable. It means refusing to let them have the final word. Many people who have made a great difference started with severe disadvantages. Their circumstances shaped them, but their responses defined them.",
        ],
        inPractice: [
          "A young man who lost his father early channels that pain into mentoring fatherless boys.",
          "A woman denied a school education teaches herself to read as an adult and then starts a literacy group.",
          "A professional who is overlooked for promotion uses the season to build new skills instead of becoming bitter.",
        ],
        insight: "You did not choose your starting point, but you do choose your next step.",
        practice: "Draw a simple timeline of your life with three columns: circumstances I did not choose, opportunities that appeared, and how I responded. Mark one response you are proud of and one you would handle differently now.",
      }),
      lesson({
        hook: "\"It wasn't meant to be.\" Sometimes that sentence is wisdom. Sometimes it is a polite way of saying, \"I was afraid to try again.\"",
        teaching: [
          "Fatalism is the belief that outcomes are fixed regardless of what we do, so effort is pointless. It often hides inside spiritual or cultural language, making passivity sound like faith or humility. Common signs include blaming fate for failures that came from poor choices, refusing to plan because \"the future is in God's hands\", and abandoning goals at the first obstacle.",
          "Excuses are fatalism's everyday companions: \"I'm too old\", \"My background won't allow it\", \"The system is against me.\" Some of these contain real truth, but they become excuses when they end the conversation instead of starting the problem-solving. Overcoming fatalism means asking honestly, \"What part of this is mine to change?\", and acting on that part.",
        ],
        inPractice: [
          "Replacing \"It was not meant to be\" with \"What can I learn, and what can I try next?\"",
          "Planning carefully for your goals while still holding the outcome with faith and humility.",
          "Asking a friend to challenge you whenever you use an excuse to avoid a step you know you should take.",
        ],
        insight: "Faith says the future is held; fatalism says the future is fixed. Only one of them gets you out of bed.",
        practice: "List three excuses you use most often. Next to each, write the part of it that is true and the part that is within your control. Choose one controllable part and act on it this week.",
      }),
      lesson({
        hook: "Imagine an architect and a builder working together. The architect provides the design; the builder brings the materials, labour and decisions on site. A life of purpose is lived in that kind of partnership.",
        teaching: [
          "Co-creating your path means holding two things together: trust in a higher purpose and responsibility for your own actions. Trust frees you from anxiety and the need to control everything. Responsibility moves you to plan, prepare and act with courage. Without trust, planning becomes fearful striving. Without responsibility, trust becomes passive waiting.",
          "In practice, co-creation looks like praying or reflecting and then planning; setting goals and then holding them with openness; acting courageously and then accepting outcomes with humility. When doors close, you adjust without despair. When doors open, you walk through them prepared.",
        ],
        inPractice: [
          "Writing a one-year plan for your purpose and reviewing it in a time of prayer or reflection each quarter.",
          "Applying for an opportunity you feel called to while accepting that a \"no\" may redirect you rather than defeat you.",
          "Taking a courageous step, such as starting a project or a difficult conversation, after careful preparation.",
        ],
        insight: "Trust without action is wishful thinking; action without trust is exhausting striving. Purpose needs both.",
        practice: "Write a short \"co-creation plan\" for one area of your life: what you are trusting for, what you will plan, what courageous action you will take and how you will respond if the outcome differs from your hopes.",
      }),
    ],
    quiz: [
      q(
        "In this module, what does \"destiny\" refer to?",
        [
          "A fixed outcome that no choice can change",
          "Pure luck",
          "The intended end and potential that a life is designed to reach",
          "A prediction made by fortune tellers",
        ],
        2,
        "Destiny is used here to mean the intended end and potential woven into a person's life, which gives significance and security.",
      ),
      q(
        "Why does purpose require human agency?",
        [
          "Because choices, discipline and stewardship turn potential into reality",
          "Because divine intention does not exist",
          "Because agency guarantees success",
          "Because waiting is always wrong",
        ],
        0,
        "Like a seed needing soil and care, potential must be developed through real choices, discipline and stewardship.",
      ),
      q(
        "According to the module, what part of life's story do we most fully own?",
        ["Our circumstances", "Our birthplace", "The opportunities that appear", "Our response"],
        3,
        "We do not choose our starting circumstances, but we do own how we interpret and respond to what happens.",
      ),
      q(
        "What is fatalism?",
        [
          "Careful planning combined with faith",
          "The belief that outcomes are fixed regardless of what we do, so effort is pointless",
          "Taking responsibility for your choices",
          "Learning from failure",
        ],
        1,
        "Fatalism treats outcomes as fixed and effort as pointless, often hiding behind spiritual or cultural language.",
      ),
      q(
        "What does co-creating your path involve?",
        [
          "Controlling every outcome",
          "Waiting passively for doors to open",
          "Holding trust in a higher purpose together with planning and courageous action",
          "Rejecting faith in favour of planning",
        ],
        2,
        "Co-creation balances trust, which frees us from anxiety, with responsibility, which moves us to act.",
      ),
    ],
    exam: [
      q(
        "James believes God has a great plan for his life, so he has stopped applying for jobs and is \"waiting for the right door\". Which concept from PURP 104 best addresses his situation?",
        [
          "Destiny requires no action",
          "Human agency and stewardship: purpose requires active participation",
          "Circumstances determine everything",
          "Fatalism is a form of faith",
        ],
        1,
        "James is confusing passive waiting with faith. Purpose requires choices, discipline and stewardship alongside trust.",
      ),
      q(
        "Which statement is the clearest example of fatalism disguised as humility?",
        [
          "\"I'll plan carefully and trust God with the results.\"",
          "\"I'll learn from this failure and try a different approach.\"",
          "\"I'll ask for advice before my next attempt.\"",
          "\"There's no point preparing; whatever is meant to happen will happen.\"",
        ],
        3,
        "Refusing to prepare because outcomes are supposedly fixed is fatalism, even when it sounds spiritual or humble.",
      ),
      q(
        "A woman born into poverty starts a literacy group after teaching herself to read. Which principle does her story illustrate?",
        [
          "Circumstances shape us, but our responses define us",
          "Circumstances do not matter at all",
          "Poverty is always a blessing",
          "Opportunity only comes to the privileged",
        ],
        0,
        "Her starting point shaped her, but her response defined the impact she made.",
      ),
      q(
        "How should a person respond to a closed door, according to the co-creation principle?",
        [
          "Give up, because it shows the goal was wrong",
          "Force the door open at any cost",
          "Adjust without despair, learning and preparing for the next opportunity",
          "Blame others for the outcome",
        ],
        2,
        "Co-creation means holding plans with openness: when doors close, you adjust and keep moving without despair.",
      ),
    ],
  },

  "PURP 105": {
    lessons: [
      lesson({
        hook: "Many people believe that \"ministry\" belongs only to clergy, and \"calling\" only to a special few. This lesson invites you to see that every person carries both a purpose and a calling, expressed in different seasons.",
        teaching: [
          "Purpose is the overarching reason for your life: the broad contribution you are designed to make. Calling is a specific assignment within that purpose for a particular season, place or group of people. Your purpose may remain constant while your callings change: raising young children in one season, leading a team in another, mentoring the next generation in a third.",
          "Ministry, in its simplest sense, means service: meeting the needs of others in a way that reflects your values and convictions. It is the practical expression of purpose and calling. When you understand these three together, your service stops being random activity and becomes a faithful response to who you are and what you have been entrusted with.",
        ],
        inPractice: [
          "A woman whose purpose is to nurture others is called in one season to foster children and in another to train young mothers.",
          "A man whose purpose is to bring order and justice serves as an accountant, then as treasurer of a community savings group.",
          "A retired teacher whose purpose is to develop minds is now called to tutor children in her village.",
        ],
        insight: "Purpose is the river; callings are the seasons of its flow; ministry is the water that reaches the fields.",
        practice: "Write a one-sentence statement of your overarching purpose as you currently understand it. Then list the specific callings you sense in this season of your life, and the people or needs each one serves.",
      }),
      lesson({
        hook: "Some of the most powerful ministry in your community will never be announced from a pulpit. It happens in kitchens, offices, clinics, classrooms and on street corners every day.",
        teaching: [
          "Service is not confined to formal religious institutions. Every sphere of life is a platform for ministry. In the home, it is raising children with love and values. In the marketplace, it is honest business and fair treatment of workers. In the classroom, it is teaching with patience and care. In the clinic, it is healing with dignity. In the neighbourhood, it is noticing and meeting needs.",
          "Recognising every sphere as a platform for ministry has two effects. First, it gives dignity to ordinary work and relationships, because they become places of service, not merely obligations. Second, it multiplies impact: if every person serves faithfully where they already are, whole communities can be transformed without waiting for an institution to lead.",
        ],
        inPractice: [
          "A shopkeeper who extends patient credit to a struggling widow and treats every customer with respect.",
          "A doctor who takes time to listen to and reassure frightened patients, not only to treat their symptoms.",
          "A neighbour who organises others to repair the home of an elderly resident.",
        ],
        insight: "Wherever you stand, you stand on a platform for service.",
        practice: "List the five main spheres you move in during a typical week (for example home, work, faith community, neighbourhood, online). For each, write one specific way you could serve someone there this week.",
      }),
      lesson({
        hook: "A calling rarely arrives as a voice from the sky. More often it emerges slowly, through a burden you cannot shake, a gift others keep noticing and experiences that seem to have prepared you for something specific.",
        teaching: [
          "This module identifies four threads that help you discern your calling. Natural gifts are the abilities you have and others affirm. Deep convictions are the beliefs and causes you cannot stop caring about. Empathy is the group of people whose pain moves you most. Lived experience includes the struggles and victories that have equipped you to help others walking a similar road.",
          "Where these threads come together, a calling usually begins to appear. Discernment takes time, honesty and counsel. It helps to reflect quietly, try small acts of service, notice what bears fruit and listen to the feedback of people who know you well. A true calling is usually confirmed by fruit, by peace and by the affirmation of others.",
        ],
        inPractice: [
          "A former addict with a gift for communication feels compelled to support young people in recovery.",
          "A woman who grew up in a children's home and loves organising starts a mentoring programme for orphans.",
          "A teacher who is moved by struggling readers tries a weekend reading club and sees children's confidence grow.",
        ],
        insight: "Your calling often lies where your gifts, your burdens and your story meet.",
        practice: "Write four short lists: my natural gifts, my deep convictions, the people whose pain moves me and the experiences that have shaped me. Circle the words that connect across lists and write a sentence describing the calling they suggest.",
      }),
      lesson({
        hook: "Modern culture often promises that fulfilment comes from focusing on yourself: your goals, your comfort, your happiness. Yet many people who achieve these things still feel empty. Meaning often arrives through the opposite door.",
        teaching: [
          "Self-fulfilment is not wrong. Developing your gifts and enjoying your life are good. The problem comes when the self becomes the final goal. A life that only serves itself becomes small, however successful it appears. Purpose reaches its fullness when it moves beyond self-fulfilment into social impact: using your gifts to make life better for others.",
          "Serving others deepens meaning in at least three ways. It connects you to something bigger than yourself. It confirms your gifts through real results. And it builds relationships of gratitude and trust that enrich your own life. In this way, service is not only something you give; it is also something that shapes and validates who you are.",
        ],
        inPractice: [
          "A successful entrepreneur who begins mentoring young business owners and finds a new sense of meaning.",
          "A professional who uses part of her annual leave to provide free services to a rural community.",
          "A family that commits to supporting one vulnerable household in their neighbourhood throughout the year.",
        ],
        insight: "The surest way to find your life is to spend it on others.",
        practice: "Reflect on a time when serving someone gave you deep satisfaction. Write what you did, why it mattered to them and what it revealed about you. Then plan one act of service for the coming week that draws on the same gift.",
      }),
      lesson({
        hook: "Compassion that lasts only as long as a feeling cannot carry a lifetime of service. Many good intentions fade because they were never given a structure.",
        teaching: [
          "Stewardship of gifts means treating your abilities, time and resources as entrusted to you for the good of others, and managing them faithfully. Faithful stewardship turns compassion into consistent, sustainable action. It asks: what have I been given, who is it for, and how can I use it regularly without burning out?",
          "A practical stewardship framework has four steps. Identify the gift and the need it meets. Commit to a specific, regular expression of service, such as weekly or monthly. Build in support and accountability by serving alongside others. Review and rest regularly, because sustainable service requires renewal. Small, steady faithfulness will outlast and outperform occasional grand gestures.",
        ],
        inPractice: [
          "Committing two hours every Saturday to a youth mentoring programme rather than volunteering \"whenever I can\".",
          "Setting aside a fixed percentage of income each month for a cause connected to your calling.",
          "Joining a service team so that others share the load, encourage you and keep you accountable.",
        ],
        insight: "Faithfulness in small, regular service builds the trust that larger callings require.",
        practice: "Create a personal stewardship plan: name one gift, the need it will serve, a specific weekly or monthly commitment, a person who will serve or check in with you, and how you will rest and review. Begin it within the next fourteen days.",
      }),
    ],
    quiz: [
      q(
        "How does the module distinguish purpose from calling?",
        [
          "They mean exactly the same thing",
          "Calling is permanent; purpose changes every season",
          "Purpose is only for religious leaders",
          "Purpose is the overarching reason for life; a calling is a specific assignment for a season, place or people",
        ],
        3,
        "Purpose remains constant while callings change across seasons. Ministry is the practical service that expresses both.",
      ),
      q(
        "Why does the module say ministry should not be limited to formal religious positions?",
        [
          "Because every sphere of life, including home, work and community, is a platform for service",
          "Because religious institutions are unimportant",
          "Because ministry only happens in businesses",
          "Because service should always be paid",
        ],
        0,
        "Every sphere of life is a platform for ministry, which gives dignity to everyday work and multiplies impact.",
      ),
      q(
        "Which four threads help a person discern their calling?",
        [
          "Salary, title, location and recognition",
          "Natural gifts, deep convictions, empathy and lived experience",
          "Family tradition, popularity, wealth and timing",
          "Talent, fame, connections and education",
        ],
        1,
        "A calling usually emerges where gifts, convictions, empathy and lived experience meet.",
      ),
      q(
        "According to the lesson, when does self-fulfilment become a problem?",
        [
          "Whenever a person enjoys their life",
          "When a person develops their gifts",
          "When the self becomes the final goal and life only serves itself",
          "When a person takes rest",
        ],
        2,
        "Developing gifts and enjoying life are good. The problem is when the self becomes the end goal and service is lost.",
      ),
      q(
        "What turns compassion into sustainable service, according to the stewardship framework?",
        [
          "Waiting until you feel strongly moved",
          "Serving alone so that no one else interferes",
          "Giving everything at once",
          "A specific regular commitment, support and accountability, and regular rest and review",
        ],
        3,
        "Sustainable stewardship combines a specific commitment with shared support, accountability and renewal.",
      ),
    ],
    exam: [
      q(
        "A banker says, \"I'm not called to ministry; I just work in finance.\" Which response best reflects PURP 105?",
        [
          "He is right, because ministry happens only in religious settings",
          "He must leave banking to fulfil a calling",
          "Honest, fair and caring financial work in the marketplace can be a genuine platform for ministry",
          "Finance and service cannot be connected",
        ],
        2,
        "The marketplace is one of the spheres the module names as a platform for ministry when work is done with integrity and care.",
      ),
      q(
        "Amina's purpose is to nurture others. She once fostered children and now trains young mothers. What does this illustrate?",
        [
          "A purpose that remains constant while specific callings change with the seasons",
          "A lack of focus",
          "Two separate purposes",
          "That callings never change",
        ],
        0,
        "Purpose is the overarching thread; callings are seasonal assignments within it.",
      ),
      q(
        "Which approach is most likely to confirm a true calling?",
        [
          "Waiting for a dramatic sign before doing anything",
          "Choosing the most prestigious option",
          "Avoiding feedback from others",
          "Trying small acts of service, noticing the fruit and seeking counsel from people who know you",
        ],
        3,
        "Discernment grows through reflection, experiment, fruit, peace and the affirmation of trusted others.",
      ),
      q(
        "A volunteer who served intensely for three months has burned out and stopped completely. What would the stewardship framework have added?",
        [
          "Even more hours of service",
          "A specific sustainable commitment, shared support and regular rest and review",
          "Serving alone to avoid conflict",
          "A more prestigious role",
        ],
        1,
        "Sustainable service needs structure: regular commitments, people to share the load and built-in renewal.",
      ),
    ],
  },
};
