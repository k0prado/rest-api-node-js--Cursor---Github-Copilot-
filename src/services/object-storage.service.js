const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand
} = require('@aws-sdk/client-s3');

let client = null;
let bucketEnsured = false;

function getBucket() {
  return process.env.MINIO_BUCKET || 'events';
}

function getClient() {
  if (client) return client;
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }
  client = new S3Client({
    region: process.env.MINIO_REGION || 'us-east-1',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true
  });
  return client;
}

function isObjectStorageConfigured() {
  return Boolean(getClient());
}

async function ensureBucket() {
  if (bucketEnsured) return;
  const s3 = getClient();
  if (!s3) return;
  const Bucket = getBucket();
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket }));
  }
  bucketEnsured = true;
}

function sanitizeFilename(name) {
  const base = path.basename(name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'image';
}

async function uploadEventImage({ userId, buffer, contentType, originalName }) {
  const s3 = getClient();
  if (!s3) {
    const err = new Error('object storage is not configured');
    err.statusCode = 503;
    throw err;
  }
  await ensureBucket();
  const key = `events/${userId}/${crypto.randomUUID()}-${sanitizeFilename(originalName)}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );
  return key;
}

async function deleteObjectByKey(key) {
  if (!key) return;
  const s3 = getClient();
  if (!s3) return;
  await s3.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key
    })
  );
}

module.exports = {
  isObjectStorageConfigured,
  uploadEventImage,
  deleteObjectByKey
};
