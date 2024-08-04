import { JikanClient, type JikanPagination } from '@tutkli/jikan-ts'
import PQueue from 'p-queue'
import axios from 'axios'

// TODO: coba lebih manfaatkan rate limitnya jikan
export const jikanQueue = new PQueue({
  concurrency: 1,
  intervalCap: 1,
  interval: 1000,
  carryoverConcurrencyCount: true,
})

export const jikanClient = new JikanClient({
  cacheOptions: {
    headerInterpreter: () => 'dont cache',
  },
})

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
  async getProducers(params: GetProducerSearchParams): Promise<ProcuderResponse> {
    const response = await axios.get('https://api.jikan.moe/v4/producers', {
      params,
    })

    return response.data
  },
}
