import type { APIRoute } from 'astro';

export const prerender = false;

const RESEND_API = 'https://api.resend.com';

interface ResendErrorBody {
  message?: string;
  name?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const audienceId = import.meta.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return new Response(
      JSON.stringify({ ok: false, code: 'not_configured' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  let payload: { email?: string; locale?: string };
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, code: 'invalid_body' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  const locale = (payload.locale ?? 'la').slice(0, 8);

  // Minimal validation; Resend will do its own. This keeps obvious garbage out.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ ok: false, code: 'invalid_email' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const res = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      unsubscribed: false,
      // Resend supports first_name/last_name only; stash locale as a name hint
      // so the eventual sender knows which language to address. Cheap, no schema needed.
      first_name: locale,
    }),
  });

  if (res.ok) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  // 409 Conflict = already subscribed — still success from the user's POV
  if (res.status === 409) {
    return new Response(JSON.stringify({ ok: true, alreadySubscribed: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  let detail: ResendErrorBody = {};
  try {
    detail = await res.json();
  } catch {
    /* ignore */
  }

  return new Response(
    JSON.stringify({ ok: false, code: 'upstream_error', detail: detail.message ?? null }),
    { status: 502, headers: { 'content-type': 'application/json' } },
  );
};
