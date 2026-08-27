import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.horrivals.game',
  appName: 'HORRIVALS',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false }
};

export default config;
