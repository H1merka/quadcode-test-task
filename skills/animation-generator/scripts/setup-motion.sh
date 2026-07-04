#!/bin/bash

# Exit on first failure
set -e

echo "=========================================="
echo "Setting up Framer Motion & Tailwind v4 SDK"
echo "=========================================="

# Check for package.json
if [ ! -f package.json ]; then
    echo "Error: package.json not found in the root directory."
    echo "Please run 'npm init -y' or initialize your web project first."
    exit 1
fi

echo "1. Installing motion/react and support packages..."
npm install motion react react-dom

echo "2. Installing development dependencies (Tailwind CSS v4 & PostCSS)..."
npm install -D tailwindcss @tailwindcss/postcss postcss

echo "3. Creating postcss.config.js for PostCSS compiler integration..."
cat << 'EOF' > postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
EOF

echo "Setup complete!"
echo "Configuration registered."
echo "=========================================="