#!/usr/bin/env node
/**
 * Decksmith pre-launch environment validator.
 * Reads from .env file in the project root.
 * Run: npm run validate
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })

import { runValidation } from './validate-core.js'
runValidation(process.env)
