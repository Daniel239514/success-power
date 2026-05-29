// Shown instantly while a page's server data is still loading, so the user
// sees branded content immediately instead of a blank screen.
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-6">
      <h1 className="animate-pulse text-center text-5xl font-bold tracking-tight text-[#c9a84c] sm:text-7xl">
        Success Power
      </h1>
      <div className="flex gap-2" aria-label="Loading">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#c9a84c] [animation-delay:-0.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#c9a84c] [animation-delay:-0.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#c9a84c]" />
      </div>
    </main>
  )
}
