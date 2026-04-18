import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'

const STORAGE_KEY = 'nekoserve:onboarded'

interface OnboardingStep {
  targetSelector: string
  titleKey: string
  bodyKey: string
}

const STEPS: OnboardingStep[] = [
  {
    targetSelector: '[data-onboarding="scenario-bar"]',
    titleKey: 'onboarding.step1Title',
    bodyKey: 'onboarding.step1Body',
  },
  {
    targetSelector: '[data-onboarding="run-button"]',
    titleKey: 'onboarding.step2Title',
    bodyKey: 'onboarding.step2Body',
  },
  {
    targetSelector: '[data-onboarding="nav-playback"]',
    titleKey: 'onboarding.step3Title',
    bodyKey: 'onboarding.step3Body',
  },
  {
    targetSelector: '[data-onboarding="nav-results"]',
    titleKey: 'onboarding.step4Title',
    bodyKey: 'onboarding.step4Body',
  },
]

export function resetOnboarding(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ok */ }
}

interface OnboardingOverlayProps {
  /** When flipped to true externally, re-opens the tour from step 0. */
  externalOpen?: boolean
  /** Called when the tour closes (finish or skip), so the parent can reset its trigger. */
  onClose?: () => void
}

export default function OnboardingOverlay({ externalOpen, onClose }: OnboardingOverlayProps) {
  const { t } = useTranslation('common')
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Auto-open on first launch
  useEffect(() => {
    if (window.electronAPI.testEnv.isE2E) return
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        const timer = setTimeout(() => setVisible(true), 500)
        return () => clearTimeout(timer)
      }
    } catch { /* ignore */ }
  }, [])

  // Re-open when parent triggers externally
  useEffect(() => {
    if (externalOpen) {
      setStep(0)
      setVisible(true)
    }
  }, [externalOpen])

  // Scroll target into view, wait for layout, then measure.
  const scrollAndMeasure = useCallback(() => {
    if (!visible) return
    const s = STEPS[step]
    if (!s) return
    const el = document.querySelector(s.targetSelector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      // Measure after scroll settles
      const timer = setTimeout(() => {
        setRect(el.getBoundingClientRect())
      }, 350)
      return () => clearTimeout(timer)
    } else {
      setRect(null)
    }
  }, [step, visible])

  useEffect(() => {
    const cleanup = scrollAndMeasure()
    const onResize = () => {
      const s = STEPS[step]
      if (!s) return
      const el = document.querySelector(s.targetSelector)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onResize)
    return () => {
      cleanup?.()
      window.removeEventListener('resize', onResize)
    }
  }, [scrollAndMeasure, step])

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finish()
    }
  }

  function finish() {
    setVisible(false)
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* ok */ }
    onClose?.()
  }

  useFocusTrap(tooltipRef, visible)

  if (!visible) return null

  const current = STEPS[step]

  // ── Spotlight cutout ──
  const PAD = 10
  const spotX = rect ? rect.left - PAD : 0
  const spotY = rect ? rect.top - PAD : 0
  const spotW = rect ? rect.width + PAD * 2 : 0
  const spotH = rect ? rect.height + PAD * 2 : 0

  // ── Tooltip placement ──
  // Try below first; if no room, go above; final clamp.
  const TW = 320
  const GAP = 14
  let tipTop = 0
  let tipLeft = 0

  if (rect) {
    tipLeft = Math.max(12, Math.min(rect.left, window.innerWidth - TW - 12))

    const tipH = tooltipRef.current?.offsetHeight ?? 180
    const spaceBelow = window.innerHeight - rect.bottom - GAP
    const spaceAbove = rect.top - GAP

    if (spaceBelow >= tipH) {
      // Below
      tipTop = rect.bottom + GAP
    } else if (spaceAbove >= tipH) {
      // Above
      tipTop = rect.top - tipH - GAP
    } else {
      // Neither fits: center vertically
      tipTop = Math.max(12, (window.innerHeight - tipH) / 2)
    }
  } else {
    tipTop = window.innerHeight / 2 - 90
    tipLeft = window.innerWidth / 2 - TW / 2
  }

  return (
    <div className="fixed inset-0 z-[9996]" role="dialog" aria-modal="true" aria-labelledby="onboarding-step-title" onClick={handleNext}>
      {/* Dark mask with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="ob-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect x={spotX} y={spotY} width={spotW} height={spotH} rx={12} fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#ob-mask)" />
      </svg>

      {/* Glow ring around spotlight */}
      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-orange-400 pointer-events-none"
          style={{ left: spotX, top: spotY, width: spotW, height: spotH }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute bg-white dark:bg-bark-800 rounded-2xl shadow-2xl p-5 animate-fade-in"
        style={{ top: tipTop, left: tipLeft, width: TW }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i === step ? 'bg-orange-500' : i < step ? 'bg-orange-300' : 'bg-gray-200 dark:bg-bark-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-start gap-2 mb-2">
          <span className="text-base">🐱</span>
          <h3 id="onboarding-step-title" className="text-sm font-bold text-orange-700 dark:text-orange-400">
            {t(current.titleKey)}
          </h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-bark-200 leading-relaxed mb-4">
          {t(current.bodyKey)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {step + 1} / {STEPS.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1"
            >
              {t('onboarding.skip')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary text-xs px-4 py-1.5"
            >
              {step < STEPS.length - 1 ? t('onboarding.next') : t('onboarding.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
