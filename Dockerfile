FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies first (needed for build)
RUN npm ci

COPY . .

RUN npm run build

# Remove dev dependencies after build
RUN npm ci --only=production && npm cache clean --force

EXPOSE 3000

USER node

CMD ["npm", "start"]