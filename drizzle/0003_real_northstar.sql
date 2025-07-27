CREATE TABLE "chapter_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"chosen" boolean DEFAULT false,
	"chapter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" smallint NOT NULL,
	"story_so_far" text NOT NULL,
	"created" timestamp NOT NULL,
	"adventure_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_choices" ADD CONSTRAINT "chapter_choices_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "public"."adventures"("id") ON DELETE no action ON UPDATE no action;