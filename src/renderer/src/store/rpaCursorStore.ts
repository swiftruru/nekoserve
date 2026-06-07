/**
 * RPA fake cursor store.
 *
 * Lives at App.tsx level via <RpaFakeCursor />. The sweep runner pushes
 * (x, y, visible, label) updates and the cursor component slides to the
 * new position via CSS transition. Decoupling the cursor from the
 * orchestrator (instead of passing refs around) lets the cursor render
 * from anywhere in the tree, including while the RPA modal is hidden.
 */

import { create } from 'zustand'

interface RpaCursorState {
  x: number
  y: number
  visible: boolean
  /** Optional small tooltip the cursor shows under itself, e.g.
   *  "點擊 ⚙️ 模擬設定" or "輸入 3". Empty string for no tooltip. */
  label: string
  moveTo: (x: number, y: number, label?: string) => void
  show: () => void
  hide: () => void
}

export const useRpaCursorStore = create<RpaCursorState>((set) => ({
  x: 0,
  y: 0,
  visible: false,
  label: '',
  moveTo: (x, y, label = '') => set({ x, y, label }),
  show: () => set({ visible: true }),
  hide: () => set({ visible: false, label: '' }),
}))
