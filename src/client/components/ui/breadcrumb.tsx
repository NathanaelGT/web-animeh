import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'

import { cn } from '~c/utils'

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = 'Breadcrumb'

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<'ol'>>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
        className,
      )}
      {...props}
    />
  ),
)
BreadcrumbList.displayName = 'BreadcrumbList'

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn('inline-flex items-center gap-1.5', className)} {...props} />
  ),
)
BreadcrumbItem.displayName = 'BreadcrumbItem'

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp
      ref={ref}
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = 'BreadcrumbLink'

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  ),
)
BreadcrumbPage.displayName = 'BreadcrumbPage'

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator'

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = 'BreadcrumbElipssis'

type SimpleBreadcrumbProps = {
  links: [...React.JSX.Element[], React.JSX.Element | string]
  viewTransitionPrefix?: string | number
  itemClassName?: string
  className?: string
}

function SimpleBreadcrumb({
  links,
  viewTransitionPrefix,
  itemClassName,
  className,
}: SimpleBreadcrumbProps) {
  const children: React.ReactNode[] = []

  let separatorKey = 0

  const len = links.length
  for (let index = 0; index < len; index++) {
    if (index < len - 1) {
      children.push(
        <BreadcrumbItem
          key={index}
          style={{ viewTransitionName: `bread-${viewTransitionPrefix}-${index}` }}
          className={itemClassName}
        >
          <BreadcrumbLink asChild>{links[index]}</BreadcrumbLink>
        </BreadcrumbItem>,
        <BreadcrumbSeparator
          key={--separatorKey}
          style={{ viewTransitionName: `bread-sep-${viewTransitionPrefix}-${index}` }}
        />,
      )
    } else {
      children.push(
        <BreadcrumbPage
          key={index}
          style={{ viewTransitionName: `bread-${viewTransitionPrefix}-${index}` }}
        >
          {links[index]}
        </BreadcrumbPage>,
      )
    }
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>{children}</BreadcrumbList>
    </Breadcrumb>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  SimpleBreadcrumb,
}
