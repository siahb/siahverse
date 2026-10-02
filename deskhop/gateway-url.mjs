export function validateGatewayUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTPS gateway address without credentials, query parameters, or fragments.');
  }
  return url.href;
}
