#!/bin/bash

# Start backend
echo "Starting Backend Server..."
cd server
npm install
# Start in background
PORT=5000 node index.js &
SERVER_PID=$!

# Start frontend
echo "Starting Frontend Client..."
cd ../client
npm install
npm run dev

# Cleanup on exit
trap "kill $SERVER_PID" EXIT
