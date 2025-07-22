CREATE TABLE "adventure_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "adventures" ADD COLUMN "adventure_type_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_adventure_type_id_adventure_types_id_fk" FOREIGN KEY ("adventure_type_id") REFERENCES "public"."adventure_types"("id") ON DELETE no action ON UPDATE no action;