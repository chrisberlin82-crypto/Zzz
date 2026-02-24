FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

RUN mkdir -p /app/uploads/documents /app/uploads/signatures \
    /app/uploads/address-lists /app/uploads/receipts /app/uploads/temp /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

USER nodejs

EXPOSE 3001

CMD ["node", "src/server.js"]
