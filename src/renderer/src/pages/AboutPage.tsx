import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import appIconUrl from '@assets/app-icon.png'

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-bark-500 text-orange-600 dark:text-orange-400 text-xs font-medium hover:bg-orange-50 dark:hover:bg-bark-700 transition-colors no-drag"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7" />
        <path d="M8 1h3v3" />
        <path d="M11 1 5.5 6.5" />
      </svg>
      {label}
    </a>
  )
}

// Reusable bold inline element for <Trans> markup components.
const boldComponents = { strong: <strong className="font-semibold" /> }

interface AboutPageProps {
  onCheckForUpdate?: () => void
  updateChecking?: boolean
}

export default function AboutPage({ onCheckForUpdate, updateChecking }: AboutPageProps) {
  const { t } = useTranslation(['about', 'update'])
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    window.electronAPI.getAppVersion().then((v) => setVersion(v))
  }, [])

  return (
    <div className="page-container max-w-2xl">

      {/* ── App header ──────────────────────────────────── */}
      <div className="flex flex-col items-center text-center mb-8 pt-2">
        <span className="text-6xl mb-3">🐱</span>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-bark-50">{t('about:appName')}</h2>
        <p className="text-sm text-gray-500 dark:text-bark-300 mt-1">{t('about:subtitle')}</p>
        <p className="text-xs text-gray-400 dark:text-bark-400 mt-2">{version ? `v${version}` : ''}</p>
      </div>

      <div className="space-y-4">

        {/* ── Course background ─────────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:courseBackground.title')}</div>
          <div className="grid grid-cols-[5rem_1fr] gap-y-2.5 text-sm">
            <span className="text-gray-400 dark:text-bark-400">{t('about:courseBackground.author')}</span>
            <span className="font-medium text-gray-800 dark:text-bark-100">{t('about:courseBackground.authorValue')}</span>

            <span className="text-gray-400 dark:text-bark-400">{t('about:courseBackground.school')}</span>
            <span className="text-gray-700 dark:text-bark-200">{t('about:courseBackground.schoolValue')}</span>

            <span className="text-gray-400 dark:text-bark-400">{t('about:courseBackground.department')}</span>
            <span className="text-gray-700 dark:text-bark-200">{t('about:courseBackground.departmentValue')}</span>

            <span className="text-gray-400 dark:text-bark-400">{t('about:courseBackground.course')}</span>
            <span className="text-gray-700 dark:text-bark-200">{t('about:courseBackground.courseValue')}</span>
          </div>

          <div className="border-t border-orange-50 dark:border-bark-600 mt-4 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">
              <span>{t('about:courseBackground.advisorHeading')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-orange-50 dark:bg-bark-700 border border-orange-100 dark:border-bark-500 text-sm text-gray-700 dark:text-bark-200">
                {t('about:courseBackground.advisorValue')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tech stack ────────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:tech.title')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-bark-200 mb-4">
            <div className="space-y-1.5">
              <div className="font-semibold text-orange-600 dark:text-orange-400 text-xs mb-1">{t('about:tech.frontendLabel')}</div>
              <p className="text-gray-600 dark:text-bark-300">Electron　·　React 18　·　TypeScript</p>
              <p className="text-gray-600 dark:text-bark-300">Tailwind CSS　·　Recharts</p>
            </div>
            <div className="space-y-1.5">
              <div className="font-semibold text-orange-600 dark:text-orange-400 text-xs mb-1">{t('about:tech.coreLabel')}</div>
              <p className="text-gray-600 dark:text-bark-300">Python 3.11　·　SimPy 4</p>
              <p className="text-gray-600 dark:text-bark-300">PyInstaller　·　electron-vite</p>
            </div>
          </div>

          <div className="border-t border-orange-50 dark:border-bark-600 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-bark-200">{t('about:tech.github')}</p>
                <p className="text-xs text-gray-400 dark:text-bark-400">swiftruru/nekoserve</p>
              </div>
              <ExternalLink href="https://github.com/swiftruru/nekoserve" label="GitHub" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-bark-200">{t('about:tech.homepage')}</p>
                <p className="text-xs text-gray-400 dark:text-bark-400">swift.moe</p>
              </div>
              <ExternalLink href="https://swift.moe" label="swift.moe" />
            </div>
          </div>
        </div>

        {/* ── Description ───────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:description.title')}</div>
          <p className="text-sm text-gray-700 dark:text-bark-200 leading-relaxed">
            {t('about:description.body')}
          </p>
        </div>

        {/* ── Architecture ──────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:architecture.title')}</div>
          <div className="text-sm text-gray-700 dark:text-bark-200 space-y-2 leading-relaxed">
            <p>
              <Trans i18nKey="about:architecture.simulationLogic" components={boldComponents} />
            </p>
            <p>
              <Trans i18nKey="about:architecture.ipc" components={boldComponents} />
            </p>
          </div>
        </div>

        {/* ── Random distributions ──────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:distributions.title')}</div>
          <div className="text-sm text-gray-700 dark:text-bark-200 space-y-1">
            <p>• <Trans i18nKey="about:distributions.arrival" components={boldComponents} /></p>
            <p>• <Trans i18nKey="about:distributions.service" components={boldComponents} /></p>
            <p>• <Trans i18nKey="about:distributions.catRest" components={boldComponents} /></p>
          </div>
        </div>

        {/* ── Usage ─────────────────────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:usage.title')}</div>
          <ol className="text-sm text-gray-700 dark:text-bark-200 space-y-1 list-decimal list-inside">
            <li>{t('about:usage.step1')}</li>
            <li>{t('about:usage.step2')}</li>
            <li>{t('about:usage.step3')}</li>
            <li>{t('about:usage.step4')}</li>
            <li>{t('about:usage.step5')}</li>
            <li>{t('about:usage.step6')}</li>
            <li>{t('about:usage.step7')}</li>
            <li>{t('about:usage.step8')}</li>
          </ol>
        </div>

        {/* ── Designing experiments ─────────────────── */}
        <div className="card">
          <div className="card-title">{t('about:experiment.title')}</div>
          <div className="text-sm text-gray-700 dark:text-bark-200 space-y-4 leading-relaxed">
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">{t('about:experiment.principle1Title')}</p>
              <p>
                <Trans i18nKey="about:experiment.principle1Body" components={boldComponents} />
              </p>
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">{t('about:experiment.principle2Title')}</p>
              <p>{t('about:experiment.principle2Body')}</p>
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">{t('about:experiment.principle3Title')}</p>
              <p className="mb-1">
                <Trans i18nKey="about:experiment.principle3BodyA" components={boldComponents} />
              </p>
              <p>
                <Trans i18nKey="about:experiment.principle3BodyB" components={boldComponents} />
              </p>
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">{t('about:experiment.principle4Title')}</p>
              <ul className="space-y-1 ml-3">
                <li>• <Trans i18nKey="about:experiment.principle4Item1" components={boldComponents} /></li>
                <li>• <Trans i18nKey="about:experiment.principle4Item2" components={boldComponents} /></li>
                <li>• <Trans i18nKey="about:experiment.principle4Item3" components={boldComponents} /></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">{t('about:experiment.principle5Title')}</p>
              <p className="mb-1">{t('about:experiment.principle5BodyA')}</p>
              <p>{t('about:experiment.principle5BodyB')}</p>
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">{t('about:experiment.principle6Title')}</p>
              <p>{t('about:experiment.principle6Body')}</p>
            </div>
          </div>
        </div>

        {/* ── Version & Updates ─────────────────────── */}
        <div className="card">
          <div className="card-title">{t('update:versionAndUpdate')}</div>
          <div className="flex items-center gap-4">
            <img src={appIconUrl} alt="NekoServe" className="w-12 h-12 rounded-xl shadow-sm flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-bark-100">NekoServe</p>
              <p className="text-xs text-gray-400 dark:text-bark-400">
                {t('update:currentVersionLabel')}: {version ? `v${version}` : '...'}
              </p>
            </div>
            <button
              type="button"
              onClick={onCheckForUpdate}
              disabled={updateChecking}
              className={`flex-shrink-0 px-4 py-2 rounded-xl border text-xs font-medium transition-colors no-drag ${
                updateChecking
                  ? 'border-orange-100 dark:border-bark-600 text-orange-300 dark:text-bark-400 cursor-not-allowed'
                  : 'border-orange-200 dark:border-bark-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 active:bg-orange-100'
              }`}
            >
              {updateChecking ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-[1.5px] border-orange-200 border-t-orange-400 rounded-full animate-spin" />
                  {t('update:checkingButton')}
                </span>
              ) : (
                t('update:checkForUpdates')
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
