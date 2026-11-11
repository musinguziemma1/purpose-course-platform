-- Timed quiz sessions are backend-only. Correct answers remain in the stored
-- snapshot; clients receive only prompts/options until their own review.
CREATE TABLE public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id integer NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) > 0),
  pass_mark integer NOT NULL CHECK (pass_mark BETWEEN 0 AND 100),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempt_id integer UNIQUE REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  CONSTRAINT assessment_sessions_deadline CHECK (expires_at > started_at),
  CONSTRAINT assessment_sessions_submitted CHECK (status <> 'submitted' OR (attempt_id IS NOT NULL AND submitted_at IS NOT NULL))
);
CREATE INDEX assessment_sessions_profile_idx ON public.assessment_sessions(profile_id, assessment_id);
CREATE INDEX assessment_sessions_assessment_idx ON public.assessment_sessions(assessment_id);
CREATE UNIQUE INDEX assessment_sessions_active_idx ON public.assessment_sessions(profile_id, assessment_id) WHERE status = 'in_progress';
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'purpose_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_sessions TO purpose_app;
    CREATE POLICY purpose_backend_access ON public.assessment_sessions FOR ALL TO purpose_app USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.assessment_sessions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.assessment_sessions FROM authenticated;
  END IF;
END $$;
REVOKE ALL ON public.assessment_sessions FROM PUBLIC;

-- Course certificates may share a level; a level award has its own scope.
DROP INDEX public.certificates_course_unique_idx;
DROP INDEX public.certificates_level_unique_idx;
CREATE UNIQUE INDEX certificates_course_unique_idx ON public.certificates(profile_id, course_id) WHERE kind = 'course';
CREATE UNIQUE INDEX certificates_level_unique_idx ON public.certificates(profile_id, level_id) WHERE kind = 'level';

-- Sharing is always an explicit learner choice; existing choices are retained.
ALTER TABLE public.instrument_sessions ALTER COLUMN shared_with_mentor SET DEFAULT false;

-- The audit identified one demonstration award owned by a disabled seed login.
-- Keep its history while preventing it from verifying as a real qualification.
UPDATE public.certificates AS certificate SET revoked_at = now()
FROM public.profiles AS profile INNER JOIN public.users AS account ON account.id = profile.user_id
WHERE certificate.profile_id = profile.id AND certificate.revoked_at IS NULL
  AND account.is_active = false AND account.email IN (
    'admin@purposecourse.org', 'editor@purposecourse.org', 'author@purposecourse.org',
    'writer@purposecourse.org', 'mentor@purposecourse.org', 'student@purposecourse.org'
  );
