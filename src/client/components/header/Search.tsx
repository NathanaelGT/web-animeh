import React, { useRef, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
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
  className: string
}

export const HEADER_CLASS_ON_SEARCH_INPUT_FOCUS = '_focus'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
})

export function Search({ headerRef, className }: Props) {
  const searchRef = useRef<HTMLInputElement | null>(null)
  const arrowOffsetRef = useRef(0)

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
    arrowOffsetRef.current = 0

    const { value } = event.currentTarget

    if (value) {
      search.mutate(
        {
          query: value,
          offset: 0,
        },
        {
          onSuccess: setSearchResults,
        },
      )
    } else {
      setSearchResults(null)
    }
  }

  const onInputFocusTimeoutId = useRef<Timer | null>(null)
  const onInputFocusHandler = () => {
    const searchEl = searchRef.current
    if (!searchEl) {
      return
    }

    searchEl.parentElement?.classList.add('md:w-64', 'lg:w-96')

    onInputFocusTimeoutId.current = setTimeout(() => {
      onInputFocusTimeoutId.current = null

      const suggestionWrapperEl = searchEl.nextElementSibling
      if (!suggestionWrapperEl) {
        return
      }

      suggestionWrapperEl.classList.add('!opacity-100', '!visible')
      headerRef.current?.classList.add(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)
    }, 200)
  }

  const onBlurHandler = () => {
    requestAnimationFrame(() => {
      const searchEl = searchRef.current
      if (!searchEl) {
        return
      }

      const active = document.activeElement
      if (active === searchEl) {
        return
      } else if (active instanceof HTMLElement && 'searchResult' in active.dataset) {
        return
      }

      setTimeout(() => {
        searchEl.parentElement?.classList.remove('md:w-64', 'lg:w-96')
      }, 100)

      const suggestionWrapperEl = searchEl.nextElementSibling
      if (!suggestionWrapperEl) {
        return
      }

      headerRef.current?.classList.remove(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)

      if (onInputFocusTimeoutId.current) {
        clearTimeout(onInputFocusTimeoutId.current)

        onInputFocusTimeoutId.current = null
      } else {
        suggestionWrapperEl.classList.remove('!opacity-100', '!visible')
      }
    })
  }

  const onSearchResultKeydownHandler = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      const child = event.currentTarget.firstElementChild
      if (child instanceof HTMLAnchorElement) {
        child.click()

        const activeEl = document.activeElement
        if (activeEl instanceof HTMLElement) {
          activeEl.blur()
        }
      }

      return
    }

    const moveFocus = (
      getElement: (from: HTMLElement) => Element | null,
      nextOffset: () => number | null,
    ) => {
      const currentTarget = event.currentTarget
      const element = getElement(currentTarget)
      if (element instanceof HTMLElement) {
        event.preventDefault()
        element.focus()

        return
      }

      const searchEl = searchRef.current
      if (!searchEl) {
        return
      }

      const originalOffset = arrowOffsetRef.current

      const offset = nextOffset()
      if (offset === null) {
        return
      }

      event.preventDefault()
      search.mutate(
        {
          query: searchEl.value,
          offset,
        },
        {
          onSuccess(result) {
            if (result.length === 4) {
              flushSync(() => {
                setSearchResults(result)
              })

              const element = getElement(currentTarget)
              if (element instanceof HTMLElement) {
                element.focus()
              }
            } else {
              arrowOffsetRef.current = originalOffset
            }
          },
        },
      )
    }

    if (event.key === 'ArrowUp') {
      moveFocus(
        el => el.previousElementSibling,
        () => {
          if (arrowOffsetRef.current === 0) {
            return null
          }
          return --arrowOffsetRef.current
        },
      )
    } else if (event.key === 'ArrowDown') {
      moveFocus(
        el => el.nextElementSibling,
        () => ++arrowOffsetRef.current,
      )
    }
  }

  const onInputKeydownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const searchEl = searchRef.current
    if (!searchEl) {
      return
    }

    if (event.key === 'Escape') {
      // Escape defaultnya bakal ngeclear input yang typenya search
      event.preventDefault()
      searchEl.blur()

      return
    } else if (event.key !== 'ArrowDown') {
      return
    }

    const firstSuggestionEl = searchEl.nextElementSibling?.firstElementChild?.firstElementChild
    if (!(firstSuggestionEl instanceof HTMLElement)) {
      return
    }

    event.preventDefault()
    firstSuggestionEl.focus()
  }

  return (
    <div className="relative w-20 transition-[width] duration-200 ease-in-out md:w-28">
      <Input
        ref={searchRef}
        onInput={onInputHandler}
        onFocus={onInputFocusHandler}
        onBlur={onBlurHandler}
        onKeyDown={onInputKeydownHandler}
        type="search"
        placeholder="Cari..."
        className={`!ring-0 ${className}`}
      />

      <div className="invisible absolute max-h-[calc(100vh-4rem)] w-full overflow-hidden opacity-0 transition-all">
        {searchResults ? (
          <div className="mt-1 flex h-fit flex-col rounded-md border border-input bg-background px-1 py-1 text-sm">
            {searchResults.length ? (
              searchResults.map(result => (
                <div
                  key={result.id}
                  tabIndex={0}
                  onKeyDown={onSearchResultKeydownHandler}
                  onBlur={onBlurHandler}
                  data-search-result
                  className="flex gap-3 px-[.375rem] py-[.375rem]"
                >
                  <Link to="/anime/$id" params={{ id: result.id.toString() }} tabIndex={-1}>
                    <Image
                      src={result.id}
                      tabIndex={-1}
                      className="h-[89px] w-[63px] rounded-md shadow outline outline-1 outline-slate-600/20"
                    />
                  </Link>

                  <div className="flex max-w-[calc(100%-63px-0.75rem)] flex-col justify-between">
                    <div>
                      <SimpleTooltip title={result.title}>
                        <Link
                          to="/anime/$id"
                          params={{ id: result.id.toString() }}
                          tabIndex={-1}
                          className="block truncate text-sm font-bold"
                        >
                          {result.title}
                        </Link>
                      </SimpleTooltip>
                      <SimpleTooltip title={result.englishTitle}>
                        <Link
                          to="/anime/$id"
                          params={{ id: result.id.toString() }}
                          tabIndex={-1}
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
              <div className="flex justify-center px-[.375rem] py-[.375rem]">
                <span className="rotate-90">:(</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
