declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    STRIPE_SECRET_KEY: string;
    NEXT_PUBLIC_APP_URL: string;
    STRIPE_WEBHOOK_SECRET: string;
  }
}