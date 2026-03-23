export const ratings = {
  'G': 'All Ages',
  'PG': 'Children',
  'PG-13': 'Teens 13 or older',
  'R': '17+ (violence & profanity)',
  'R+': 'Mild Nudity',
  'Rx': 'Hentai',
} as const

export const ratingColor = (rating: string) => {
  return (
    {
      'G': 'bg-green-100',
      'PG': 'bg-blue-100',
      'PG-13': 'bg-yellow-100',
      'R': 'bg-orange-100',
      'R+': 'bg-red-100',
      'Rx': 'bg-red-400',
    }[rating] ?? 'bg-gray-200'
  )
}
