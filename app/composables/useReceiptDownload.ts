import { ref } from 'vue'

export interface ReceiptItemData {
  name: string
  quantity: number
  unitPrice?: number
  lineTotal: number
  sizeName?: string | null
  addons?: { name: string; quantity?: number; price?: number }[]
}

export interface ReceiptDownloadData {
  receiptNumber: string
  transactionUuid?: string
  date: string | Date
  cashier: string
  cafeName?: string | null
  branchName?: string | null
  branchAddress?: string | null
  items: ReceiptItemData[]
  subtotal: number
  discountType?: string | null
  discountAmount?: number
  total: number
  paymentMethod?: string | null
  amountTendered?: number | null
  change?: number | null
  referenceNumber?: string | null
  walkInNote?: string | null
  status?: string | null
}

export function useReceiptDownload() {
  const isDownloading = ref(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0)
  }

  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput)
    return isNaN(d.getTime()) ? String(dateInput) : d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  /**
   * Generates a high-resolution, crisp PNG image of the receipt using HTML5 Canvas and downloads it.
   */
  async function downloadReceiptImage(data: ReceiptDownloadData, customFilename?: string): Promise<boolean> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false
    isDownloading.value = true

    try {
      const scale = 2 // 2x backing for sharp Retina display / print
      const width = 460

      // Calculate dynamic canvas height
      let estimatedHeight = 360 // header, summary, payment, footer
      for (const item of data.items) {
        estimatedHeight += 38 // base line item height
        if (item.addons?.length) {
          estimatedHeight += item.addons.length * 18
        }
      }
      if (data.discountAmount && data.discountAmount > 0) estimatedHeight += 24
      if (data.referenceNumber) estimatedHeight += 20
      if (data.walkInNote) estimatedHeight += 28
      if (data.status && data.status.toLowerCase() === 'refunded') estimatedHeight += 30

      const height = Math.max(estimatedHeight, 520)

      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return false

      ctx.scale(scale, scale)

      // Background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)

      // Border outline
      ctx.strokeStyle = '#EADFD3'
      ctx.lineWidth = 1.5
      ctx.strokeRect(10, 10, width - 20, height - 20)

      let y = 38
      const centerX = width / 2
      const leftX = 28
      const rightX = width - 28

      // Helpers
      const drawDottedLine = (posY: number) => {
        ctx.save()
        ctx.strokeStyle = '#A38F85'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(leftX, posY)
        ctx.lineTo(rightX, posY)
        ctx.stroke()
        ctx.restore()
      }

      // ── Header ──
      ctx.fillStyle = '#3B1F0E'
      ctx.font = 'bold 20px "Outfit", "Inter", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText((data.cafeName || 'BrewSpot').toUpperCase(), centerX, y)
      y += 20

      ctx.fillStyle = '#6B5048'
      ctx.font = '13px "Inter", sans-serif'
      if (data.branchName) {
        ctx.fillText(data.branchName, centerX, y)
        y += 18
      }
      if (data.branchAddress) {
        ctx.font = '11px "Inter", sans-serif'
        ctx.fillText(data.branchAddress, centerX, y)
        y += 18
      }

      ctx.fillStyle = '#7B5A50'
      ctx.font = 'bold 12px "Inter", sans-serif'
      ctx.fillText('SALES RECEIPT', centerX, y)
      y += 14

      drawDottedLine(y)
      y += 18

      // ── Receipt Metadata ──
      ctx.font = '12px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#6B5048'
      ctx.fillText('Receipt No:', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#2D201B'
      ctx.font = 'bold 12px "Inter", monospace'
      ctx.fillText(`#${data.receiptNumber}`, rightX, y)
      y += 18

      ctx.font = '12px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#6B5048'
      ctx.fillText('Date:', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#2D201B'
      ctx.fillText(formatDate(data.date), rightX, y)
      y += 18

      ctx.textAlign = 'left'
      ctx.fillStyle = '#6B5048'
      ctx.fillText('Cashier:', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#2D201B'
      ctx.fillText(data.cashier, rightX, y)
      y += 18

      if (data.status && data.status.toLowerCase() === 'refunded') {
        ctx.textAlign = 'center'
        ctx.fillStyle = '#92400E'
        ctx.font = 'bold 12px "Inter", sans-serif'
        ctx.fillText('** SALE REFUNDED **', centerX, y)
        y += 18
      }

      drawDottedLine(y)
      y += 18

      // ── Line Items Header ──
      ctx.font = 'bold 11px "Inter", sans-serif'
      ctx.fillStyle = '#8A6E64'
      ctx.textAlign = 'left'
      ctx.fillText('ITEM', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillText('AMOUNT', rightX, y)
      y += 14

      // ── Line Items List ──
      for (const item of data.items) {
        ctx.textAlign = 'left'
        ctx.font = 'bold 13px "Inter", sans-serif'
        ctx.fillStyle = '#2D201B'

        const itemTitle = `${item.quantity}x ${item.name}${item.sizeName ? ` (${item.sizeName})` : ''}`
        // Truncate long names if needed
        const maxTextWidth = width - 130
        let displayTitle = itemTitle
        if (ctx.measureText(displayTitle).width > maxTextWidth) {
          while (ctx.measureText(displayTitle + '...').width > maxTextWidth && displayTitle.length > 0) {
            displayTitle = displayTitle.slice(0, -1)
          }
          displayTitle += '...'
        }
        ctx.fillText(displayTitle, leftX, y)

        ctx.textAlign = 'right'
        ctx.font = 'bold 13px "Inter", sans-serif'
        ctx.fillText(formatCurrency(item.lineTotal), rightX, y)
        y += 16

        // Addons if any
        if (item.addons?.length) {
          ctx.font = '11px "Inter", sans-serif'
          ctx.fillStyle = '#6B5048'
          for (const addon of item.addons) {
            ctx.textAlign = 'left'
            const addonText = `  + ${addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ''}${addon.name}`
            ctx.fillText(addonText, leftX, y)
            if (addon.price) {
              ctx.textAlign = 'right'
              ctx.fillText(formatCurrency(addon.price * (addon.quantity || 1)), rightX, y)
            }
            y += 14
          }
        }
        y += 4
      }

      drawDottedLine(y)
      y += 18

      // ── Totals ──
      ctx.font = '13px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#6B5048'
      ctx.fillText('Subtotal', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#2D201B'
      ctx.fillText(formatCurrency(data.subtotal), rightX, y)
      y += 18

      if (data.discountAmount && data.discountAmount > 0) {
        ctx.textAlign = 'left'
        ctx.fillStyle = '#991B1B'
        ctx.fillText(`Discount ${data.discountType ? `(${data.discountType})` : ''}`, leftX, y)
        ctx.textAlign = 'right'
        ctx.fillText(`- ${formatCurrency(data.discountAmount)}`, rightX, y)
        y += 18
      }

      ctx.save()
      ctx.strokeStyle = '#2D201B'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftX, y)
      ctx.lineTo(rightX, y)
      ctx.stroke()
      ctx.restore()
      y += 18

      ctx.font = 'bold 16px "Outfit", "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#2D201B'
      ctx.fillText('TOTAL AMOUNT', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#3B1F0E'
      ctx.fillText(formatCurrency(data.total), rightX, y)
      y += 22

      drawDottedLine(y)
      y += 18

      // ── Payment Details ──
      ctx.font = '12px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#6B5048'
      ctx.fillText('Payment Method:', leftX, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#2D201B'
      ctx.font = 'bold 12px "Inter", sans-serif'
      ctx.fillText((data.paymentMethod || 'Cash').toUpperCase(), rightX, y)
      y += 18

      if (data.paymentMethod?.toLowerCase() === 'cash') {
        if (data.amountTendered !== undefined && data.amountTendered !== null) {
          ctx.font = '12px "Inter", sans-serif'
          ctx.textAlign = 'left'
          ctx.fillStyle = '#6B5048'
          ctx.fillText('Amount Tendered:', leftX, y)
          ctx.textAlign = 'right'
          ctx.fillStyle = '#2D201B'
          ctx.fillText(formatCurrency(data.amountTendered), rightX, y)
          y += 18
        }
        if (data.change !== undefined && data.change !== null) {
          ctx.font = 'bold 12px "Inter", sans-serif'
          ctx.textAlign = 'left'
          ctx.fillStyle = '#065F46'
          ctx.fillText('Change:', leftX, y)
          ctx.textAlign = 'right'
          ctx.fillText(formatCurrency(data.change), rightX, y)
          y += 18
        }
      }

      if (data.referenceNumber) {
        ctx.font = '12px "Inter", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#6B5048'
        ctx.fillText('Ref Number:', leftX, y)
        ctx.textAlign = 'right'
        ctx.fillStyle = '#2D201B'
        ctx.font = '11px monospace'
        ctx.fillText(data.referenceNumber, rightX, y)
        y += 18
      }

      if (data.walkInNote) {
        ctx.font = 'italic 11px "Inter", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#8A6E64'
        ctx.fillText(`Note: ${data.walkInNote}`, leftX, y)
        y += 18
      }

      drawDottedLine(y)
      y += 24

      // ── Barcode Simulation ──
      ctx.fillStyle = '#2D201B'
      const barcodeWidth = 240
      const barcodeStartX = (width - barcodeWidth) / 2
      const barCount = 42
      const barSeed = (data.receiptNumber || '000001').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

      for (let i = 0; i < barCount; i++) {
        const barThickness = ((i + barSeed) % 3 === 0) ? 3 : 1.5
        const barX = barcodeStartX + (i * (barcodeWidth / barCount))
        ctx.fillRect(barX, y, barThickness, 24)
      }
      y += 32

      // ── Footer ──
      ctx.textAlign = 'center'
      ctx.fillStyle = '#6B5048'
      ctx.font = 'bold 11px "Inter", sans-serif'
      ctx.fillText('* * * THANK YOU FOR VISITING * * *', centerX, y)
      y += 16
      ctx.font = '11px "Inter", sans-serif'
      ctx.fillText('Please visit us again!', centerX, y)

      // Convert to blob and download
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return false

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = customFilename || `receipt-${data.receiptNumber || 'pos'}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      return true
    } catch (err) {
      console.error('Failed to download receipt image', err)
      return false
    } finally {
      isDownloading.value = false
    }
  }

  /**
   * Generates and downloads a clean text-based receipt (.txt).
   */
  function downloadReceiptText(data: ReceiptDownloadData, customFilename?: string): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false
    try {
      const line = (left: string, right: string = '', width: number = 38) => {
        const spaces = Math.max(width - left.length - right.length, 1)
        return left + ' '.repeat(spaces) + right
      }
      const divider = '-'.repeat(38)
      const center = (text: string, width: number = 38) => {
        const left = Math.max(Math.floor((width - text.length) / 2), 0)
        return ' '.repeat(left) + text
      }

      const rows: string[] = [
        center((data.cafeName || 'BrewSpot').toUpperCase()),
      ]
      if (data.branchName) rows.push(center(data.branchName))
      if (data.branchAddress) rows.push(center(data.branchAddress))
      rows.push(center('SALES RECEIPT'))
      rows.push(divider)
      rows.push(line('Receipt No:', `#${data.receiptNumber}`))
      rows.push(line('Date:', formatDate(data.date)))
      rows.push(line('Cashier:', data.cashier))
      if (data.status && data.status.toLowerCase() === 'refunded') {
        rows.push(center('** SALE REFUNDED **'))
      }
      rows.push(divider)
      rows.push(line('ITEM', 'AMOUNT'))

      for (const item of data.items) {
        const itemLine = `${item.quantity}x ${item.name}${item.sizeName ? ` (${item.sizeName})` : ''}`
        rows.push(line(itemLine, formatCurrency(item.lineTotal)))
        if (item.addons?.length) {
          for (const a of item.addons) {
            rows.push(line(`  + ${a.quantity && a.quantity > 1 ? `${a.quantity}x ` : ''}${a.name}`, a.price ? formatCurrency(a.price * (a.quantity || 1)) : ''))
          }
        }
      }

      rows.push(divider)
      rows.push(line('Subtotal:', formatCurrency(data.subtotal)))
      if (data.discountAmount && data.discountAmount > 0) {
        rows.push(line(`Discount (${data.discountType || 'Disc'}):`, `-${formatCurrency(data.discountAmount)}`))
      }
      rows.push('='.repeat(38))
      rows.push(line('TOTAL AMOUNT:', formatCurrency(data.total)))
      rows.push(divider)
      rows.push(line('Payment Method:', (data.paymentMethod || 'Cash').toUpperCase()))
      if (data.paymentMethod?.toLowerCase() === 'cash') {
        if (data.amountTendered !== undefined && data.amountTendered !== null) {
          rows.push(line('Amount Tendered:', formatCurrency(data.amountTendered)))
        }
        if (data.change !== undefined && data.change !== null) {
          rows.push(line('Change:', formatCurrency(data.change)))
        }
      }
      if (data.referenceNumber) {
        rows.push(line('Ref Number:', data.referenceNumber))
      }
      if (data.walkInNote) {
        rows.push(line('Note:', data.walkInNote))
      }
      rows.push(divider)
      rows.push(center('* * * THANK YOU * * *'))
      rows.push(center('Please come again!'))
      rows.push('\n')

      const text = rows.join('\n')
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = customFilename || `receipt-${data.receiptNumber || 'pos'}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return true
    } catch (e) {
      console.error('Failed to download receipt text', e)
      return false
    }
  }

  return {
    isDownloading,
    downloadReceiptImage,
    downloadReceiptText,
    formatCurrency,
    formatDate,
  }
}
