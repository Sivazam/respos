// Ambient declarations for experimental browser APIs we use behind feature
// detection. These exist only so TypeScript stops complaining; runtime guards
// (`'foo' in navigator`, try/catch) still gate every call.

export {};

declare global {
  interface Navigator {
    /** Web Bluetooth API (experimental) */
    bluetooth?: {
      requestDevice(options?: unknown): Promise<unknown>;
      getAvailability?(): Promise<boolean>;
    };

    /** WebUSB API (experimental) */
    usb?: {
      requestDevice(options?: unknown): Promise<unknown>;
      getDevices(): Promise<unknown[]>;
    };

    /** Web Serial API (experimental) */
    serial?: {
      requestPort(options?: unknown): Promise<unknown>;
      getPorts(): Promise<unknown[]>;
    };

    /** Experimental "managed" print API used by some Chromium builds. */
    print?: (init: { content: Blob | string; ticket?: unknown }) => Promise<void>;

    /** Experimental printer capabilities (Chromium kiosk/managed). */
    printerCapabilities?: Promise<unknown[]>;
  }
}
