const path = require('path');
const { randomUUID } = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const required = ['S3_BUCKET_MEDIA'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is required for media storage`);
  }
}

const bucket = process.env.S3_BUCKET_MEDIA;
const region = process.env.S3_REGION || 'us-east-1';
const endpoint = process.env.S3_ENDPOINT;
const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true';
const signedUrlExpiry = Number(process.env.S3_SIGNED_URL_EXPIRY || 3600);

const credentials =
  process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
      }
    : undefined;

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  credentials
});

function buildObjectUrl(key) {
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  if (publicBase) {
    const clean = publicBase.replace(/\/+$/, '');
    return `${clean}/${key}`;
  }

  if (endpoint) {
    const u = new URL(endpoint);
    if (forcePathStyle) {
      return `${u.origin}/${bucket}/${key}`;
    }
    return `${u.protocol}//${bucket}.${u.host}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function buildKey(tenantId, filename) {
  const ext = path.extname(filename || '') || '';
  return `tenants/${tenantId}/${Date.now()}-${randomUUID()}${ext}`;
}

async function uploadBuffer({ tenantId, buffer, contentType, filename, acl }) {
  const key = buildKey(tenantId, filename);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: acl
    })
  );

  const url = buildObjectUrl(key);
  const signedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: signedUrlExpiry
  });

  return { key, url, signedUrl };
}

async function deleteObject(key) {
  if (!key) return;
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
}

async function getSignedReadUrl(key) {
  if (!key) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: signedUrlExpiry
  });
}

module.exports = {
  uploadBuffer,
  deleteObject,
  getSignedReadUrl,
  buildObjectUrl
};
