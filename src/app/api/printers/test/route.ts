import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const printer: PrinterSettings = await request.json()

    // Test printer connection by sending a test page
    const testPage = generateTestPage(printer)
    
    const success = await sendToPrinter(printer, testPage)
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test page sent successfully' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to printer' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Printer test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function generateTestPage(printer: PrinterSettings): string {
  const timestamp = new Date().toLocaleString()
  
  // ESC/POS commands for thermal printer
  const commands = []
  
  // Initialize printer
  commands.push(Buffer.from([0x1B, 0x40])) // ESC @ - Initialize
  
  // Center alignment
  commands.push(Buffer.from([0x1B, 0x61, 0x01])) // ESC a 1 - Center
  
  // Print title
  commands.push(Buffer.from('PRINTER TEST PAGE\n'))
  commands.push(Buffer.from('==================\n\n'))
  
  // Left alignment
  commands.push(Buffer.from([0x1B, 0x61, 0x00])) // ESC a 0 - Left
  
  // Printer info
  commands.push(Buffer.from(`Printer: ${printer.name}\n`))
  commands.push(Buffer.from(`IP: ${printer.ip}:${printer.port}\n`))
  commands.push(Buffer.from(`Paper: ${printer.paperWidth}mm x ${printer.paperHeight}mm\n`))
  commands.push(Buffer.from(`Time: ${timestamp}\n\n`))
  
  // Test different font sizes
  commands.push(Buffer.from('Font Test:\n'))
  commands.push(Buffer.from('Normal text\n'))
  commands.push(Buffer.from([0x1B, 0x21, 0x08])) // Double height
  commands.push(Buffer.from('Double Height\n'))
  commands.push(Buffer.from([0x1B, 0x21, 0x00])) // Normal
  commands.push(Buffer.from([0x1B, 0x21, 0x10])) // Double width
  commands.push(Buffer.from('Double Width\n'))
  commands.push(Buffer.from([0x1B, 0x21, 0x18])) // Double height + width
  commands.push(Buffer.from('Double Size\n'))
  commands.push(Buffer.from([0x1B, 0x21, 0x00])) // Normal
  
  commands.push(Buffer.from('\n'))
  
  // Test alignment
  commands.push(Buffer.from('Alignment Test:\n'))
  commands.push(Buffer.from([0x1B, 0x61, 0x00])) // Left
  commands.push(Buffer.from('Left aligned\n'))
  commands.push(Buffer.from([0x1B, 0x61, 0x01])) // Center
  commands.push(Buffer.from('Center aligned\n'))
  commands.push(Buffer.from([0x1B, 0x61, 0x02])) // Right
  commands.push(Buffer.from('Right aligned\n'))
  commands.push(Buffer.from([0x1B, 0x61, 0x00])) // Left
  
  commands.push(Buffer.from('\n'))
  
  // Test line
  commands.push(Buffer.from('--------------------------------\n'))
  
  // Cut paper
  commands.push(Buffer.from([0x1D, 0x56, 0x00])) // GS V 0 - Full cut
  
  return Buffer.concat(commands).toString('binary')
}

async function sendToPrinter(printer: PrinterSettings, data: string): Promise<boolean> {
  try {
    // For Node.js environment, we'll use net module
    // In a real implementation, you might need to use a different approach
    // since Next.js API routes run in a serverless environment
    
    // For now, we'll simulate the connection
    // In production, you would need:
    // 1. A server process that maintains socket connections
    // 2. Or use a service like PrintNode or similar
    // 3. Or use a hardware print server
    
    console.log(`Connecting to printer at ${printer.ip}:${printer.port}`)
    console.log(`Sending ${data.length} bytes of data`)
    
    // Simulate connection success
    // In reality, you would use something like:
    // const net = require('net')
    // const client = new net.Socket()
    // client.connect(printer.port, printer.ip, ...)
    
    return true
  } catch (error) {
    console.error('Error sending to printer:', error)
    return false
  }
}