export const STORYBOARD_GRID_ROWS = 14

export const STORYBOARD_GRID_COLS = 14

export const STORYBOARD_FRAMES_PER_GRID = STORYBOARD_GRID_ROWS * STORYBOARD_GRID_COLS

export const STORYBOARD_SECONDS_PER_GRID = 6.5 * 60

export const STORYBOARD_FPS = STORYBOARD_FRAMES_PER_GRID / STORYBOARD_SECONDS_PER_GRID

export const STORYBOARD_FRAME_WIDTH = 240

export const STORYBOARD_FRAME_HEIGHT = 135

// JPEG ngebagi gambar jadi chunk 8x8 px, jadi biar per frame ga ada yang kecampur, ukuran framenya harus kelipatan 8 (bakal dikasih black bar untuk selisihnya)
export const STORYBOARD_FRAME_PERFECT_WIDTH = Math.ceil(STORYBOARD_FRAME_WIDTH / 8) * 8

export const STORYBOARD_FRAME_PERFECT_HEIGHT = Math.ceil(STORYBOARD_FRAME_HEIGHT / 8) * 8
