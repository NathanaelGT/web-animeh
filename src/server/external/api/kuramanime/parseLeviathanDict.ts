import vm from 'vm'
import { LeviathanParseError } from '~s/error'

export const parseLeviathanDict = (source: string) => {
  try {
    convertHexToBase10()

    const [dictCode, deobfuscatorFnName] = extractDictCode()

    extractMainCode()
    inlineAlias()
    inlineObfuscatorFnCall()
    processStringConcatenation()
    removeUselessParentheses()
    processStringConcatenation()
    inlineEscapedAscii()
    inlineStringVariable()
    processStringConcatenation()

    if (!import.meta.env.PROD) {
      convertDynamicFunctionCallToStatic()
    }

    return mapDict()

    function convertHexToBase10() {
      source = source.replace(/(0x[0-9a-fA-F]+)/g, (_match, hex) => {
        return Number(hex).toString()
      })
    }

    function extractDictCode() {
      const dictCode = source.match(/^(.*\}\(_\d+,\d+\)),/)![1]!.replace('}}(_', '}})(_')
      const deobfuscatorFnName = dictCode.match(/function (_\d+)\(_\d+/)![1]!

      return [dictCode, deobfuscatorFnName] as const
    }

    function extractMainCode() {
      source = source.substring(dictCode.length)
      source = source.substring(0, source.length - 2)
    }

    function inlineAlias() {
      const aliasRegex = new RegExp(`(_\\d+)=${deobfuscatorFnName}`, 'g')

      // 2x karena ada alias didalam alias
      for (let i = 0; i < 2; i++) {
        const aliases = source.matchAll(aliasRegex)
        for (const [_, varName] of aliases) {
          source = source.replaceAll(varName!, deobfuscatorFnName)
        }
      }

      if (!import.meta.env.PROD) {
        source = source
          .replace(new RegExp(`${deobfuscatorFnName}=${deobfuscatorFnName},?`, 'g'), '')
          .replaceAll('const ;', '')
      }
    }

    function inlineObfuscatorFnCall() {
      const getterFnName = dictCode.match(/function (_\d+)\(\)/)![1]

      const dict = vm.runInNewContext(
        dictCode + `,${getterFnName}()`,
        {},
        {
          timeout: 1000,
          microtaskMode: 'afterEvaluate',
          contextCodeGeneration: {
            strings: false,
            wasm: false,
          },
        },
      ) as string[]

      const magicNum = Number(dictCode.match(/-(\d+);/)![1])

      source = source.replace(
        new RegExp(`${deobfuscatorFnName}\\((\\d+?)\\)`, 'g'),
        (_match, param) => {
          return "'" + dict[Number(param) - magicNum] + "'"
        },
      )
    }

    function processStringConcatenation() {
      while (source.match(/'([^']+)'\+'([^']+)'/g)) {
        source = source.replace(/'([^']+)'\+'([^']+)'/g, (_match, operand1, operand2) => {
          return "'" + (operand1 + operand2) + "'"
        })
      }
    }

    function removeUselessParentheses() {
      source = source.replace(/\+\('([^']+?)'\)/g, (_match, string) => {
        return "+'" + string + "'"
      })
    }

    function inlineEscapedAscii() {
      source = source.replace(/\\x([0-9a-fA-F]+)/g, (_match, hex) => {
        return String.fromCharCode(parseInt(hex, 16))
      })
    }

    function inlineStringVariable() {
      for (const [_, varName, string] of source.matchAll(/(_\d+)='([^']*?)'/g)) {
        source = source.replaceAll(varName!, "'" + string + "'")
      }

      source = source.replace(/'([^']*?)'='\1'/g, '')

      if (!import.meta.env.PROD) {
        source = source.replaceAll('const ;', '')
      }
    }

    function convertDynamicFunctionCallToStatic() {
      while (source.match(/([a-zA-Z_$][\w$]*)\['([^']+)'\]/g)) {
        source = source.replace(
          /([a-zA-Z_$][\w$]*)\['([^']+)'\]/g,
          (_match, objName, methodName) => {
            return objName + '.' + methodName
          },
        )
      }

      source = source.replace(/\)\['([^']+)'\]/g, (_match, methodName) => {
        return ').' + methodName
      })
    }

    function mapDict() {
      const counts = new Map<string, Map<string, number>>()
      const dict = new Map<string, string>()

      for (const [, key, value] of source.matchAll(/'([^']+)':'([^']+)'/g)) {
        let valueMap = counts.get(key!)
        if (!valueMap) {
          valueMap = new Map()
          counts.set(key!, valueMap)
        }

        const newCount = (valueMap.get(value!) ?? 0) + 1
        valueMap.set(value!, newCount)

        const currentBest = dict.get(key!)
        if (!currentBest || newCount > (valueMap.get(currentBest) ?? 0)) {
          dict.set(key!, value!)
        }
      }

      return dict
    }
  } catch (error) {
    let message = 'Failed to parse Leviathan source code'
    if (error instanceof Error) {
      if ((error as any).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        message += `: Dict execution timeout`
      } else {
        message += `: ${error.message}`
      }
    }

    throw new LeviathanParseError(message, { cause: error })
  }
}
