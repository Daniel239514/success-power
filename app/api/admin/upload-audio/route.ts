import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { uploadAudioToR2 } from '@/lib/r2'

const MAX_BYTES = 50 * 1024 * 1024

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const prefix = formData.get('prefix') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  if (!prefix || !['episodes', 'posts'].includes(prefix)) {
    return NextResponse.json({ error: 'Invalid prefix.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) {
    return NextResponse.json(
      { error: 'Audio must be .mp3 or .m4a.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File must be 50 MB or smaller.' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`

  await uploadAudioToR2(buffer, key, contentType)

  return NextResponse.json({ key })
}
