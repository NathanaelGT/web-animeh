CREATE TABLE `anime` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mal_id` integer,
	`anilist_id` integer,
	`title` text NOT NULL,
	`japanese_title` text,
	`english_title` text,
	`synopsis` text,
	`total_episodes` integer,
	`aired_from` integer,
	`aired_to` integer,
	`score` integer,
	`rating` text,
	`duration` integer,
	`type` text NOT NULL,
	`image_url` text,
	`image_extension` text,
	`updated_at` integer NOT NULL
);