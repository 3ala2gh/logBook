import { useState } from 'react'
import { exportPdf } from '../utils/exportPdf'

export function usePdfExport() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download(svgs: SVGSVGElement[], filename: string) {
    setExporting(true)
    setError(null)
    try {
      await exportPdf(svgs, filename)
    } catch {
      setError('Could not create the PDF. Try "Print" and save as PDF instead.')
    } finally {
      setExporting(false)
    }
  }

  return { download, exporting, error }
}
