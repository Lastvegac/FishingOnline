import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { GoogleIdentity } from '../../types.js';
import { ApiError } from '../../lib/errors.js';

const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);

/** Verifies a Google Identity Services ID token (signature, issuer, audience, expiry, verified email). */
export function googleVerifier(clientId: string) {
  return async (credential: string): Promise<GoogleIdentity> => {
    try {
      const { payload } = await jwtVerify(credential, googleKeys, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        payload.email_verified !== true
      )
        throw new Error('unverified');
      return { subject: payload.sub, email: payload.email.trim().toLowerCase() };
    } catch {
      throw new ApiError(
        401,
        'GOOGLE_TOKEN_INVALID',
        'Không xác minh được tài khoản Google. Vui lòng thử lại.',
      );
    }
  };
}
