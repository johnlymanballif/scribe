#!/bin/bash
# Helper script to add POSTGRES_URL to .env.local

echo "🔧 Adding POSTGRES_URL to .env.local"
echo ""
echo "Please paste your Supabase connection string below."
echo "It should look like: postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
echo ""
read -p "Connection string: " POSTGRES_URL

if [ -z "$POSTGRES_URL" ]; then
    echo "❌ No connection string provided. Exiting."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    touch .env.local
fi

# Check if POSTGRES_URL already exists
if grep -q "POSTGRES_URL" .env.local; then
    echo "⚠️  POSTGRES_URL already exists in .env.local"
    read -p "Do you want to replace it? (y/n): " replace
    if [ "$replace" = "y" ] || [ "$replace" = "Y" ]; then
        # Remove old POSTGRES_URL line
        sed -i.bak '/^POSTGRES_URL=/d' .env.local
        echo "POSTGRES_URL=$POSTGRES_URL" >> .env.local
        echo "✅ Updated POSTGRES_URL in .env.local"
    else
        echo "ℹ️  Keeping existing POSTGRES_URL"
    fi
else
    echo "POSTGRES_URL=$POSTGRES_URL" >> .env.local
    echo "✅ Added POSTGRES_URL to .env.local"
fi

echo ""
echo "✅ Done! Next steps:"
echo "   1. Run: npx tsx lib/contacts/migrations.ts"
echo "   2. Run: npx tsx lib/contacts/diagnose-postgres.ts"
echo "   3. Restart your dev server: npm run dev"

