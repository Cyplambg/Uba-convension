#!/bin/bash
# Cloudflare Pages Build Script
# This script ensures clean dependency installation

echo "Cleaning old dependencies..."
rm -rf node_modules

echo "Installing dependencies without frozen lockfile..."
bun install

echo "Building project..."
bun run build
