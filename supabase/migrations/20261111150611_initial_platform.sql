CREATE TYPE "public"."article_status" AS ENUM('draft', 'submitted', 'in_review', 'revision_requested', 'approved', 'scheduled', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."assessment_attempt_status" AS ENUM('submitted', 'void');--> statement-breakpoint
CREATE TYPE "public"."assessment_kind" AS ENUM('session', 'level');--> statement-breakpoint
CREATE TYPE "public"."certificate_kind" AS ENUM('course', 'level');--> statement-breakpoint
CREATE TYPE "public"."coaching_status" AS ENUM('requested', 'scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('waitlist', 'enrolled', 'completed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."group_submission_status" AS ENUM('draft', 'submitted', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."instrument_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lesson_kind" AS ENUM('video', 'audio', 'reading', 'illustration', 'download', 'practice', 'live');--> statement-breakpoint
CREATE TYPE "public"."lesson_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."live_message_kind" AS ENUM('chat', 'question', 'prompt', 'system');--> statement-breakpoint
CREATE TYPE "public"."live_session_status" AS ENUM('scheduled', 'live', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."live_session_type" AS ENUM('class', 'group_work', 'discussion', 'office_hours');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('review', 'publish', 'community', 'system');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."reflection_visibility" AS ENUM('private', 'mentor', 'cohort');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('worksheet', 'guide', 'template', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."review_action" AS ENUM('submitted', 'review_started', 'comment', 'revision_requested', 'approved', 'rejected', 'scheduled', 'published', 'archived', 'restored');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'submitted', 'reviewed');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(48) DEFAULT 'award' NOT NULL,
	"criteria" text NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"category" varchar(48) DEFAULT 'learning' NOT NULL,
	CONSTRAINT "achievements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" varchar(96) NOT NULL,
	"entity_type" varchar(48) NOT NULL,
	"entity_id" varchar(96),
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"title" varchar(200) NOT NULL,
	"scope" varchar(32) DEFAULT 'platform' NOT NULL,
	"definition" text NOT NULL,
	"query_ref" varchar(96) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "article_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"action" "review_action" NOT NULL,
	"from_status" "article_status",
	"to_status" "article_status",
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"editor_id" uuid,
	"title" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"change_note" varchar(280),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(220) NOT NULL,
	"title" varchar(240) NOT NULL,
	"subtitle" varchar(280),
	"excerpt" text,
	"body" text DEFAULT '' NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"category_id" integer,
	"author_id" uuid NOT NULL,
	"cover_image_url" text,
	"cover_alt" varchar(240),
	"reading_minutes" integer DEFAULT 6 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(200),
	"seo_description" text,
	"published_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"selected_index" integer DEFAULT -1 NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"pass_mark" integer DEFAULT 80 NOT NULL,
	"status" "assessment_attempt_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_index" integer DEFAULT 0 NOT NULL,
	"explanation" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "assessment_kind" DEFAULT 'session' NOT NULL,
	"level_id" integer,
	"course_id" integer,
	"module_id" integer,
	"title" varchar(220) NOT NULL,
	"description" text,
	"pass_mark" integer DEFAULT 80 NOT NULL,
	"time_limit_minutes" integer DEFAULT 15 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"feedback" text,
	"reviewed_by_id" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer,
	"session_id" integer,
	"title" varchar(220) NOT NULL,
	"brief" text NOT NULL,
	"is_collaborative" boolean DEFAULT false NOT NULL,
	"due_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(96) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(96) NOT NULL,
	"principle_question" varchar(160),
	"description" text,
	"accent" varchar(24) DEFAULT 'navy' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "certificate_kind" DEFAULT 'course' NOT NULL,
	"course_id" integer,
	"level_id" integer,
	"title" varchar(240) NOT NULL,
	"level_name" varchar(120),
	"score" integer,
	"hours" integer,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "certificates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "coaching_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"title" varchar(200) NOT NULL,
	"focus" text,
	"status" "coaching_status" DEFAULT 'requested' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 45 NOT NULL,
	"mentor_notes" text,
	"student_reflection" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohort_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" varchar(24) DEFAULT 'learner' NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohort_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"theme" varchar(120) NOT NULL,
	"focus" text NOT NULL,
	"assignment_brief" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(180) NOT NULL,
	"level_id" integer,
	"course_id" integer,
	"description" text NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"capacity" integer DEFAULT 50 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cadence" varchar(120) DEFAULT 'Weekly live class + group work' NOT NULL,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohorts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" varchar(80) DEFAULT 'Purpose Discovery' NOT NULL,
	"description" text NOT NULL,
	"accent" varchar(24) DEFAULT 'gold' NOT NULL,
	"cover_image_url" text,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"guidelines" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" varchar(24) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_participants" (
	"peer_id" varchar(64) PRIMARY KEY NOT NULL,
	"room_code" varchar(40) NOT NULL,
	"live_session_id" integer,
	"profile_id" uuid,
	"display_name" varchar(140) NOT NULL,
	"role" varchar(24) DEFAULT 'student' NOT NULL,
	"mode" varchar(16) DEFAULT 'mesh' NOT NULL,
	"audio_enabled" boolean DEFAULT true NOT NULL,
	"video_enabled" boolean DEFAULT true NOT NULL,
	"sharing_screen" boolean DEFAULT false NOT NULL,
	"hand_raised" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" varchar(40) NOT NULL,
	"from_peer" varchar(64) NOT NULL,
	"to_peer" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(24) NOT NULL,
	"target_id" integer NOT NULL,
	"reporter_id" uuid,
	"reason" varchar(80) NOT NULL,
	"detail" text,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"moderator_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer,
	"name" varchar(160) NOT NULL,
	"brief" text,
	"mentor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(120) NOT NULL,
	"level_number" integer NOT NULL,
	"tagline" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"weeks" integer DEFAULT 5 NOT NULL,
	"accent" varchar(24) DEFAULT 'navy' NOT NULL,
	"pass_mark" integer DEFAULT 80 NOT NULL,
	"icon" varchar(48) DEFAULT 'sprout' NOT NULL,
	"image_url" text,
	"outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "course_levels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text,
	"session_code" varchar(16),
	"estimated_minutes" integer DEFAULT 45 NOT NULL,
	"is_preview" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"code" varchar(16) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"focus_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" varchar(120) DEFAULT 'Experiential presentation' NOT NULL,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "course_sessions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(240),
	"summary" text DEFAULT '' NOT NULL,
	"description" text,
	"cover_image_url" text,
	"accent" varchar(24) DEFAULT 'navy' NOT NULL,
	"estimated_hours" integer DEFAULT 4 NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"is_sequential" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "data_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(64) NOT NULL,
	"record_id" varchar(96) NOT NULL,
	"change_type" varchar(24) DEFAULT 'update' NOT NULL,
	"actor_id" uuid,
	"before" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" uuid,
	"author_name" varchar(140) NOT NULL,
	"body" text NOT NULL,
	"is_removed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"accent" varchar(24) DEFAULT 'navy' NOT NULL,
	"is_members_only" boolean DEFAULT false NOT NULL,
	CONSTRAINT "discussion_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discussion_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"author_name" varchar(140) NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"is_answer" boolean DEFAULT false NOT NULL,
	"is_removed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer,
	"title" varchar(240) NOT NULL,
	"prompt" text,
	"author_name" varchar(140) NOT NULL,
	"author_id" uuid,
	"community_id" integer,
	"thread_type" varchar(24) DEFAULT 'discussion' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"is_removed" boolean DEFAULT false NOT NULL,
	"is_answered" boolean DEFAULT false NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"outbox_id" integer,
	"profile_id" uuid,
	"event" varchar(40) DEFAULT 'queued' NOT NULL,
	"provider" varchar(48) DEFAULT 'internal' NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" varchar(10) NOT NULL,
	"profile_id" uuid,
	"minutes_learned" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"discussions" integer DEFAULT 0 NOT NULL,
	"active_flag" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"level_id" integer,
	"cohort" varchar(80),
	"status" "enrollment_status" DEFAULT 'waitlist' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" varchar(24) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" varchar(220) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "group_submission_status" DEFAULT 'draft' NOT NULL,
	"score" integer,
	"feedback" text,
	"submitted_by_id" uuid,
	"reviewed_by_id" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_bands" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"dimension_id" integer,
	"min_score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"label" varchar(80) NOT NULL,
	"interpretation" text NOT NULL,
	"recommendation" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_dimensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(140) NOT NULL,
	"description" text NOT NULL,
	"low_label" varchar(80) DEFAULT 'Emerging' NOT NULL,
	"high_label" varchar(80) DEFAULT 'Established' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"dimension_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"rationale" text,
	"reverse_scored" boolean DEFAULT false NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"raw_value" integer NOT NULL,
	"scored_value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"band_label" varchar(80) NOT NULL,
	"summary" text NOT NULL,
	"dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_trace" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_results_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "instrument_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"instrument_version" varchar(16) NOT NULL,
	"consent_given" boolean DEFAULT false NOT NULL,
	"shared_with_mentor" boolean DEFAULT true NOT NULL,
	"status" varchar(24) DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"title" varchar(200) NOT NULL,
	"category" varchar(64) DEFAULT 'discovery' NOT NULL,
	"construct" text NOT NULL,
	"description" text,
	"methodology" text NOT NULL,
	"limitations" text NOT NULL,
	"interpretation_guide" text NOT NULL,
	"data_protection" text NOT NULL,
	"consent_summary" text NOT NULL,
	"response_scale" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_method" varchar(32) DEFAULT 'mean_banded' NOT NULL,
	"version" varchar(16) DEFAULT '1.0' NOT NULL,
	"is_proprietary" boolean DEFAULT true NOT NULL,
	"estimated_minutes" integer DEFAULT 8 NOT NULL,
	"status" "instrument_status" DEFAULT 'published' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"superseded_by" varchar(96),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "learner_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"achievement_id" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence" text
);
--> statement-breakpoint
CREATE TABLE "learner_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"mentor_id" uuid,
	"reason" text NOT NULL,
	"severity" varchar(24) DEFAULT 'attention' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "learner_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"mentor_id" uuid,
	"title" varchar(220) NOT NULL,
	"description" text,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer,
	"cohort_week_id" integer,
	"title" varchar(220) NOT NULL,
	"kind" varchar(40) DEFAULT 'practice' NOT NULL,
	"instruction" text NOT NULL,
	"estimated_minutes" integer DEFAULT 15 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid,
	"event_type" varchar(48) NOT NULL,
	"course_id" integer,
	"lesson_id" integer,
	"assessment_id" integer,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"lesson_id" integer NOT NULL,
	"status" "lesson_progress_status" DEFAULT 'not_started' NOT NULL,
	"seconds_watched" integer DEFAULT 0 NOT NULL,
	"note" text,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(220) NOT NULL,
	"kind" "lesson_kind" DEFAULT 'reading' NOT NULL,
	"summary" text,
	"body" text DEFAULT '' NOT NULL,
	"video_url" text,
	"audio_url" text,
	"image_url" text,
	"image_alt" varchar(240),
	"download_url" text,
	"download_label" varchar(120),
	"transcript" text,
	"practice_prompt" text,
	"duration_minutes" integer DEFAULT 10 NOT NULL,
	"is_preview" boolean DEFAULT false NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"live_session_id" integer NOT NULL,
	"author_id" uuid,
	"author_name" varchar(140) NOT NULL,
	"author_role" varchar(32) DEFAULT 'student' NOT NULL,
	"kind" "live_message_kind" DEFAULT 'chat' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"live_session_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'going' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer,
	"module_id" integer,
	"cohort_id" integer,
	"host_id" uuid,
	"title" varchar(220) NOT NULL,
	"description" text,
	"type" "live_session_type" DEFAULT 'class' NOT NULL,
	"status" "live_session_status" DEFAULT 'scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"meeting_url" text,
	"room_code" varchar(40),
	"agenda" text,
	"group_size" integer,
	"recording_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_sessions_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"alt" varchar(240),
	"kind" varchar(32) DEFAULT 'image' NOT NULL,
	"width" integer,
	"height" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"assigned_by_id" uuid,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"focus" varchar(240),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentoring_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"session_id" integer,
	"body" text NOT NULL,
	"visibility" varchar(24) DEFAULT 'shared' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" uuid,
	"recipient_id" uuid NOT NULL,
	"subject" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"context_type" varchar(40),
	"context_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(80) NOT NULL,
	"href" varchar(160) NOT NULL,
	"location" varchar(32) DEFAULT 'header' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"channel" varchar(24) DEFAULT 'email' NOT NULL,
	"template_key" varchar(64) NOT NULL,
	"subject" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'queued' NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"category" varchar(48) NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"push" boolean DEFAULT false NOT NULL,
	"digest" varchar(24) DEFAULT 'instant' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" uuid,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"href" varchar(240),
	"is_read" boolean DEFAULT false NOT NULL,
	"channel" varchar(24) DEFAULT 'in_app' NOT NULL,
	"template_key" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"role_slug" varchar(48) DEFAULT 'student' NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(180) NOT NULL,
	"plan" varchar(32) DEFAULT 'partner' NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"country" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(140) NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(260),
	"body" text DEFAULT '' NOT NULL,
	"status" varchar(24) DEFAULT 'published' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(96) NOT NULL,
	"label" varchar(200) NOT NULL,
	"module" varchar(48) DEFAULT 'general' NOT NULL,
	"description" text,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(96) NOT NULL,
	"module" varchar(48) DEFAULT 'learning' NOT NULL,
	"profile_id" uuid,
	"session_id" varchar(64),
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" integer NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(160),
	"bio" text,
	"avatar_url" text,
	"organization_id" integer,
	"headline" varchar(200),
	"timezone" varchar(64) DEFAULT 'Africa/Kampala' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(24) NOT NULL,
	"target_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"emoji" varchar(16) DEFAULT 'amen' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflections" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_profile_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"session_id" integer,
	"prompt" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"visibility" "reflection_visibility" DEFAULT 'mentor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" integer NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"type" "resource_type" DEFAULT 'guide' NOT NULL,
	"file_url" text,
	"file_format" varchar(24) DEFAULT 'PDF' NOT NULL,
	"file_size" varchar(24) DEFAULT '1.2 MB' NOT NULL,
	"level" varchar(48),
	"download_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_key" varchar(96) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(48) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"level" integer DEFAULT 10 NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scoring_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer,
	"assessment_id" integer,
	"name" varchar(160) NOT NULL,
	"rule_type" varchar(48) DEFAULT 'weighted_mean' NOT NULL,
	"expression" text NOT NULL,
	"band_definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" varchar(16) DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(48) NOT NULL,
	"profile_id" uuid,
	"ip_address" varchar(64),
	"user_agent" text,
	"severity" varchar(24) DEFAULT 'info' NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"live_session_id" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'present' NOT NULL,
	"minutes_attended" integer DEFAULT 0 NOT NULL,
	"note" varchar(240),
	"marked_by_id" uuid,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(96) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" varchar(160),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(160),
	"source" varchar(64) DEFAULT 'website' NOT NULL,
	"principle" varchar(64),
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(96) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(140) NOT NULL,
	"role" varchar(160),
	"location" varchar(120),
	"quote" text NOT NULL,
	"level_slug" varchar(96),
	"is_featured" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_editor_id_profiles_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_reviewed_by_id_profiles_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_mentor_id_profiles_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_weeks" ADD CONSTRAINT "cohort_weeks_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_participants" ADD CONSTRAINT "conference_participants_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_participants" ADD CONSTRAINT "conference_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_mentor_id_profiles_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_changes" ADD CONSTRAINT "data_changes_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_post_id_discussion_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."discussion_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_group_id_discussion_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."discussion_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_outbox_id_notification_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."notification_outbox"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement" ADD CONSTRAINT "engagement_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_course_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."course_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_submissions" ADD CONSTRAINT "group_submissions_group_id_course_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."course_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_submissions" ADD CONSTRAINT "group_submissions_submitted_by_id_profiles_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_submissions" ADD CONSTRAINT "group_submissions_reviewed_by_id_profiles_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_bands" ADD CONSTRAINT "instrument_bands_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_bands" ADD CONSTRAINT "instrument_bands_dimension_id_instrument_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."instrument_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_dimensions" ADD CONSTRAINT "instrument_dimensions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_items" ADD CONSTRAINT "instrument_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_items" ADD CONSTRAINT "instrument_items_dimension_id_instrument_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."instrument_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_responses" ADD CONSTRAINT "instrument_responses_session_id_instrument_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."instrument_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_responses" ADD CONSTRAINT "instrument_responses_item_id_instrument_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."instrument_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_results" ADD CONSTRAINT "instrument_results_session_id_instrument_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."instrument_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_results" ADD CONSTRAINT "instrument_results_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_results" ADD CONSTRAINT "instrument_results_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_sessions" ADD CONSTRAINT "instrument_sessions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_sessions" ADD CONSTRAINT "instrument_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_achievements" ADD CONSTRAINT "learner_achievements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_achievements" ADD CONSTRAINT "learner_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_flags" ADD CONSTRAINT "learner_flags_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_flags" ADD CONSTRAINT "learner_flags_mentor_id_profiles_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_goals" ADD CONSTRAINT "learner_goals_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_goals" ADD CONSTRAINT "learner_goals_mentor_id_profiles_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_activities" ADD CONSTRAINT "learning_activities_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_activities" ADD CONSTRAINT "learning_activities_cohort_week_id_cohort_weeks_id_fk" FOREIGN KEY ("cohort_week_id") REFERENCES "public"."cohort_weeks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_rsvps" ADD CONSTRAINT "live_rsvps_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_rsvps" ADD CONSTRAINT "live_rsvps_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_host_id_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_mentor_id_profiles_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_assigned_by_id_profiles_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentoring_notes" ADD CONSTRAINT "mentoring_notes_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentoring_notes" ADD CONSTRAINT "mentoring_notes_mentor_id_profiles_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentoring_notes" ADD CONSTRAINT "mentoring_notes_session_id_coaching_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."coaching_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_downloads" ADD CONSTRAINT "resource_downloads_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_marked_by_id_profiles_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "article_reviews_article_idx" ON "article_reviews" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_revisions_article_idx" ON "article_revisions" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "assessment_attempts_profile_idx" ON "assessment_attempts" USING btree ("profile_id","assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_submitted_idx" ON "assessment_attempts" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "assessment_questions_assessment_idx" ON "assessment_questions" USING btree ("assessment_id","sort_order");--> statement-breakpoint
CREATE INDEX "assessments_level_idx" ON "assessments" USING btree ("level_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_submissions_unique_idx" ON "assignment_submissions" USING btree ("assignment_id","profile_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_profile_idx" ON "assignment_submissions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_course_unique_idx" ON "certificates" USING btree ("profile_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_level_unique_idx" ON "certificates" USING btree ("profile_id","level_id");--> statement-breakpoint
CREATE INDEX "coaching_sessions_mentor_idx" ON "coaching_sessions" USING btree ("mentor_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "coaching_sessions_student_idx" ON "coaching_sessions" USING btree ("student_id","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cohort_members_unique_idx" ON "cohort_members" USING btree ("cohort_id","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cohort_weeks_unique_idx" ON "cohort_weeks" USING btree ("cohort_id","week_number");--> statement-breakpoint
CREATE UNIQUE INDEX "community_members_unique_idx" ON "community_members" USING btree ("community_id","profile_id");--> statement-breakpoint
CREATE INDEX "conference_participants_room_idx" ON "conference_participants" USING btree ("room_code","last_seen_at");--> statement-breakpoint
CREATE INDEX "conference_signals_inbox_idx" ON "conference_signals" USING btree ("to_peer","consumed");--> statement-breakpoint
CREATE INDEX "course_groups_course_idx" ON "course_groups" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_modules_slug_idx" ON "course_modules" USING btree ("course_id","slug");--> statement-breakpoint
CREATE INDEX "course_sessions_level_idx" ON "course_sessions" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "courses_level_idx" ON "courses" USING btree ("level_id","sort_order");--> statement-breakpoint
CREATE INDEX "data_changes_record_idx" ON "data_changes" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "discussion_comments_post_idx" ON "discussion_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_idx" ON "discussion_posts" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_activity_idx" ON "discussion_threads" USING btree ("last_activity_at");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_unique_idx" ON "engagement" USING btree ("snapshot_date","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_email_level_idx" ON "enrollments" USING btree ("email","level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_unique_idx" ON "group_members" USING btree ("group_id","profile_id");--> statement-breakpoint
CREATE INDEX "group_submissions_group_idx" ON "group_submissions" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "instrument_bands_instrument_idx" ON "instrument_bands" USING btree ("instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instrument_dimensions_unique_idx" ON "instrument_dimensions" USING btree ("instrument_id","slug");--> statement-breakpoint
CREATE INDEX "instrument_items_instrument_idx" ON "instrument_items" USING btree ("instrument_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "instrument_responses_unique_idx" ON "instrument_responses" USING btree ("session_id","item_id");--> statement-breakpoint
CREATE INDEX "instrument_results_profile_idx" ON "instrument_results" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "instrument_sessions_profile_idx" ON "instrument_sessions" USING btree ("profile_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_achievements_unique_idx" ON "learner_achievements" USING btree ("profile_id","achievement_id");--> statement-breakpoint
CREATE INDEX "learner_flags_student_idx" ON "learner_flags" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "learner_goals_student_idx" ON "learner_goals" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "learning_activities_lesson_idx" ON "learning_activities" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "learning_events_profile_idx" ON "learning_events" USING btree ("profile_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_progress_unique_idx" ON "learning_progress" USING btree ("enrollment_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_unique_idx" ON "lesson_progress" USING btree ("profile_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_profile_idx" ON "lesson_progress" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_slug_idx" ON "lessons" USING btree ("module_id","slug");--> statement-breakpoint
CREATE INDEX "live_messages_session_idx" ON "live_messages" USING btree ("live_session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "live_rsvps_unique_idx" ON "live_rsvps" USING btree ("live_session_id","profile_id");--> statement-breakpoint
CREATE INDEX "live_sessions_starts_idx" ON "live_sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_assignments_unique_idx" ON "mentor_assignments" USING btree ("mentor_id","student_id");--> statement-breakpoint
CREATE INDEX "mentoring_notes_student_idx" ON "mentoring_notes" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_recipient_idx" ON "messages" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_unique_idx" ON "notification_preferences" USING btree ("profile_id","category");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "org_memberships_unique_idx" ON "org_memberships" USING btree ("organization_id","profile_id");--> statement-breakpoint
CREATE INDEX "events_name_idx" ON "events" USING btree ("name","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_slug_idx" ON "profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_unique_idx" ON "reactions" USING btree ("target_type","target_id","profile_id","emoji");--> statement-breakpoint
CREATE INDEX "reflections_author_idx" ON "reflections" USING btree ("author_profile_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique_idx" ON "role_permissions" USING btree ("role_id","permission_key");--> statement-breakpoint
CREATE INDEX "security_events_idx" ON "security_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_attendance_unique_idx" ON "session_attendance" USING btree ("live_session_id","profile_id");