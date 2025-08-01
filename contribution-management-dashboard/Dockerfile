# Stage 1: Build the frontend application
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package.json and install dependencies for the frontend
COPY package.json ./
# Since there is no lock file, we run a clean install.
# In a real-world scenario, a package-lock.json would be committed.
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Build the frontend assets
RUN npm run build

# Stage 2: Install backend dependencies
FROM node:20-alpine AS backend-builder
WORKDIR /app

# Copy only the package.json for the server and install production dependencies
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# Copy the backend source code
COPY server ./server


# Stage 3: Create the final production image
FROM node:20-alpine
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Copy the built frontend static assets from the builder stage
COPY --from=frontend-builder /app/dist ./dist

# Copy the backend source code and its production node_modules from the backend builder stage
COPY --from=backend-builder /app/server ./server

# Expose the port the server listens on
EXPOSE 3001

# The command to start the application
CMD ["node", "server/server.js"]
