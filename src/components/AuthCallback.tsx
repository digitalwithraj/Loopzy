import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    console.log("Email verification callback");

    const handleCallback = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname;

        console.log("[AuthCallback] pathname:", pathname);
        console.log("[AuthCallback] hash:", hash);
        console.log("[AuthCallback] search params:", window.location.search);

        // ── Try to recover the session ───────────────────────────────
        // getSession() will detect tokens in the URL hash (default Supabase
        // redirect) or return an already-persisted session.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthCallback] getSession error:", error);
        }

        if (session) {
          console.log("Session created");
          const userId = session.user.id;
          console.log("[AuthCallback] User ID:", userId);

          // Look up the user's onboarding status
          let needsOnboarding = true;
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', userId)
              .maybeSingle();

            if (profile) {
              needsOnboarding = !profile.onboarding_completed;
            }
          } catch (profileErr) {
            console.warn("[AuthCallback] Profile lookup failed:", profileErr);
          }

          // Clean up URL — remove hash / search and strip /auth/callback
          window.history.replaceState(null, '', '/');

          console.log("Redirecting user");
          setStatus('success');
          setMessage('Email verified! Redirecting...');

          // Reload so App.tsx picks up the persisted session and shows
          // the correct view (onboarding or dashboard).
          setTimeout(() => window.location.replace('/'), 800);
          return;
        }

        // ── No session found — try to exchange a PKCE auth code if present ──
        const authCode = params.get('code');
        if (authCode && pathname.includes('/auth/callback')) {
          console.log("[AuthCallback] Exchanging auth code for session...");
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(authCode);

          if (exchangeError) {
            console.error("[AuthCallback] Code exchange error:", exchangeError);
          } else if (exchangeData.session) {
            console.log("Session created");
            window.history.replaceState(null, '', '/');
            console.log("Redirecting user");
            setStatus('success');
            setMessage('Email verified! Redirecting...');
            setTimeout(() => window.location.replace('/'), 800);
            return;
          }
        }

        // ── No session and no code — show graceful fallback ────────────
        console.log("[AuthCallback] No session or code found");
        setStatus('error');
        setMessage('Email verified. Please sign in.');
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setStatus('error');
        setMessage('Email verified. Please sign in.');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {status === 'loading' && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
              <Loader className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
            <h2 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
              Verifying...
            </h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
              Email Verified
            </h2>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
              Almost there
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {message}
            </p>
            <a
              href="/"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-indigo-400"
            >
              Go to Sign In
            </a>
          </>
        )}

        <p className="mt-4 text-xs text-slate-400">{message}</p>
      </div>
    </div>
  );
}
