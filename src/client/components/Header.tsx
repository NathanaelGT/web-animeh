import { useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { useStore } from '@tanstack/react-store'
import { clientProfileSettingsStore } from '~/client/stores'
import { Search, HEADER_CLASS_ON_SEARCH_INPUT_FOCUS } from '@/header/Search'
import { ProfileSwitcher } from '@/header/ProfileSwitcher'
import { Button } from '@/ui/button'

export const HYBRID_HEADER_CLASS_ON_HIDDEN = 'translate-y-[calc(-100%+1px)]'

export function Header() {
  const headerPosition = useStore(clientProfileSettingsStore, store => store.headerPosition)
  const headerRef = useRef<HTMLElement | null>(null)

  let isHybrid = headerPosition === 'hybrid'

  useEffect(() => {
    if (!isHybrid) {
      return
    }
    const getWindowY = () => document.body.getBoundingClientRect().y

    let latestY = getWindowY()
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
      const top = latestY < currentY ? 0 : header.offsetHeight

      if (headerTop !== top) {
        if (top === 0) {
          header.classList.remove(HYBRID_HEADER_CLASS_ON_HIDDEN)
        } else {
          header.classList.add(HYBRID_HEADER_CLASS_ON_HIDDEN)
        }
      }

      headerTop = top
      latestY = currentY
    }

    document.addEventListener('scroll', scrollHandler, { passive: true })

    return () => {
      document.removeEventListener('scroll', scrollHandler)
    }
  }, [isHybrid])

  let className = ''
  if (headerPosition !== 'static') {
    className = 'sticky top-0'
  }
  if (isHybrid) {
    className += ' transition-transform'
  }

  return (
    <header ref={headerRef} className={`${className} z-50 border-b bg-background`}>
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-3 lg:space-x-4">
          <Link to="/" preloadDelay={50}>
            Web Animeh
          </Link>
        </div>

        <div className="flex items-center space-x-3 lg:space-x-4">
          <Search headerRef={headerRef} />

          <ProfileSwitcher />

          <Link to="/pengaturan">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Pengaturan</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
