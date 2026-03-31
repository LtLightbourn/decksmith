import jsPDF from 'jspdf'
import type { DeckCard } from '../types'

// ── Card / page dimensions (all in mm) ───────────────────────────────────
const CARD_W  = 63.5   // MTG standard card width
const CARD_H  = 88.9   // MTG standard card height
const COLS    = 3
const ROWS    = 3
const MARGIN  = 4      // page margin (4mm keeps 3×3 inside letter/A4)
const GAP     = 2      // gap between cards
const NAME_H  = 5      // extra row height when card names are shown
const CROP    = 2.5    // crop mark length in mm

export type PaperSize = 'letter' | 'a4'

export interface PrintOptions {
  paper: PaperSize
  cardNames: boolean
  cutLines: boolean
  printMode: 'all' | 'proxy'
}

export interface PrintCard {
  name: string
  imageUri: string  // Scryfall normal image URL
  qty: number
}

// ── Fetch a Scryfall image URL → base64 data URL ──────────────────────────
async function fetchImageDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── Build a flat list of cards expanded by qty ───────────────────────────
function expandCards(cards: PrintCard[]): PrintCard[] {
  const out: PrintCard[] = []
  for (const c of cards) {
    for (let i = 0; i < c.qty; i++) out.push(c)
  }
  return out
}

// ── Draw crop mark lines at one card corner ───────────────────────────────
function drawCropMark(doc: jsPDF, cx: number, cy: number, dx: number, dy: number) {
  doc.setDrawColor(160, 160, 160)
  doc.setLineWidth(0.15)
  doc.line(cx, cy, cx + dx, cy)
  doc.line(cx, cy, cx, cy + dy)
}

// ── Main export ───────────────────────────────────────────────────────────

export async function generateProxyPDF(
  cards: PrintCard[],
  options: PrintOptions,
  deckName: string,
  onProgress: (fetched: number, total: number) => void,
): Promise<void> {
  const expanded = expandCards(cards)
  if (expanded.length === 0) return

  // Fetch unique images in batches of 10 with 50ms delays
  const uniqueUrls = [...new Set(expanded.map(c => c.imageUri).filter(Boolean))]
  const imageMap = new Map<string, string>()

  for (let i = 0; i < uniqueUrls.length; i += 10) {
    const batch = uniqueUrls.slice(i, i + 10)
    await Promise.all(batch.map(async url => {
      try {
        imageMap.set(url, await fetchImageDataUrl(url))
      } catch {
        imageMap.set(url, '')  // empty = draw placeholder rect
      }
    }))
    onProgress(Math.min(i + 10, uniqueUrls.length), uniqueUrls.length)
    if (i + 10 < uniqueUrls.length) {
      await new Promise(r => setTimeout(r, 50))
    }
  }

  // Set up jsPDF
  const rowH = CARD_H + GAP + (options.cardNames ? NAME_H : 0)
  const doc = new jsPDF({ unit: 'mm', format: options.paper, orientation: 'portrait' })

  let idx = 0
  let pageNum = 0

  while (idx < expanded.length) {
    if (pageNum > 0) doc.addPage()
    pageNum++

    for (let row = 0; row < ROWS && idx < expanded.length; row++) {
      for (let col = 0; col < COLS && idx < expanded.length; col++) {
        const card = expanded[idx]
        const x = MARGIN + col * (CARD_W + GAP)
        const y = MARGIN + row * rowH

        const dataUrl = imageMap.get(card.imageUri)

        if (dataUrl) {
          try {
            // Use URL as alias so jsPDF deduplicates identical images (e.g. basic lands)
            doc.addImage(dataUrl, 'JPEG', x, y, CARD_W, CARD_H, card.imageUri, 'FAST')
          } catch {
            drawPlaceholder(doc, card.name, x, y)
          }
        } else {
          drawPlaceholder(doc, card.name, x, y)
        }

        // Card name text below image
        if (options.cardNames) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)
          doc.setTextColor(30, 22, 10)
          doc.text(card.name, x + CARD_W / 2, y + CARD_H + 3.5, { align: 'center', maxWidth: CARD_W })
        }

        // Crop marks at all four corners
        if (options.cutLines) {
          drawCropMark(doc, x,          y,          -CROP,  -CROP)   // top-left: extend ↑←
          drawCropMark(doc, x + CARD_W, y,           CROP,  -CROP)   // top-right: extend ↑→
          drawCropMark(doc, x,          y + CARD_H, -CROP,   CROP)   // bottom-left: extend ↓←
          drawCropMark(doc, x + CARD_W, y + CARD_H,  CROP,   CROP)   // bottom-right: extend ↓→
        }

        idx++
      }
    }
  }

  const safeName = deckName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
  doc.save(`${safeName}-proxies.pdf`)
}

function drawPlaceholder(doc: jsPDF, name: string, x: number, y: number) {
  doc.setFillColor(30, 22, 12)
  doc.setDrawColor(80, 65, 40)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, CARD_W, CARD_H, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(140, 110, 60)
  doc.text(name, x + CARD_W / 2, y + CARD_H / 2, { align: 'center', maxWidth: CARD_W - 6 })
}

// ── Build the PrintCard list from current deck state ─────────────────────

export function buildPrintCards(
  cards: DeckCard[],
  proxyCardIds: string[],
  mode: 'all' | 'proxy',
): PrintCard[] {
  const proxySet = new Set(proxyCardIds)
  const filtered = mode === 'proxy'
    ? cards.filter(dc => proxySet.has(dc.card.id))
    : cards

  return filtered.map(dc => ({
    name: dc.card.name,
    imageUri: dc.card.imageUri,
    qty: dc.qty,
  }))
}
