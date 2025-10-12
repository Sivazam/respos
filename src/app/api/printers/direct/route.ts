import { NextRequest, NextResponse } from 'next/server'

interface PrintRequest {
  printerId?: string
  content: string
  type: 'receipt' | 'test' | 'kot'
}

interface PrinterSettings {
  id: string
  name: string
  ip: string
  port: number
  isEnabled: boolean
  paperWidth: number
  paperHeight: number
  isDefault: boolean
}

// In a real app, this would come from a database
const configuredPrinters: PrinterSettings[] = [
  {
    id: '1',
    name: 'TVS 3230 - Main Counter',
    ip: '192.168.1.100',
    port: 9100,
    isEnabled: true,
    paperWidth: 78,
    paperHeight: 56,
    isDefault: true
  }
]

export async function POST(request: NextRequest) {
  try {
    const printRequest: PrintRequest = await request.json()
    
    // Find the target printer
    let targetPrinter: PrinterSettings | undefined
    
    if (printRequest.printerId) {
      targetPrinter = configuredPrinters.find(p => p.id === printRequest.printerId)
    } else {
      // Use default printer
      targetPrinter = configuredPrinters.find(p => p.isDefault)
    }
    
    if (!targetPrinter) {
      return NextResponse.json({ 
        success: false, 
        error: 'No printer configured or printer not found' 
      }, { status: 404 })
    }
    
    if (!targetPrinter.isEnabled) {
      return NextResponse.json({ 
        success: false, 
        error: 'Printer is disabled' 
      }, { status: 400 })
    }
    
    // Convert HTML content to ESC/POS commands
    const escPosCommands = convertHtmlToEscPos(printRequest.content, targetPrinter)
    
    // Send to printer
    const success = await sendToPrinter(targetPrinter, escPosCommands)
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Print job sent successfully',
        printer: targetPrinter.name
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send print job' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Direct print error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function convertHtmlToEscPos(htmlContent: string, _printer: PrinterSettings): string {
  // This is a simplified conversion
  // In a real implementation, you'd need a proper HTML to ESC/POS converter
  
  const commands = []
  
  // Initialize printer
  commands.push(Buffer.from([0x1B, 0x40])) // ESC @ - Initialize
  
  // Set character code table (PC437 for most thermal printers)
  commands.push(Buffer.from([0x1B, 0x74, 0x00])) // ESC t 0
  
  // Extract text content from HTML (simplified)
  const textContent = htmlContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  // Split into lines and format for 78mm paper (45 characters per line)
  const lines = textContent.split('\n')
  const maxCharsPerLine = 45
  
  lines.forEach(line => {
    if (line.trim()) {
      // Handle long lines by wrapping
      if (line.length > maxCharsPerLine) {
        const words = line.split(' ')
        let currentLine = ''
        
        words.forEach(word => {
          if ((currentLine + word).length <= maxCharsPerLine) {
            currentLine += (currentLine ? ' ' : '') + word
          } else {
            if (currentLine) {
              commands.push(Buffer.from(currentLine + '\n'))
            }
            currentLine = word
          }
        })
        
        if (currentLine) {
          commands.push(Buffer.from(currentLine + '\n'))
        }
      } else {
        commands.push(Buffer.from(line + '\n'))
      }
    } else {
      commands.push(Buffer.from('\n'))
    }
  })
  
  // Add some spacing at the bottom
  commands.push(Buffer.from('\n\n\n'))
  
  // Cut paper
  commands.push(Buffer.from([0x1D, 0x56, 0x00])) // GS V 0 - Full cut
  
  return Buffer.concat(commands).toString('binary')
}

async function sendToPrinter(printer: PrinterSettings, data: string): Promise<boolean> {
  try {
    // This is where you would implement the actual socket connection
    // For demonstration, we'll simulate the connection
    
    console.log(`Sending print job to ${printer.name} at ${printer.ip}:${printer.port}`)
    console.log(`Data size: ${data.length} bytes`)
    
    // In a real implementation, you would use:
    /*
    const net = require('net')
    
    return new Promise((resolve, reject) => {
      const client = new net.Socket()
      
      client.connect(printer.port, printer.ip, () => {
        console.log('Connected to printer')
        client.write(Buffer.from(data, 'binary'))
        client.end()
      })
      
      client.on('close', () => {
        console.log('Printer connection closed')
        resolve(true)
      })
      
      client.on('error', (error) => {
        console.error('Printer connection error:', error)
        reject(error)
      })
      
      // Timeout after 10 seconds
      setTimeout(() => {
        client.destroy()
        reject(new Error('Connection timeout'))
      }, 10000)
    })
    */
    
    // For now, simulate success
    return true
  } catch (error) {
    console.error('Error sending to printer:', error)
    return false
  }
}