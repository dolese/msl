CREATE TYPE "public"."account_kind" AS ENUM('person', 'team');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "records" ADD COLUMN "seq" serial NOT NULL;--> statement-breakpoint
-- Number existing records in the order they were registered (oldest = 1)
UPDATE "records" SET "seq" = ordered.n FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS n FROM "records") AS ordered WHERE "records"."id" = ordered."id";--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('records', 'seq'), COALESCE((SELECT max("seq") FROM "records"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "records" ADD COLUMN "plots" integer;--> statement-breakpoint
ALTER TABLE "records" ADD COLUMN "field_officer" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kind" "account_kind" DEFAULT 'person' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_seq_unique" UNIQUE("seq");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");