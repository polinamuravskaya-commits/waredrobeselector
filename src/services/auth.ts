import type { Request, Response, NextFunction } from 'express';

export function isAdminAuthEnabled(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD
    || process.env.ADMIN_TOKEN
    || process.env.ADMIN_API_KEY
  );
}

export function getAdminCredentials(): { username?: string; password?: string; token?: string } {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    token: process.env.ADMIN_TOKEN ?? process.env.ADMIN_API_KEY
  };
}

export function requireAdminAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isAdminAuthEnabled()) {
      next();
      return;
    }

    const authorization = req.get('Authorization') ?? '';
    const { username, password, token } = getAdminCredentials();

    if (token && authorization === `Bearer ${token}`) {
      next();
      return;
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
