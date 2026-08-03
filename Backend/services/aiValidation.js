/**
 * AI Validation Service Entry Point
 * Re-exports the unified AI validation service from services/ai/aiValidation.js
 */

const { validateContribution } = require('./ai/aiValidation');

module.exports = {
  validateContribution,
};
