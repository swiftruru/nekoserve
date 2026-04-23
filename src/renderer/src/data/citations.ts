/**
 * NekoServe central citations registry.
 *
 * Single source of truth for every piece of literature cited anywhere in
 * the app (parameter defaults, learning notes, literature review, about
 * page, BibTeX export). UI components and the BibTeX generator both
 * read from here, so a DOI update only needs to change one line.
 */

export interface Citation {
  /** BibTeX-style key, e.g. "hirsch2025cats". */
  key: string
  doi: string
  authors: string[]
  year: number
  title: string
  journal?: string
  volume?: number
  issue?: number
  pages?: string
  publisher?: string
  /** Canonical URL. Defaults to https://doi.org/{doi} if omitted. */
  url?: string
  /** Whether the paper is open access (controls UI "free download" badge). */
  openAccess: boolean
  /** Short tag describing the citation's role in NekoServe. */
  role?:
    | 'core-empirical'
    | 'empirical-arrival'
    | 'empirical-reneging'
    | 'classical-queueing'
    | 'classical-balking-reneging'
    | 'customer-psychology'
    | 'animal-welfare'
    | 'methodology-validation'
    | 'methodology-statistics'
}

/**
 * Resolve the canonical external URL for a citation.
 * Used by hyperlinks everywhere.
 */
export function citationUrl(c: Citation): string {
  return c.url ?? `https://doi.org/${c.doi}`
}

/**
 * Short APA-style inline string, e.g. "Hirsch et al. (2025)".
 * For the first author's surname we take the first token of the first author entry.
 */
export function citationShort(c: Citation): string {
  const first = c.authors[0] ?? ''
  const surname = first.split(',')[0].trim() || first
  if (c.authors.length >= 3) return `${surname} et al. (${c.year})`
  if (c.authors.length === 2) {
    const second = c.authors[1] ?? ''
    const secondSurname = second.split(',')[0].trim() || second
    return `${surname} & ${secondSurname} (${c.year})`
  }
  return `${surname} (${c.year})`
}

export const CITATIONS: Record<string, Citation> = {
  hirsch2025cats: {
    key: 'hirsch2025cats',
    doi: '10.3390/ani15223233',
    authors: ['Hirsch, E. N.', 'Navarro Rivero, B.', 'Andersson, M.'],
    year: 2025,
    title: 'Cats in a Cat Café: Individual Cat Behavior and Interactions with Humans',
    journal: 'Animals',
    volume: 15,
    issue: 22,
    pages: '3233',
    publisher: 'MDPI',
    openAccess: true,
    role: 'core-empirical',
  },

  dbeis2024enhancing: {
    key: 'dbeis2024enhancing',
    doi: '10.1080/23270012.2024.2408528',
    authors: ['Dbeis, A.', 'Al-Sahili, K.'],
    year: 2024,
    title:
      'Enhancing Queuing Theory Realism: Analysis of Reneging Behavior Impact on M/M/1 Drive-Thru Service System',
    journal: 'Journal of Management Analytics',
    volume: 11,
    issue: 4,
    pages: '659-674',
    publisher: 'Taylor & Francis',
    // Taylor & Francis has IP-based paywall. Point to the Najah
    // University open-access mirror maintained by co-author Al-Sahili
    // (verified 2026-04-22). doi.org still resolves for archival
    // completeness, but the primary link is the free PDF.
    url: 'https://staff.najah.edu/media/published_research/2025/02/14/Enhancing_queuing_theory_realism__analysis_of_reneging_behavior_impact_on_M_M_1_drive-thru_service_system.pdf',
    openAccess: true,
    role: 'empirical-reneging',
  },

  hasugian2020analysis: {
    key: 'hasugian2020analysis',
    doi: '10.1088/1757-899X/851/1/012028',
    authors: ['Hasugian, I. A.', 'Vandrick, N.', 'Dewi, E.'],
    year: 2020,
    title: 'Analysis of Queuing Models of Fast Food Restaurant with Simulation Approach',
    journal: 'IOP Conference Series: Materials Science and Engineering',
    volume: 851,
    issue: 1,
    pages: '012028',
    publisher: 'IOP Publishing',
    openAccess: true,
    role: 'empirical-arrival',
  },

  li2025attributes: {
    key: 'li2025attributes',
    doi: '10.1177/21582440251378834',
    authors: ['Li, J.', 'Wong, J. W. C.', 'Fong, L. H. N.', 'Zhou, Y.'],
    year: 2025,
    title: 'Attributes Influencing Pet Café Satisfaction and Social Media Sharing Intentions',
    journal: 'SAGE Open',
    publisher: 'SAGE Publications',
    openAccess: true,
    role: 'customer-psychology',
  },

  ropski2023analysis: {
    key: 'ropski2023analysis',
    doi: '10.1016/j.jveb.2023.02.005',
    authors: ['Ropski, M. K.', 'Pike, A. L.', 'Ramezani, N.'],
    year: 2023,
    title:
      'Analysis of illness and length of stay for cats in a foster-based rescue organization compared with cats housed in a cat café',
    journal: 'Journal of Veterinary Behavior',
    publisher: 'Elsevier',
    openAccess: false,
    role: 'animal-welfare',
  },

  ancker1963balking1: {
    key: 'ancker1963balking1',
    doi: '10.1287/opre.11.1.88',
    authors: ['Ancker Jr., C. J.', 'Gafarian, A. V.'],
    year: 1963,
    title: 'Some Queuing Problems with Balking and Reneging. I',
    journal: 'Operations Research',
    volume: 11,
    issue: 1,
    pages: '88-100',
    publisher: 'INFORMS',
    openAccess: false,
    role: 'classical-balking-reneging',
  },

  ancker1963balking2: {
    key: 'ancker1963balking2',
    doi: '10.1287/opre.11.6.928',
    authors: ['Ancker Jr., C. J.', 'Gafarian, A. V.'],
    year: 1963,
    title: 'Some Queuing Problems with Balking and Reneging. II',
    journal: 'Operations Research',
    volume: 11,
    issue: 6,
    pages: '928-937',
    publisher: 'INFORMS',
    openAccess: false,
    role: 'classical-balking-reneging',
  },

  little1961proof: {
    key: 'little1961proof',
    doi: '10.1287/opre.9.3.383',
    authors: ['Little, J. D. C.'],
    year: 1961,
    title: 'A Proof for the Queuing Formula: L = λW',
    journal: 'Operations Research',
    volume: 9,
    issue: 3,
    pages: '383-387',
    publisher: 'INFORMS',
    openAccess: false,
    role: 'classical-queueing',
  },

  // Simulation V&V methodology: backs our multi-metric composite score
  sargent2013vv: {
    key: 'sargent2013vv',
    doi: '10.1109/WSC.2013.6721420',
    authors: ['Sargent, R. G.'],
    year: 2013,
    title: 'Verification and validation of simulation models',
    journal: 'Proceedings of the 2013 Winter Simulation Conference',
    pages: '321-327',
    publisher: 'IEEE',
    openAccess: false,
    role: 'methodology-validation',
  },

  kleijnen1995vv: {
    key: 'kleijnen1995vv',
    doi: '10.1016/0377-2217(94)00016-6',
    authors: ['Kleijnen, J. P. C.'],
    year: 1995,
    title: 'Verification and validation of simulation models',
    journal: 'European Journal of Operational Research',
    volume: 82,
    issue: 1,
    pages: '145-162',
    publisher: 'Elsevier',
    openAccess: false,
    role: 'methodology-validation',
  },

  rubner2000emd: {
    key: 'rubner2000emd',
    doi: '10.1023/A:1026543900054',
    authors: ['Rubner, Y.', 'Tomasi, C.', 'Guibas, L. J.'],
    year: 2000,
    title: 'The Earth Mover\'s Distance as a Metric for Image Retrieval',
    journal: 'International Journal of Computer Vision',
    volume: 40,
    issue: 2,
    pages: '99-121',
    publisher: 'Springer',
    openAccess: false,
    role: 'methodology-validation',
  },

  agresti2013cda: {
    key: 'agresti2013cda',
    doi: '10.1002/9780470594001',
    authors: ['Agresti, A.'],
    year: 2013,
    title: 'Categorical Data Analysis',
    publisher: 'Wiley',
    pages: '752',
    openAccess: false,
    role: 'methodology-statistics',
  },

  wilson1927ci: {
    key: 'wilson1927ci',
    doi: '10.1080/01621459.1927.10502953',
    authors: ['Wilson, E. B.'],
    year: 1927,
    title: 'Probable Inference, the Law of Succession, and Statistical Inference',
    journal: 'Journal of the American Statistical Association',
    volume: 22,
    issue: 158,
    pages: '209-212',
    publisher: 'Taylor & Francis',
    openAccess: false,
    role: 'methodology-statistics',
  },
}

/**
 * Format a single citation as a BibTeX entry.
 * Used by scripts/generate-bibtex.ts and by the CitationsPage "copy BibTeX" button.
 */
export function citationToBibTeX(c: Citation): string {
  const fields: [string, string | number | undefined][] = [
    ['title', c.title],
    ['author', c.authors.join(' and ')],
    ['year', c.year],
    ['journal', c.journal],
    ['volume', c.volume],
    ['number', c.issue],
    ['pages', c.pages?.replace(/-/g, '--')],
    ['publisher', c.publisher],
    ['doi', c.doi],
  ]
  const body = fields
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `  ${k}={${v}}`)
    .join(',\n')
  return `@article{${c.key},\n${body}\n}`
}
