import { useState, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// ── Lightweight Python syntax highlighter ────────────────────
// No external dependency. Covers keywords, builtins, strings,
// comments, numbers, and operators used in the SimPy snippets.

const PY_KEYWORDS = new Set([
  'yield', 'with', 'as', 'if', 'else', 'for', 'in', 'while',
  'def', 'class', 'return', 'import', 'from', 'not', 'and', 'or',
  'True', 'False', 'None', 'break', 'continue', 'pass', 'raise',
  'try', 'except', 'finally', 'lambda', 'del', 'global', 'nonlocal',
])

const PY_BUILTINS = new Set([
  'simpy', 'env', 'range', 'sum', 'sqrt', 'round', 'min', 'max',
  'len', 'print', 'int', 'float', 'str', 'list', 'dict', 'set',
  'append', 'Resource', 'Environment', 'Container',
  'request', 'release', 'timeout', 'process', 'run', 'cancel',
  'get', 'put', 'random', 'setup', 'average', 'collect_metrics',
])

interface Token {
  type: 'keyword' | 'builtin' | 'string' | 'comment' | 'number' | 'operator' | 'plain'
  text: string
}

function tokenizePython(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < code.length) {
    // Comment
    if (code[i] === '#') {
      const end = code.indexOf('\n', i)
      const slice = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ type: 'comment', text: slice })
      i += slice.length
      continue
    }

    // Strings (single/double quotes, including f-strings)
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i]
      let j = i + 1
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') j++ // skip escaped char
        j++
      }
      j++ // include closing quote
      tokens.push({ type: 'string', text: code.slice(i, j) })
      i = j
      continue
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s=+\-*/(,[\]|:]/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && /[0-9._eE]/.test(code[j])) j++
      tokens.push({ type: 'number', text: code.slice(i, j) })
      i = j
      continue
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++
      const word = code.slice(i, j)
      if (PY_KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', text: word })
      } else if (PY_BUILTINS.has(word)) {
        tokens.push({ type: 'builtin', text: word })
      } else {
        tokens.push({ type: 'plain', text: word })
      }
      i = j
      continue
    }

    // Operators
    if ('=|+-*/<>!&%^~'.includes(code[i])) {
      tokens.push({ type: 'operator', text: code[i] })
      i++
      continue
    }

    // Everything else (whitespace, parens, brackets, etc.)
    tokens.push({ type: 'plain', text: code[i] })
    i++
  }

  return tokens
}

const TOKEN_STYLES: Record<Token['type'], string> = {
  keyword:  'text-purple-600 dark:text-purple-400 font-semibold',
  builtin:  'text-blue-600 dark:text-sky-400',
  string:   'text-green-700 dark:text-green-400',
  comment:  'text-gray-400 dark:text-bark-500 italic',
  number:   'text-amber-700 dark:text-amber-400',
  operator: 'text-rose-600 dark:text-rose-400',
  plain:    '',
}

function HighlightedCode({ code }: { code: string }): ReactNode {
  const tokens = tokenizePython(code)
  return (
    <>
      {tokens.map((tok, i) =>
        tok.type === 'plain' ? (
          <span key={i}>{tok.text}</span>
        ) : (
          <span key={i} className={TOKEN_STYLES[tok.type]}>{tok.text}</span>
        ),
      )}
    </>
  )
}

// ── CodeToggle component ─────────────────────────────────────

interface CodeToggleProps {
  /** Python code snippet (language-neutral, not translated). */
  code: string
  /** Translated note shown below the code block. */
  note: string
}

/**
 * Collapsible Python code block with syntax highlighting and
 * a copy-to-clipboard button. Collapsed by default so the
 * interactive demo stays front-and-center.
 */
export default function CodeToggle({ code, note }: CodeToggleProps) {
  const { t } = useTranslation('howItWorks')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback: select text in the <pre>
    }
  }, [code])

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 flex items-center gap-1"
      >
        <span className="text-[10px] transition-transform duration-150" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
          ▶
        </span>
        {open ? t('hideCode') : t('showCode')}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          <div className="relative group">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className={
                'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ' +
                (copied
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                  : 'bg-white/80 dark:bg-bark-600/80 text-gray-400 dark:text-bark-300 opacity-0 group-hover:opacity-100 hover:text-gray-600 dark:hover:text-bark-100 border border-gray-200 dark:border-bark-500')
              }
              aria-label="Copy code"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>

            <pre className="font-mono text-[13px] bg-gray-50 dark:bg-bark-700 border border-gray-200 dark:border-bark-600 rounded-lg px-4 py-3 leading-relaxed text-gray-700 dark:text-bark-200 whitespace-pre overflow-x-auto select-text">
              <HighlightedCode code={code} />
            </pre>
          </div>
          <p className="text-xs text-gray-500 dark:text-bark-400">{note}</p>
        </div>
      )}
    </div>
  )
}
