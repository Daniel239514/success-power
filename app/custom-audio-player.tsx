'use client'

import { useEffect, useRef, useState } from 'react'

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
}: {
  src: string
  title: string
}) {
  // Whether audio is currently playing. Changing this redraws the icon.
  const [isPlaying, setIsPlaying] = useState(false)

  // How far we are (seconds) and how long the episode is (seconds).
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Current playback speed (one of SPEEDS).
  const [speed, setSpeed] = useState(1)

  // A stable handle to the real <audio> element. Changing it does NOT redraw.
  const audioRef = useRef<HTMLAudioElement>(null)

  // The filled percentage of the bar. Guard against dividing by zero.
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

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
    <div className="mb-10 rounded-2xl bg-[#141414] p-6">
      {/* The real audio engine, hidden. We control it through audioRef. */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />

      {/* Big gold play/pause button, centered */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[#c9a84c] text-black shadow-lg transition active:scale-95"
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
      </div>

      {/* Seek bar */}
      <div className="mt-6">
        <div className="relative h-4 w-full">
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
          className="rounded-full border border-neutral-600 px-3 py-1 text-xs font-medium text-neutral-300 transition active:scale-95"
        >
          {speed}×
        </button>
      </div>
    </div>
  )
}
