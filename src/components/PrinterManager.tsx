import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { printerManager, PrinterConfig, TVS_3230_DEFAULTS } from '@/lib/printerConfig';
import { directPrintService } from '@/lib/directPrint';
import { Printer, Wifi, WifiOff, Plus, Settings, TestTube, Trash2, Check, X, AlertCircle, Usb } from 'lucide-react';

export const PrinterManager: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [defaultPrinterId, setDefaultPrinterId] = useState<string>('');
  const [testResult, setTestResult] = useState<{ printerId: string; success: boolean; message: string } | null>(null);
  const [detectingUSB, setDetectingUSB] = useState(false);

  // New printer form state
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    ip: '',
    port: TVS_3230_DEFAULTS.port,
    gateway: '',
    subnet: '',
    model: TVS_3230_DEFAULTS.model,
    paperWidth: TVS_3230_DEFAULTS.paperWidth
  });

  useEffect(() => {
    loadPrinters();
    const defaultId = directPrintService.getDefaultPrinter();
    if (defaultId) {
      setDefaultPrinterId(defaultId);
    }
  }, []);

  const loadPrinters = () => {
    const allPrinters = printerManager.getAllPrinters();
    setPrinters(allPrinters);
  };

  const handleAddPrinter = async () => {
    if (!newPrinter.name || !newPrinter.ip) {
      return;
    }

    try {
      const printer = printerManager.addPrinter(newPrinter);
      setPrinters([...printers, printer]);
      setNewPrinter({
        name: '',
        ip: '',
        port: TVS_3230_DEFAULTS.port,
        gateway: '',
        subnet: '',
        model: TVS_3230_DEFAULTS.model,
        paperWidth: TVS_3230_DEFAULTS.paperWidth
      });
      setIsAddingPrinter(false);
      
      // Test connection automatically
      await testPrinterConnection(printer.id);
    } catch {
      console.error('Failed to add printer');
    }
  };

  const handleRemovePrinter = (printerId: string) => {
    printerManager.removePrinter(printerId);
    setPrinters(printers.filter(p => p.id !== printerId));
    
    if (defaultPrinterId === printerId) {
      setDefaultPrinterId('');
      directPrintService.setDefaultPrinter('');
    }
  };

  const testPrinterConnection = async (printerId: string) => {
    setTestingPrinter(printerId);
    setTestResult(null);
    
    try {
      const isConnected = await printerManager.testConnection(printerId);
      setTestResult({
        printerId,
        success: isConnected,
        message: isConnected ? 'Printer connected successfully!' : 'Failed to connect to printer'
      });
      loadPrinters(); // Refresh to update connection status
    } catch {
      setTestResult({
        printerId,
        success: false,
        message: 'Connection test failed'
      });
    } finally {
      setTestingPrinter(null);
    }
  };

  const handleSetDefaultPrinter = (printerId: string) => {
    setDefaultPrinterId(printerId);
    directPrintService.setDefaultPrinter(printerId);
  };

  const handleTestPrint = async (printerId: string) => {
    const testContent = `
================================
        TEST PRINT
================================
Printer: ${printers.find(p => p.id === printerId)?.name}
Model: ${TVS_3230_DEFAULTS.model}
Paper Width: ${TVS_3230_DEFAULTS.paperWidth}mm
IP: ${printers.find(p => p.id === printerId)?.ip}
Port: ${printers.find(p => p.id === printerId)?.port}

Date: ${new Date().toLocaleString()}
================================

This is a test print to verify
your TVS 3230 thermal printer
is working correctly.

Characters per line: ${TVS_3230_DEFAULTS.maxCharsPerLine}
Font: Font A (16x32 dots) - Enhanced

================================
    `;

    try {
      await directPrintService.printReceipt(testContent, { printerId });
      setTestResult({
        printerId,
        success: true,
        message: 'Test print sent successfully!'
      });
    } catch (error) {
      setTestResult({
        printerId,
        success: false,
        message: 'Test print failed'
      });
    }
  };

  const handleDetectUSBPrinters = async () => {
    setDetectingUSB(true);
    try {
      const usbPrinters = await directPrintService.detectUSBPrinters();
      if (usbPrinters.length > 0) {
        loadPrinters(); // Refresh the printer list
        setTestResult({
          printerId: usbPrinters[0].id,
          success: true,
          message: `USB printer detected: ${usbPrinters[0].name}`
        });
      } else {
        setTestResult({
          printerId: 'usb',
          success: false,
          message: 'No USB printers found. Please ensure your printer is connected via USB and drivers are installed.'
        });
      }
    } catch (error) {
      setTestResult({
        printerId: 'usb',
        success: false,
        message: 'USB printer detection failed. Please check browser permissions and USB connection.'
      });
    } finally {
      setDetectingUSB(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Thermal Printer Management
              </CardTitle>
              <CardDescription>
                Configure and manage your TVS 3230 thermal printer for WiFi or USB printing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDetectUSBPrinters}
                disabled={detectingUSB}
              >
                {detectingUSB ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Usb className="h-4 w-4 mr-2" />
                )}
                Detect USB
              </Button>
              <Dialog open={isAddingPrinter} onOpenChange={setIsAddingPrinter}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Printer
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Printer</DialogTitle>
                  <DialogDescription>
                    Configure your TVS 3230 thermal printer for WiFi connection
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="printer-name">Printer Name</Label>
                    <Input
                      id="printer-name"
                      placeholder="e.g., Kitchen Printer"
                      value={newPrinter.name}
                      onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="printer-ip">IP Address</Label>
                    <Input
                      id="printer-ip"
                      placeholder="e.g., 192.168.1.100"
                      value={newPrinter.ip}
                      onChange={(e) => setNewPrinter({ ...newPrinter, ip: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="printer-port">Port</Label>
                      <Input
                        id="printer-port"
                        type="number"
                        value={newPrinter.port}
                        onChange={(e) => setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="printer-gateway">Gateway (Optional)</Label>
                      <Input
                        id="printer-gateway"
                        placeholder="e.g., 192.168.1.1"
                        value={newPrinter.gateway}
                        onChange={(e) => setNewPrinter({ ...newPrinter, gateway: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="printer-model">Model</Label>
                    <Select value={newPrinter.model} onValueChange={(value) => setNewPrinter({ ...newPrinter, model: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TVS 3230">TVS 3230</SelectItem>
                        <SelectItem value="TVS 3350">TVS 3350</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddingPrinter(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPrinter} disabled={!newPrinter.name || !newPrinter.ip}>
                      Add Printer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {printers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No printers configured. Connect your TVS 3230 printer via USB and click "Detect USB" or add a WiFi printer manually.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {printers.map((printer) => (
                <Card key={printer.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {printer.ip === 'usb' ? (
                            <Usb className="h-5 w-5 text-blue-500" />
                          ) : printer.isConnected ? (
                            <Wifi className="h-5 w-5 text-green-500" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <h3 className="font-semibold">{printer.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {printer.model} • {printer.ip === 'usb' ? 'USB Connection' : `${printer.ip}:${printer.port}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={printer.isConnected ? "default" : "destructive"}>
                          {printer.isConnected ? "Connected" : "Offline"}
                        </Badge>
                        {printer.ip === 'usb' && (
                          <Badge variant="outline">USB</Badge>
                        )}
                        {defaultPrinterId === printer.id && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testPrinterConnection(printer.id)}
                          disabled={testingPrinter === printer.id}
                        >
                          {testingPrinter === printer.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestPrint(printer.id)}
                        >
                          Test Print
                        </Button>
                        
                        {defaultPrinterId !== printer.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefaultPrinter(printer.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemovePrinter(printer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {testResult?.printerId === printer.id && (
                      <Alert className={`mt-4 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
                        <div className="flex items-center gap-2">
                          {testResult.success ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <AlertDescription>{testResult.message}</AlertDescription>
                        </div>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            TVS 3230 Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="wifi" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="usb">USB Setup</TabsTrigger>
              <TabsTrigger value="wifi">WiFi Setup</TabsTrigger>
              <TabsTrigger value="network">Network Config</TabsTrigger>
              <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
            </TabsList>
            
            <TabsContent value="usb" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Connect Printer via USB</h4>
                <p className="text-sm text-muted-foreground">
                  Connect your TVS 3230 printer to your computer using a USB cable:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Use the USB port on the printer</li>
                  <li>• Connect to any available USB port on your computer</li>
                  <li>• Ensure the printer is powered on</li>
                  <li>• Install printer drivers if prompted</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">2. Detect USB Printer</h4>
                <p className="text-sm text-muted-foreground">
                  Click the "Detect USB" button above to automatically find your printer:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Ensure browser has USB permissions</li>
                  <li>• Grant permission when prompted</li>
                  <li>• Select your TVS 3230 from the list</li>
                  <li>• Printer will be added automatically</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">3. Test USB Printing</h4>
                <p className="text-sm text-muted-foreground">
                  Use the "Test Print" button to verify USB connection works
                </p>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> USB printing works through the browser and may show a print preview. 
                  For direct printing, ensure your system recognizes the printer.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="wifi" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Connect Printer to WiFi</h4>
                <p className="text-sm text-muted-foreground">
                  Use the printer's control panel to connect to your WiFi network:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Press Menu → Network → WiFi Setup</li>
                  <li>• Select your WiFi network (SSID)</li>
                  <li>• Enter your WiFi password</li>
                  <li>• Wait for connection confirmation</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">2. Get Printer IP Address</h4>
                <p className="text-sm text-muted-foreground">
                  Find the printer's IP address:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Press Menu → Network → Status</li>
                  <li>• Note the IP address (e.g., 192.168.1.100)</li>
                  <li>• Note the Gateway address if shown</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">3. Add Printer in System</h4>
                <p className="text-sm text-muted-foreground">
                  Use the "Add Printer" button above with the IP address
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Network Configuration</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Default Port:</span>
                    <span>9100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Protocol:</span>
                    <span>TCP/IP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Paper Width:</span>
                    <span>78mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Max Characters/Line:</span>
                    <span>45</span>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure your computer and printer are on the same network for WiFi printing to work.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="troubleshoot" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Printer Not Found</h4>
                  <p className="text-sm text-muted-foreground">
                    • Check if printer is powered on and connected to WiFi<br/>
                    • Verify IP address is correct<br/>
                    • Ensure same network as computer<br/>
                    • Check firewall settings
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Print Jobs Failing</h4>
                  <p className="text-sm text-muted-foreground">
                    • Test printer connection first<br/>
                    • Check paper is loaded properly<br/>
                    • Verify printer has power<br/>
                    • Try restarting printer
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Connection Issues</h4>
                  <p className="text-sm text-muted-foreground">
                    • Restart WiFi router<br/>
                    • Move printer closer to router<br/>
                    • Check network signal strength<br/>
                    • Update printer firmware
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};