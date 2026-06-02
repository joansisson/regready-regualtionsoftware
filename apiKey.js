import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/encryption.js';

const prisma = new PrismaClient();

// This middleware assumes `req.user` is populated by a previous auth middleware
// (e.g., from Passport.js or JWT verification)
export async function fetchUserApiKey(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { encryptedOpenaiApiKey: true },
    });

    req.userApiKey = null;
    if (user && user.encryptedOpenaiApiKey) {
      const decryptedKey = decrypt(user.encryptedOpenaiApiKey);
      if (decryptedKey) {
        req.userApiKey = decryptedKey;
      }
    }

    next();
  } catch (error) {
    console.error('Error fetching user API key:', error);
    return res.status(500).json({ error: 'Internal server error while fetching API key.' });
  }
}