export type DevicePlatform = 'android' | 'ios' | 'desktop';
export type StorePlatform = DevicePlatform | 'all';
export type FallbackMode = 'show_store_options' | 'auto_redirect';

export interface StoreDestination {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  platforms: StorePlatform[];
}

export interface DistributionConfig {
  deepLink: {
    enabled: boolean;
    /**
     * Example: "braintouch://game/{gameId}"
     * "{gameId}" token is replaced at runtime.
     */
    urlTemplate: string;
  };
  fallback: {
    mode: FallbackMode;
    delayMs: number;
    /**
     * Used only when mode is "auto_redirect".
     * If omitted, the first eligible store is used.
     */
    autoRedirectStoreId?: string;
  };
  stores: StoreDestination[];
}

/**
 * Update only this object when store targets are finalized.
 */
export const DISTRIBUTION_CONFIG: DistributionConfig = {
  deepLink: {
    enabled: false,
    urlTemplate: '',
  },
  fallback: {
    mode: 'show_store_options',
    delayMs: 1400,
  },
  stores: [
    {
      id: 'onestore',
      label: '원스토어',
      url: '',
      enabled: false,
      platforms: ['android'],
    },
    {
      id: 'app-in-toss',
      label: '앱인토스',
      url: '',
      enabled: false,
      platforms: ['android', 'ios'],
    },
  ],
};

function hasValue(input: string): boolean {
  return input.trim().length > 0;
}

function supportsPlatform(store: StoreDestination, platform: DevicePlatform): boolean {
  return store.platforms.includes('all') || store.platforms.includes(platform);
}

export function detectDevicePlatform(userAgent: string): DevicePlatform {
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  return 'desktop';
}

export function buildDeepLinkUrl(gameId: string): string | null {
  if (!DISTRIBUTION_CONFIG.deepLink.enabled) {
    return null;
  }

  const template = DISTRIBUTION_CONFIG.deepLink.urlTemplate.trim();
  if (!hasValue(template)) {
    return null;
  }

  return template.replace('{gameId}', encodeURIComponent(gameId));
}

export function getAvailableStores(platform: DevicePlatform): StoreDestination[] {
  return DISTRIBUTION_CONFIG.stores.filter((store) => {
    return store.enabled && hasValue(store.url) && supportsPlatform(store, platform);
  });
}

export function resolveAutoRedirectStore(
  platform: DevicePlatform,
  preferredStoreId?: string | null
): StoreDestination | null {
  if (DISTRIBUTION_CONFIG.fallback.mode !== 'auto_redirect') {
    return null;
  }

  const availableStores = getAvailableStores(platform);
  if (availableStores.length === 0) {
    return null;
  }

  if (preferredStoreId) {
    const preferredStore = availableStores.find((store) => store.id === preferredStoreId);
    if (preferredStore) {
      return preferredStore;
    }
  }

  if (DISTRIBUTION_CONFIG.fallback.autoRedirectStoreId) {
    const configuredStore = availableStores.find(
      (store) => store.id === DISTRIBUTION_CONFIG.fallback.autoRedirectStoreId
    );
    if (configuredStore) {
      return configuredStore;
    }
  }

  return availableStores[0];
}
