import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  buildDeepLinkUrl,
  detectDevicePlatform,
  DISTRIBUTION_CONFIG,
  getAvailableStores,
  resolveAutoRedirectStore,
} from '../shared/distribution';
import { getGameCatalogItem } from '../shared/gameCatalog';

type LaunchState = 'idle' | 'launching' | 'opened' | 'show_store_options' | 'deep_link_unconfigured';

export default function ShareLandingPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const resolvedGameId = gameId ?? '';
  const game = getGameCatalogItem(resolvedGameId);

  const platform = useMemo(() => {
    if (typeof navigator === 'undefined') return 'desktop';
    return detectDevicePlatform(navigator.userAgent);
  }, []);
  const stores = useMemo(() => getAvailableStores(platform), [platform]);
  const preferredStoreId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get('store');
  }, [location.search]);

  const [launchState, setLaunchState] = useState<LaunchState>('idle');
  const fallbackTimerRef = useRef<number | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const pageHiddenRef = useRef(false);

  const clearLaunchWatchers = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearLaunchWatchers();
    };
  }, [clearLaunchWatchers]);

  const handleOpenGame = useCallback(() => {
    clearLaunchWatchers();
    pageHiddenRef.current = false;

    const deepLinkUrl = buildDeepLinkUrl(resolvedGameId);
    if (!deepLinkUrl) {
      setLaunchState('deep_link_unconfigured');
      return;
    }

    setLaunchState('launching');

    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        pageHiddenRef.current = true;
        setLaunchState('opened');
        clearLaunchWatchers();
      }
    };

    visibilityHandlerRef.current = visibilityHandler;
    document.addEventListener('visibilitychange', visibilityHandler);

    window.location.assign(deepLinkUrl);

    fallbackTimerRef.current = window.setTimeout(() => {
      clearLaunchWatchers();

      if (pageHiddenRef.current) {
        return;
      }

      const autoRedirectStore = resolveAutoRedirectStore(platform, preferredStoreId);
      if (autoRedirectStore) {
        window.location.assign(autoRedirectStore.url);
        return;
      }

      setLaunchState('show_store_options');
    }, DISTRIBUTION_CONFIG.fallback.delayMs);
  }, [clearLaunchWatchers, platform, preferredStoreId, resolvedGameId]);

  const statusMessage = useMemo(() => {
    if (launchState === 'launching') {
      return '앱을 여는 중입니다...';
    }

    if (launchState === 'deep_link_unconfigured') {
      return '딥링크 설정이 비어 있습니다. src/shared/distribution.ts를 설정해 주세요.';
    }

    if (launchState === 'show_store_options') {
      if (stores.length > 0) {
        return '앱이 설치되지 않았거나 실행에 실패했습니다. 아래 스토어에서 설치해 주세요.';
      }
      return '스토어 링크가 아직 설정되지 않았습니다.';
    }

    if (launchState === 'opened') {
      return '앱 실행을 시도했습니다.';
    }

    return null;
  }, [launchState, stores.length]);

  if (!game) {
    return (
      <div className="w-full h-full bg-toss-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-toss-gray-600 bg-toss-gray-700 p-6">
          <h1 className="text-xl font-bold mb-2">잘못된 공유 링크입니다</h1>
          <p className="text-sm text-toss-gray-300 mb-5">지원하지 않는 게임 식별자입니다.</p>
          <Link to="/" className="inline-flex items-center justify-center w-full rounded-lg bg-toss-blue px-4 py-3 font-semibold">
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-toss-black text-white">
      <main className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-5 p-5">
        <section className="rounded-2xl border border-toss-gray-600 bg-toss-gray-700 p-5">
          <p className="text-xs uppercase tracking-wide text-toss-gray-300 mb-2">Shared Link</p>
          <h1 className="text-2xl font-bold mb-2">{game.title}</h1>
          <p className="text-sm text-toss-gray-200">{game.description}</p>
        </section>

        <button
          type="button"
          onClick={handleOpenGame}
          className="w-full rounded-xl bg-toss-blue px-4 py-4 text-base font-bold active:scale-[0.99] transition-transform"
        >
          게임하러 가기
        </button>

        <Link
          to={`/game/${game.id}`}
          className="w-full rounded-xl border border-toss-gray-500 px-4 py-3 text-center text-sm font-semibold text-toss-gray-100 active:scale-[0.99] transition-transform"
        >
          웹에서 바로 플레이
        </Link>

        {statusMessage && (
          <p className="rounded-lg border border-toss-gray-600 bg-toss-gray-700 px-4 py-3 text-sm text-toss-gray-200">
            {statusMessage}
          </p>
        )}

        <section className="rounded-2xl border border-toss-gray-600 bg-toss-gray-700 p-5">
          <h2 className="text-base font-semibold mb-3">스토어 설치</h2>

          {stores.length === 0 && (
            <p className="text-sm text-toss-gray-300">
              아직 활성화된 스토어 링크가 없습니다. 배포가 확정되면 설정 파일에서 링크를 추가해 주세요.
            </p>
          )}

          {stores.length > 0 && (
            <div className="flex flex-col gap-2">
              {stores.map((store) => (
                <a
                  key={store.id}
                  href={store.url}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-toss-gray-500 px-4 py-3 text-sm font-semibold text-toss-gray-100 active:scale-[0.99] transition-transform"
                >
                  {store.label}에서 설치하기
                </a>
              ))}
            </div>
          )}
        </section>

        <Link to="/" className="mt-auto py-2 text-center text-sm text-toss-gray-300">
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
