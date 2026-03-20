type Props = {
  checked: boolean
}

export function Icon({ checked }: Props) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={checked ? 'M6 18 18 6M6 6l12 12' : 'm4.5 12.75 6 6 9-13.5'}
      />
    </svg>
  )
}
