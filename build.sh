#!/usr/bin/env bash
# exit on error
set -o errexit

# Install backend dependencies
cd backend
npm install

# Build frontend
cd ../frontend
npm install
npm run build
