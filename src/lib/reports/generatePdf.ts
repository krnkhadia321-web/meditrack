import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// A4 in mm
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

/**
 * Capture every `.pdf-page` child inside `rootId` as a PNG,
 * then stitch them into a multi-page A4 PDF.
 */
export async function generatePdf(rootId: string, filename: string): Promise<void> {
  const root = document.getElementById(rootId)
  if (!root) throw new Error(`#${rootId} not found`)

  const pages = Array.from(root.querySelectorAll<HTMLElement>('.pdf-page'))
  if (pages.length === 0) throw new Error('No .pdf-page elements inside template')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    const imgData = canvas.toDataURL('image/png')

    // Fit to A4 width, keeping aspect ratio
    const imgWidth = A4_WIDTH_MM
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const renderHeight = Math.min(imgHeight, A4_HEIGHT_MM)

    if (i > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, renderHeight)
  }

  pdf.save(filename)
}
