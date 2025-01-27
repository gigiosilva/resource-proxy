# Build Environment: Node
FROM node:22.6.0-alpine

# Env
WORKDIR /app

# Export port 3000 for Node
EXPOSE 3000

COPY package*.json ./

# Install Deps
RUN yarn install

# Copy the rest of the application files to the container
COPY . .

# Run Node index.js file
CMD [ "node", "index.js" ]