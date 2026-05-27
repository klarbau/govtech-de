import { AssistentView } from '@/components/assistent/AssistentView';

export const dynamic = 'force-dynamic';

/**
 * Assistent (HERO). The mock-backend lives in localStorage, so the persona
 * snapshot is bootstrapped client-side after hydration inside <AssistentView>.
 * The page shell stays a Server Component; all chat interactivity (SSE stream,
 * tool dispatch, composer state) lives in the client view.
 */
export default function AssistentPage() {
  return <AssistentView />;
}
