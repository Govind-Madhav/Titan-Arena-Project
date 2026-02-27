FROM node:20-alpine

WORKDIR /app

# Install netcat for entrypoint check
RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
RUN npm ci

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/entrypoint.sh"]
