#!/bin/bash

# GitHub and Vercel Deployment Script
set -e

echo "🚀 Starting deployment process..."

# Check GitHub authentication
if ! gh auth status &>/dev/null; then
    echo "❌ Please authenticate with GitHub first:"
    echo "   Run: gh auth login"
    echo "   Then choose: GitHub.com > HTTPS > Login with a web browser"
    exit 1
fi

echo "✅ GitHub authenticated"

# Create GitHub repository if it doesn't exist
if ! git remote get-url origin &>/dev/null; then
    echo "📦 Creating GitHub repository..."
    gh repo create scribe \
        --public \
        --source=. \
        --remote=origin \
        --description="Scribe application with contacts and pipeline features" \
        --push
    echo "✅ Repository created and code pushed to GitHub"
else
    echo "📤 Pushing to GitHub..."
    git push -u origin main
    echo "✅ Code pushed to GitHub"
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if vercel --version &>/dev/null; then
    vercel --prod
    echo "✅ Deployed to Vercel!"
else
    echo "⚠️  Vercel CLI not found. Install with: npm i -g vercel"
fi

echo "🎉 Deployment complete!"

