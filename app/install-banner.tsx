'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'spw_install_dismissed'

// beforeinstallprompt isn't in standard TypeScript lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already running as an installed PWA — hide permanently.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // User already dismissed — respect that forever.
    if (localStorage.getItem(STORAGE_KEY) === '1') return

    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // iOS Safari never fires beforeinstallprompt; show the manual guide instead.
      setShow(true)
    } else {
      // Android/desktop Chrome: wait for the browser's installability signal.
      const handler = (e: Event) => {
        e.preventDefault() // Don't show the default mini-bar prompt.
        promptRef.current = e as BeforeInstallPromptEvent
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  async function install() {
    const prompt = promptRef.current
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    // Whether they accepted or dismissed, don't show the banner again.
    if (outcome === 'accepted') {
      setShow(false)
    }
    dismiss()
  }

  if (!show) return null

  return (
    <div className="w-full max-w-md rounded-xl border border-[#c9a84c]/30 bg-neutral-900 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl" aria-hidden>
          📲
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            Add Success Power to your home screen
          </p>
          {isIOS ? (
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              Tap the{' '}
              <span className="font-semibold text-neutral-300">
                Share button ↑
              </span>{' '}
              in your browser bar, then tap{' '}
              <span className="font-semibold text-neutral-300">
                &ldquo;Add to Home Screen&rdquo;
              </span>
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-neutral-400">
                Works offline, instant open, no app store needed.
              </p>
              <button
                type="button"
                onClick={install}
                className="mt-2.5 rounded-md bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#d4b85c] active:scale-95"
              >
                Install app
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="shrink-0 text-neutral-500 transition hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
