/**
 * Parameter metadata types for NekoServe v2.0.
 *
 * ParameterWithSource<T> wraps any parameter value with provenance info
 * so the UI can show which literature the default came from, and the
 * BibTeX generator can assemble a .bib file directly from code.
 *
 * We keep the runtime SimulationConfig as flat numbers for the Python
 * simulator pipeline, and attach ParameterWithSource metadata as a
 * sidecar (PARAMETER_META in data/parameterMeta.ts) that the UI reads.
 */

import type { Citation } from '../data/citations'

export interface ParameterWithSource<T> {
  /** The actual default value used by the simulator. */
  value: T
  /** Unit description (e.g. "customers/day", "minutes", "count"). */
  unit?: string
  /** Literature citation. Use the Citation object from citations.ts, not a bare string. */
  source: Citation
  /** Free-form note explaining how the value was chosen or qualifying it. */
  note?: string
  /** Empirical or practical bounds from the literature (e.g. IQR). */
  bounds?: { min: T; max: T }
}
