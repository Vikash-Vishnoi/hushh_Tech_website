#!/bin/bash

# ==========================================
# 🍎 Apple Client Secret Generator (FIXED)
# ==========================================

# --- 1. CONFIGURATION (ENTER YOUR DETAILS HERE) ---
# Update these 4 lines with your specific details:
TEAM_ID="WVDK9JW99C"                   # Your Team ID
KEY_ID="2822NMDJU5"                    # The Key ID from Apple
CLIENT_ID="WVDK9JW99C.all-hushh-web-login"           # Your Service ID (e.g. com.hushh.webapp)
KEY_FILE_PATH="${APPLE_PRIVATE_KEY_PATH:-$HOME/.private_keys/AuthKey_${KEY_ID}.p8}" # Keep the .p8 outside the repo

# --- 2. SETUP & GENERATION ---

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed."
    exit 1
fi

# Check if .p8 file exists
if [ ! -f "$KEY_FILE_PATH" ]; then
    echo "❌ Error: Key file not found at $KEY_FILE_PATH"
    echo "   Set APPLE_PRIVATE_KEY_PATH or place the file at ~/.private_keys/AuthKey_${KEY_ID}.p8"
    exit 1
fi

echo "⚙️  Setting up temporary environment..."
mkdir -p temp_apple_gen
cd temp_apple_gen

# Initialize dummy package to install jsonwebtoken quietly
npm init -y > /dev/null
echo "📦 Installing 'jsonwebtoken' library..."
npm install jsonwebtoken --silent

# Create the Node.js generator script
# NOTICE: We are now correctly using the variables ($KEY_FILE_PATH, etc)
cat <<EOF > generate.js
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Read the key file from the parent directory
// We use the variable passed from Bash
const privateKey = fs.readFileSync('../$KEY_FILE_PATH');

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d',
  issuer: '$TEAM_ID',
  audience: 'https://appleid.apple.com',
  subject: '$CLIENT_ID',
  keyid: '$KEY_ID'
});

console.log(token);
EOF

# --- 3. EXECUTION ---
echo "🔐 Generating Client Secret..."
SECRET=$(node generate.js)

# --- 4. CLEANUP ---
cd ..
rm -rf temp_apple_gen

# --- 5. RESULT ---
echo ""
echo "✅ SUCCESS! Here is your Client Secret (valid for 6 months):"
echo ""
echo "$SECRET"
echo ""
echo "👉 Copy the string above and paste it into your Supabase/Auth provider settings."
