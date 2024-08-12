declare module 'safe-eval' {
  function safeEval(code: string, context?: Record<string, any>): any

  export = safeEval
}
