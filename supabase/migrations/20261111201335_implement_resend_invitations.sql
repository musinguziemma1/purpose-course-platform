CREATE TABLE public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  full_name varchar(160) NOT NULL,
  role_id integer NOT NULL REFERENCES public.roles(id),
  organization_id integer NOT NULL REFERENCES public.organizations(id),
  invited_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_invitations_pending_email_idx ON public.account_invitations(email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX account_invitations_role_idx ON public.account_invitations(role_id);
CREATE INDEX account_invitations_org_idx ON public.account_invitations(organization_id);
CREATE INDEX account_invitations_inviter_idx ON public.account_invitations(invited_by_id);

ALTER TABLE public.notification_outbox
  ALTER COLUMN profile_id DROP NOT NULL,
  ADD COLUMN invitation_id uuid REFERENCES public.account_invitations(id) ON DELETE CASCADE,
  ADD COLUMN recipient_email varchar(255),
  ADD COLUMN attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN first_attempt_at timestamptz,
  ADD COLUMN locked_until timestamptz,
  ADD COLUMN lease_token uuid,
  ADD COLUMN provider_id varchar(96) UNIQUE,
  ADD COLUMN request_ciphertext text,
  ADD COLUMN delivered_at timestamptz;
CREATE INDEX notification_outbox_claim_idx ON public.notification_outbox(status,scheduled_at) WHERE channel = 'email';
CREATE INDEX notification_outbox_profile_idx ON public.notification_outbox(profile_id);
CREATE UNIQUE INDEX notification_outbox_invitation_idx ON public.notification_outbox(invitation_id);
ALTER TABLE public.email_events
  ADD COLUMN provider_event_id varchar(160) UNIQUE,
  ADD COLUMN provider_message_id varchar(96);
CREATE INDEX email_events_outbox_idx ON public.email_events(outbox_id);
CREATE INDEX email_events_profile_idx ON public.email_events(profile_id);
CREATE INDEX email_events_message_idx ON public.email_events(provider_message_id);

-- Historical manual/demo dispatch claims have no provider receipt.
UPDATE public.notification_outbox SET status = 'needs_review', error = 'Legacy dispatch was not verified by an email provider.' WHERE status = 'sent';
UPDATE public.email_events SET event = 'legacy_unverified' WHERE provider = 'internal' AND event IN ('sent','opened','delivered');

ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_invitations FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'purpose_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_invitations TO purpose_app;
    CREATE POLICY backend_access ON public.account_invitations FOR ALL TO purpose_app USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON public.account_invitations FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON public.account_invitations FROM authenticated; END IF;
END $$;
