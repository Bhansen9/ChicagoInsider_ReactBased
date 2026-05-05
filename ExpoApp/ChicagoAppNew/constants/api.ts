import Constants from 'expo-constants';

function getApiBaseUrl() {
  const manifest = (Constants as any).manifest || (Constants as any).manifest2 || (Constants as any).expoConfig;
  const debuggerHost = manifest?.debuggerHost || (Constants as any).debuggerHost;

  if (debuggerHost) {
    const host = String(debuggerHost).split(':')[0];
    return `http://${host}:3000`;
  }

  return 'http://localhost:3000';
}

export const API_BASE_URL = getApiBaseUrl();
