# Use Node.js Alpine base image
FROM node:22.6.0-alpine

# Set the working directory
WORKDIR /app

# Install dependencies for FFmpeg
RUN apk add --no-cache ffmpeg

# Copy package files for dependency installation
COPY package*.json ./

# Install Node.js dependencies
RUN yarn install

# Copy the rest of the application files
COPY . .

# Expose port 3000 for the application
EXPOSE 3000

# Run the Node.js application
CMD ["node", "index.js"]
