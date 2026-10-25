CREATE TYPE "public"."flavour_note" AS ENUM('sweet', 'fruity', 'floral', 'chocolatey', 'astringent');--> statement-breakpoint
CREATE TYPE "public"."grind_level" AS ENUM('extra_fine', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse');--> statement-breakpoint
CREATE TYPE "public"."grinder_kind" AS ENUM('clicks', 'dial', 'stepless');--> statement-breakpoint
CREATE TYPE "public"."process" AS ENUM('washed', 'natural', 'honey', 'anaerobic', 'other');--> statement-breakpoint
CREATE TYPE "public"."roast_level" AS ENUM('light', 'medium_light', 'medium', 'medium_dark', 'dark');--> statement-breakpoint
CREATE TABLE "bags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"coffee_id" integer NOT NULL,
	"roasted_on" date NOT NULL,
	"weight_g" integer NOT NULL,
	"notes" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bags_weight_positive" CHECK ("bags"."weight_g" > 0)
);
--> statement-breakpoint
CREATE TABLE "brewers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"brewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bag_id" integer NOT NULL,
	"brewer_id" integer NOT NULL,
	"recipe_id" integer,
	"recipe_snapshot" jsonb,
	"dose_g" numeric(4, 1) NOT NULL,
	"water_ml" integer NOT NULL,
	"temp_c" smallint NOT NULL,
	"grinder_id" integer NOT NULL,
	"grind_setting" numeric(6, 2) NOT NULL,
	"rating" numeric(3, 2),
	"compass_strength" numeric(3, 2),
	"compass_extraction" numeric(3, 2),
	"flavour_notes" "flavour_note"[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brews_dose_positive" CHECK ("brews"."dose_g" > 0),
	CONSTRAINT "brews_water_positive" CHECK ("brews"."water_ml" > 0),
	CONSTRAINT "brews_temp_range" CHECK ("brews"."temp_c" between 0 and 100),
	CONSTRAINT "brews_rating_range" CHECK ("brews"."rating" is null or ("brews"."rating" between 0.25 and 5 and rating * 4 = trunc(rating * 4))),
	CONSTRAINT "brews_compass_pair" CHECK (("brews"."compass_strength" is null) = ("brews"."compass_extraction" is null)),
	CONSTRAINT "brews_compass_range" CHECK ("brews"."compass_strength" is null or (
        "brews"."compass_strength" between -1 and 1 and compass_strength * 4 = trunc(compass_strength * 4) and
        "brews"."compass_extraction" between -1 and 1 and compass_extraction * 4 = trunc(compass_extraction * 4))),
	CONSTRAINT "brews_snapshot_with_recipe" CHECK (("brews"."recipe_id" is null) = ("brews"."recipe_snapshot" is null))
);
--> statement-breakpoint
CREATE TABLE "coffees" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coffees_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roaster_id" integer NOT NULL,
	"name" text NOT NULL,
	"origin_country" char(2),
	"region" text,
	"producer" text,
	"variety" text,
	"process" "process" NOT NULL,
	"roast_level" "roast_level" NOT NULL,
	"tasting_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"rating" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coffees_rating_range" CHECK ("coffees"."rating" is null or ("coffees"."rating" between 0.25 and 5 and rating * 4 = trunc(rating * 4)))
);
--> statement-breakpoint
CREATE TABLE "grinders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grinders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"setting_kind" "grinder_kind" DEFAULT 'clicks' NOT NULL,
	"step" numeric(4, 2) DEFAULT 1 NOT NULL,
	"unit" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grinders_step_positive" CHECK ("grinders"."step" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recipes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"brewer_id" integer NOT NULL,
	"dose_g" numeric(4, 1) NOT NULL,
	"water_ml" integer NOT NULL,
	"temp_c" smallint NOT NULL,
	"grind_level" "grind_level" NOT NULL,
	"steps" jsonb NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_dose_positive" CHECK ("recipes"."dose_g" > 0),
	CONSTRAINT "recipes_water_positive" CHECK ("recipes"."water_ml" > 0),
	CONSTRAINT "recipes_temp_range" CHECK ("recipes"."temp_c" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "roasters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roasters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"city" text,
	"country_code" char(2),
	"website" text,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bags" ADD CONSTRAINT "bags_coffee_id_coffees_id_fk" FOREIGN KEY ("coffee_id") REFERENCES "public"."coffees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_bag_id_bags_id_fk" FOREIGN KEY ("bag_id") REFERENCES "public"."bags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_brewer_id_brewers_id_fk" FOREIGN KEY ("brewer_id") REFERENCES "public"."brewers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_grinder_id_grinders_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."grinders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffees" ADD CONSTRAINT "coffees_roaster_id_roasters_id_fk" FOREIGN KEY ("roaster_id") REFERENCES "public"."roasters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_brewer_id_brewers_id_fk" FOREIGN KEY ("brewer_id") REFERENCES "public"."brewers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bags_coffee_idx" ON "bags" USING btree ("coffee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brewers_name_unique" ON "brewers" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "brews_brewed_at_idx" ON "brews" USING btree ("brewed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "brews_bag_brewed_at_idx" ON "brews" USING btree ("bag_id","brewed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "brews_recipe_idx" ON "brews" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "brews_brewer_grinder_idx" ON "brews" USING btree ("brewer_id","grinder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coffees_roaster_name_unique" ON "coffees" USING btree ("roaster_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "grinders_name_unique" ON "grinders" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "roasters_name_unique" ON "roasters" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");