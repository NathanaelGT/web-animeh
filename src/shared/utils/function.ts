export const combineFunction = (...functions: (() => any)[]) => {
  return () => {
    functions.forEach(f => {
      f()
    })
  }
}
