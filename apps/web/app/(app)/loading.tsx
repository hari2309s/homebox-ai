import { PageLoader } from "@homebox-ai/ui";

// Next.js nests this Suspense boundary around every route under (app) that
// doesn't define its own more specific loading.tsx — one file covers
// items/locations/labels/chat/capture/receipts/maintenance.
export default function Loading() {
  return <PageLoader />;
}
