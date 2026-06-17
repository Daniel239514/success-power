import { NextResponse } from 'next/server'
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'
import { getAdminUser } from '@/lib/admin'

// One-time setup: call GET /api/admin/setup-r2-cors while logged in as admin.
// This writes a CORS policy to the R2 bucket so the browser can PUT files
// directly to R2 without routing them through Vercel.
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  await r2.send(
    new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [
              'https://success-power.vercel.app',
              'http://localhost:3000',
            ],
            AllowedMethods: ['PUT'],
            AllowedHeaders: ['*'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  )

  return NextResponse.json({ ok: true, message: 'R2 CORS configured.' })
}
