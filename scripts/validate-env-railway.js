#!/usr/bin/env node
/**
 * Decksmith production environment validator.
 * Reads from process.env directly (for Railway / CI).
 * Run: npm run validate:prod
 */

import { runValidation } from './validate-core.js'
runValidation(process.env)
