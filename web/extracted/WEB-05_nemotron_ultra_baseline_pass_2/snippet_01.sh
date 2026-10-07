# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate and run migrations
pnpm db:generate
pnpm db:push

# Start development server
pnpm dev