import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { chromium } from '@playwright/test'
import DiagnosticNotebookGrid from '../src/components/teacher/sections/DiagnosticNotebookGrid.js'

// Local renderer only: no HTTP app, credentials, external fonts, files or navigation.
export async function renderPupilNotebook(notebook, { signal } = {}) {
  if (signal?.aborted) throw new Error('Notebook render cancelled')
  const frame = notebook.workspace, bounds = notebook.bounds
  if (!frame || !bounds || frame.rows > 40 || frame.columns > 40
    || JSON.stringify(frame).length > 2 * 1024 * 1024) throw new Error('Notebook render exceeds supported limits')
  const css = await readFile(new URL('../src/dev/diagnosticGridPrototype.css', import.meta.url), 'utf8')
  const markup = renderToStaticMarkup(createElement(DiagnosticNotebookGrid, { frame }))
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) })
  const cancel = () => { browser.close().catch(() => {}) }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    if (signal?.aborted) throw new Error('Notebook render cancelled')
    const page = await browser.newPage({ viewport: { width: 1600, height: 2600 }, deviceScaleFactor: 1 })
    await page.route('**/*', route => route.abort())
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *,::before,::after{box-sizing:border-box}html{font-size:16px;font-family:ui-sans-serif,system-ui,sans-serif}
      body{margin:8px;background:white}${css}
      #drawing{display:block;margin-top:8px;background:white;border:1px solid #94a3b8}
      </style></head><body>${markup}<canvas id="drawing" width="740" height="1036"></canvas></body></html>`)
    const images = [], layout = { rows: notebook.rows, columns: notebook.columns, bounds,
      cellWidth: 36, cellHeight: 57.6, cellAspectRatio: 1.6 }
    if (notebook.gridEnabled) {
      const gridBox = await page.getByRole('grid').boundingBox()
      const first = await page.locator(`[data-export-cell="${bounds.firstRow}:${bounds.firstColumn}"]`).boundingBox()
      const last = await page.locator(`[data-export-cell="${bounds.lastRow}:${bounds.lastColumn}"]`).boundingBox()
      // Include an outer border when cropping away preceding blank cells; no half cells.
      const x = Math.max(gridBox.x, first.x - 1), y = Math.max(gridBox.y, first.y - 1)
      const clip = { x, y, width: last.x + last.width - x, height: last.y + last.height - y }
      const png = await page.screenshot({ type: 'png', clip, timeout: 15000 })
      images.push({ kind: 'grid', mimeType: 'image/png', data: png.toString('base64'),
        width: Math.floor(clip.width), height: Math.floor(clip.height) })
      layout.cellWidth = first.width; layout.cellHeight = first.height
    }
    if (frame.drawing?.length) {
      await page.locator('#drawing').evaluate((canvas, strokes) => {
        const ctx = canvas.getContext('2d')
        for (const stroke of strokes) {
          ctx.globalCompositeOperation = stroke.erasing ? 'destination-out' : 'source-over'
          ctx.strokeStyle = stroke.color === 'magenta' ? '#b00070' : '#1f2937'
          ctx.lineWidth = stroke.erasing ? 18 : 2.8
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath()
          stroke.points.forEach(([x, y], index) => {
            if (!index) ctx.moveTo(x * canvas.width, y * canvas.height)
            else ctx.lineTo(x * canvas.width, y * canvas.height)
          })
          if (stroke.points.length === 1) ctx.lineTo(stroke.points[0][0] * canvas.width + 0.1, stroke.points[0][1] * canvas.height + 0.1)
          ctx.stroke()
        }
      }, frame.drawing)
      const png = await page.locator('#drawing').screenshot({ type: 'png', timeout: 15000 })
      images.push({ kind: 'drawing', mimeType: 'image/png', data: png.toString('base64'),
        width: png.readUInt32BE(16), height: png.readUInt32BE(20) })
    }
    if (images.some(image => image.data.length > 1400000)) throw new Error('Notebook image exceeds output limit')
    return { layout, images }
  } finally {
    signal?.removeEventListener('abort', cancel)
    await browser.close()
  }
}
