CREATE TABLE `episodes` (
	`anime_id` integer NOT NULL,
	`number` integer NOT NULL,
	`title` text,
	`japanese_title` text,
	`romanji_title` text,
	`score` real,
	`is_filler` integer,
	`is_recap` integer,
	PRIMARY KEY(`anime_id`, `number`)
);
