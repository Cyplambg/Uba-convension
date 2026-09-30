import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ubaarchives.convention',
  appName: 'UBA Convention',
  webDir: '.output/public',
  server: {
    url: 'https://harchives-uba.mbongo801.workers.dev',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#B3191F',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
