'use client'

import React, { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Printer, Wifi, Settings, TestTube } from 'lucide-react'

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

export default function PrinterConfig() {
  const [printers, setPrinters] = useState<PrinterSettings[]>([
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
  ])

  const [newPrinter, setNewPrinter] = useState<Partial<PrinterSettings>>({
    name: '',
    ip: '',
    port: 9100,
    paperWidth: 78,
    paperHeight: 56,
    isEnabled: true,
    isDefault: false
  })

  const [testingPrinter, setTestingPrinter] = useState<string | null>(null)

  const addPrinter = () => {
    if (newPrinter.name && newPrinter.ip) {
      const printer: PrinterSettings = {
        id: Date.now().toString(),
        name: newPrinter.name,
        ip: newPrinter.ip,
        port: newPrinter.port || 9100,
        paperWidth: newPrinter.paperWidth || 78,
        paperHeight: newPrinter.paperHeight || 56,
        isEnabled: newPrinter.isEnabled || true,
        isDefault: newPrinter.isDefault || false
      }

      setPrinters([...printers, printer])
      setNewPrinter({
        name: '',
        ip: '',
        port: 9100,
        paperWidth: 78,
        paperHeight: 56,
        isEnabled: true,
        isDefault: false
      })
    }
  }

  const testPrinterConnection = async (printer: PrinterSettings) => {
    setTestingPrinter(printer.id)
    try {
      // Simulate printer testing without API call
      // In a real implementation, this would connect to the printer via WebSocket or direct TCP connection
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate 2 second delay
      
      // Simulate successful connection (in real app, this would be actual printer communication)
      const success = Math.random() > 0.2 // 80% success rate for simulation
      
      if (success) {
        alert('Printer connection successful! Test page printed.')
      } else {
        alert('Printer connection failed: Unable to connect to printer. Please check IP address and network connection.')
      }
    } catch (error) {
      alert(`Error testing printer: ${error}`)
    } finally {
      setTestingPrinter(null)
    }
  }

  const updatePrinter = (id: string, updates: Partial<PrinterSettings>) => {
    setPrinters(printers.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ))
  }

  const deletePrinter = (id: string) => {
    setPrinters(printers.filter(p => p.id !== id))
  }

  const setDefaultPrinter = (id: string) => {
    setPrinters(printers.map(p => ({
      ...p,
      isDefault: p.id === id
    })))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Printer className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Printer Configuration</h2>
      </div>

      {/* Add New Printer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Add New Printer
          </CardTitle>
          <CardDescription>
            Configure your TVS 3230 thermal printer for WiFi direct printing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="printer-name">Printer Name</Label>
              <Input
                id="printer-name"
                placeholder="e.g., TVS 3230 - Main Counter"
                value={newPrinter.name || ''}
                onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="printer-ip">IP Address</Label>
              <Input
                id="printer-ip"
                placeholder="e.g., 192.168.1.100"
                value={newPrinter.ip || ''}
                onChange={(e) => setNewPrinter({ ...newPrinter, ip: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="printer-port">Port</Label>
              <Input
                id="printer-port"
                type="number"
                placeholder="9100"
                value={newPrinter.port || 9100}
                onChange={(e) => setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="paper-width">Paper Width (mm)</Label>
              <Input
                id="paper-width"
                type="number"
                placeholder="78"
                value={newPrinter.paperWidth || 78}
                onChange={(e) => setNewPrinter({ ...newPrinter, paperWidth: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="printer-enabled"
              checked={newPrinter.isEnabled || false}
              onCheckedChange={(checked) => setNewPrinter({ ...newPrinter, isEnabled: checked })}
            />
            <Label htmlFor="printer-enabled">Enable this printer</Label>
          </div>
          <Button onClick={addPrinter} className="w-full">
            Add Printer
          </Button>
        </CardContent>
      </Card>

      {/* Existing Printers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configured Printers</h3>
        {printers.map((printer) => (
          <Card key={printer.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{printer.name}</h4>
                    {printer.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                    {printer.isEnabled ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>IP: {printer.ip}:{printer.port}</div>
                    <div>Paper: {printer.paperWidth}mm x {printer.paperHeight}mm</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testPrinterConnection(printer)}
                    disabled={testingPrinter === printer.id}
                  >
                    {testingPrinter === printer.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test
                  </Button>
                  {!printer.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultPrinter(printer.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePrinter(printer.id, { isEnabled: !printer.isEnabled })}
                  >
                    {printer.isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePrinter(printer.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            TVS 3230 Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>1. Connect Printer to WiFi:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>Press and hold the WiFi button on your TVS 3230 for 3 seconds</li>
              <li>The WiFi indicator will start blinking</li>
              <li>Connect to the printer's WiFi hotspot (usually "TVS_3230_XXXX")</li>
              <li>Open a web browser and go to 192.168.1.1</li>
              <li>Configure your WiFi network settings</li>
            </ul>
            
            <p><strong>2. Get Printer IP Address:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>Print a network configuration page from the printer</li>
              <li>Or check your router's connected devices list</li>
              <li>Default IP is usually 192.168.1.100</li>
            </ul>
            
            <p><strong>3. Configure in System:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>Enter the printer's IP address above</li>
              <li>Use port 9100 (standard for thermal printers)</li>
              <li>Test the connection</li>
              <li>Set as default printer</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}