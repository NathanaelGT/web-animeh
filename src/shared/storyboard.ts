export const STORYBOARD_FRAME_WIDTH = 256

export const STORYBOARD_FRAME_HEIGHT = 144

// JPEG ngebagi gambar jadi chunk 8x8 px, jadi biar per frame ga ada yang kecampur, ukuran framenya harus kelipatan 8 (bakal dikasih black bar untuk selisihnya)
export const STORYBOARD_FRAME_PERFECT_WIDTH = Math.ceil(STORYBOARD_FRAME_WIDTH / 8) * 8

export const STORYBOARD_FRAME_PERFECT_HEIGHT = Math.ceil(STORYBOARD_FRAME_HEIGHT / 8) * 8

export const STORYBOARD_GRID_ROWS = Math.floor((1024 * 2) / STORYBOARD_FRAME_PERFECT_WIDTH)

export const STORYBOARD_GRID_COLS = Math.floor((1024 * 2) / STORYBOARD_FRAME_PERFECT_HEIGHT)

export const STORYBOARD_FRAMES_PER_GRID = STORYBOARD_GRID_ROWS * STORYBOARD_GRID_COLS
