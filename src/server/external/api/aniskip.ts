import { db as drizzle } from '~s/db'
import { limitRequest } from '~s/external/limit'
import { waService } from '~s/ky'

export const resetAniskipDump = async () => {
  const response = await limitRequest(() => waService.get('aniskip.csv').text())

  const db = drizzle.$client

  db.transaction(() => {
    db.run('DELETE FROM episode_skips')

    const insertEpisodeSkip = db.prepare(
      'INSERT INTO episode_skips (anime_id, episode_number, type, start_time, end_time, episode_length) VALUES (?, ?, ?, ?, ?, ?)',
    )

    response.split('\n').forEach(line => {
      insertEpisodeSkip.run(...line.split(','))
    })
  })()
}
