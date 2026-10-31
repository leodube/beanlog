-- Coffees can have more than one origin. Origin details move from coffees
-- into coffee_origins (one row per origin, position 1 = main). Every existing
-- coffee becomes a single-origin coffee here; the next migration drops the
-- old columns.
CREATE TABLE "coffee_origins" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coffee_origins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"coffee_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"country" char(2),
	"region" text,
	"producer" text,
	"variety" text,
	CONSTRAINT "coffee_origins_position_positive" CHECK ("coffee_origins"."position" >= 1),
	CONSTRAINT "coffee_origins_country_known" CHECK ("coffee_origins"."country" is not null or "coffee_origins"."position" = 1)
);
--> statement-breakpoint
ALTER TABLE "coffee_origins" ADD CONSTRAINT "coffee_origins_coffee_id_coffees_id_fk" FOREIGN KEY ("coffee_id") REFERENCES "public"."coffees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coffee_origins_position_unique" ON "coffee_origins" USING btree ("coffee_id","position");--> statement-breakpoint
INSERT INTO "coffee_origins" ("coffee_id", "position", "country", "region", "producer", "variety")
SELECT "id", 1, "origin_country", "region", "producer", "variety" FROM "coffees";
