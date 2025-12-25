import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0971035e798b41c78d2de4cecd61b258',
  appName: 'StockMaster - Inventario',
  webDir: 'dist',
  server: {
    url: 'https://0971035e-798b-41c7-8d2d-e4cecd61b258.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a2332',
      showSpinner: true,
      spinnerColor: '#22c55e'
    }
  }
};

export default config;
