# Use the Puppeteer base image with Chromium
FROM ghcr.io/puppeteer/puppeteer:23.1.0

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Create a new directory for the app
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Start Xvfb server and run the Node.js app
CMD [ "node", "index.js" ]
