const PDF_WIDTH_PX = 1188
const PDF_HEIGHT_PX = 840

export async function exportDeckPdf(deck: HTMLElement, title: string): Promise<void> {
  const snapshot = deck.cloneNode(true)
  if (!(snapshot instanceof HTMLElement)) throw new Error('Unable to prepare the PDF export.')
  document.body.appendChild(snapshot)

  try {
    const pages = Array.from(snapshot.querySelectorAll<HTMLElement>('.pdf-page'))
    if (pages.length === 0) throw new Error('Create some content before exporting it.')

    await document.fonts.ready
    await Promise.all(Array.from(snapshot.querySelectorAll('img'), async (image) => {
      try {
        await image.decode()
      } catch {
        throw new Error('An image could not be loaded for the PDF export.')
      }
    }))

    for (const [index, page] of pages.entries()) {
      const bounds = page.getBoundingClientRect()
      const overflowing = Array.from(page.querySelectorAll<HTMLElement>('[data-pdf-content]')).some((element) => {
        const rect = element.getBoundingClientRect()
        return element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1 ||
          rect.bottom > bounds.bottom + 1 || rect.right > bounds.right + 1
      })
      if (overflowing) {
        throw new Error(`Content on PDF page ${index + 1} does not fit. Shorten it before exporting.`)
      }
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas-pro'),
      import('jspdf'),
    ])
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: PDF_WIDTH_PX,
        height: PDF_HEIGHT_PX,
        useCORS: true,
        logging: false,
      })
      if (index > 0) pdf.addPage('a4', 'landscape')
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210)
      canvas.width = 0
      canvas.height = 0
    }

    const filename = title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'material'
    pdf.save(`${filename}.pdf`)
  } finally {
    snapshot.remove()
  }
}
