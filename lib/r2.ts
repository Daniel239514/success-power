import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// R2 is S3-compatible: point the standard AWS S3Client at Cloudflare's endpoint
// instead of AWS. Everything else (auth, presigning, commands) stays identical.
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

// Upload a file buffer to R2. `key` is the storage path, e.g. "episodes/day-3.mp3".
export async function uploadAudioToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
}

// Generate a presigned GET URL for `key` that expires after `expiresIn` seconds.
//
// A presigned URL is a normal HTTPS URL with extra query parameters
// (X-Amz-Signature, X-Amz-Expires, X-Amz-Credential, etc.) that are a
// cryptographic proof the server authorised this specific file for this
// specific time window. R2 verifies the signature on every request — an
// expired, tampered, or wrong-file URL gets a 403.
export async function getSignedAudioUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn,
  })
}

// Generate a short-lived presigned PUT URL so the browser can upload a file
// directly to R2 — bypassing Vercel entirely, so no server timeout applies.
export async function getPresignedPutUrl(
  key: string,
  expiresIn = 300,
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn },
  )
}

// Delete a file from R2. Called when an episode or post is deleted.
export async function deleteAudioFromR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
