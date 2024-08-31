import ky from 'ky'
import PQueue from 'p-queue'
import { BaseURL, JikanClient, type JikanPagination } from '@tutkli/jikan-ts'

const kyJikan = ky.create({
  prefixUrl: BaseURL,
  retry: {
    limit: 2,
    delay: () => 1000,
  },
})

// TODO: coba lebih manfaatkan rate limitnya jikan
export const jikanQueue = new PQueue({
  concurrency: 1,
  intervalCap: 1,
  interval: 1000,
  carryoverConcurrencyCount: true,
})

export const jikanClient = new JikanClient(kyJikan)

type GetProducerSearchParams = Partial<{
  page: number
  limit: number
  q: string
  order_by: 'mal_id' | 'count' | 'favorites' | 'established'
  sort: 'asc' | 'desc'
  letter: string
}>

type ProcuderResponse = {
  pagination: JikanPagination
  data: {
    mal_id: number
    url: string
    titles: {
      type: string
      title: string
    }[]
    images: {
      jpg: {
        image_url: string
      }
    }
    favorites: number
    established: string | null
    about: string | null
    count: number
  }[]
}

export const producerClient = {
  async getProducers(searchParams: GetProducerSearchParams) {
    const response = await kyJikan.get('producers', {
      searchParams,
    })

    return response.json<ProcuderResponse>()
  },
}
