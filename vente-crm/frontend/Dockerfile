FROM node:18-alpine AS builder

WORKDIR /app
ENV NODE_OPTIONS=--max_old_space_size=2048

COPY package*.json ./
RUN npm install && npm cache clean --force

COPY public/ ./public/
COPY src/ ./src/

ENV REACT_APP_API_URL=/api
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
