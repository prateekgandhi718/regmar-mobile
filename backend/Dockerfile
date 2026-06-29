FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy data folder for runtime use (e.g. CSVs)
COPY data ./data

# Copy backend source
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
    