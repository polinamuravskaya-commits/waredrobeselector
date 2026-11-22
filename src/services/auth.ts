import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

function isValidJwtSignature(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) {
    return false;
  }

  const signingInput = `${header}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

function isValidJwtBearerToken(token: string, secret: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const payloadSegment = parts[1];
    const normalizedPayload = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '='
    );
    const payload = JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf-8')) as {
      exp?: number;
    };

    if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return isValidJwtSignature(token, secret);
  } catch {
    return false;
  }
}

export function isAdminAuthEnabled(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD
    || process.env.ADMIN_TOKEN
    || process.env.ADMIN_API_KEY
    || process.env.ADMIN_JWT_SECRET
  );
}

export function getAdminCredentials(): { username?: string; password?: string; token?: string; jwtSecret?: string } {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    token: process.env.ADMIN_TOKEN ?? process.env.ADMIN_API_KEY,
    jwtSecret: process.env.ADMIN_JWT_SECRET
  };
}

export function requireAdminAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isAdminAuthEnabled()) {
      next();
      return;
    }

    const authorization = req.get('Authorization') ?? '';
    const { username, password, token, jwtSecret } = getAdminCredentials();

    if (authorization.toLowerCase().startsWith('bearer ')) {
      const bearerToken = authorization.slice(7).trim();

      if (token && bearerToken === token) {
        next();
        return;
      }

      if (jwtSecret && isValidJwtBearerToken(bearerToken, jwtSecret)) {
        next();
        return;
      }
    }

    if (username && password) {
      const basicPrefix = 'Basic ';
      if (authorization.startsWith(basicPrefix)) {
        const encoded = authorization.slice(basicPrefix.length);
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const [providedUsername, ...providedPasswordParts] = decoded.split(':');
        const providedPassword = providedPasswordParts.join(':');

        if (providedUsername === username && providedPassword === password) {
          next();
          return;
        }
      }
    }

    res.status(401).json({
      message: 'Authentication required. Use Admin credentials or a valid bearer token.'
    });
  };
}
