import { useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { useStore } from '@tanstack/react-store'
import {
  clientProfileSettingsStore,
  headerChildStore,
  headerSubscribersStore,
  headerLatestYStore,
} from '~c/stores'
import { Search, HEADER_CLASS_ON_SEARCH_INPUT_FOCUS } from '@/header/Search'
import { ProfileSwitcher } from '@/header/ProfileSwitcher'
import { Button } from '@/ui/button'

export const HYBRID_HEADER_CLASS_ON_HIDDEN = 'translate-y-[calc(-100%+1px)]'

export function Header() {
  const headerPosition = useStore(clientProfileSettingsStore, store => store.headerPosition)
  const headerChild = useStore(headerChildStore)
  const headerRef = useRef<HTMLElement | null>(null)
  const newSubscriberHandlerRef = useRef<(element: HTMLElement) => void>(() => {})

  const createClassApplier = (method: 'add' | 'remove') => (element: HTMLElement) => {
    element.classList[method](...element.dataset.subsHeader!.split(' '))
  }

  let isHybrid = headerPosition === 'hybrid'

  useEffect(() => {
    if (headerPosition !== 'static') {
      return
    }

    const apply = createClassApplier('remove')

    newSubscriberHandlerRef.current = apply

    headerSubscribersStore.state.forEach(apply)
  }, [headerPosition === 'static'])

  useEffect(() => {
    if (headerPosition !== 'sticky') {
      return
    }

    const apply = createClassApplier('add')

    newSubscriberHandlerRef.current = apply

    headerSubscribersStore.state.forEach(apply)
  }, [headerPosition === 'sticky'])

  useEffect(() => {
    if (!isHybrid) {
      return
    }

    newSubscriberHandlerRef.current = () => {}

    const getWindowY = () => document.body.getBoundingClientRect().y

    headerLatestYStore.setState(getWindowY)
    let headerTop = -1

    const scrollHandler = () => {
      const header = headerRef.current
      if (header === null) {
        return
      }

      if (header.classList.contains(HEADER_CLASS_ON_SEARCH_INPUT_FOCUS)) {
        header.classList.remove(HYBRID_HEADER_CLASS_ON_HIDDEN)

        return
      }

      const currentY = getWindowY()
      const top = headerLatestYStore.state < currentY ? 0 : header.offsetHeight

      if (headerTop !== top) {
        const getMethod = (condition: boolean) => (condition ? 'remove' : 'add')

        header.classList[getMethod(top === 0)](HYBRID_HEADER_CLASS_ON_HIDDEN)

        headerSubscribersStore.state.forEach(createClassApplier(getMethod(top !== 0)))
      }

      headerTop = top
      headerLatestYStore.setState(() => currentY)
    }

    document.addEventListener('scroll', scrollHandler, { passive: true })

    return () => {
      document.removeEventListener('scroll', scrollHandler)
    }
  }, [isHybrid])

  useEffect(() => {
    document.body.querySelectorAll('[data-subs-header]').forEach(element => {
      if (element instanceof HTMLElement) {
        newSubscriberHandlerRef.current(element)
        headerSubscribersStore.state.add(element)
      }
    })

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        const createSubscribersMutater = (method: 'add' | 'delete') => (node: Node) => {
          if (node instanceof HTMLElement) {
            if ('subsHeader' in node.dataset) {
              if (method === 'add') {
                newSubscriberHandlerRef.current(node)
              }

              headerSubscribersStore.state[method](node)
            }

            node.querySelectorAll('[data-subs-header]').forEach(element => {
              if (element instanceof HTMLElement) {
                if (method === 'add') {
                  newSubscriberHandlerRef.current(element)
                }

                headerSubscribersStore.state[method](element)
              }
            })
          }
        }

        mutation.addedNodes.forEach(createSubscribersMutater('add'))
        mutation.removedNodes.forEach(createSubscribersMutater('delete'))
      })
    })

    observer.observe(document.body, { childList: true, subtree: true, attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [])

  let className = headerChild
    ? 'border-slate-400 bg-[#fff] dark:border-slate-900 dark:bg-[#000]'
    : 'bg-background'
  if (headerPosition !== 'static') {
    className += ' sticky top-0'
  }
  if (isHybrid) {
    className += ' transition-transform'
  }

  const parentClassName = headerChild ? '[&_*]:border-slate-400 dark:[&_*]:border-slate-900' : ''
  const childClassName = headerChild
    ? 'bg-[#fff]/25 hover:bg-[#fff]/50 dark:bg-[#000]/25 dark:hover:bg-[#000]/50'
    : ''

  return (
    <header
      ref={headerRef}
      style={{ viewTransitionName: 'header' }}
      className={`${className} z-50 border-b`}
    >
      {headerChild}

      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-3 lg:space-x-4">
          {/* kalo engga dikasih params splat kosong, paramsnya bakal mengikuti splat yang lagi aktif */}
          <Link to="/$" preloadDelay={50} params={{ _splat: '' }} className="mr-8 font-extrabold">
            Web Animeh
          </Link>

          <Link
            to="/$"
            preloadDelay={50}
            params={{ _splat: 'ongoing' }}
            activeProps={{ className: 'font-bold' }}
          >
            Ongoing
          </Link>

          <Link
            to="/$"
            preloadDelay={50}
            params={{ _splat: 'downloaded' }}
            activeProps={{ className: 'font-bold' }}
          >
            Terunduh
          </Link>
        </div>

        <div className={`${parentClassName} flex items-center space-x-3 lg:space-x-4`}>
          <Search headerRef={headerRef} className={childClassName} />

          <ProfileSwitcher className={childClassName} />

          <Button asChild variant="outline" size="icon" className={childClassName}>
            <Link to="/pengaturan">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
