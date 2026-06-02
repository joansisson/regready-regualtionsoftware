import express from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { encrypt } from '../utils/encryption.js';
import { isAuthenticated } from '../middleware/auth'; // Your existing auth middleware

const prisma = new PrismaClient();
const router = express.Router();

// --- Route to Save API Key ---
router.post('/settings/api-key', isAuthenticated, async (req, res) => {
  const { apiKey } = req.body;
  const userId = req.user.id;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
    return res.status(400).json({ message: 'A valid OpenAI API key is required.' });
  }

  try {
    const encryptedKey = encrypt(apiKey);
    await prisma.user.update({
      where: { id: userId },
      data: { encryptedOpenaiApiKey: encryptedKey },
    });
    res.status(200).json({ message: 'API Key saved and encrypted successfully.' });
  } catch (error) {
    console.error('Failed to save API key:', error);
    res.status(500).json({ message: 'An error occurred while saving the key.' });
  }
});

// --- Route to Validate API Key ---
router.post('/validate-key', isAuthenticated, async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'API key is required.' });
  }

  const openai = new OpenAI({ apiKey });

  try {
    await openai.models.list(); // A lightweight call to check if the key is valid
    res.json({ success: true, message: 'API Key is valid and active.' });
  } catch (error) {
    const message = error.response?.data?.error?.message || 'Invalid API Key.';
    res.status(401).json({ success: false, message });
  }
});

export default router;