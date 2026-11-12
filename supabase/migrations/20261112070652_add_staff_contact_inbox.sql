CREATE TABLE public.contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  email varchar(255),
  subject varchar(240) NOT NULL,
  body text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'new',
  source varchar(24) NOT NULL DEFAULT 'website',
  sender_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  legacy_message_id integer UNIQUE REFERENCES public.messages(id) ON DELETE SET NULL,
  rate_key varchar(64),
  fingerprint varchar(64),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT contact_enquiries_status_check CHECK (status IN ('new','in_progress','resolved')),
  CONSTRAINT contact_enquiries_source_check CHECK (source IN ('website','legacy')),
  CONSTRAINT contact_enquiries_version_check CHECK (version >= 0)
);
CREATE INDEX contact_enquiries_inbox_idx ON public.contact_enquiries(status, created_at);
CREATE INDEX contact_enquiries_rate_idx ON public.contact_enquiries(rate_key, created_at);
CREATE INDEX contact_enquiries_fingerprint_idx ON public.contact_enquiries(fingerprint, created_at);
CREATE INDEX contact_enquiries_sender_idx ON public.contact_enquiries(sender_profile_id);
CREATE INDEX contact_enquiries_assigned_idx ON public.contact_enquiries(assigned_to_id);

CREATE TABLE public.contact_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.contact_enquiries(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email varchar(255) NOT NULL,
  body text NOT NULL,
  outbox_id integer NOT NULL UNIQUE REFERENCES public.notification_outbox(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_replies_enquiry_idx ON public.contact_replies(enquiry_id);
CREATE INDEX contact_replies_author_idx ON public.contact_replies(author_id);

INSERT INTO public.permissions(key,label,module)
VALUES ('contact.manage','Read and respond to website enquiries','contact') ON CONFLICT (key) DO NOTHING;
UPDATE public.roles SET permissions = permissions || '["contact.manage"]'::jsonb
WHERE slug IN ('super_admin','platform_admin') AND NOT permissions @> '["contact.manage"]'::jsonb;
INSERT INTO public.role_permissions(role_id,permission_key)
SELECT id,'contact.manage' FROM public.roles WHERE slug IN ('super_admin','platform_admin')
ON CONFLICT (role_id,permission_key) DO NOTHING;

-- BEGIN LEGACY CONTACT IMPORT
-- One insert formerly fanned out identical rows to staff at the same timestamp.
-- Preserve all originals and retain the raw footer; never guess a recipient email.
INSERT INTO public.contact_enquiries(full_name,subject,body,source,sender_profile_id,legacy_message_id,created_at,updated_at)
SELECT 'Website visitor (legacy)',left(subject,240),body,'legacy',sender_id,min(id),created_at,created_at
FROM public.messages WHERE context_type = 'contact'
GROUP BY sender_id,subject,body,created_at
ON CONFLICT (legacy_message_id) DO NOTHING;
-- END LEGACY CONTACT IMPORT

-- Old recipient notifications must not retain enquiry details outside the inbox.
UPDATE public.notifications SET body = 'An enquiry is waiting in the staff contact inbox.', href = '/admin/contact'
WHERE template_key = 'contact.message_received';

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_enquiries, public.contact_replies FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'purpose_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_enquiries, public.contact_replies TO purpose_app;
    CREATE POLICY backend_access ON public.contact_enquiries FOR ALL TO purpose_app USING (true) WITH CHECK (true);
    CREATE POLICY backend_access ON public.contact_replies FOR ALL TO purpose_app USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON public.contact_enquiries, public.contact_replies FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON public.contact_enquiries, public.contact_replies FROM authenticated; END IF;
END $$;
