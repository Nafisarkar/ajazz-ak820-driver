import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { api, type Catalog, type Profile, type Status, type Store } from './api'

/** Stable context: only changes when the profile data itself changes. */
interface AppContextValue {
  store: Store | null
  catalog: Catalog | null
  error: string | null
  toast: string | null
  reload: () => Promise<void>
  setEnabled: (value: boolean) => Promise<void>
  saveProfile: (profile: Profile) => Promise<void>
  createProfile: (name: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  setActiveProfile: (id: string) => Promise<void>
  activeProfile: Profile | null
  /** Edit the active profile: applied locally at once, persisted after a pause. */
  mutateActive: (fn: (profile: Profile) => Profile) => Promise<void>
  notify: (message: string) => void
}

/** Live context: polled hook/runtime status. Kept separate so polling does not
 *  re-render the editors. */
interface StatusContextValue {
  status: Status | null
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)
const StatusContext = createContext<StatusContextValue | null>(null)

const SAVE_DEBOUNCE_MS = 400

export function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)

  const storeRef = useRef<Store | null>(null)
  useEffect(() => {
    storeRef.current = store
  }, [store])

  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e))
  }, [])

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.status())
    } catch {
      // status polling failures are transient (e.g. while reloading)
    }
  }, [])

  const reload = useCallback(async () => {
    try {
      const [nextStore, nextStatus] = await Promise.all([api.store(), api.status()])
      setStore(nextStore)
      setStatus(nextStatus)
      setError(null)
    } catch (e) {
      fail(e)
    }
  }, [fail])

  useEffect(() => {
    api.catalog().then(setCatalog).catch(fail)
    void reload()
  }, [reload, fail])

  useEffect(() => {
    const timer = setInterval(() => void refresh(), 1500)
    return () => clearInterval(timer)
  }, [refresh])

  const notify = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const flushSave = useCallback(
    async (profile: Profile) => {
      const timer = saveTimers.current.get(profile.id)
      if (timer) {
        clearTimeout(timer)
        saveTimers.current.delete(profile.id)
      }
      try {
        setStore(await api.saveProfile(profile))
        setError(null)
      } catch (e) {
        fail(e)
      }
    },
    [fail],
  )

  const scheduleSave = useCallback(
    (profile: Profile) => {
      const existing = saveTimers.current.get(profile.id)
      if (existing) clearTimeout(existing)
      saveTimers.current.set(
        profile.id,
        setTimeout(() => {
          saveTimers.current.delete(profile.id)
          void flushSave(profile)
        }, SAVE_DEBOUNCE_MS),
      )
    },
    [flushSave],
  )

  const setEnabled = useCallback(
    async (value: boolean) => {
      try {
        await api.setEnabled(value)
        void refresh()
      } catch (e) {
        fail(e)
      }
    },
    [fail, refresh],
  )

  const saveProfile = useCallback(
    async (profile: Profile) => {
      await flushSave(profile)
    },
    [flushSave],
  )

  const createProfile = useCallback(
    async (name: string) => {
      try {
        setStore(await api.createProfile(name))
        notify(`Profile "${name}" created`)
      } catch (e) {
        fail(e)
      }
    },
    [fail, notify],
  )

  const deleteProfile = useCallback(
    async (id: string) => {
      try {
        setStore(await api.deleteProfile(id))
      } catch (e) {
        fail(e)
      }
    },
    [fail],
  )

  const setActiveProfile = useCallback(
    async (id: string) => {
      try {
        setStore(await api.setActiveProfile(id))
        notify('Active profile changed')
      } catch (e) {
        fail(e)
      }
    },
    [fail, notify],
  )

  const activeProfile = useMemo(
    () => store?.profiles.find((p) => p.id === store.active) ?? null,
    [store],
  )

  const mutateActive = useCallback(
    async (fn: (profile: Profile) => Profile) => {
      const current = storeRef.current
      const active = current?.profiles.find((p) => p.id === current.active)
      if (!active) return
      const next = fn(active)
      // Optimistic: the UI reflects the edit immediately, disk write is deferred.
      setStore((previous) =>
        previous
          ? {
              ...previous,
              profiles: previous.profiles.map((p) => (p.id === next.id ? next : p)),
            }
          : previous,
      )
      scheduleSave(next)
    },
    [scheduleSave],
  )

  const appValue = useMemo<AppContextValue>(
    () => ({
      store,
      catalog,
      error,
      toast,
      reload,
      setEnabled,
      saveProfile,
      createProfile,
      deleteProfile,
      setActiveProfile,
      activeProfile,
      mutateActive,
      notify,
    }),
    [
      store,
      catalog,
      error,
      toast,
      reload,
      setEnabled,
      saveProfile,
      createProfile,
      deleteProfile,
      setActiveProfile,
      activeProfile,
      mutateActive,
      notify,
    ],
  )

  const statusValue = useMemo<StatusContextValue>(() => ({ status, refresh }), [status, refresh])

  // Flush any pending edit when the window goes away.
  useEffect(() => {
    const handler = () => {
      const current = storeRef.current
      const active = current?.profiles.find((p) => p.id === current.active)
      if (active && saveTimers.current.has(active.id)) void flushSave(active)
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [flushSave])

  return (
    <StatusContext.Provider value={statusValue}>
      <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
    </StatusContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export function useStatus(): StatusContextValue {
  const ctx = useContext(StatusContext)
  if (!ctx) throw new Error('useStatus must be used inside AppProvider')
  return ctx
}
