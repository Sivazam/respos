
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrinterManager } from '@/components/PrinterManager';
import { Settings, Printer as PrinterIcon, Wifi } from 'lucide-react';

export default function PrinterSettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-full">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Printer Settings</h1>
          <p className="text-gray-600">Configure your TVS 3230 thermal printer</p>
        </div>
      </div>

      <Tabs defaultValue="printers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="printers" className="flex items-center gap-2">
            <PrinterIcon className="h-4 w-4" />
            Printers
          </TabsTrigger>
          <TabsTrigger value="wifi" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="printers" className="space-y-6">
          <PrinterManager />
        </TabsContent>
        
        <TabsContent value="wifi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
              <CardDescription>
                Configure your network settings for optimal printer performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Current Network Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Connection Type:</span>
                      <span className="font-medium">WiFi</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network Name:</span>
                      <span className="font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signal Strength:</span>
                      <span className="font-medium text-green-600">Good</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-blue-800">WiFi Requirements</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 2.4GHz WiFi network recommended</li>
                    <li>• Same network for computer and printer</li>
                    <li>• Stable connection with minimal interference</li>
                    <li>• DHCP enabled for automatic IP assignment</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic restaurant information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  General settings will be available in future updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Advanced configuration options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Advanced settings will be available in future updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}