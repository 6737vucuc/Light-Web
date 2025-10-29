-- Add reactions table
CREATE TABLE IF NOT EXISTS "reactions" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"post_id" integer,
"reaction_type" varchar(20) NOT NULL,
"created_at" timestamp DEFAULT now(),
CONSTRAINT "reactions_user_post_unique" UNIQUE("user_id", "post_id")
);

-- Add stories table
CREATE TABLE IF NOT EXISTS "stories" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"media_url" text NOT NULL,
"media_type" varchar(20) NOT NULL,
"created_at" timestamp DEFAULT now(),
"expires_at" timestamp NOT NULL
);

-- Add shares table
CREATE TABLE IF NOT EXISTS "shares" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"post_id" integer,
"created_at" timestamp DEFAULT now()
);

-- Add foreign keys
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "shares" ADD CONSTRAINT "shares_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

-- Add shares_count to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "shares_count" integer DEFAULT 0;
