FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure uploads directory exists for tenant logos/files
RUN mkdir -p uploads/tenant-logos

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "index.js"]

