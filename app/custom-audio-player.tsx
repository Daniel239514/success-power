'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// The playback speeds the speed button cycles through, in order.
const SPEEDS = [0.75, 1, 1.25, 1.5]

// Turn a number of seconds into "M:SS" (e.g. 75 -> "1:15").
function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export default function CustomAudioPlayer({
  src,
  title,
  episodeId,
  userId,
}: {
  src: string
  title: string
  episodeId: string
  userId: string
}) {
  // Whether audio is currently playing. Changing this redraws the icon.
  const [isPlaying, setIsPlaying] = useState(false)

  // How far we are (seconds) and how long the episode is (seconds).
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Current playback speed (one of SPEEDS).
  const [speed, setSpeed] = useState(1)

  // The "Resuming from 2:30" note, and whether it's currently fading away.
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [resumeFading, setResumeFading] = useState(false)

  // A stable handle to the real <audio> element. Changing it does NOT redraw.
  const audioRef = useRef<HTMLAudioElement>(null)

  // Holds a saved position fetched from the DB until the audio is ready to be
  // moved to it (we can't seek before the audio knows its own length).
  const pendingSeekRef = useRef<number | null>(null)

  // Create the Supabase browser client exactly once. Passing a function to
  // useState means it runs only on the first render, not on every render.
  const [supabase] = useState(() => createClient())

  // The filled percentage of the bar. Guard against dividing by zero.
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Save the current position to the database. "Upsert" = update the row if it
  // already exists (matched on the user_id + episode_id primary key), or insert
  // a new one if not. Wrapped in useCallback so it stays the same function
  // across renders, which keeps the 5-second timer below from resetting.
  const saveProgress = useCallback(
    async (completed: boolean) => {
      const audio = audioRef.current
      if (!audio) return
      await supabase.from('listening_progress').upsert({
        user_id: userId,
        episode_id: episodeId,
        position_seconds: Math.floor(audio.currentTime),
        completed,
        updated_at: new Date().toISOString(),
      })
    },
    [supabase, userId, episodeId],
  )

  // While playing, save progress every 5 seconds. The timer is created when
  // playback starts and cleared when it stops (or the component unmounts).
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => saveProgress(false), 5000)
    return () => clearInterval(timer)
  }, [isPlaying, saveProgress])

  // On load, fetch this user's saved spot for this episode and resume there.
  // Runs once (the deps are all stable). `cancelled` stops us touching state
  // if the player unmounts before the network request comes back.
  useEffect(() => {
    let cancelled = false

    async function loadProgress() {
      const { data } = await supabase
        .from('listening_progress')
        .select('position_seconds, completed')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .maybeSingle()

      if (cancelled || !data) return
      // A finished episode starts fresh, not at the last second.
      if (data.completed || data.position_seconds <= 0) return

      const audio = audioRef.current
      if (audio && audio.readyState >= 1) {
        // Audio metadata already loaded: seek now.
        audio.currentTime = data.position_seconds
      } else {
        // Not ready yet: stash it for onLoadedMetadata to apply.
        pendingSeekRef.current = data.position_seconds
      }
      setResumeMessage(`Resuming from ${formatTime(data.position_seconds)}`)
    }

    loadProgress()
    return () => {
      cancelled = true
    }
  }, [supabase, userId, episodeId])

  // Fade the "Resuming from..." note out after 3s, then remove it from the DOM.
  useEffect(() => {
    if (!resumeMessage) return
    const fadeTimer = setTimeout(() => setResumeFading(true), 3000)
    const removeTimer = setTimeout(() => setResumeMessage(null), 3800)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [resumeMessage])

  // Tell the OS what's playing, so the lock screen shows the right info.
  // Re-runs whenever `title` changes (i.e. a different episode loads).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Sam Adeyemi',
      album: 'Success Power',
      artwork: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    })
  }, [title])

  // Tell the OS what to do when the user taps the lock-screen / headphone
  // buttons. Runs once on mount; the handlers read the audio element live
  // through the ref, so they never go stale and don't need to re-run.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const audio = audioRef.current
    if (!audio) return

    navigator.mediaSession.setActionHandler('play', () => audio.play())
    navigator.mediaSession.setActionHandler('pause', () => audio.pause())
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset ?? 10
      audio.currentTime = Math.max(audio.currentTime - skip, 0)
    })
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset ?? 10
      audio.currentTime = Math.min(audio.currentTime + skip, audio.duration || 0)
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) audio.currentTime = details.seekTime
    })

    // Cleanup: clear the handlers if this player ever unmounts, so they
    // don't linger and point at an audio element that's gone.
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }

  // Jump the given number of seconds (negative = back), clamped to the track.
  function skip(seconds: number) {
    const audio = audioRef.current
    if (!audio) return
    const max = Number.isFinite(audio.duration)
      ? audio.duration
      : audio.currentTime + seconds
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), max)
    setCurrentTime(audio.currentTime)
    updatePositionState()
  }

  // Tell the OS how long the track is, where we are, and the speed. This is
  // what makes the lock-screen scrubber accurate and the remote play/pause
  // reliable (especially on iOS, which otherwise freezes a paused page).
  function updatePositionState() {
    const audio = audioRef.current
    if (!audio) return
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: audio.currentTime,
    })
  }

  function handlePlay() {
    setIsPlaying(true)
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
    updatePositionState()
  }

  function handlePause() {
    setIsPlaying(false)
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
  }

  function handleLoadedMetadata(event: React.SyntheticEvent<HTMLAudioElement>) {
    setDuration(event.currentTarget.duration)
    // If a saved position was waiting on the audio to be ready, apply it now.
    if (pendingSeekRef.current != null) {
      event.currentTarget.currentTime = pendingSeekRef.current
      pendingSeekRef.current = null
    }
    updatePositionState()
  }

  function cycleSpeed() {
    const currentIndex = SPEEDS.indexOf(speed)
    const nextSpeed = SPEEDS[(currentIndex + 1) % SPEEDS.length]
    setSpeed(nextSpeed)
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed
    updatePositionState()
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Number(event.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
    updatePositionState()
  }

  return (
    <div className="relative mb-10 rounded-2xl bg-[#141414] p-6">
      {/* The real audio engine, hidden. We control it through audioRef. */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false)
          saveProgress(true)
        }}
      />

      {/* "Resuming from 2:30" note — floats in the top padding (absolute, so it
          never pushes the layout) and fades out a few seconds after load. */}
      {resumeMessage && (
        <p
          className={`pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-[#c9a84c] transition-opacity duration-700 ${
            resumeFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {resumeMessage}
        </p>
      )}

      {/* Skip-back 10s · play/pause · skip-forward 10s, centered as a row */}
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => skip(-10)}
          aria-label="Skip back 10 seconds"
          className="relative flex h-12 w-12 touch-manipulation select-none items-center justify-center text-neutral-300 transition active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
            10
          </span>
        </button>

        {/* Big gold play/pause button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-16 w-16 touch-manipulation select-none items-center justify-center rounded-full bg-[#c9a84c] text-black shadow-lg transition active:scale-95"
        >
          {isPlaying ? (
            // Pause icon: two bars
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            // Play triangle (ml-0.5 nudges it to look optically centered)
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-7 w-7">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => skip(10)}
          aria-label="Skip forward 10 seconds"
          className="relative flex h-12 w-12 touch-manipulation select-none items-center justify-center text-neutral-300 transition active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
            10
          </span>
        </button>
      </div>

      {/* Seek bar */}
      <div className="mt-6">
        <div className="relative h-6 w-full">
          {/* Gray track, centered vertically inside the taller touch area */}
          <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-neutral-700">
            {/* Gold filled portion grows with progress */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#c9a84c]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Draggable dot follows the progress. pointer-events-none so clicks
              pass through to the range input underneath it. */}
          <div
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a84c] shadow"
            style={{ left: `${progress}%` }}
          />

          {/* Invisible native slider sits on top and captures drag/touch. */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Times: current on the left, total on the right */}
        <div className="mt-2 flex justify-between text-xs text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed button on the side */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x`}
          className="min-w-[3.5rem] touch-manipulation select-none rounded-full border border-neutral-600 px-3 py-1 text-center text-xs font-medium tabular-nums text-neutral-300 transition active:scale-95"
        >
          {speed}×
        </button>
      </div>
    </div>
  )
}
