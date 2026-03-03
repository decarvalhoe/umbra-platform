import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.umbra.game.umbra',
  appName: 'umbra-app',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
