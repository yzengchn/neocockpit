const API_ORIGIN = 'https://api.neocockpit.cn';

export async function onRequest({ request }: { request: Request }): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, API_ORIGIN);

  const proxyRequest = new Request(targetUrl.toString(), request);
  proxyRequest.headers.set('X-Forwarded-Host', incomingUrl.host);
  proxyRequest.headers.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''));

  return fetch(proxyRequest);
}
