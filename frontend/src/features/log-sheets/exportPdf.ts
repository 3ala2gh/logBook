import { SHEET_H, SHEET_W } from './geometry'

/** Vector PDF of the given log sheet SVGs, one US-letter page each. */
export async function exportPdf(svgs: SVGSVGElement[], filename: string): Promise<void> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 24
  const width = pageW - margin * 2
  const height = (width * SHEET_H) / SHEET_W

  for (const [i, svg] of svgs.entries()) {
    if (i > 0) doc.addPage()
    await svg2pdf(svg, doc, { x: margin, y: margin + 8, width, height })
  }
  doc.save(filename)
}
