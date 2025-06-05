CREATE TABLE "adventures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active" boolean DEFAULT true,
	"created" timestamp NOT NULL,
	"last_modified" timestamp
);
