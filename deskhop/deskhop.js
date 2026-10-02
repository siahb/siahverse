import { gatewayUrl } from './config.js';
import { validateGatewayUrl } from './gateway-url.mjs';
const button = document.querySelector('#connect');
const status = document.querySelector('#connection-status');
try {
  const url = validateGatewayUrl(gatewayUrl);
  if (url) {
    status.textContent = 'Gateway configured · PC availability checked after sign-in';
    button.disabled = false;
    button.addEventListener('click', () => window.open('/deskhop/connect', '_blank', 'noopener,noreferrer'));
  } else {
    status.textContent = 'Setup needed · Gateway not configured';
  }
} catch {
  status.textContent = 'Setup needed · Gateway address must be a valid HTTPS URL';
}
