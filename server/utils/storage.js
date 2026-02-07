const path = require('path');
const { randomUUID } = require('crypto');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const required = ['GCS_BUCKET_MEDIA'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is required for media storage`);
  }
}

const bucketName = process.env.GCS_BUCKET_MEDIA;
const signedUrlExpiry = Number(process.env.GCS_SIGNED_URL_EXPIRY || 3600);
const projectId = process.env.GCS_PROJECT_ID || undefined;
const keyFilename = process.env.GCS_KEYFILE || undefined;

const storage = new Storage({
  projectId,
  keyFilename
});

function buildObjectUrl(key) {
  const publicBase = process.env.GCS_PUBLIC_BASE_URL;
  if (publicBase) {
    const clean = publicBase.replace(/\/+$/, '');
    return `${clean}/${key}`;
  }
  return `https://storage.googleapis.com/${bucketName}/${key}`;
}

function buildKey(tenantId, filename) {
  const ext = path.extname(filename || '') || '';
  return `tenants/${tenantId}/${Date.now()}-${randomUUID()}${ext}`;
}

async function uploadBuffer({ tenantId, buffer, contentType, filename }) {
  const key = buildKey(tenantId, filename);
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(key);

  await file.save(buffer, {
    contentType,
    resumable: false
  });

  const url = buildObjectUrl(key);
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + signedUrlExpiry * 1000
  });

  return { key, url, signedUrl };
}

async function deleteObject(key) {
  if (!key) return;
  const bucket = storage.bucket(bucketName);
  await bucket.file(key).delete({ ignoreNotFound: true });
}

async function getSignedReadUrl(key) {
  if (!key) return null;
  const bucket = storage.bucket(bucketName);
  const [signedUrl] = await bucket.file(key).getSignedUrl({
    action: 'read',
    expires: Date.now() + signedUrlExpiry * 1000
  });
  return signedUrl;
}

module.exports = {
  uploadBuffer,
  deleteObject,
  getSignedReadUrl,
  buildObjectUrl
};
