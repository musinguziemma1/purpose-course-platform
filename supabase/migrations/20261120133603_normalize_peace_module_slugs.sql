UPDATE public.programme_modules AS pm
SET slug = 'module-' || pm.sort_order::text
FROM public.programme_levels AS pl
JOIN public.programmes AS p ON p.id = pl.programme_id
WHERE pm.programme_level_id = pl.id
  AND p.slug = 'purpose-to-peace'
  AND pl.slug IN ('relational-peace-leadership', 'community-peace-leadership');
