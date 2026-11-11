-- Retain the original request history, but remove demonstration counters for
-- the six known seed listings that have never had a real file attached.
UPDATE public.resources SET download_count = 0, file_size = 'Unavailable'
WHERE file_url IS NULL AND slug IN (
  'purpose-journal-template', 'five-principles-overview', 'gifting-audit-worksheet',
  'vision-plan-12-months', 'purpose-and-career-guide', 'clarity-coach-session-audio'
);

-- Existing uploaded files and their metrics are deliberately preserved.
UPDATE public.resources AS resource SET
  file_url = starter.url, file_format = 'PDF', file_size = starter.size,
  description = starter.description, is_featured = true
FROM (VALUES
  ('five-principles-overview', '/resources/five-principles-overview.pdf', '75 KiB',
   'A one-page overview of Identity, Source, Purpose, Potential and Destiny, with reflection prompts and a practical next step. Starter edition.'),
  ('gifting-audit-worksheet', '/resources/gifting-audit-worksheet.pdf', '96 KiB',
   'Six reflection questions, a peer-feedback grid and a two-week experiment to explore your strengths using specific examples. Starter edition.'),
  ('vision-plan-12-months', '/resources/vision-plan-12-months.pdf', '97 KiB',
   'A two-page planning canvas with an observable outcome, quarterly milestones, a weekly time budget and a review rhythm. Starter edition.')
) AS starter(slug, url, size, description)
WHERE resource.slug = starter.slug AND resource.file_url IS NULL;
