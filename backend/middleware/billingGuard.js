'use strict';
/**
 * billingGuard.js — Pre-flight credit balance middleware
 *
 * Usage: router.post('/route', verifySupabaseAuth, billingGuard, handler)
 *
 * Returns HTTP 402 if user has zero credits.
 * Sets req.userBalance for downstream handlers.
 */

const { checkBalance } = require('../services/billing');

module.exports = async function billingGuard(req, res, next) {
  const userId = req.userId;

  // If no auth context, pass through (auth middleware will block unauthenticated requests)
  if (!userId) return next();

  try {
    const { balance, hasCredits } = await checkBalance(userId);

    if (!hasCredits) {
      return res.status(402).json({
        error:   'insufficient_credits',
        message: 'Your credit balance is zero. Please top up to continue.',
        balance: 0,
      });
    }

    req.userBalance = balance;
    return next();
  } catch (err) {
    // Fail closed — if we can't verify credits, block the request
    console.error('[billingGuard] Error checking balance (blocking request):', err.message);
    return res.status(503).json({
      error:   'billing_unavailable',
      message: 'Unable to verify account balance. Please try again in a moment.',
    });
  }
};
