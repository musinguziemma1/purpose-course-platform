import type { ModuleContent } from "../types";
import { lesson, q } from "./helpers";

/** Purpose Program for Schools · Level 1: Foundation – Understanding Purpose. */
export const SCHOOLS_LEVEL_1: Record<string, ModuleContent> = {
  "PURP 101": {
    lessons: [
      lesson({
        hook: "Every invention, every building and every tool was made for a reason. A pen is made to write and a key to open a door. If even a simple object has a purpose, what about you?",
        teaching: [
          "Purpose is the reason you exist and the unique contribution you are meant to make to the world. It is bigger than a career or an exam result. It is about who you are becoming and how your life can make a positive difference to other people.",
          "Purpose matters for students because it gives meaning to what you do every day. When you know why you are studying, building friendships and growing your character, school stops feeling like a list of tasks and becomes preparation for a life that counts.",
        ],
        inPractice: [
          "A student who knows she wants to help sick people sees her biology lessons as preparation, not just homework.",
          "A boy who discovers he loves helping younger children begins to see that teaching or mentoring could be part of his purpose.",
          "A learner who believes his life matters is less likely to waste it on harmful habits.",
        ],
        insight: "You are not an accident; your life was made to make a difference.",
        practice: "Write down three things you are good at, three things you care about and one problem in the world that bothers you. Keep this page safe. These are the first clues to your purpose.",
      }),
      lesson({
        hook: "A leaf on a river goes wherever the water pushes it. A fish can swim against the current. Which one are you more like at school?",
        teaching: [
          "Drifting means living without direction: following the crowd, doing whatever your friends do, or simply repeating routines without thinking. Many students drift by copying others, giving in to peer pressure or waiting for someone else to decide for them.",
          "Intentional living means choosing your direction on purpose. You think about what matters, make decisions based on your values and take responsibility for your actions. It does not mean being unfriendly or different just to stand out. It means being the one who decides what your life will be about.",
        ],
        inPractice: [
          "Choosing to revise for a test instead of spending the whole evening on your phone because your friends are.",
          "Saying no when friends pressure you to do something that goes against your values.",
          "Planning your week so that study, rest, family and fun all have their place.",
        ],
        insight: "If you do not choose your direction, someone or something else will choose it for you.",
        practice: "Think about yesterday. List three things you did because you chose them and three things you did just because others were doing them. Pick one \"drifting\" habit and decide what you will do differently this week.",
      }),
      lesson({
        hook: "Detectives solve mysteries by following clues. Discovering your identity works in a similar way: your life is full of clues about who you are and what you are made for.",
        teaching: [
          "This lesson explores four clues to identity. Interests are the subjects and activities you enjoy and keep returning to. Natural strengths are the things you do well, often without much effort. Core values are the beliefs that matter most to you, such as honesty, fairness, kindness or faith. Aspirations are your hopes and dreams for the future.",
          "Each clue tells you something, but together they tell you much more. When your interests, strengths, values and aspirations point in the same direction, you begin to see the shape of your purpose. Understanding yourself is one of the most important steps towards discovering why you are here.",
        ],
        inPractice: [
          "Interest: you love drawing and designing. Strength: you notice details others miss.",
          "Value: you care deeply about fairness. Aspiration: you dream of defending people who are treated unjustly.",
          "Noticing that friends often come to you for advice, which may be a clue to a strength in listening.",
        ],
        insight: "The more you understand yourself, the clearer your purpose becomes.",
        practice: "Draw four boxes labelled interests, strengths, values and aspirations. Fill each with at least three words or phrases. Circle any words that seem connected and write one sentence about what they might say about your purpose.",
      }),
      lesson({
        hook: "Purpose is not only for adults or for some faraway future. You can live with purpose today, in the classroom, at break time and on the way home.",
        teaching: [
          "Purpose in student life means applying your values and direction to everyday choices. In class, it shows in how seriously you take learning, how you treat teachers and whether you do your own work honestly. In friendships, it shows in who you choose to spend time with and how you treat others. In personal conduct, it shows in your words, habits and the way you handle difficulties.",
          "Small daily choices add up. A student who chooses honesty, effort and kindness every day is building the character that a meaningful life needs. Purpose is not just a big decision you make once; it is a series of small decisions you make every day.",
        ],
        inPractice: [
          "Paying attention in a lesson you find difficult because you know learning is preparing you for your future.",
          "Standing up for a classmate who is being teased.",
          "Choosing friends who encourage you to do well rather than those who pull you down.",
        ],
        insight: "Your purpose is not waiting for you after school; it begins in how you live at school.",
        practice: "Choose one area this week (class, friendships or personal conduct) and write one purposeful choice you will make every day in that area. At the end of the week, write what changed.",
      }),
      lesson({
        hook: "The questions you ask yourself shape the person you become. \"How can I be popular?\" leads to one kind of life. \"What difference can I make?\" leads to a very different one.",
        teaching: [
          "Two powerful questions can shape your future. \"Who am I?\" helps you understand your identity: your strengths, values and story. \"What difference can I make?\" helps you look beyond yourself to the needs of others and the contribution your life could bring.",
          "Asking these questions regularly keeps you growing. Your answers may change as you learn more about yourself, and that is normal. What matters is that you keep asking, reflecting and acting on what you discover. Students who ask good questions about their lives tend to make wiser decisions about their future.",
        ],
        inPractice: [
          "Keeping a journal where you write your answers to \"Who am I?\" every few weeks and notice how they change.",
          "Talking with a parent, teacher or mentor about what difference they think you could make.",
          "Looking around your school and community to find needs you could help meet.",
        ],
        insight: "Great lives often begin with great questions.",
        practice: "Write your answers to two questions: \"Who am I?\" (at least five sentences) and \"What difference can I make?\" (at least three ideas). Share one idea with a friend, parent or teacher this week.",
      }),
    ],
    quiz: [
      q(
        "What is purpose, as explained in this module?",
        [
          "Getting the highest grades in class",
          "The reason you exist and the unique contribution you are meant to make",
          "Becoming popular at school",
          "Doing whatever your friends do",
        ],
        1,
        "Purpose is about why you exist and how your life can make a positive difference.",
      ),
      q(
        "What does it mean to drift through life?",
        [
          "Living without direction, following the crowd or routines without thinking",
          "Planning your future carefully",
          "Making decisions based on your values",
          "Taking responsibility for your actions",
        ],
        0,
        "Drifting means being carried along by others or by habit instead of choosing your direction.",
      ),
      q(
        "Which list shows the four clues to identity in this module?",
        [
          "Clothes, phone, friends and money",
          "Grades, sports, popularity and looks",
          "Interests, natural strengths, core values and aspirations",
          "Parents, teachers, school and town",
        ],
        2,
        "Your interests, strengths, values and aspirations together reveal the shape of your purpose.",
      ),
      q(
        "How does purpose show up in student life?",
        [
          "Only when choosing a career",
          "Only in the final year of school",
          "Only during exams",
          "In daily choices in class, friendships and personal conduct",
        ],
        3,
        "Purpose is lived through small daily choices, not only big future decisions.",
      ),
      q(
        "Which two questions does the module say can shape your future?",
        [
          "\"Who am I?\" and \"What difference can I make?\"",
          "\"How can I be popular?\" and \"What do others think?\"",
          "\"What is the easiest path?\" and \"Who can do it for me?\"",
          "\"How much money will I make?\" and \"What car will I drive?\"",
        ],
        0,
        "These questions help you understand your identity and look beyond yourself to the contribution you can make.",
      ),
    ],
    exam: [
      q(
        "Brian spends every evening doing whatever his friends are doing, even when he has exams the next day. Which concept best describes this?",
        ["Intentional living", "Drifting with the crowd", "Discovering his strengths", "Living with purpose"],
        1,
        "Brian is letting others choose his direction instead of making intentional choices.",
      ),
      q(
        "Aisha loves science, is good at caring for others, values kindness and dreams of working in a hospital. What do these clues suggest?",
        [
          "Her clues point in a similar direction, giving her an early picture of her purpose",
          "She should ignore them until she leaves school",
          "Interests and values are unimportant",
          "Only her exam results matter",
        ],
        0,
        "When interests, strengths, values and aspirations line up, they reveal the shape of a person's purpose.",
      ),
      q(
        "Which of these is the best example of a purposeful decision by a student?",
        [
          "Copying a friend's homework to save time",
          "Skipping class because others are",
          "Choosing to study for a test and helping a friend understand a difficult topic",
          "Spending all free time on social media",
        ],
        2,
        "A purposeful decision is guided by values and future direction, not by convenience or pressure.",
      ),
      q(
        "How can a sense of purpose influence a student's future?",
        [
          "It has no effect until adulthood",
          "It only matters for students with high grades",
          "It removes the need to study",
          "It guides daily choices, motivates learning and helps build character for a meaningful life",
        ],
        3,
        "Purpose shapes the choices, habits and character that create a student's future.",
      ),
    ],
  },

  "PURP 102": {
    lessons: [
      lesson({
        hook: "Imagine two students. One has the latest phone and many followers. The other is the one everyone trusts when something goes wrong. Which one has more value?",
        teaching: [
          "Many students measure their worth by false measures: exam scores, clothes, phones, popularity or how many people like their posts. These things can change quickly. A low mark, an old phone or a disagreement with friends can make someone feel worthless, even though their true value has not changed at all.",
          "True worth comes from being human and from your character: who you are and how you treat others. Every person has dignity, whatever their grades or background. Your value grows as you become honest, kind, responsible and helpful. These qualities cannot be bought, and they cannot be taken away by a bad result.",
        ],
        inPractice: [
          "Reminding yourself after a disappointing test that one result does not define who you are.",
          "Treating a classmate from a poorer family with the same respect as anyone else.",
          "Choosing not to judge people by their clothes, phones or popularity.",
        ],
        insight: "Your grades describe your performance, not your worth.",
        practice: "Write down three things people often use to measure a student's worth. Next to each, explain why it does not define true value. Then write three qualities you believe make a person truly valuable.",
      }),
      lesson({
        hook: "A building needs strong pillars to stand. A person of value also stands on pillars, the qualities that hold their character together.",
        teaching: [
          "This module teaches five pillars of a person of value. Honesty means telling the truth even when it is hard. Integrity means doing the right thing even when no one is watching. Respect for self and others means treating yourself and everyone around you with dignity. Empathy means understanding and caring about how others feel. Responsibility means owning your actions and doing what you are supposed to do.",
          "These pillars support each other. A student who is honest but not respectful may hurt people with the truth. A student who is kind but not responsible may let people down. Building all five pillars makes you someone others can trust and rely on.",
        ],
        inPractice: [
          "Honesty: admitting you broke something rather than blaming someone else.",
          "Integrity: refusing to cheat in an exam even when you could get away with it.",
          "Empathy: noticing a classmate who looks sad and asking if they are all right.",
        ],
        insight: "Character is built pillar by pillar, choice by choice.",
        practice: "Score yourself from 1 to 5 on each pillar: honesty, integrity, respect, empathy and responsibility. Choose your lowest pillar and write one action you will take every day this week to strengthen it.",
      }),
      lesson({
        hook: "Your reputation at school is built one conversation, one group project and one promise at a time.",
        teaching: [
          "Attitude and conduct at school show who you really are. How you speak to classmates and teachers, whether you are kind to people who are left out, how you work in a team and whether you keep your word all build your reputation. A good reputation takes time to build but can be damaged quickly by gossip, rudeness or unreliability.",
          "Students with a trustworthy reputation are given more responsibility and opportunities. Teachers trust them with tasks, classmates choose them for projects and friends rely on them. Being reliable and kind is not only good for others; it also opens doors for you.",
        ],
        inPractice: [
          "Doing your fair share in group work rather than leaving it to others.",
          "Speaking respectfully to teachers, even when you disagree.",
          "Refusing to spread gossip about classmates.",
        ],
        insight: "Your reputation walks into the room before you do.",
        practice: "For one week, keep a small record of your conduct. Each day, write one thing you did that built trust and one thing you could have done better. At the end of the week, choose one habit to improve.",
      }),
      lesson({
        hook: "You do not need to wait until you are an adult to make a difference. You can add value right now, in your classroom, your home and your neighbourhood.",
        teaching: [
          "Adding value means making things better for the people around you. At school, it might mean helping a classmate understand a topic, encouraging someone who is discouraged or keeping the classroom clean. At home, it might mean helping with chores, caring for younger siblings or being respectful to parents. In your community, it might mean helping elderly neighbours or taking part in clean-up activities.",
          "Small acts of service matter. They build your character, strengthen relationships and show that you are a person of value. When students add value where they are, whole classrooms and families become better places.",
        ],
        inPractice: [
          "Offering to explain a maths problem to a classmate who is struggling.",
          "Washing dishes at home without being asked.",
          "Greeting and helping an elderly neighbour carry their shopping.",
        ],
        insight: "Wherever you are, you can leave the place better than you found it.",
        practice: "Plan three acts of service for this week: one at school, one at home and one in your community. After completing them, write how each one affected the other person and how it made you feel.",
      }),
      lesson({
        hook: "Good character does not happen by accident. It grows when you turn good values into daily habits.",
        teaching: [
          "Intentional character growth means choosing the qualities you want to develop and practising them every day. Knowing that honesty is good is not enough; you become honest by telling the truth again and again, especially when it is difficult. Habits turn values into character.",
          "Character growth takes time and patience. You will sometimes fail, and that is part of learning. What matters is that you keep trying, learn from your mistakes and keep building. The student you are becoming is shaped by the habits you practise today.",
        ],
        inPractice: [
          "Practising punctuality by arriving early for every class this week.",
          "Choosing one kind word to say to a different person every day.",
          "Owning your mistakes quickly instead of making excuses.",
        ],
        insight: "Values become character when they become habits.",
        practice: "Choose three personal qualities you want to develop. For each, write why it matters and one daily habit that will build it. Track your habits for two weeks with a simple tick chart.",
      }),
    ],
    quiz: [
      q(
        "According to the module, which of these is a false measure of a student's worth?",
        ["Honesty", "Kindness", "Popularity on social media", "Responsibility"],
        2,
        "Popularity, clothes and exam scores are false measures. True worth comes from dignity and character.",
      ),
      q(
        "Which list shows the five pillars of a person of value in this module?",
        [
          "Honesty, integrity, respect for self and others, empathy and responsibility",
          "Wealth, fame, beauty, intelligence and strength",
          "Grades, sports, music, art and dance",
          "Popularity, confidence, fashion, phones and friends",
        ],
        0,
        "These five qualities hold a person's character together.",
      ),
      q(
        "What does integrity mean?",
        [
          "Being the most popular student",
          "Getting good grades",
          "Always agreeing with friends",
          "Doing the right thing even when no one is watching",
        ],
        3,
        "Integrity means your actions stay right whether or not anyone is watching.",
      ),
      q(
        "What is one result of building a trustworthy reputation at school?",
        [
          "You are given more responsibility and opportunities",
          "You no longer need to study",
          "You never make mistakes",
          "You become the most popular student",
        ],
        0,
        "Teachers and classmates trust reliable, kind students with tasks, projects and opportunities.",
      ),
      q(
        "How do values become character, according to the module?",
        [
          "By memorising definitions",
          "By practising them repeatedly as daily habits",
          "By waiting until adulthood",
          "By telling others about them",
        ],
        1,
        "Character grows when values are practised over and over until they become habits.",
      ),
    ],
    exam: [
      q(
        "Grace feels worthless after failing a test. What would PURP 102 remind her?",
        [
          "Her worth depends on her grades",
          "She should stop trying",
          "One result describes her performance, not her worth as a person",
          "Only popular students have value",
        ],
        2,
        "True worth comes from human dignity and character, not from a single exam score.",
      ),
      q(
        "During an exam, Kevin could easily copy from the student next to him without being caught, but he chooses not to. Which pillar is he showing?",
        ["Integrity", "Popularity", "Competition", "Empathy"],
        0,
        "Integrity means doing what is right even when no one would find out.",
      ),
      q(
        "Which is the best example of adding value at home?",
        [
          "Waiting to be told before helping",
          "Complaining about chores",
          "Spending all evening on your phone",
          "Helping a younger sibling with homework without being asked",
        ],
        3,
        "Adding value means making life better for others, especially through service no one asked for.",
      ),
      q(
        "Why does the module say character growth requires patience?",
        [
          "Because character cannot change",
          "Because it takes time, includes mistakes and grows through continued practice",
          "Because only adults can grow character",
          "Because habits are not important",
        ],
        1,
        "Character develops gradually. Mistakes are part of learning as long as you keep building.",
      ),
    ],
  },

  "PURP 103": {
    lessons: [
      lesson({
        hook: "When people ask, \"What do you want to be when you grow up?\", most students name a job. But a better question might be, \"What difference do you want to make, and which work will help you make it?\"",
        teaching: [
          "A career is the work you do over a long period of your life. It can be much more than a way to earn money. A career can be a vehicle for expressing your purpose: a way to use your gifts to serve others and make a positive difference.",
          "Earning money is important, because it helps you support yourself and your family. But when a career is connected to purpose, it brings meaning as well as income. A doctor who heals, a farmer who feeds a nation and an engineer who builds safe roads all serve society through their work.",
        ],
        inPractice: [
          "A student who wants to be a teacher because she loves helping others learn.",
          "A student who wants to be an engineer because he wants to bring electricity and water to rural areas.",
          "A student who dreams of a business that creates jobs for young people in her community.",
        ],
        insight: "A career is not just how you will earn a living; it is how you can make a contribution.",
        practice: "Write three careers you find interesting. For each, write how it could help other people and what kind of difference it could make in your community.",
      }),
      lesson({
        hook: "A traveller who knows their destination packs differently from one who has no idea where they are going. Thinking about your career early helps you prepare well.",
        teaching: [
          "Starting to think about your career while you are still at school has many benefits. It helps you choose subjects wisely, because some careers need particular subjects. It motivates better study habits, because you can see why your effort matters. It helps you look for mentors who are already working in fields you are interested in.",
          "Thinking early does not mean you must decide everything now. Your interests may change, and that is normal. But having some direction helps you make better choices and prepare for opportunities instead of being surprised by them.",
        ],
        inPractice: [
          "A student interested in medicine makes sure to take sciences seriously.",
          "A student interested in law practises debating and reads widely.",
          "A student asks a relative who works as an accountant about their job and what subjects helped them.",
        ],
        insight: "You do not need every answer now, but thinking early gives your studies a clear direction.",
        practice: "Choose one career you are curious about. Find out which subjects and skills it requires. Then write how this information might change the way you study or the subjects you choose.",
      }),
      lesson({
        hook: "A compass helps travellers find the right direction. A career compass helps you find work that fits who you are and what the world needs.",
        teaching: [
          "The career compass has four points. Interests are what you enjoy. Abilities are what you do well. Values are what you believe is important. Community needs are the problems and opportunities around you that your work could address. A career that lines up with all four is more likely to bring both satisfaction and impact.",
          "Using the career compass means thinking carefully rather than choosing a career only because it is popular, because your friends are choosing it or because it seems to pay well. Money and status matter, but they are not the only things to consider. The best career choices fit who you are and how you want to serve.",
        ],
        inPractice: [
          "Interests: you enjoy working with computers. Abilities: you solve problems quickly.",
          "Values: you care about helping farmers. Community need: farmers in your area struggle to reach markets.",
          "Possible direction: developing technology that helps farmers sell their produce.",
        ],
        insight: "The best career direction is found where your interests, abilities and values meet real needs.",
        practice: "Draw a compass with four points labelled interests, abilities, values and community needs. Write at least two answers for each point, then write one or two careers that might fit all four.",
      }),
      lesson({
        hook: "Before a building goes up, workers lay a strong foundation. Your education and skills are the foundation for your future career.",
        teaching: [
          "Education and skills development prepare you for a purposeful career. Literacy (reading and writing well) and numeracy (working confidently with numbers) are needed in almost every career. Digital skills help you work in a world shaped by technology. Practical skills, such as fixing things, cooking, farming or building, are valuable in many careers.",
          "Work ethic is just as important as knowledge. It means being punctual, finishing tasks, working hard and doing your best even when it is difficult. Students who develop a strong work ethic at school carry it into their careers, where it opens doors and builds trust.",
        ],
        inPractice: [
          "Reading for twenty minutes every day to improve your literacy.",
          "Practising maths problems regularly rather than only before exams.",
          "Learning a practical or digital skill during the holidays, such as typing, sewing or basic coding.",
        ],
        insight: "What you learn and how you work today are building the foundation of your future.",
        practice: "Write down one skill in each area (literacy, numeracy, digital and practical) that you want to improve. Choose one and practise it for at least fifteen minutes every day this week.",
      }),
      lesson({
        hook: "A nation needs doctors and teachers, but it also needs farmers, plumbers, electricians, drivers and business owners. Every honest profession matters.",
        teaching: [
          "Every honest profession can serve society and transform communities. Farmers feed the nation. Builders and tradespeople create homes, schools and roads. Health workers care for the sick. Teachers shape minds. Business people create jobs and provide goods and services. No honest work is too small to make a difference.",
          "Some students feel pressure to choose only certain \"respectable\" careers. Yet the value of a career comes from how it serves others and how well it is done. A purposeful mechanic or farmer can make as great a difference as anyone in an office, if they work with excellence and integrity.",
        ],
        inPractice: [
          "A farmer who uses modern methods to grow more food and trains other farmers.",
          "An electrician who brings safe electricity to homes and schools.",
          "A tailor who runs a small business and trains young people in useful skills.",
        ],
        insight: "Every honest profession, done with excellence, can transform a community.",
        practice: "Choose a career you are interested in. Write how it serves society, who benefits from it and one way someone in that career could make an even bigger positive difference.",
      }),
    ],
    quiz: [
      q(
        "What is the relationship between purpose and career in this module?",
        [
          "A career is only for earning money",
          "Purpose and career have nothing to do with each other",
          "A career can be a vehicle for expressing purpose and serving others",
          "Only some careers can express purpose",
        ],
        2,
        "A career provides income, but it can also be a way to use your gifts to make a positive difference.",
      ),
      q(
        "Why should students start thinking about their careers while still at school?",
        [
          "So they can stop studying",
          "It helps them choose subjects, build better study habits and find mentors",
          "Because they must decide their whole future now",
          "Because career choices can never change",
        ],
        1,
        "Thinking early gives studies direction without requiring every decision to be final.",
      ),
      q(
        "What are the four points of the career compass?",
        [
          "Money, status, location and popularity",
          "Parents, teachers, friends and neighbours",
          "Grades, sports, music and art",
          "Interests, abilities, values and community needs",
        ],
        3,
        "A career that aligns all four points is more likely to bring satisfaction and impact.",
      ),
      q(
        "Why is work ethic important in preparing for a career?",
        [
          "Habits like punctuality, finishing tasks and working hard carry into future careers",
          "Work ethic is only needed after school",
          "Knowledge is more important than work ethic",
          "Work ethic only matters in sports",
        ],
        0,
        "A strong work ethic built at school opens doors and builds trust in any career.",
      ),
      q(
        "Which statement reflects the module's view of careers that serve society?",
        [
          "Only office jobs make a difference",
          "Every honest profession, done with excellence, can serve and transform communities",
          "Farming and trades are less valuable than other careers",
          "Only high-paying careers matter",
        ],
        1,
        "The value of a career comes from how it serves others and how well it is done.",
      ),
    ],
    exam: [
      q(
        "Peter wants to become a lawyer only because his friends say it pays well, though he dislikes reading and debating. Which tool from PURP 103 would help him most?",
        ["Choosing what is popular", "Asking only about salary", "The career compass", "Waiting until after school"],
        2,
        "The career compass helps Peter consider his interests, abilities, values and community needs, not just pay.",
      ),
      q(
        "Which action best shows a student preparing for a career through education and skills?",
        [
          "Learning a practical or digital skill during the holidays and reading every day",
          "Studying only the night before exams",
          "Avoiding difficult subjects",
          "Waiting until university to begin",
        ],
        0,
        "Building literacy, numeracy, digital and practical skills now lays a strong foundation.",
      ),
      q(
        "A student says, \"Farming is not a real career.\" How would the module respond?",
        [
          "Farming is less important than other careers",
          "Only office careers serve society",
          "Farming should be avoided by educated people",
          "Farming feeds the nation and, done with excellence, can transform communities",
        ],
        3,
        "Every honest profession has value because it serves real needs.",
      ),
      q(
        "Why might a student's career interests change over time, and is that a problem?",
        [
          "It means they have failed",
          "Interests often change as students learn more about themselves; thinking early still gives helpful direction",
          "Career interests should never change",
          "It means they should stop planning",
        ],
        1,
        "Thinking early is about direction, not a final decision. Changing interests are a normal part of growing.",
      ),
    ],
  },

  "PURP 104": {
    lessons: [
      lesson({
        hook: "Some people say, \"If it is my destiny, it will happen anyway.\" But does a seed become a tree if it is never planted?",
        teaching: [
          "Predestination is the belief that a person's life has a design or plan made in advance, often understood as coming from God. This module explores destiny as potential design rather than automatic outcome. In other words, your life may have a meaningful plan, but that plan is like a seed that must be planted, watered and cared for.",
          "Believing your life has a purpose can give you confidence and hope. It tells you that you matter and that your life is not random. But this belief should encourage you to act, prepare and grow, not to sit back and wait for things to happen.",
        ],
        inPractice: [
          "A student who believes she was made to lead begins practising leadership by serving in class.",
          "A student who believes his life has a purpose works hard because he wants to be ready for it.",
          "A family that believes their child has a bright future invests in the child's education and character.",
        ],
        insight: "Destiny is a seed of possibility, not a guarantee without effort.",
        practice: "Write what you believe about destiny and purpose. Then write one way this belief could motivate you to work harder or prepare better, starting this week.",
      }),
      lesson({
        hook: "Every day you make hundreds of choices: what to say, what to do, whom to spend time with. These choices are building your future, one decision at a time.",
        teaching: [
          "Personal choices matter even if you believe your life has a purpose. Free will means you have the ability to choose. Effort means working hard to develop your gifts. Daily decisions about studying, friendships and habits can either activate your purpose, helping it grow, or delay it, holding you back.",
          "Think of purpose as a road and your choices as steps along it. Good choices move you forward; poor choices may take you off course or slow you down. You are not a passenger in your own life; you are responsible for the steps you take.",
        ],
        inPractice: [
          "Choosing to attend all your classes and pay attention, even when it is boring.",
          "Choosing friends who encourage you rather than those who lead you into trouble.",
          "Choosing to practise your talent regularly rather than wasting it.",
        ],
        insight: "Your purpose may be planned, but your progress depends on your choices.",
        practice: "List five choices you made today. For each, write whether it moved you towards your purpose, away from it or neither. Write one choice you will make differently tomorrow.",
      }),
      lesson({
        hook: "Drop a stone into a pond and ripples spread across the whole surface. The decisions you make today send ripples into your future.",
        teaching: [
          "The ripple effect means that small decisions today can have large effects later. Habits in class, such as listening, completing homework and asking questions, affect your results and future opportunities. Friendships influence your values and behaviour. Health habits, such as sleep, food and exercise, affect your energy and wellbeing for years to come.",
          "Many adults look back and see how decisions they made as students shaped their lives. Some wish they had studied harder, chosen better friends or looked after their health. Understanding the ripple effect helps you make wiser decisions now.",
        ],
        inPractice: [
          "A student who reads every day becomes a strong communicator, which opens many future opportunities.",
          "A student who chooses friends involved in harmful activities may be drawn into trouble.",
          "A student who sleeps well and eats healthily has more energy to learn and grow.",
        ],
        insight: "Today's small choices are tomorrow's big results.",
        practice: "Choose one habit you have now: in class, in friendships or in health. Draw a ripple diagram showing how this habit might affect you in one year, five years and ten years. Decide whether to keep it or change it.",
      }),
      lesson({
        hook: "\"If it is meant to be, I don't need to try.\" It sounds peaceful, but this attitude has stolen many people's futures.",
        teaching: [
          "Passivity means waiting for things to happen without taking action. Excuses are the reasons we give for not acting: \"I'm not smart enough\", \"My family is poor\", \"The teacher doesn't like me\". Some excuses contain real difficulties, but they become harmful when they stop us from trying.",
          "Rejecting passivity means taking responsibility for what you can control. You cannot control everything, but you can control your effort, your attitude and your choices. Students who reject excuses and take action, even in difficult circumstances, often achieve far more than they expected.",
        ],
        inPractice: [
          "Instead of saying \"I'm bad at maths\", asking for help and practising more.",
          "Instead of blaming your circumstances, finding creative ways to study, such as borrowing books.",
          "Instead of waiting for opportunities, looking for them and preparing for them.",
        ],
        insight: "Excuses keep you where you are; action moves you where you are meant to be.",
        practice: "Write down three excuses you often use. For each, write what part is true and what part you can control. Choose one and take a specific action on it this week.",
      }),
      lesson({
        hook: "A farmer prays for rain but still ploughs the field and plants the seeds. Faith and action work together.",
        teaching: [
          "Faith plus action means balancing confidence in a meaningful future with discipline, preparation and wise decision-making. Faith gives you hope and courage. Action is what you do to prepare and grow. Faith without action can become waiting without working, while action without faith can become worry and fear.",
          "When you combine faith and action, you work hard while trusting that your efforts have meaning. You plan for your future while staying open to new directions. You make wise decisions and leave room for the outcomes you cannot control.",
        ],
        inPractice: [
          "Praying or reflecting about your future while also studying hard for exams.",
          "Setting goals for the year and reviewing them regularly.",
          "Asking a teacher or mentor for advice before making an important decision.",
        ],
        insight: "Faith gives you hope for the future; action builds the path to get there.",
        practice: "Write a short plan with two parts: what you are trusting and hoping for in your future, and three specific actions you will take this month to prepare. Share your plan with a parent, teacher or mentor.",
      }),
    ],
    quiz: [
      q(
        "How does this module explain destiny?",
        [
          "As an automatic outcome that requires no effort",
          "As something only lucky people have",
          "As potential design: a seed of possibility that must be developed",
          "As something that cannot be understood",
        ],
        2,
        "Destiny is potential design, not automatic outcome. It must be developed through action.",
      ),
      q(
        "Why do personal choices matter, even when someone believes their life has a purpose?",
        [
          "Because daily decisions can activate or delay purpose",
          "Because choices do not affect the future",
          "Because purpose happens automatically",
          "Because only adults make important choices",
        ],
        0,
        "Free will, effort and daily decisions can move a person towards their purpose or hold them back.",
      ),
      q(
        "What is the ripple effect of today's decisions?",
        [
          "Decisions only affect the present moment",
          "Only big decisions matter",
          "The future cannot be influenced",
          "Small decisions today can have large effects later",
        ],
        3,
        "Habits in class, friendships and health send ripples into your future opportunities.",
      ),
      q(
        "Which attitude does the module encourage students to reject?",
        [
          "Taking responsibility for your effort",
          "\"If it's meant to be, I don't need to try.\"",
          "Asking for help when you struggle",
          "Looking for opportunities",
        ],
        1,
        "This passive attitude prevents action and can steal a person's future.",
      ),
      q(
        "What does \"faith plus action\" mean?",
        [
          "Balancing confidence in a meaningful future with discipline, preparation and wise decisions",
          "Waiting for good things to happen",
          "Rejecting faith and relying only on effort",
          "Avoiding planning",
        ],
        0,
        "Faith gives hope and courage; action prepares the path.",
      ),
    ],
    exam: [
      q(
        "Samuel believes he is destined to become a doctor, so he does not study science seriously. What does PURP 104 teach about his attitude?",
        [
          "He is right, because destiny is automatic",
          "He should change his destiny",
          "Destiny is potential that must be developed through effort; his choices matter",
          "Studying is unrelated to purpose",
        ],
        2,
        "Believing in a purpose should motivate preparation, not replace it.",
      ),
      q(
        "Which choice is most likely to send a positive ripple into a student's future?",
        [
          "Staying up late every night on social media",
          "Building a daily habit of reading and revising",
          "Skipping breakfast regularly",
          "Choosing friends who discourage studying",
        ],
        1,
        "A daily reading and revision habit builds knowledge and skills that open future opportunities.",
      ),
      q(
        "A student says, \"My family is poor, so I can't succeed.\" Which response best reflects the module?",
        [
          "That is true, so there is no point trying",
          "Poverty has no effect on anyone",
          "Ignore the problem completely",
          "Acknowledge the real difficulty, but focus on what you can control, such as effort, attitude and creative solutions",
        ],
        3,
        "Excuses can contain real difficulties, but taking responsibility for what you can control leads forward.",
      ),
      q(
        "Which example best combines faith and action?",
        [
          "Trusting that your future is meaningful while setting goals, studying hard and seeking advice",
          "Waiting for good results without studying",
          "Studying while believing nothing matters",
          "Refusing to plan because the future is unknown",
        ],
        0,
        "Faith and action work together: hope for the future, combined with discipline and preparation.",
      ),
    ],
  },

  "PURP 105": {
    lessons: [
      lesson({
        hook: "Saying \"I believe in honesty\" is easy. Telling the truth when it might get you into trouble is harder. Purpose becomes real when beliefs become actions.",
        teaching: [
          "Purpose in action means translating your beliefs and values into habits that others can see. If you value respect, it shows in how you speak to people. If you value hard work, it shows in how you approach your studies. If you value kindness, it shows in how you treat those who are left out.",
          "Living purposefully is not about perfect behaviour or big speeches. It is about matching what you do with what you believe, day after day. When your actions line up with your values, people trust you, and you grow in confidence and character.",
        ],
        inPractice: [
          "Valuing learning and therefore completing homework on time.",
          "Valuing family and therefore helping at home without complaining.",
          "Valuing kindness and therefore including a new student in your group.",
        ],
        insight: "Your purpose is seen not in what you say, but in what you do.",
        practice: "Write three values that matter to you. For each one, write a specific action that would show it in your daily life. Do all three actions this week.",
      }),
      lesson({
        hook: "A single drop of water does little, but water dripping on the same stone for years can carve a hole through it. Small, repeated actions are powerful.",
        teaching: [
          "Daily habits are actions you repeat so often that they become automatic. Good habits, such as reading, revising, exercising, being punctual and being kind, build character, excellence and trust over time. Bad habits, such as procrastinating, gossiping or wasting time, slowly damage your progress.",
          "Consistency is doing the right things regularly, not just when you feel like it. A student who studies a little every day usually learns more than one who studies a lot only before exams. Consistency builds trust too: people rely on those who behave the same way every day.",
        ],
        inPractice: [
          "Revising for thirty minutes every evening rather than cramming the night before exams.",
          "Arriving on time every day, which builds a reputation for reliability.",
          "Making your bed every morning to start the day with discipline.",
        ],
        insight: "You become what you repeatedly do.",
        practice: "Choose one good habit to start and one bad habit to reduce. Track both for fourteen days with a simple chart, and write what changes you notice.",
      }),
      lesson({
        hook: "Purpose is not something you switch on at school and off at home. It shows wherever you are.",
        teaching: [
          "This module describes three arenas of purposeful living. At home, purpose looks like respect for parents and family members, sharing chores and caring for younger siblings. At school, it looks like diligent study, punctuality and encouraging your classmates. In the community, it looks like caring for the environment, being kind to elders and being a positive role model for younger children.",
          "Living purposefully in all three arenas builds consistent character. A student who is respectful at school but rude at home is not yet fully living their purpose. The goal is to be the same person of value wherever you go.",
        ],
        inPractice: [
          "At home: helping with cooking or cleaning and caring for a younger brother or sister.",
          "At school: studying diligently, arriving on time and encouraging a struggling friend.",
          "In the community: picking up litter, greeting elders respectfully and setting a good example for children.",
        ],
        insight: "A purposeful life looks the same at home, at school and in the community.",
        practice: "Write one purposeful action you will take in each arena this week: home, school and community. At the end of the week, write what you did and how people responded.",
      }),
      lesson({
        hook: "Some days you will wake up excited to learn and serve. Other days you will feel tired, bored or discouraged. Purposeful people keep going on both kinds of day.",
        teaching: [
          "Moods change from day to day. If you only do the right thing when you feel motivated, you will be inconsistent. Self-discipline is the ability to keep your commitments even when you do not feel like it. It is like a muscle: the more you use it, the stronger it becomes.",
          "Discipline is not about being harsh with yourself. It is about remembering why your commitments matter and acting on them anyway. Over time, disciplined students achieve more, build stronger character and earn greater trust than those who follow their moods.",
        ],
        inPractice: [
          "Starting your homework on time even when you would rather watch television.",
          "Keeping a promise to help a friend even though you are tired.",
          "Going to sports practice or club activities regularly, not only when you feel like it.",
        ],
        insight: "Motivation gets you started; discipline keeps you going.",
        practice: "Think of one commitment you often skip when you are not in the mood. Write why it matters, then decide on a simple rule to keep it (for example, \"I start homework at 5 pm, no matter what\"). Follow the rule for seven days.",
      }),
      lesson({
        hook: "Many people make promises to themselves at the start of a year and forget them a few weeks later. Writing and tracking your commitments helps you keep them.",
        teaching: [
          "Personal purpose commitments are specific, actionable habits you decide to practise. Good commitments are clear (you know exactly what to do), realistic (you can actually do them) and measurable (you can tell whether you did them). For example, \"I will read for twenty minutes every evening\" is better than \"I will read more\".",
          "Tracking your commitments helps you see your progress and stay accountable. A simple chart, a journal or a partner who checks in with you can make a big difference. When you miss a day, simply start again. Progress, not perfection, is the goal.",
        ],
        inPractice: [
          "\"I will help with one household chore every day without being asked.\"",
          "\"I will arrive at school ten minutes early every day.\"",
          "\"I will encourage one classmate every week.\"",
        ],
        insight: "A commitment you write down and track is far more likely to become part of your life.",
        practice: "Write three practical purpose commitments: one for home, one for school and one for your community. Make each clear, realistic and measurable. Create a tracking chart and use it for the next month. This forms your module output.",
      }),
    ],
    quiz: [
      q(
        "What does it mean to put purpose into action?",
        [
          "Talking about your values often",
          "Translating your beliefs and values into habits others can see",
          "Waiting until adulthood to live purposefully",
          "Only behaving well when teachers are watching",
        ],
        1,
        "Purpose becomes real when values show up in daily actions.",
      ),
      q(
        "Why are daily habits powerful?",
        [
          "Because small actions repeated over time build character, excellence and trust",
          "Because habits never change",
          "Because one action is enough",
          "Because only big actions matter",
        ],
        0,
        "Repeated actions shape who you become, for good or bad.",
      ),
      q(
        "Which are the three arenas of purposeful living in this module?",
        [
          "Sports, music and art",
          "Morning, afternoon and evening",
          "Home, school and community",
          "Friends, family and phone",
        ],
        2,
        "Purpose should be lived consistently at home, at school and in the community.",
      ),
      q(
        "What is self-discipline?",
        [
          "Doing only what you feel like doing",
          "Being harsh with yourself",
          "Following your moods",
          "Keeping your commitments even when you do not feel motivated",
        ],
        3,
        "Discipline keeps you faithful to commitments when motivation changes.",
      ),
      q(
        "Which is the best example of a personal purpose commitment?",
        [
          "\"I will be better.\"",
          "\"I will read for twenty minutes every evening.\"",
          "\"I will try harder sometimes.\"",
          "\"I will be good.\"",
        ],
        1,
        "Good commitments are clear, realistic and measurable.",
      ),
    ],
    exam: [
      q(
        "Mary is polite at school but rude to her parents at home. What does PURP 105 suggest she needs?",
        [
          "Consistent character across the arenas of home, school and community",
          "More friends at school",
          "Better grades",
          "Less time at home",
        ],
        0,
        "A purposeful life looks the same in every arena, not only where others are watching.",
      ),
      q(
        "John studies only the night before exams and often struggles. What change would the module recommend?",
        [
          "Studying even later at night",
          "Giving up on difficult subjects",
          "Waiting until he feels motivated",
          "Building a consistent daily study habit",
        ],
        3,
        "Small daily study sessions usually build more learning than occasional cramming.",
      ),
      q(
        "Which statement best describes the relationship between motivation and discipline?",
        [
          "Discipline is unnecessary if you are motivated",
          "Motivation and discipline are the same",
          "Motivation gets you started; discipline keeps you going",
          "Only motivated people can be disciplined",
        ],
        2,
        "Moods change, so discipline is needed to stay faithful to commitments.",
      ),
      q(
        "A student misses two days of her tracked commitment. What does the module advise?",
        [
          "Give up, because the commitment has failed",
          "Simply start again; progress, not perfection, is the goal",
          "Make the commitment much harder",
          "Stop tracking so no one knows",
        ],
        1,
        "Missing a day is not failure. Restarting quickly keeps progress going.",
      ),
    ],
  },
};
