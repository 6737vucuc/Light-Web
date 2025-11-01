-- Add story_views table
CREATE TABLE IF NOT EXISTS "story_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "story_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "viewed_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "story_views_story_user_unique" UNIQUE("story_id", "user_id")
);

-- Add foreign keys
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" 
  FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "story_views" ADD CONSTRAINT "story_views_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add caption column to stories table
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "caption" text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "story_views_story_id_idx" ON "story_views" ("story_id");
CREATE INDEX IF NOT EXISTS "story_views_user_id_idx" ON "story_views" ("user_id");
CREATE INDEX IF NOT EXISTS "stories_user_id_idx" ON "stories" ("user_id");
CREATE INDEX IF NOT EXISTS "stories_expires_at_idx" ON "stories" ("expires_at");
