export const SEARCH_API_BASE =
  process.env.NEXT_PUBLIC_SEARCH_API ??
  process.env.NEXT_PUBLIC_ANALYTICS_API ??
  process.env.NEXT_PUBLIC_TAGGING_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8081";

