import type { NextPageContext } from 'next';

/**
 * Minimal Pages-Router error fallback. This project is App-Router-only —
 * user-facing 404/500 are served by `app/not-found.tsx` and
 * `app/global-error.tsx`. This file exists solely to give Next.js a *custom*
 * (non-static) error page: its `getInitialProps` makes Next treat the error
 * page as non-static, which stops `next build` from statically prerendering the
 * built-in pages-router `/_error` for `/404` + `/500`. That built-in static
 * export is broken on Next 15.5.18 and throws "<Html> should not be imported
 * outside of pages/_document", which otherwise aborts the production build.
 */
function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
        background: '#fafafa',
        color: '#18181b',
      }}
    >
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          {statusCode ?? ''} — Seite nicht gefunden
        </h1>
      </main>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};

export default ErrorPage;
