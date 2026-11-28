import type { ModuleContent } from "../types";
import { lesson, q } from "./helpers";

/** Purpose Program for Schools · Level 2: Intermediate – Purpose Discovery and Clarity. */
export const SCHOOLS_LEVEL_2: Record<string, ModuleContent> = {
  "PURP 201": {
    lessons: [
      lesson({
        hook: "Have you ever stayed up all night before an exam, panicking because you left everything until the last minute? Most students have. Purposeful planning is the way out of that cycle.",
        teaching: [
          "Purposeful planning means thinking ahead and deciding how you will reach what matters to you. It replaces wishful thinking (\"I hope I pass\") and last-minute panic with intentional direction (\"Here is how I will prepare\"). It connects your daily activities to your purpose and goals.",
          "Planning gives you control. Instead of reacting to deadlines and surprises, you prepare for them. Planned students tend to feel calmer, perform better and have more time for rest, family and friends, because they are not always rushing to catch up.",
        ],
        inPractice: [
          "Writing down all your test and assignment dates at the start of term.",
          "Deciding on Sunday what you will study each evening of the coming week.",
          "Preparing your uniform and school bag the night before to avoid morning stress.",
        ],
        insight: "A plan turns hope into direction.",
        practice: "Write down the most stressful last-minute situation you have experienced at school. Then describe how planning could have prevented it, and make a simple plan for your next important deadline.",
      }),
      lesson({
        hook: "\"I want to do better at school\" is a wish. \"I want to raise my maths mark from 55% to 70% by the end of term\" is a goal you can work towards.",
        teaching: [
          "Purpose-driven goals are goals connected to your values and your sense of purpose. Good goals are specific (clear about what you want), measurable (you can track progress), realistic (possible with effort) and time-bound (with a deadline). They are also aligned with your values, so achieving them matters to you.",
          "Understanding your purpose helps you choose meaningful goals. If you sense you are called to help people through medicine, a goal to improve in biology has real meaning. Goals connected to purpose are easier to keep because you know why they matter.",
        ],
        inPractice: [
          "Specific and measurable: \"Read two novels this term and write a short summary of each.\"",
          "Realistic: improving a mark by fifteen percentage points with consistent study, not jumping from 40% to 100% in a week.",
          "Value-aligned: \"Volunteer once a month at a children's home, because I value caring for others.\"",
        ],
        insight: "Goals connected to your purpose carry their own motivation.",
        practice: "Write two goals for this term, one academic and one personal. Check each against the checklist (specific, measurable, realistic, time-bound and value-aligned) and rewrite it until it passes.",
      }),
      lesson({
        hook: "A goal is like a destination on a map. An action plan is the route: the turns, roads and stops that get you there.",
        teaching: [
          "A goal describes what you want to achieve. An action plan describes how you will achieve it. A good action plan breaks a big goal into smaller steps, sets a timeline for each step, and identifies the resources you need, such as books, help from teachers, time or materials.",
          "Daily and weekly action steps make big goals manageable. If your goal is to improve in maths, your action plan might include practising ten problems every evening, asking the teacher one question each week and doing a past paper every Saturday. Each small step moves you closer to the goal.",
        ],
        inPractice: [
          "Goal: pass the English exam with a good mark. Weekly step: write one practice essay.",
          "Daily step: learn five new vocabulary words.",
          "Resources: a dictionary, past papers and fifteen minutes a week with the teacher.",
        ],
        insight: "Goals tell you where you are going; action plans tell you how to get there.",
        practice: "Choose one of your goals from the previous lesson. Write an action plan with at least three weekly steps, three daily steps, a timeline and the resources you will need. Begin the first daily step today. This forms your module output.",
      }),
      lesson({
        hook: "Your phone buzzes, a friend wants to chat, a show is starting and your homework is due tomorrow. Which comes first?",
        teaching: [
          "Prioritisation is deciding what to do first and what can wait. It means distinguishing what is important (it matters for your purpose and goals) from what is merely urgent (it demands attention now) or distracting (it pulls your attention away but adds little value).",
          "Students who prioritise well put important tasks first, such as study, rest and responsibilities at home, and fit less important activities around them. This does not mean never having fun. It means making sure fun does not crowd out what matters most.",
        ],
        inPractice: [
          "Finishing homework before checking social media.",
          "Turning off phone notifications during study time.",
          "Saying \"I'll join you after I finish revising\" when friends invite you out.",
        ],
        insight: "Do the important things first, and the urgent and distracting things will not control your life.",
        practice: "List everything you did yesterday after school. Mark each item as important, urgent or distracting. Write tomorrow's after-school plan with the important tasks first.",
      }),
      lesson({
        hook: "You have been entrusted with time, pocket money and school materials. How you manage these small things says a lot about how you will manage bigger things later.",
        teaching: [
          "Stewarding time and resources means managing them wisely and responsibly. Time includes study hours, rest and free time. Resources include pocket money, books, uniforms and other school materials, often provided through your family's sacrifice. Wasting them affects not only you but also those who provided them.",
          "Good stewardship includes making a weekly timetable, budgeting pocket money, saving some of it and taking care of your books and belongings. These habits build responsibility and prepare you to manage larger resources in the future.",
        ],
        inPractice: [
          "Making a weekly timetable with study, rest, chores and free time.",
          "Saving part of your pocket money each week rather than spending it all immediately.",
          "Covering your books and keeping your school materials in good condition.",
        ],
        insight: "Faithfulness with small resources prepares you to be trusted with greater ones.",
        practice: "Create a weekly timetable and a simple pocket-money plan (spending, saving and giving). Follow both for one week and write what you learned about managing your time and money.",
      }),
    ],
    quiz: [
      q(
        "What is purposeful planning?",
        [
          "Hoping things will work out",
          "Doing everything at the last minute",
          "Thinking ahead and deciding intentionally how to reach what matters",
          "Letting others decide for you",
        ],
        2,
        "Purposeful planning replaces wishful thinking and panic with intentional direction.",
      ),
      q(
        "Which goal best meets the qualities of a purpose-driven goal?",
        [
          "\"I want to do better.\"",
          "\"I will raise my maths mark from 55% to 70% by the end of term through daily practice.\"",
          "\"I will be the best at everything.\"",
          "\"I might study more someday.\"",
        ],
        1,
        "It is specific, measurable, realistic, time-bound and connected to effort.",
      ),
      q(
        "What is the difference between a goal and an action plan?",
        [
          "A goal is what you want to achieve; an action plan is how you will achieve it",
          "They are the same thing",
          "An action plan is a wish; a goal is a timetable",
          "Goals are only for adults",
        ],
        0,
        "The action plan breaks a goal into steps, timelines and resources.",
      ),
      q(
        "What does prioritisation mean?",
        [
          "Doing whatever is most fun first",
          "Doing everything at once",
          "Avoiding all distractions forever",
          "Deciding what is important to do first and what can wait",
        ],
        3,
        "Prioritisation separates what is important from what is merely urgent or distracting.",
      ),
      q(
        "Which of these is an example of stewarding resources well?",
        [
          "Spending all your pocket money as soon as you receive it",
          "Losing your school books regularly",
          "Saving part of your pocket money and caring for your books",
          "Wasting study time",
        ],
        2,
        "Good stewardship means managing time, money and materials wisely and responsibly.",
      ),
    ],
    exam: [
      q(
        "Ruth always studies the night before exams and feels stressed. What would PURP 201 recommend first?",
        [
          "Studying even later",
          "Purposeful planning: scheduling regular study well before the exams",
          "Skipping the exams",
          "Asking friends for answers",
        ],
        1,
        "Planning ahead replaces last-minute panic with intentional preparation.",
      ),
      q(
        "A student's goal is to improve in English. Which of these is part of an action plan rather than the goal itself?",
        [
          "\"I want to be good at English.\"",
          "\"English is important.\"",
          "\"I hope to pass English.\"",
          "\"I will write one practice essay every week and learn five new words every day.\"",
        ],
        3,
        "Action plans describe the specific steps, timeline and resources needed to reach the goal.",
      ),
      q(
        "Which is the best example of prioritisation?",
        [
          "Finishing homework before spending time on social media",
          "Watching shows until late, then doing homework",
          "Chatting with friends during study time",
          "Doing chores only when asked several times",
        ],
        0,
        "Putting important tasks first ensures distractions do not crowd out what matters.",
      ),
      q(
        "Why does the module connect managing pocket money with purpose?",
        [
          "Because money is the main purpose of life",
          "Because spending all your money is wise",
          "Because faithfulness with small resources prepares you to manage greater ones",
          "Because pocket money is unimportant",
        ],
        2,
        "Stewarding small resources builds the responsibility needed for larger ones in the future.",
      ),
    ],
  },

  "PURP 202": {
    lessons: [
      lesson({
        hook: "Imagine someone gives you a seed that could grow into a fruit tree. You could plant and water it, or leave it in your pocket until it dies. Your gifts are like that seed.",
        teaching: [
          "Stewardship means caring for, developing and using what has been entrusted to you. Your gifts, talents and potential have been given to you, and they come with responsibility. A good steward does not take gifts for granted. They develop them and use them well.",
          "Every student has gifts, even if they have not discovered them all yet. Stewardship asks: what have I been given, how am I developing it, and how am I using it to help others? Taking these questions seriously turns potential into real ability and contribution.",
        ],
        inPractice: [
          "A student with a good singing voice joins the choir and practises regularly.",
          "A student who is good at maths helps classmates and enters mathematics competitions.",
          "A student who is a natural leader volunteers to organise class activities.",
        ],
        insight: "Your gifts are entrusted to you, not just for you.",
        practice: "List three gifts or abilities you have. For each, write how well you are currently developing it (well, a little or not at all), and one step you could take this month to develop it further.",
      }),
      lesson({
        hook: "Some students think they have no talents because they are not top of the class or the best athlete. But strengths come in many different forms.",
        teaching: [
          "This module identifies five kinds of strength. Academic strengths include ability in subjects such as maths, science or languages. Creative strengths include art, music, writing and design. Athletic strengths include sport and physical skill. Interpersonal strengths include communication, empathy and leadership. Practical strengths include building, fixing, cooking, farming or organising.",
          "Identifying your strengths helps you understand where you can grow and contribute most. It also builds confidence. Everyone has a different mix of strengths, and the world needs all of them. A school, family or community works best when people use their different strengths together.",
        ],
        inPractice: [
          "Noticing that you can calm friends who are upset, which is an interpersonal strength.",
          "Realising that you love fixing broken things at home, which is a practical strength.",
          "Recognising that you can explain ideas clearly, which is useful in many careers.",
        ],
        insight: "Every student is strong in something; the task is to find it and grow it.",
        practice: "Draw five boxes labelled academic, creative, athletic, interpersonal and practical. Write at least one strength in each box, then ask a friend or family member to add one strength they see in you.",
      }),
      lesson({
        hook: "Many talented students never reach their potential, while some students with less natural talent achieve great things. The difference is often what they do with what they have.",
        teaching: [
          "The multiplier effect means that talent grows when it is combined with discipline, practice, coaching and perseverance. Talent without discipline fades. A gifted footballer who never trains, or a gifted writer who never writes, will be overtaken by those who work hard.",
          "Practice builds skill through repetition. Coaching and mentorship help you improve faster by learning from people with experience. Perseverance keeps you going when progress feels slow or when you fail. Together, these multiply your natural gifts and unlock excellence.",
        ],
        inPractice: [
          "Practising a musical instrument for thirty minutes every day.",
          "Asking a teacher or coach for feedback on how to improve.",
          "Continuing to train after losing a competition rather than giving up.",
        ],
        insight: "Talent is the starting line; discipline and practice decide how far you go.",
        practice: "Choose one gift you want to multiply. Write a practice plan (how often and for how long), name one person who could coach or mentor you, and write how you will persevere when it gets hard.",
      }),
      lesson({
        hook: "A gift can be wasted in two ways: by hiding it or by misusing it. Both deny the world what that gift could have brought.",
        teaching: [
          "This lesson describes four dangers. Laziness means not putting in the effort to develop your gifts. Fear-driven hiding means not using your gifts because you are afraid of failure or of what others will think. Pride means believing you are better than others because of your gifts. Misuse means using your abilities to harm others, for example using cleverness to cheat or bully.",
          "Neglecting or misusing your gifts has consequences. Gifts that are not developed weaken over time. Gifts that are misused damage relationships, trust and your character. The healthiest path is to develop your gifts humbly and use them to build others up.",
        ],
        inPractice: [
          "Laziness: a talented artist who never practises and loses their skill.",
          "Fear-driven hiding: a good singer who never sings in public because of fear of mockery.",
          "Misuse: a clever student who uses their knowledge to help others cheat in exams.",
        ],
        insight: "Gifts are meant to be developed humbly and used to build others up, not hidden or turned into weapons.",
        practice: "Honestly identify which danger (laziness, fear, pride or misuse) is most tempting for you. Write a specific situation where it has shown up and one change you will make to avoid it.",
      }),
      lesson({
        hook: "The best way to discover the full value of your gifts is to use them to help someone else.",
        teaching: [
          "Gifts for service means channelling your strengths to help others: classmates, family members and your school community. When you use your gifts to serve, they grow stronger, you gain confidence and others benefit. Service also helps you discover new strengths you did not know you had.",
          "Service does not have to be big or formal. It can be helping a classmate with a difficult subject, drawing posters for a school event, coaching younger students in sport or helping your family with practical tasks. Every act of service is a way of using your gifts responsibly.",
        ],
        inPractice: [
          "Using your maths ability to tutor a struggling classmate.",
          "Using your creativity to design posters for a school campaign.",
          "Using your practical skills to repair things at home or school.",
        ],
        insight: "Gifts grow strongest when they are given away in service.",
        practice: "Identify two gifts you possess. For each, develop a plan for using it responsibly to serve others this month: who you will serve, how and when. Carry out at least one part of the plan this week. This forms your module output.",
      }),
    ],
    quiz: [
      q(
        "What does stewardship of gifts mean?",
        [
          "Keeping your gifts hidden",
          "Caring for, developing and using your gifts responsibly",
          "Using your gifts only to benefit yourself",
          "Waiting until adulthood to use your gifts",
        ],
        1,
        "Stewardship treats gifts as entrusted and develops them for good use.",
      ),
      q(
        "Which list shows the five kinds of strength named in the module?",
        [
          "Academic, creative, athletic, interpersonal and practical",
          "Wealth, fame, looks, popularity and power",
          "Morning, afternoon, evening, weekend and holiday",
          "Phones, clothes, shoes, bags and books",
        ],
        0,
        "Students can have strengths in any of these five areas.",
      ),
      q(
        "What is the multiplier effect?",
        [
          "Talent grows by itself without effort",
          "Only talented people can succeed",
          "Practice is unnecessary for gifted students",
          "Talent grows when combined with discipline, practice, coaching and perseverance",
        ],
        3,
        "Discipline and practice multiply natural gifts; talent without discipline fades.",
      ),
      q(
        "Which of the following is a misuse of gifts?",
        [
          "Using cleverness to help others cheat",
          "Tutoring a struggling classmate",
          "Practising a skill daily",
          "Joining a school club",
        ],
        0,
        "Using abilities to cheat or harm others is misuse.",
      ),
      q(
        "Why does using your gifts to serve others help you as well?",
        [
          "It makes you famous",
          "It means you no longer need to practise",
          "It strengthens your gifts, builds confidence and helps you discover new strengths",
          "It guarantees good grades",
        ],
        2,
        "Service develops gifts and reveals new ones while benefiting others.",
      ),
    ],
    exam: [
      q(
        "Daniel is very talented at football but rarely trains. A less talented teammate trains every day and has now overtaken him. Which concept explains this?",
        ["Fear-driven hiding", "The multiplier effect", "Misuse of gifts", "Interpersonal strength"],
        1,
        "Talent without discipline fades, while practice and perseverance unlock excellence.",
      ),
      q(
        "Esther sings beautifully but refuses to sing in public because she fears being laughed at. Which danger does she face?",
        ["Fear-driven hiding", "Pride", "Misuse", "Laziness"],
        0,
        "Fear of failure or mockery can cause people to hide their gifts.",
      ),
      q(
        "A student says, \"I'm not good at anything because I'm not top of the class.\" How would the module respond?",
        [
          "Only academic strengths matter",
          "Some students have no strengths",
          "Strengths come in many forms, including creative, athletic, interpersonal and practical",
          "Strengths can only be discovered in adulthood",
        ],
        2,
        "Academic ability is only one kind of strength. Every student is strong in something.",
      ),
      q(
        "Which plan best shows using gifts for service?",
        [
          "Keeping your art skills to yourself",
          "Using your knowledge to show off",
          "Waiting until someone asks for help",
          "Using your art skills to design posters for a school health campaign",
        ],
        3,
        "Gifts for service means channelling strengths to help classmates, family and the school community.",
      ),
    ],
  },

  "PURP 203": {
    lessons: [
      lesson({
        hook: "\"Show me your friends and I will show you your future.\" Look at the people you spend most of your time with. Where are they heading?",
        teaching: [
          "The power of association means that the people we spend time with influence our thoughts, habits and choices. In school life, friends can shape how seriously you take studies, what you think is normal and the decisions you make. Over time, you tend to become more like the people closest to you.",
          "This is why choosing friends carefully is one of the most important decisions a student can make. Good friends can encourage you towards your purpose, while harmful friendships can pull you away from it. Being kind to everyone does not mean you must be close to everyone.",
        ],
        inPractice: [
          "A student who joins friends who study together begins to improve academically.",
          "A student who spends time with peers who skip class begins skipping too.",
          "A student surrounded by encouraging friends grows in confidence.",
        ],
        insight: "Your closest friends are helping to write your future.",
        practice: "Write the names of the five friends you spend the most time with. Beside each, write one way they influence you, positively or negatively. Reflect on what this says about the direction you are heading.",
      }),
      lesson({
        hook: "Some relationships make you feel stronger, braver and better. Others leave you feeling small, pressured or confused. Learning to tell them apart protects your future.",
        teaching: [
          "Healthy relationships show encouragement (they support your goals), accountability (they challenge you when you go wrong) and respect (they value you and your boundaries). Harmful relationships show manipulation (trying to control you), mockery (putting you down or laughing at you) and coercion (pressuring you to do things you do not want to do).",
          "Recognising these signs is the first step to protecting yourself. A harmful relationship can be with a friend, a classmate, a romantic partner or even someone older. If a relationship consistently leaves you feeling afraid, ashamed or pressured, it is a warning sign. Talk to a trusted adult if you need help.",
        ],
        inPractice: [
          "Healthy: a friend who says, \"I know you can do it. Let's study together.\"",
          "Harmful: a friend who says, \"If you were really my friend, you would skip class with me.\"",
          "Harmful: someone who constantly mocks your dreams or appearance.",
        ],
        insight: "A true friend builds you up; a harmful one breaks you down.",
        practice: "Make two lists: signs of healthy relationships and signs of harmful ones. Think about your own relationships and identify one that is healthy and one that may need boundaries. Write what you will do about the second one.",
      }),
      lesson({
        hook: "\"Everyone is doing it.\" These three words have pushed many students into choices they later regretted.",
        teaching: [
          "Peer influence is the effect that people your age have on your decisions. It can be positive, such as encouraging you to study, join clubs or help others. It can also be negative, pushing you towards truancy, dishonesty, substance use or other risky behaviour.",
          "Standing firm in your values means deciding in advance what you will and will not do, and being ready to say no respectfully but clearly. It helps to have friends who share your values, to avoid situations where pressure is likely, and to remember your purpose and goals when pressure comes.",
        ],
        inPractice: [
          "Saying, \"No thanks, I'm not interested,\" and walking away from a risky situation.",
          "Suggesting a different activity when friends plan something you are uncomfortable with.",
          "Spending more time with friends who respect your choices.",
        ],
        insight: "Deciding your values before the pressure comes makes it easier to stand firm when it does.",
        practice: "Write three situations where you might face negative peer pressure. For each, write what you would say and do to stand firm in your values. Practise saying your responses aloud.",
      }),
      lesson({
        hook: "Strong buildings need strong pillars. Strong relationships need them too.",
        teaching: [
          "This module identifies five pillars of strong relationships. Trust means being reliable and honest. Active listening means truly paying attention when others speak. Empathy means understanding and caring about how others feel. Loyalty means standing by people in good and difficult times. Healthy boundaries mean knowing and respecting limits, both yours and others'.",
          "Boundaries are especially important. They protect your values, time and wellbeing. A healthy boundary might be refusing to share private information, saying no to activities that go against your values, or limiting time with people who are a negative influence. Good friends respect your boundaries.",
        ],
        inPractice: [
          "Trust: keeping a friend's secret, unless it puts someone in danger.",
          "Active listening: putting your phone away and giving your full attention when a friend shares a problem.",
          "Boundaries: telling a friend, \"I'm not comfortable with that,\" and sticking to it.",
        ],
        insight: "Relationships grow strong when trust, listening, empathy, loyalty and boundaries are present together.",
        practice: "Choose one important relationship in your life. Rate it from 1 to 5 on each pillar. Identify one pillar you can strengthen and take one action this week to do so.",
      }),
      lesson({
        hook: "No one achieves their purpose alone. Behind every successful person is a circle of people who supported, guided and believed in them.",
        teaching: [
          "Your purpose circle is the group of people who support your growth and purpose. It includes family members who love and support you, wise peers who share your values and encourage you, and trusted adult mentors such as teachers, coaches, faith leaders or relatives who can guide you.",
          "Building your purpose circle takes intention. Appreciate the support your family gives. Choose friends wisely. Seek out adults you respect and ask for their advice. These relationships will help you stay on track, grow in wisdom and handle challenges along the way.",
        ],
        inPractice: [
          "Thanking a parent or guardian for their sacrifices and support.",
          "Joining a study group or club with peers who share your goals.",
          "Asking a teacher you respect if you can talk to them about your future plans.",
        ],
        insight: "Choose your circle wisely, because your circle will help shape your course.",
        practice: "Draw three circles labelled family, wise peers and trusted mentors. Write names in each. Identify three practical steps you will take to strengthen your purpose circle this month. This forms your module output.",
      }),
    ],
    quiz: [
      q(
        "What does \"the power of association\" mean?",
        [
          "Friends have no influence on us",
          "We tend to become like the people we spend the most time with",
          "Only parents influence our decisions",
          "Popular people are always good influences",
        ],
        1,
        "The people closest to us shape our thoughts, habits and choices over time.",
      ),
      q(
        "Which of the following is a sign of a harmful relationship?",
        ["Encouragement", "Accountability", "Respect", "Coercion"],
        3,
        "Manipulation, mockery and coercion are signs of harmful relationships.",
      ),
      q(
        "What does standing firm against negative peer influence involve?",
        [
          "Deciding your values in advance and saying no respectfully but clearly",
          "Always doing what friends suggest",
          "Avoiding all friendships",
          "Arguing with everyone",
        ],
        0,
        "Being prepared in advance makes it easier to resist pressure when it comes.",
      ),
      q(
        "Which of these is one of the five pillars of strong relationships?",
        ["Popularity", "Competition", "Active listening", "Control"],
        2,
        "The pillars are trust, active listening, empathy, loyalty and healthy boundaries.",
      ),
      q(
        "Which groups make up a student's purpose circle?",
        [
          "Family, wise peers and trusted adult mentors",
          "Online followers only",
          "Only teachers",
          "Anyone who is popular",
        ],
        0,
        "A purpose circle includes supportive family, encouraging peers and trusted mentors.",
      ),
    ],
    exam: [
      q(
        "James's new friends often skip class and he has started doing the same. Which concept from PURP 203 best explains his change?",
        ["Healthy boundaries", "The power of association", "Active listening", "Loyalty"],
        1,
        "We tend to become like the people we spend the most time with.",
      ),
      q(
        "A friend says, \"If you really cared about me, you would lie to the teacher for me.\" What kind of behaviour is this?",
        ["Encouragement", "Accountability", "Respect", "Manipulation"],
        3,
        "Using guilt to pressure someone into dishonesty is manipulation.",
      ),
      q(
        "Which response best shows a healthy boundary?",
        [
          "\"I'm not comfortable with that, so I won't do it.\"",
          "\"Okay, I'll do whatever you want.\"",
          "\"I'll do it this time so you don't get upset.\"",
          "\"I don't care what happens.\"",
        ],
        0,
        "A healthy boundary clearly and respectfully states your limits.",
      ),
      q(
        "Which step would most strengthen a student's purpose circle?",
        [
          "Spending more time alone online",
          "Avoiding adults",
          "Asking a respected teacher or mentor for guidance about their future",
          "Choosing friends based only on popularity",
        ],
        2,
        "Seeking trusted adult mentors adds wisdom and guidance to your purpose circle.",
      ),
    ],
  },

  "PURP 204": {
    lessons: [
      lesson({
        hook: "You do not need to be a prefect, a captain or a class monitor to influence people. Someone is watching how you live right now.",
        teaching: [
          "Influence is the effect your words and actions have on others. Many students think influence belongs only to people with titles, such as prefects, captains and leaders. But influence is mostly about everyday example. Younger siblings copy you, classmates notice how you behave and friends are affected by your choices.",
          "Understanding that everyone influences someone helps you take your conduct seriously. Your purpose is not only about what you achieve; it is also about the kind of influence you have on the people around you.",
        ],
        inPractice: [
          "A younger sibling copying the way you speak to your parents.",
          "Classmates becoming more serious about studying because they see you working hard.",
          "A friend choosing honesty because they saw you do the same.",
        ],
        insight: "You do not need a title to have influence; you only need to be seen.",
        practice: "List five people who are influenced by you: siblings, classmates, friends or younger students. For each, write what they might be learning from your example right now.",
      }),
      lesson({
        hook: "When one student starts helping clean the classroom, others often join in. When one student starts mocking someone, others often join that too. Conduct spreads.",
        teaching: [
          "The ripple effect of conduct means that behaviour spreads through a peer group. Honesty encourages honesty, kindness encourages kindness and diligence encourages others to work hard. Carelessness, rudeness and dishonesty also spread, often faster than we expect.",
          "This means your choices affect more than just you. A single act of kindness can start a chain reaction of goodness. A single act of bullying can make it seem acceptable to others. Being aware of the ripple effect helps you choose conduct that makes your school a better place.",
        ],
        inPractice: [
          "Starting a habit of greeting and including new students, which others begin to copy.",
          "Refusing to laugh at a cruel joke, which helps others refuse too.",
          "Working hard in group projects, which raises the standard for the whole group.",
        ],
        insight: "Every action starts a ripple; make sure yours spread goodness.",
        practice: "Think of a time when someone else's behaviour, good or bad, spread through your class or group. Write what happened. Then choose one positive behaviour you will practise this week to start a good ripple.",
      }),
      lesson({
        hook: "Some people get others to follow them through respect. Others do it through fear, gossip or pressure. Both are influence, but only one is healthy.",
        teaching: [
          "Positive influence is leading by integrity, respect and service. It means influencing others through your good example, honest words and genuine care. People follow positive influencers because they trust and respect them.",
          "Manipulation is influencing others through fear, gossip, threats or pressure. It may get quick results, but it damages relationships and trust. A manipulator controls people for their own benefit, while a positive influencer helps others grow and make their own good choices.",
        ],
        inPractice: [
          "Positive influence: encouraging a friend to join a club by sharing how it has helped you.",
          "Manipulation: threatening to spread rumours unless someone does what you want.",
          "Positive influence: leading a group project by listening to everyone and sharing tasks fairly.",
        ],
        insight: "Positive influence lifts people up; manipulation pushes them down.",
        practice: "Write two examples of positive influence and two of manipulation that you have seen at school. Reflect honestly: have you ever used manipulation? Write how you could use positive influence instead.",
      }),
      lesson({
        hook: "It is easy to do the right thing when everyone agrees. Moral courage is doing the right thing when it is unpopular.",
        teaching: [
          "Moral courage means standing up for what is right even when it is difficult, unpopular or risky. In school life, this might mean standing up for a student being bullied, including someone who is left out, refusing to cheat or reporting something wrong to a teacher.",
          "Moral courage does not mean being aggressive or self-righteous. It means acting with fairness, kindness and firmness. It often starts small: a quiet word of support, a refusal to join in or a decision to sit with someone who is alone. Small acts of courage can change the culture of a whole school.",
        ],
        inPractice: [
          "Telling classmates, \"That's not funny,\" when someone is being mocked.",
          "Inviting a student who always sits alone to join your group.",
          "Reporting cheating or bullying to a trusted teacher.",
        ],
        insight: "Courage is not the absence of fear; it is doing what is right in spite of it.",
        practice: "Think of a situation at school where moral courage is needed. Write what the right action would be, what makes it difficult and how you could take that action respectfully. If it is safe, take a small step this week.",
      }),
      lesson({
        hook: "Change in a school, a family or a community often begins with one person deciding to make a difference.",
        teaching: [
          "A change agent is someone who actively helps to make things better. As a student, you can be a change agent by uplifting your peers, helping your siblings and contributing to a positive school culture. This could mean starting a study group, organising a clean-up, encouraging kindness or helping younger students settle in.",
          "Becoming a change agent starts with noticing what needs to improve, then taking practical steps to help. You do not need to fix everything at once. Start small, involve others and keep going. Over time, your efforts can shape the culture around you.",
        ],
        inPractice: [
          "Starting a weekly study group for classmates who are struggling.",
          "Organising a classroom or school clean-up day.",
          "Mentoring a younger student who is new to the school.",
        ],
        insight: "You do not have to wait to be a leader to start leading change.",
        practice: "Identify one area at home, at school or in your community where you can become a more positive influence. Write what you will do, who you will involve and when you will start. This forms your module output.",
      }),
    ],
    quiz: [
      q(
        "According to the module, what is influence mainly about?",
        [
          "Holding a formal title like prefect",
          "Being popular",
          "Everyday example: how your words and actions affect others",
          "Being the oldest in a group",
        ],
        2,
        "Influence is mostly about everyday example, not formal status.",
      ),
      q(
        "What is the ripple effect of conduct?",
        [
          "Behaviour, good or bad, spreads through a peer group",
          "Only adults influence behaviour",
          "Conduct only affects the person doing it",
          "Good behaviour never spreads",
        ],
        0,
        "Honesty, kindness and diligence spread, and so do carelessness and dishonesty.",
      ),
      q(
        "What is the difference between positive influence and manipulation?",
        [
          "There is no difference",
          "Manipulation is always more effective",
          "Positive influence uses fear",
          "Positive influence leads through integrity and respect; manipulation uses fear, gossip or pressure",
        ],
        3,
        "Positive influence builds trust; manipulation damages it.",
      ),
      q(
        "What is moral courage?",
        [
          "Doing the right thing only when everyone agrees",
          "Standing up for what is right even when it is unpopular",
          "Being aggressive to win arguments",
          "Avoiding difficult situations",
        ],
        1,
        "Moral courage means acting rightly despite difficulty or unpopularity.",
      ),
      q(
        "What is a change agent?",
        [
          "Someone who complains about problems",
          "Someone who waits for others to act",
          "Someone who actively helps to make things better",
          "Someone who only follows rules",
        ],
        2,
        "A change agent notices what needs to improve and takes practical steps to help.",
      ),
    ],
    exam: [
      q(
        "Sarah is not a prefect but notices her younger brother copying how she talks to their parents. What does this show?",
        [
          "Everyone influences someone through everyday example",
          "Only prefects have influence",
          "Influence only happens at school",
          "Her brother is not affected by her",
        ],
        0,
        "Influence comes through example, not only through titles.",
      ),
      q(
        "A class leader gets classmates to obey by threatening to spread rumours about them. Which concept is this?",
        ["Positive influence", "Moral courage", "Change agency", "Manipulation"],
        3,
        "Using threats and gossip to control others is manipulation, not positive influence.",
      ),
      q(
        "When classmates laugh at a student being mocked, Kevin says calmly, \"That's not funny,\" and sits with the student. What is Kevin showing?",
        ["Manipulation", "Moral courage", "Peer pressure", "Popularity"],
        1,
        "Standing up for fairness when it is unpopular is moral courage.",
      ),
      q(
        "Which action best shows a student becoming a change agent?",
        [
          "Complaining that the school is dirty",
          "Waiting for teachers to solve every problem",
          "Organising a clean-up day with classmates",
          "Ignoring problems that do not affect them",
        ],
        2,
        "Change agents take practical steps and involve others in making things better.",
      ),
    ],
  },

  "PURP 205": {
    lessons: [
      lesson({
        hook: "A computer has an operating system that runs in the background and shapes everything it does. What would happen if purpose became the operating system of your life?",
        teaching: [
          "A purpose lifestyle means making purpose your daily operating system rather than an occasional thought. Instead of thinking about purpose only during special lessons or events, you let it shape how you study, speak, spend your time and treat others every day.",
          "This lifestyle brings together everything you have learned in this level: planning, stewarding your gifts, choosing relationships wisely and using your influence well. When purpose is your operating system, these become part of who you are, not just things you know.",
        ],
        inPractice: [
          "Starting each day by remembering your goals and values.",
          "Making decisions about friends, time and activities based on your purpose.",
          "Reviewing each evening whether your day reflected your purpose.",
        ],
        insight: "Purpose is not an occasional thought; it is a daily way of living.",
        practice: "Write a short description of what your day would look like if purpose were your operating system: morning, school, after school and evening. Then choose one part of that day to start living this week.",
      }),
      lesson({
        hook: "If you say you value honesty but lie when it is convenient, or say you value studies but spend all your time with friends who skip class, something is out of line.",
        teaching: [
          "Alignment means making sure that your values (what you believe), your habits (how you act) and your relationships (whom you walk with) all point in the same direction. When they are aligned, you feel more confident, consistent and peaceful. When they are not, you may feel confused, guilty or pulled in different directions.",
          "Checking alignment regularly helps you notice where adjustments are needed. You may need to change a habit, set a boundary in a relationship or remind yourself of a value you have been neglecting. Small adjustments keep your life moving in the direction of your purpose.",
        ],
        inPractice: [
          "Value: education. Habit: daily study. Relationships: friends who also take school seriously.",
          "Value: kindness. Habit: encouraging others. Relationships: friends who do not mock people.",
          "Noticing a gap, such as valuing health but staying up late every night, and making a change.",
        ],
        insight: "When your values, habits and relationships agree, your purpose grows strong.",
        practice: "Write your three most important values. For each, write one habit that supports it and one relationship that supports it. Identify one area where they are not aligned and decide on one change.",
      }),
      lesson({
        hook: "Who are you when no teacher is watching, during the long holidays, or when you are scrolling online late at night?",
        teaching: [
          "Consistency across environments means living with the same integrity in class, at home, during holidays and on social media. Many students behave well at school but differently at home, or present one image in person and another online. Purposeful living means being the same person everywhere.",
          "Social media deserves special attention. What you post, comment on and share reflects your character and can affect your reputation for years. A purpose lifestyle includes posting respectfully, refusing to join online bullying and being careful about the content you consume.",
        ],
        inPractice: [
          "Keeping a study routine during the holidays, not only during term.",
          "Speaking to family members with the same respect you show teachers.",
          "Thinking before posting: \"Would I be comfortable if my parents, teachers or future employer saw this?\"",
        ],
        insight: "Integrity means being the same person in every place, online and offline.",
        practice: "Rate your consistency from 1 to 5 in four environments: class, home, holidays and social media. For your lowest score, write one change you will make to live with greater integrity there.",
      }),
      lesson({
        hook: "Every student who tries to live with purpose will face obstacles. The question is not whether they will come, but how you will respond when they do.",
        teaching: [
          "This lesson looks at four common obstacles. Setbacks such as poor marks, failures or disappointments can make you want to give up. Peer pressure can push you away from your values. Phone and media distractions can steal hours of time and focus. Loss of motivation can make purpose feel unimportant.",
          "Each obstacle can be overcome. Treat setbacks as lessons rather than final verdicts. Prepare responses to peer pressure in advance. Set limits on phone use, such as no phone during study time. When motivation is low, rely on your habits and remind yourself why your purpose matters.",
        ],
        inPractice: [
          "After a poor test result, reviewing your mistakes and making a study plan.",
          "Keeping your phone in another room during homework time.",
          "Reading your written goals when you feel unmotivated.",
        ],
        insight: "Obstacles are not stop signs; they are part of the road.",
        practice: "Identify the obstacle that affects you most. Write a specific plan to overcome it, including one action for the next time it appears. Share the plan with a friend or mentor.",
      }),
      lesson({
        hook: "Athletes have coaches, teams and regular reviews of their performance. Students who want to grow in purpose need the same kind of support.",
        teaching: [
          "Accountability means inviting trusted people to check on your progress and help you stay on track. This could be a parent, teacher, mentor or close friend who shares your values. Regularly reviewing your progress with them helps you notice what is working, what is not and what to change.",
          "Continuous growth means never thinking you have \"arrived\". There is always more to learn, more character to build and more ways to serve. Students who keep growing, with the support of mentors and peers, are well prepared to live purposefully for the rest of their lives.",
        ],
        inPractice: [
          "Meeting a mentor or teacher once a month to talk about your goals.",
          "Having an accountability partner who checks on your study habits each week.",
          "Reviewing your purpose commitments at the end of each month.",
        ],
        insight: "Growth is faster and stronger when you walk with others who help you stay on track.",
        practice: "Write five practical commitments that will help you build and sustain a purpose lifestyle. Choose an accountability partner or mentor and agree on when you will review your progress together. This forms your module output.",
      }),
    ],
    quiz: [
      q(
        "What is a purpose lifestyle?",
        [
          "Thinking about purpose only during special events",
          "Making purpose your daily operating system",
          "Following whatever is popular",
          "Focusing only on exams",
        ],
        1,
        "A purpose lifestyle lets purpose shape daily choices, not only occasional thoughts.",
      ),
      q(
        "What does alignment of values, habits and relationships mean?",
        [
          "Your beliefs, actions and the people you walk with all point in the same direction",
          "Having many friends",
          "Changing your values to fit in",
          "Keeping your values secret",
        ],
        0,
        "When values, habits and relationships agree, purpose grows strong.",
      ),
      q(
        "Why does the module give special attention to social media?",
        [
          "Because social media is always harmful",
          "Because online behaviour does not matter",
          "Because only adults use social media",
          "Because what you post reflects your character and can affect your reputation for years",
        ],
        3,
        "Consistency includes living with integrity online as well as offline.",
      ),
      q(
        "Which of these is a recommended way to overcome phone and media distractions?",
        [
          "Keeping your phone nearby during study",
          "Checking notifications every few minutes",
          "Setting limits, such as no phone during study time",
          "Studying only when you feel like it",
        ],
        2,
        "Clear limits on phone use protect your time and focus.",
      ),
      q(
        "What is the role of accountability in building a purpose lifestyle?",
        [
          "Trusted people help you review progress and stay on track",
          "It means being punished for mistakes",
          "It means keeping your goals secret",
          "It is only needed by adults",
        ],
        0,
        "Accountability partners and mentors help you notice what is working and what to change.",
      ),
    ],
    exam: [
      q(
        "Brian studies hard during term but stops completely in the holidays and forgets much of what he learned. Which aspect of a purpose lifestyle does he need to strengthen?",
        [
          "Consistency across environments, including holidays",
          "Popularity",
          "Manipulation",
          "Peer pressure",
        ],
        0,
        "A purpose lifestyle is lived consistently in class, at home, in holidays and online.",
      ),
      q(
        "Mary values kindness but often joins friends in mocking others online. What is the problem?",
        [
          "She has too many values",
          "Her values and her habits are not aligned",
          "Kindness is not important",
          "Social media does not matter",
        ],
        1,
        "When values and habits conflict, alignment is broken and purpose is weakened.",
      ),
      q(
        "After failing a test, a student says, \"I'm just not meant to succeed.\" How should a setback be viewed, according to the module?",
        [
          "As a final verdict",
          "As a reason to give up",
          "As someone else's fault",
          "As a lesson to learn from and a reason to adjust the plan",
        ],
        3,
        "Setbacks are part of the road, not stop signs.",
      ),
      q(
        "Which plan best supports continuous growth?",
        [
          "Keeping goals private and never reviewing them",
          "Assuming you have already arrived",
          "Reviewing commitments monthly with a mentor or accountability partner",
          "Changing goals every day",
        ],
        2,
        "Regular review with trusted people supports steady growth.",
      ),
    ],
  },
};
