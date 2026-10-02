import { PDF_MARGIN_PT, SHEET_H, SHEET_W } from '../constants'

/** Vector PDF of the given log-sheet SVGs, one US-letter page each. Libraries load on demand. */
export async function exportPdf(svgs: SVGSVGElement[], filename: string): Promise<void> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const width = doc.internal.pageSize.getWidth() - PDF_MARGIN_PT * 2
  const height = (width * SHEET_H) / SHEET_W

  for (const [i, svg] of svgs.entries()) {
    if (i > 0) doc.addPage()
    await svg2pdf(svg, doc, { x: PDF_MARGIN_PT, y: PDF_MARGIN_PT + 8, width, height })
  }
  doc.save(filename)
}
