CREATE TABLE `anime_synonyms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`anime_id` integer NOT NULL,
	`synonym` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
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
