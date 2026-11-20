CREATE TABLE public.programmes (
  id serial PRIMARY KEY,
  slug varchar(96) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  duration varchar(80) NOT NULL,
  structure varchar(180) NOT NULL,
  description text NOT NULL,
  status public.publish_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX programmes_sort_idx ON public.programmes(sort_order);

CREATE TABLE public.programme_levels (
  id serial PRIMARY KEY,
  programme_id integer NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  slug varchar(96) NOT NULL,
  name varchar(200) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX programme_levels_program_slug_idx ON public.programme_levels(programme_id, slug);
CREATE INDEX programme_levels_order_idx ON public.programme_levels(programme_id, sort_order);

CREATE TABLE public.programme_modules (
  id serial PRIMARY KEY,
  programme_level_id integer NOT NULL REFERENCES public.programme_levels(id) ON DELETE CASCADE,
  slug varchar(96) NOT NULL,
  title varchar(220) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX programme_modules_level_slug_idx ON public.programme_modules(programme_level_id, slug);
CREATE INDEX programme_modules_order_idx ON public.programme_modules(programme_level_id, sort_order);

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_modules ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.programmes, public.programme_levels, public.programme_modules FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.programmes, public.programme_levels, public.programme_modules TO purpose_app;
GRANT USAGE, SELECT ON SEQUENCE public.programmes_id_seq, public.programme_levels_id_seq, public.programme_modules_id_seq TO purpose_app;

CREATE POLICY purpose_backend_access ON public.programmes FOR ALL TO purpose_app USING (true) WITH CHECK (true);
CREATE POLICY purpose_backend_access ON public.programme_levels FOR ALL TO purpose_app USING (true) WITH CHECK (true);
CREATE POLICY purpose_backend_access ON public.programme_modules FOR ALL TO purpose_app USING (true) WITH CHECK (true);

INSERT INTO public.programmes (slug, name, duration, structure, description, status, sort_order)
VALUES
  ('purpose-program-adults', 'Purpose Program for Adults', '15 weeks', '3 levels · 15 modules',
   'A progressive adult curriculum moving from foundational understanding to purpose discovery and purposeful influence.', 'draft', 1),
  ('purpose-program-students', 'Purpose Program for Students', '1 year', '3 levels · 15 modules',
   'A student curriculum focused on purposeful education, personal development, leadership, service and positive influence.', 'draft', 2),
  ('youlead', 'YouLead!', '9 months', '3 levels · 12 modules · 48 topics',
   'Leadership formation through values, intentional actions and practical leadership for community contribution.', 'draft', 3),
  ('purpose-to-peace', 'Purpose-to-Peace', '9 modules', '3 competency areas · 3 levels of peace leadership',
   'Peace leadership development across personal transformation, healthy relationships and constructive community engagement.', 'draft', 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  duration = EXCLUDED.duration,
  structure = EXCLUDED.structure,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.programme_levels (programme_id, slug, name, sort_order)
SELECT p.id, v.slug, v.name, v.sort_order
FROM (VALUES
  ('purpose-program-adults', 'foundation', 'Foundation – Understanding Purpose', 1),
  ('purpose-program-adults', 'intermediate', 'Intermediate – Purpose Discovery and Clarity', 2),
  ('purpose-program-adults', 'advanced', 'Advanced – Influence and Impact', 3),
  ('purpose-program-students', 'foundation', 'Foundation – Understanding Purpose', 1),
  ('purpose-program-students', 'intermediate', 'Intermediate – Purpose Discovery and Clarity', 2),
  ('purpose-program-students', 'advanced', 'Advanced – Purpose, Leadership and Impact', 3),
  ('youlead', 'values-index', 'Level 1 – Values Index', 1),
  ('youlead', 'actions-index', 'Level 2 – Actions Index', 2),
  ('youlead', 'leadership-index', 'Level 3 – Leadership Index', 3),
  ('purpose-to-peace', 'personal-peace-leadership', 'Personal Peace Leadership – Leading Self', 1),
  ('purpose-to-peace', 'relational-peace-leadership', 'Relational Peace Leadership – Leading Relationships', 2),
  ('purpose-to-peace', 'community-peace-leadership', 'Community Peace Leadership – Leading Communities', 3)
) AS v(programme_slug, slug, name, sort_order)
JOIN public.programmes p ON p.slug = v.programme_slug
ON CONFLICT (programme_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.programme_modules (programme_level_id, slug, title, sort_order)
SELECT l.id, v.module_slug, v.title, v.sort_order
FROM (VALUES
  ('purpose-program-adults', 'foundation', 'module-1', 'PURP 101 – Understanding Purpose', 1),
  ('purpose-program-adults', 'foundation', 'module-2', 'PURP 102 – Becoming a Person of Value', 2),
  ('purpose-program-adults', 'foundation', 'module-3', 'PURP 103 – Purpose and Career: Understanding the Concept of Work', 3),
  ('purpose-program-adults', 'foundation', 'module-4', 'PURP 104 – Purpose and Predestination', 4),
  ('purpose-program-adults', 'foundation', 'module-5', 'PURP 105 – Purpose, Ministry and Calling', 5),
  ('purpose-program-adults', 'intermediate', 'module-1', 'PURP 201 – Discovering Your Purpose', 1),
  ('purpose-program-adults', 'intermediate', 'module-2', 'PURP 202 – Understanding and Liberating Your Potential', 2),
  ('purpose-program-adults', 'intermediate', 'module-3', 'PURP 203 – How Will You Be Remembered?', 3),
  ('purpose-program-adults', 'intermediate', 'module-4', 'PURP 204 – Defining Your Purpose Statement', 4),
  ('purpose-program-adults', 'intermediate', 'module-5', 'PURP 205 – Walking in Dominion: Defining Your Transformation Story', 5),
  ('purpose-program-adults', 'advanced', 'module-1', 'PURP 301 – Vision Building (Part 1): Understanding Vision', 1),
  ('purpose-program-adults', 'advanced', 'module-2', 'PURP 302 – Vision Building (Part 2): Principles of Vision', 2),
  ('purpose-program-adults', 'advanced', 'module-3', 'PURP 303 – Positioning for Emergence: Manifesting as Sons', 3),
  ('purpose-program-adults', 'advanced', 'module-4', 'PURP 304 – Purpose, Time and Relationships', 4),
  ('purpose-program-adults', 'advanced', 'module-5', 'PURP 305 – Becoming Relevant and Impactful', 5),
  ('purpose-program-students', 'foundation', 'module-1', 'PURP 101 – Understanding Purpose', 1),
  ('purpose-program-students', 'foundation', 'module-2', 'PURP 102 – Becoming a Person of Value', 2),
  ('purpose-program-students', 'foundation', 'module-3', 'PURP 103 – Purpose and Career', 3),
  ('purpose-program-students', 'foundation', 'module-4', 'PURP 104 – Purpose and Predestination', 4),
  ('purpose-program-students', 'foundation', 'module-5', 'PURP 105 – Living Purposefully', 5),
  ('purpose-program-students', 'intermediate', 'module-1', 'PURP 201 – Purposeful Planning', 1),
  ('purpose-program-students', 'intermediate', 'module-2', 'PURP 202 – Stewardship of Gifts and Potential', 2),
  ('purpose-program-students', 'intermediate', 'module-3', 'PURP 203 – Purpose and Relationships', 3),
  ('purpose-program-students', 'intermediate', 'module-4', 'PURP 204 – Purpose and Influence', 4),
  ('purpose-program-students', 'intermediate', 'module-5', 'PURP 205 – Building a Purpose Lifestyle', 5),
  ('purpose-program-students', 'advanced', 'module-1', 'PURP 301 – Purpose and Leadership', 1),
  ('purpose-program-students', 'advanced', 'module-2', 'PURP 302 – Purpose and Service', 2),
  ('purpose-program-students', 'advanced', 'module-3', 'PURP 303 – Purpose and Resilience', 3),
  ('purpose-program-students', 'advanced', 'module-4', 'PURP 304 – Purpose and Legacy', 4),
  ('purpose-program-students', 'advanced', 'module-5', 'PURP 305 – Purpose and Multiplication', 5),
  ('youlead', 'values-index', 'module-1', 'Choices, Growth, Attitude and Commitment', 1),
  ('youlead', 'values-index', 'module-2', 'Relationships, Character, Forgiveness and Self-worth', 2),
  ('youlead', 'values-index', 'module-3', 'Responsibility, Courage, Initiative and Priorities', 3),
  ('youlead', 'values-index', 'module-4', 'Teachability, Self-discipline, Resilience and Influence', 4),
  ('youlead', 'actions-index', 'module-1', 'Questions, Values, Priorities and Thoughts Influence My Actions', 1),
  ('youlead', 'actions-index', 'module-2', 'Friends, Experiences, Growth and Pain Influence My Actions', 2),
  ('youlead', 'actions-index', 'module-3', 'Conversations, Self-image, Habits and Relationships Influence My Actions', 3),
  ('youlead', 'actions-index', 'module-4', 'Listening, Health, Perspective and Dreams Influence My Actions', 4),
  ('youlead', 'leadership-index', 'module-1', 'The Definition, Foundation, Heart and Motives of Leadership', 1),
  ('youlead', 'leadership-index', 'module-2', 'Accountability, Teamwork, Passion and Courage in Leadership', 2),
  ('youlead', 'leadership-index', 'module-3', 'Communication, Strengths, Example and Priorities in Leadership', 3),
  ('youlead', 'leadership-index', 'module-4', 'Vision, Practice, Making a Difference and Hope in Leadership', 4),
  ('purpose-to-peace', 'personal-peace-leadership', 'module-1', 'P2P 101 – Knowing Myself: Identity, Self-awareness and Peace', 1),
  ('purpose-to-peace', 'personal-peace-leadership', 'module-2', 'P2P 102 – Discovering My Purpose for Peace', 2),
  ('purpose-to-peace', 'personal-peace-leadership', 'module-3', 'P2P 103 – Character and Ethical Leadership', 3),
  ('purpose-to-peace', 'relational-peace-leadership', 'module-4', 'P2P 104 – Leading with Values', 1),
  ('purpose-to-peace', 'relational-peace-leadership', 'module-5', 'P2P 105 – Understanding Peace and Conflict', 2),
  ('purpose-to-peace', 'relational-peace-leadership', 'module-6', 'P2P 201 – Dialogue and Nonviolent Communication', 3),
  ('purpose-to-peace', 'community-peace-leadership', 'module-7', 'P2P 202 – Diversity, Inclusion and Social Cohesion', 1),
  ('purpose-to-peace', 'community-peace-leadership', 'module-8', 'P2P 203 – Conflict Transformation and Collaborative Problem-Solving', 2),
  ('purpose-to-peace', 'community-peace-leadership', 'module-9', 'P2P 204 – Community Mobilisation and Peace Advocacy', 3)
) AS v(programme_slug, level_slug, module_slug, title, sort_order)
JOIN public.programmes p ON p.slug = v.programme_slug
JOIN public.programme_levels l ON l.programme_id = p.id AND l.slug = v.level_slug
ON CONFLICT (programme_level_id, slug) DO UPDATE SET
  title = EXCLUDED.title,
  sort_order = EXCLUDED.sort_order;
