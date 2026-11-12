// The Worker "earthlyhours-calendar", at calendar.earthlyhours.com: it
// serves the calendar sold on DFOS (scripts/build_calendar.py builds it
// and uploads it to the Workers KV namespace bound as CALENDAR) at
// /<CALENDAR_PATH>/earthly-hours.ics, CALENDAR_PATH being a secret of the
// Worker, never written in this repository (which is public). Anything
// else goes to the site. Deployed through the Cloudflare API; to change
// it, edit this file and deploy it again with the same bindings.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }
    if (env.CALENDAR_PATH && url.pathname === `/${env.CALENDAR_PATH}/earthly-hours.ics`) {
      const body = await env.CALENDAR.get('calendar.ics');
      if (!body) return new Response('The calendar is being prepared; try again soon.', { status: 503 });
      return new Response(request.method === 'HEAD' ? null : body, {
        headers: {
          'content-type': 'text/calendar; charset=utf-8',
          'content-disposition': 'inline; filename="earthly-hours.ics"',
          'cache-control': 'public, max-age=3600',
          'x-robots-tag': 'noindex',
        },
      });
    }
    if (url.pathname === '/' ) return Response.redirect('https://earthlyhours.com/', 302);
    return new Response('Not found', { status: 404, headers: { 'x-robots-tag': 'noindex' } });
  },
};
