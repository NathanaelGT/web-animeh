CREATE TABLE `anime` (
	`id` integer PRIMARY KEY NOT NULL,
	`anilist_id` integer,
	`title` text NOT NULL,
	`japanese_title` text,
	`english_title` text,
	`synopsis` text,
	`total_episodes` integer,
	`aired_from` integer,
	`aired_to` integer,
	`score` integer,
	`scored_by` integer,
	`rating` text,
	`duration` integer,
	`rank` integer,
	`popularity` integer,
	`members` integer,
	`type` text,
	`image_url` text,
	`is_visible` integer,
	`updated_at` integer NOT NULL,
	`episode_updated_at` integer,
	`character_updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `anime_metadata` (
	`anime_id` integer NOT NULL,
	`provider` integer NOT NULL,
	`provider_id` integer NOT NULL,
	`provider_slug` text,
	`provider_data` text,
	PRIMARY KEY(`anime_id`, `provider`, `provider_id`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `anime_relationships` (
	`anime_id` integer NOT NULL,
	`related_id` integer NOT NULL,
	`type` text NOT NULL,
	PRIMARY KEY(`anime_id`, `related_id`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `anime_synonyms` (
	`anime_id` integer NOT NULL,
	`synonym` text NOT NULL,
	`type` text NOT NULL,
	PRIMARY KEY(`anime_id`, `synonym`, `type`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `anime_to_characters` (
	`anime_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`is_main` integer,
	PRIMARY KEY(`anime_id`, `character_id`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `anime_to_anime_genres` (
	`anime_id` integer NOT NULL,
	`genre_id` integer NOT NULL,
	PRIMARY KEY(`anime_id`, `genre_id`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `anime_to_anime_studios` (
	`anime_id` integer NOT NULL,
	`studio_id` integer NOT NULL,
	`type` text NOT NULL,
	PRIMARY KEY(`anime_id`, `studio_id`, `type`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_to_persons` (
	`character_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`language` text NOT NULL,
	PRIMARY KEY(`character_id`, `person_id`),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`favorites` integer,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`anime_id` integer NOT NULL,
	`number` integer NOT NULL,
	`title` text,
	`japanese_title` text,
	`romanji_title` text,
	`score` integer,
	`is_filler` integer,
	`is_recap` integer,
	PRIMARY KEY(`anime_id`, `number`)
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`meta` text
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`settings` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_episodes` (
	`anime_id` integer NOT NULL,
	`provider` integer NOT NULL,
	`provider_id` integer NOT NULL,
	`number` integer NOT NULL,
	`created_at` integer,
	PRIMARY KEY(`anime_id`, `provider`, `provider_id`, `number`),
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`anime_id`,`number`) REFERENCES `episodes`(`anime_id`,`number`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`anime_id`,`provider`,`provider_id`) REFERENCES `anime_metadata`(`anime_id`,`provider`,`provider_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `studio_synonyms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`studio_id` integer NOT NULL,
	`synonym` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`studio_id`) REFERENCES `studios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `studios` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`about` text,
	`image_url` text,
	`established_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_name_unique` ON `genres` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_name_unique` ON `profiles` (`name`);