# TVS 3230 Thermal Printer Setup Guide

## 🎯 Overview
This guide will help you set up your TVS 3230 thermal printer for WiFi printing with your Restaurant POS system.

## 📋 What You'll Need
- TVS 3230 thermal printer
- WiFi network (2.4GHz recommended)
- Computer/Device connected to the same network
- Printer IP address

## 🔧 Step 1: Connect Printer to WiFi

### Using Printer Control Panel:
1. **Power on** the TVS 3230 printer
2. Press **Menu** button on the printer
3. Navigate to **Network** → **WiFi Setup**
4. Select your WiFi network (SSID)
5. Enter your WiFi password using the printer keypad
6. Wait for connection confirmation

### Alternative Method:
- Use the TVS printer configuration utility (if provided)
- Connect via USB first to configure WiFi settings
- Use WPS if your router supports it

## 🔧 Step 2: Get Printer IP Address

1. Press **Menu** → **Network** → **Status**
2. Note the **IP Address** (e.g., 192.168.1.100)
3. Note the **Gateway Address** (e.g., 192.168.1.1)
4. Note the **Subnet Mask** (usually 255.255.255.0)

## 🔧 Step 3: Configure in POS System

### Access Printer Settings:
1. Go to **Settings** → **Printer Settings** in your POS
2. Click **"Add Printer"**
3. Fill in the configuration:
   - **Printer Name**: e.g., "Kitchen Printer" or "Main Receipt Printer"
   - **IP Address**: The IP from Step 2 (e.g., 192.168.1.100)
   - **Port**: 9100 (default for most thermal printers)
   - **Gateway**: Optional, from Step 2
   - **Model**: TVS 3230
   - **Paper Width**: 78mm

### Test Connection:
1. Click **"Test Connection"** button
2. You should see "Printer connected successfully!"
3. Click **"Test Print"** to print a sample receipt

## 🔧 Step 4: Set as Default Printer

1. Click **"Set Default"** next to your printer
2. This printer will now be used for all receipt printing

## 🖨️ Step 5: Printing Receipts

### Direct Printing (No Preview):
- Click **"Print Receipt"** on any order
- Receipt prints **directly** to the thermal printer
- **No print preview screen** appears
- Uses optimized format for 78mm paper

### Automatic Fallback:
- If printer is offline, system falls back to browser print
- You'll see a status message indicating the printing method

## 📄 Paper Specifications

### Recommended Paper:
- **Width**: 78mm
- **Diameter**: Up to 50mm
- **Type**: Thermal paper (no ink required)
- **Quality**: BPA-free recommended for food service

### Loading Paper:
1. Open printer cover
2. Insert paper roll with paper coming from bottom
3. Pull paper through the printer mechanism
4. Close cover and press feed button if needed

## 🌐 Network Requirements

### WiFi Network:
- **Frequency**: 2.4GHz (more stable range)
- **Security**: WPA2/WPA3 recommended
- **Signal**: Strong signal in printer location
- **DHCP**: Enabled for automatic IP assignment

### Router Settings:
- **Port Forwarding**: Not required for local network
- **Firewall**: Allow port 9100 for printer communication
- **Reserved IP**: Optional but recommended (assign static IP to printer)

## 🔍 Troubleshooting

### Printer Not Found:
1. **Check Power**: Ensure printer is powered on
2. **Check WiFi**: Verify printer is connected to WiFi
3. **Check IP**: Confirm IP address is correct
4. **Check Network**: Ensure computer and printer are on same network
5. **Check Firewall**: Temporarily disable firewall to test

### Print Jobs Failing:
1. **Test Connection**: Use "Test Connection" button
2. **Check Paper**: Ensure paper is loaded correctly
3. **Check Cover**: Ensure printer cover is closed
4. **Restart Printer**: Power cycle the printer
5. **Check Network**: Restart WiFi router if needed

### Connection Issues:
1. **Move Closer**: Reduce distance to router
2. **Reduce Interference**: Keep away from microwaves, cordless phones
3. **Change Channel**: Use WiFi analyzer to find less crowded channel
4. **Update Firmware**: Check for printer firmware updates

## ⚙️ Advanced Configuration

### Static IP Setup (Optional):
1. Access your router's admin panel
2. Find DHCP reservation settings
3. Reserve an IP for your printer's MAC address
4. Update printer IP in POS settings

### Multiple Printers:
- Add multiple printers for different stations
- Use descriptive names (e.g., "Kitchen", "Bar", "Hostess")
- Set different defaults for different terminals

## 📞 Technical Support

### Printer Issues:
- **TVS Support**: Check printer manual for support contacts
- **Network Issues**: Contact your IT provider
- **POS Issues**: Check system documentation

### Common Error Messages:
- **"Printer Not Found"**: Check network connection
- **"Connection Failed"**: Verify IP address and port
- **"Print Job Failed"**: Check paper and printer status

## 🎉 Success Indicators

When properly configured:
- ✅ Printer shows "Connected" status
- ✅ Test connection succeeds
- ✅ Test print produces clear receipt
- ✅ Receipts print directly without preview
- ✅ All order information is clearly visible
- ✅ GST and table information is included

## 📝 Quick Reference

### Default Settings:
- **Port**: 9100
- **Paper Width**: 78mm
- **Characters per Line**: 45
- **Font**: Font A (12×24 dots)
- **Protocol**: TCP/IP

### Important Notes:
- Always use 2.4GHz WiFi for better range
- Keep printer firmware updated
- Use high-quality thermal paper
- Regularly clean printer head
- Keep spare paper rolls available

---

**🎯 You're now ready to print receipts directly to your TVS 3230 thermal printer!**