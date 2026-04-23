/**
 * Glossary of DES / queueing-theory terms that appear on the Results
 * page. Each entry lists the surface keywords to match in rendered
 * text; when a string runs through `splitByTerms` it comes back as an
 * array of segments where every keyword hit is replaced by a tagged
 * token that the TermTooltip component renders with a definition
 * popover.
 *
 * The `key` is an i18n key under `results:glossary.terms.<key>`
 * resolving to `{ label, def }`. Keeping the labels in i18n lets us
 * translate the term definitions, while the keywords in this file are
 * language-neutral literal strings that the matcher looks for.
 */

export interface TermDef {
  /** i18n key: `results:glossary.terms.<key>` */
  key: string
  /**
   * Literal keywords to look for in text. Matches are case-sensitive.
   * The longer keywords are tried first (see `ORDERED_TERMS`), so
   * `Little's Law` wins over `Little`.
   */
  keywords: string[]
}

/** Authoritative term list. Add new entries here. */
export const TERMS: TermDef[] = [
  {
    key: 'kingman',
    keywords: [
      "Kingman's formula",
      'Kingman 近似',
      'Kingman approximation',
      'Kingman',
    ],
  },
  {
    key: 'littlesLaw',
    keywords: ["Little's Law", 'Little 定理', 'Little 法則'],
  },
  {
    key: 'poisson',
    keywords: ['Poisson 過程', 'Poisson process', 'Poisson'],
  },
  {
    key: 'utilization',
    keywords: ['利用率', 'utilization', 'ρ'],
  },
  {
    key: 'lambdaRate',
    keywords: ['抵達率', 'arrival rate', 'λ'],
  },
  {
    key: 'waitTime',
    keywords: ['W_q'],
  },
  {
    key: 'queueLength',
    keywords: ['L(t)', 'L̄', '隊列長度'],
  },
  {
    key: 'mmc',
    keywords: ['M/M/c'],
  },
  {
    key: 'simpy',
    keywords: ['env.run', 'SimPy'],
  },
  {
    key: 'des',
    keywords: ['離散事件模擬', 'Discrete Event Simulation', 'DES'],
  },
  {
    key: 'exponential',
    keywords: ['指數分布', 'Exponential', '指數'],
  },
  {
    key: 'erlangC',
    keywords: ['Erlang-C'],
  },
  {
    key: 'inFlight',
    keywords: ['in-flight', '模擬結束時仍在店內'],
  },
  {
    key: 'bottleneck',
    keywords: ['瓶頸', 'bottleneck'],
  },
  {
    key: 'reneging',
    keywords: ['reneging', '反悔', '提早放棄'],
  },
  {
    key: 'balking',
    keywords: ['balking', 'balk', '猶豫離開'],
  },
  {
    key: 'logNormal',
    keywords: ['Log-Normal', 'log-normal', '對數常態'],
  },
  {
    key: 'weibull',
    keywords: ['Weibull', '韋伯分佈'],
  },
  {
    key: 'rcrf',
    keywords: ['RCRF'],
  },
  {
    key: 'rhoCorrected',
    keywords: ['ρ_R'],
  },
  {
    key: 'normalDist',
    keywords: ['常態分佈', 'Normal distribution', 'Normal 分佈'],
  },
  {
    key: 'curveFit',
    keywords: ['curve fitting', 'curve fit'],
  },
  {
    key: 'mm1',
    keywords: ['M/M/1'],
  },
  {
    key: 'plsSem',
    keywords: ['PLS-SEM'],
  },
  {
    key: 'chiSquare',
    keywords: ['卡方檢定', 'chi-square', 'chi square'],
  },
  {
    key: 'agentBased',
    keywords: ['agent-based', 'Agent-Based', 'agent based'],
  },
  {
    key: 'maxWaitTime',
    keywords: ['maxWaitTime'],
  },
  {
    key: 'customerArrivalInterval',
    keywords: ['customerArrivalInterval'],
  },
  {
    key: 'ethogram',
    keywords: ['ethogram', 'Ethogram'],
  },
  {
    key: 'catWelfareScore',
    keywords: ['CatWelfareScore', '貓咪福祉分數'],
  },
  {
    key: 'paretoFrontier',
    keywords: ['Pareto frontier', 'Pareto 前沿', 'Pareto'],
  },
  // ── v2.1 validation page jargon ────────────────────────────
  {
    key: 'goodnessOfFit',
    keywords: ['goodness-of-fit', 'goodness of fit', '適合度檢定'],
  },
  {
    key: 'ksDivergence',
    keywords: ['Kolmogorov-Smirnov', 'KS 檢定', 'KS test', 'KS'],
  },
  {
    key: 'klDivergence',
    keywords: ['KL divergence', 'Kullback-Leibler', 'KL 相對熵', 'KL'],
  },
  {
    key: 'wilsonCI',
    keywords: ['Wilson score', 'Wilson 信賴區間', 'Wilson CI'],
  },
  {
    key: 'cdf',
    keywords: ['CDF', '累積分布', 'cumulative distribution'],
  },
  {
    key: 'pValue',
    keywords: ['p-value', 'p 值'],
  },
  {
    key: 'criticalValue',
    keywords: ['critical value', '臨界值'],
  },
  {
    key: 'degreesOfFreedom',
    keywords: ['degrees of freedom', '自由度', 'df'],
  },
  {
    key: 'stdResidual',
    keywords: ['standardized residual', '標準化殘差', 'std residual'],
  },
  {
    key: 'residual',
    keywords: ['Pearson residual', 'residual', '殘差'],
  },
  {
    key: 'nats',
    keywords: ['nats', '奈特'],
  },
  {
    key: 'monteCarlo',
    keywords: ['Monte Carlo', '蒙地卡羅', 'Monte-Carlo'],
  },
  {
    key: 'bonferroni',
    keywords: ['Bonferroni', '邦弗朗尼校正'],
  },
  {
    key: 'faceValidity',
    keywords: ['face validity', 'face-validity', '表面效度'],
  },
  {
    key: 'compositeScore',
    keywords: [
      'multi-metric composite',
      'composite score',
      'multi-indicator composite',
      '合成分數',
    ],
  },
  {
    key: 'softCap',
    keywords: ['soft-cap', 'soft cap', '軟封頂'],
  },
  {
    key: 'typeIError',
    keywords: ['Type I error', 'Type-I error', '型一錯誤'],
  },
  {
    key: 'outlier',
    keywords: ['outlier', '離群值'],
  },
  {
    key: 'verificationValidation',
    keywords: ['Verification & Validation', 'V&V'],
  },
]

/**
 * Flat list of keywords paired with their term, sorted by keyword
 * length descending. Used by the matcher so "Little's Law" beats
 * "Little" and "Kingman 近似" beats "Kingman".
 */
interface KeywordEntry {
  keyword: string
  termKey: string
}

const ORDERED_KEYWORDS: KeywordEntry[] = TERMS.flatMap((t) =>
  t.keywords.map((k) => ({ keyword: k, termKey: t.key })),
).sort((a, b) => b.keyword.length - a.keyword.length)

/** Escape regex metacharacters so literal keywords work verbatim. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * One compiled pattern for all keywords, joined with `|`. Longest
 * alternatives first so `Kingman's formula` hits before `Kingman`.
 * Rebuilt once per module load.
 */
const PATTERN = new RegExp(
  ORDERED_KEYWORDS.map((e) => escapeRegex(e.keyword)).join('|'),
  'g',
)

/** Reverse lookup: keyword literal → owning term key. */
const KEYWORD_TO_TERM = new Map<string, string>()
for (const e of ORDERED_KEYWORDS) {
  // The first hit wins; later, shorter keywords that overlap don't
  // overwrite the longer entry's mapping.
  if (!KEYWORD_TO_TERM.has(e.keyword)) {
    KEYWORD_TO_TERM.set(e.keyword, e.termKey)
  }
}

export interface TermSegment {
  type: 'term'
  keyword: string
  termKey: string
}

export interface TextSegment {
  type: 'text'
  text: string
}

export type Segment = TermSegment | TextSegment

/**
 * Split `text` into interleaved text and term segments. Consumers
 * (ResultsPage) map the returned array into React nodes: text
 * segments become plain strings and term segments become
 * TermTooltip components.
 */
export function splitByTerms(text: string): Segment[] {
  if (text.length === 0) return []
  const out: Segment[] = []
  let lastIndex = 0
  // Reset state so consecutive calls on the shared global regex work.
  PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    const termKey = KEYWORD_TO_TERM.get(match[0]) ?? ''
    out.push({ type: 'term', keyword: match[0], termKey })
    lastIndex = match.index + match[0].length
    // Guard against zero-length matches (shouldn't happen with the
    // literal-keyword pattern, but kept for safety).
    if (match[0].length === 0) PATTERN.lastIndex += 1
  }
  if (lastIndex < text.length) {
    out.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return out
}
