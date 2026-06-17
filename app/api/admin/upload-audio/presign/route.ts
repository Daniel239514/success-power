import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { getPresignedPutUrl } from '@/lib/r2'

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
}

// Returns a short-lived presigned PUT URL so the admin's browser can upload
// a file directly to R2 without routing the bytes through Vercel.
export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const { filename, prefix } = await request.json()

  const ext = (filename as string | undefined)?.split('.').pop()?.toLowerCase() ?? ''
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) {
    return NextResponse.json({ error: 'File must be .mp3 or .m4a.' }, { status: 400 })
  }
  if (!prefix || !['episodes', 'posts'].includes(prefix as string)) {
    return NextResponse.json({ error: 'Invalid prefix.' }, { status: 400 })
  }

  const key = `${prefix}/${crypto.randomUUID()}.${ext}`
  const url = await getPresignedPutUrl(key)

  return NextResponse.json({ url, key })
}
