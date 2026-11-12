ALTER TABLE public.users ADD COLUMN is_demo_account boolean NOT NULL DEFAULT false;
-- Keep the former public seed credentials inactive; only label their provenance.
UPDATE public.users SET is_demo_account = true
WHERE email IN ('admin@purposecourse.org','editor@purposecourse.org','author@purposecourse.org','writer@purposecourse.org','mentor@purposecourse.org','student@purposecourse.org');
