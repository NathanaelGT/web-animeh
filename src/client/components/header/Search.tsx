import React, { useRef, useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Image } from '@/Image'
import { SimpleTooltip } from '@/ui/tooltip'
import { Input } from '@/ui/input'
import { AnimeType } from '@/Anime/Type'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'
import { HYBRID_HEADER_CLASS_ON_HIDDEN } from '@/Header'
import { api } from '~c/trpc'
import type { SearchProcedure } from '~s/trpc-procedures/search'
import type { TRPCResponse } from '~/shared/utils/types'

type Props = {
  headerRef: React.MutableRefObject<HTMLElement | null>
}

export const HEADER_CLASS_ON_SEARCH_INPUT_FOCUS = '_focus'

export function Search({ headerRef }: Props) {
  const searchRef = useRef<HTMLInputElement | null>(null)

  const search = api.search.useMutation()
  const [searchResults, setSearchResults] = useState<TRPCResponse<typeof SearchProcedure> | null>(
    null,
  )

  // keybind search
  useEffect(() => {
    const keydownHandler = (event: KeyboardEvent) => {
      if (event.key !== '/') {
        return
      }

      const header = headerRef.current
      if (header === null) {
        return
      }

      const inputableElements: (string | undefined)[] = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']
      if (inputableElements.includes(document.activeElement?.tagName)) {
        return
      }

      const setFocusToSearchInput = () => {
        requestAnimationFrame(() => {
          const input = searchRef.current
          if (input === null) {
            return
          }

          const searchLength = input.value.length

          input.setSelectionRange(searchLength, searchLength)
          input.focus()
        })
      }

      if (header.classList.contains(HYBRID_HEADER_CLASS_ON_HIDDEN)) {
        header.classList.remove(HYBRID_HEADER_CLASS_ON_HIDDEN)
        header.addEventListener(
          'transitionend',
          () => {
            setTimeout(setFocusToSearchInput, 50)
          },
          { once: true },
        )
      } else {
        setFocusToSearchInput()
      }
    }

    document.addEventListener('keydown', keydownHandler)

    return () => {
      document.removeEventListener('keydown', keydownHandler)
    }
  }, [])

  const onInputHandler = (event: React.FormEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget

    if (value) {
      search.mutate(value, {
        onSuccess: setSearchResults,
      })
    } else {
      setSearchResults(null)
    }
  }

  const onFocusHandler = () => {
    setTimeout(() => {
      const suggestionEl = searchRef.current?.nextElementSibling
      if (!suggestionEl) {
        return
      }

      suggestionEl.classList.add('!opacity-100', '!visible')
      headerRef.current?.classList.add(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)
    }, 200)
  }

  const onBlurHandler = () => {
    const suggestionEl = searchRef.current?.nextElementSibling
    if (!suggestionEl) {
      return
    }

    suggestionEl.classList.remove('!opacity-100', '!visible')
    headerRef.current?.classList.remove(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)
  }

  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
  })

  return (
    <div className="relative w-20 transition-[width] duration-200 ease-in-out md:w-28 md:focus-within:w-64 lg:focus-within:w-96">
      <Input
        ref={searchRef}
        onInput={onInputHandler}
        onFocus={onFocusHandler}
        onBlur={onBlurHandler}
        type="search"
        placeholder="Cari..."
        className="!ring-0"
      />

      <div className="invisible absolute max-h-[calc(100vh-4rem)] w-full overflow-hidden opacity-0 transition-all">
        {searchResults ? (
          <div className="mt-1 flex h-fit flex-col gap-3 rounded-md border border-input bg-background p-3 text-sm">
            {searchResults.length ? (
              searchResults.map(result => (
                <div key={result.id} className="flex gap-3">
                  <Link to="/anime/$id" params={{ id: result.id.toString() }}>
                    <Image
                      src={result.id}
                      className="max-h-[89px] max-w-[63px] rounded-md shadow outline outline-1 outline-slate-600/20"
                    />
                  </Link>

                  <div className="flex max-w-[calc(100%-63px-0.75rem)] flex-col justify-between">
                    <div>
                      <SimpleTooltip title={result.title}>
                        <Link
                          to="/anime/$id"
                          params={{ id: result.id.toString() }}
                          className="block truncate text-sm font-bold"
                        >
                          {result.title}
                        </Link>
                      </SimpleTooltip>
                      <SimpleTooltip title={result.englishTitle}>
                        <Link
                          to="/anime/$id"
                          params={{ id: result.id.toString() }}
                          className="block truncate text-xs font-bold text-slate-500"
                        >
                          {result.englishTitle}
                        </Link>
                      </SimpleTooltip>
                    </div>

                    {result.airedFrom && (
                      <div className="text-xs text-slate-500">
                        {dateFormatter.format(result.airedFrom)}
                        {' - '}
                        {result.airedTo ? dateFormatter.format(result.airedTo) : '?'}
                      </div>
                    )}

                    <div className="flex gap-3 text-xs text-slate-500 [&>*]:bg-transparent [&>*]:p-0">
                      <AnimeType type={result.type} />
                      <AnimeRating rating={result.rating} />
                      <AnimeDuration duration={result.duration} />
                      {result.totalEpisodes && <AnimeEpisode episode={result.totalEpisodes} />}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <span>:(</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
