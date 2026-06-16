/**
 * One-time migration: moves all audio files from Supabase Storage to R2.
 *
 * Run with:
 *   node scripts/migrate-audio-to-r2.mjs
 *
 * It is safe to re-run — rows already migrated (audio_url doesn't start with
 * https://) are skipped automatically.
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'

// ---------------------------------------------------------------------------
// Load env vars from .env.local (the file Node.js doesn't read automatically)
// ---------------------------------------------------------------------------
const envFile = new URL('../.env.local', import.meta.url).pathname
  // On Windows the pathname starts with /C:/ — strip the leading slash.
  .replace(/^\/([A-Z]:)/, '$1')

const env = {}
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
}

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET_NAME,
} = env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars.')
  process.exit(1)
}
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
  console.error('Missing R2 env vars.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Extract the Supabase Storage path from a public URL.
// e.g. https://xxx.supabase.co/storage/v1/object/public/audio/day-1.mp3
//   -> "day-1.mp3"
function storagePathFromUrl(url) {
  const marker = '/audio/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

// Guess content type from file extension.
function contentType(key) {
  if (key.endsWith('.m4a')) return 'audio/mp4'
  return 'audio/mpeg'
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
async function migrate() {
  console.log('Fetching episodes with Supabase audio URLs…')

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('id, day_number, audio_url')
    .like('audio_url', 'https://%')
    .order('day_number')

  if (error) {
    console.error('Failed to fetch episodes:', error.message)
    process.exit(1)
  }

  if (!episodes.length) {
    console.log('No episodes to migrate — all done.')
    return
  }

  console.log(`Found ${episodes.length} episode(s) to migrate.\n`)

  for (const episode of episodes) {
    const label = `Day ${episode.day_number}`
    const storagePath = storagePathFromUrl(episode.audio_url)

    if (!storagePath) {
      console.warn(`${label}: could not parse path from URL — skipping.`)
      continue
    }

    // 1) Download from Supabase Storage
    console.log(`${label}: downloading from Supabase (${storagePath})…`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('audio')
      .download(storagePath)

    if (downloadError || !fileData) {
      console.error(`${label}: download failed — ${downloadError?.message ?? 'no data'}`)
      continue
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const ext = storagePath.split('.').pop() ?? 'mp3'

    // 2) Upload to R2
    const r2Key = `episodes/${randomUUID()}.${ext}`
    console.log(`${label}: uploading to R2 (${r2Key})…`)

    try {
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: r2Key,
          Body: buffer,
          ContentType: contentType(storagePath),
        }),
      )
    } catch (uploadErr) {
      console.error(`${label}: R2 upload failed — ${uploadErr.message}`)
      continue
    }

    // 3) Update the database row
    const { error: updateError } = await supabase
      .from('episodes')
      .update({ audio_url: r2Key })
      .eq('id', episode.id)

    if (updateError) {
      console.error(`${label}: DB update failed — ${updateError.message}`)
      console.error(`  R2 key was: ${r2Key} — update it manually to avoid an orphan.`)
      continue
    }

    console.log(`${label}: done. audio_url = ${r2Key}\n`)
  }

  console.log('Migration complete.')
}

migrate()
