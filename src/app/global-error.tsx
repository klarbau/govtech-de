'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
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
        <main
          style={{
            maxWidth: '28rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Ein Fehler ist aufgetreten
          </h1>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Bitte laden Sie die Seite neu, um fortzufahren.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '1.5rem',
              minHeight: '44px',
              padding: '0 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: '#18181b',
              color: '#fafafa',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Seite neu laden
          </button>
        </main>
      </body>
    </html>
  );
}
