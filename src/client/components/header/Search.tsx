import React, { useRef, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { api } from '~c/trpc'
import { clientProfileSettingsStore } from '~c/stores'
import { createKeybindMatcher } from '~c/utils/keybind'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { Image } from '@/Image'
import { InputKeybind } from '@/ui/custom/input-keybind'
import { SimpleTooltip } from '@/ui/tooltip'
import { AnimeType } from '@/Anime/Type'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'
import { HYBRID_HEADER_CLASS_ON_HIDDEN } from '@/Header'
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
  const elRef = useRef<{
    mainWrapper?: HTMLDivElement | null
    input?: HTMLInputElement | null
    inputWrapper?: HTMLDivElement | null
    suggestionWrapper?: HTMLDivElement | null
  }>({})
  const arrowOffsetRef = useRef(0)

  const search = api.search.useMutation()
  const [searchResults, setSearchResults] = useState<TRPCResponse<typeof SearchProcedure> | null>(
    null,
  )

  useEffect(() => {
    return createKeybindHandler('global', 'search', () => {
      const header = headerRef.current
      if (header === null) {
        return
      }

      const setFocusToSearchInput = () => {
        requestAnimationFrame(() => {
          const { input } = elRef.current
          if (!input) {
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
    })
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
    elRef.current.mainWrapper?.classList.add('md:w-64', 'lg:w-96')

    onInputFocusTimeoutId.current = setTimeout(() => {
      onInputFocusTimeoutId.current = null

      elRef.current.suggestionWrapper?.classList.add('!opacity-100', '!visible')
      headerRef.current?.classList.add(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)
    }, 200)
  }

  const onBlurHandler = () => {
    requestAnimationFrame(() => {
      const { input, suggestionWrapper } = elRef.current
      if (!input || !suggestionWrapper) {
        return
      }

      const active = document.activeElement
      if (active === input) {
        return
      } else if (active instanceof HTMLElement && 'searchResult' in active.dataset) {
        return
      }

      setTimeout(() => {
        elRef.current.mainWrapper?.classList.remove('md:w-64', 'lg:w-96')
      }, 100)

      headerRef.current?.classList.remove(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)

      if (onInputFocusTimeoutId.current) {
        clearTimeout(onInputFocusTimeoutId.current)

        onInputFocusTimeoutId.current = null
      } else {
        suggestionWrapper.classList.remove('!opacity-100', '!visible')
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

      const { input } = elRef.current
      if (!input) {
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
          query: input.value,
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

    const keybindMatch = createKeybindMatcher(event)
    const keybinds = clientProfileSettingsStore.state.keybind.search

    if (keybindMatch(keybinds.up)) {
      moveFocus(
        el => el.previousElementSibling,
        () => {
          if (arrowOffsetRef.current === 0) {
            return null
          }
          return --arrowOffsetRef.current
        },
      )
    } else if (keybindMatch(keybinds.down)) {
      moveFocus(
        el => el.nextElementSibling,
        () => ++arrowOffsetRef.current,
      )
    }
  }

  const onInputKeydownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { input } = elRef.current
    if (!input) {
      return
    }

    if (event.key === 'Escape') {
      // Escape defaultnya bakal ngeclear input yang typenya search
      event.preventDefault()
      input.blur()

      return
    } else if (!createKeybindMatcher(event)(clientProfileSettingsStore.state.keybind.search.down)) {
      return
    }

    const firstSuggestionEl = elRef.current.suggestionWrapper?.firstElementChild?.firstElementChild
    if (!(firstSuggestionEl instanceof HTMLElement)) {
      return
    }

    event.preventDefault()
    firstSuggestionEl.focus()
  }

  return (
    <div
      ref={ref => {
        elRef.current.mainWrapper = ref
      }}
      className="relative w-28 transition-[width] duration-200 ease-in-out md:w-36"
    >
      <InputKeybind
        wrapperRef={ref => {
          elRef.current.inputWrapper = ref
        }}
        ref={ref => {
          elRef.current.input = ref
        }}
        onInput={onInputHandler}
        onFocus={onInputFocusHandler}
        onBlur={onBlurHandler}
        onKeyDown={onInputKeydownHandler}
        keybindId={['global', 'search']}
        type="search"
        placeholder="Cari..."
        wrapperClassName={className}
        className="[&::-webkit-search-cancel-button]:hidden"
      />

      <div
        ref={ref => {
          elRef.current.suggestionWrapper = ref
        }}
        className="invisible absolute max-h-[calc(100vh-4rem)] w-full overflow-hidden opacity-0 transition-all"
      >
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
