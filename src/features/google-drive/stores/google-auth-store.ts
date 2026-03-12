import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../lib/config'
import { loadGoogleScripts } from '../lib/load-google-scripts'

interface GoogleAuthState {
  accessToken: string | null
  expiresAt: number | null
  userEmail: string | null
  userName: string | null
  isSignedIn: boolean
  signIn: () => Promise<void>
  signOut: () => void
}

export const useGoogleAuthStore = create<GoogleAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      userEmail: null,
      userName: null,
      isSignedIn: false,

      signIn: async () => {
        await loadGoogleScripts()

        return new Promise<void>((resolve, reject) => {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            callback: async (response) => {
              if (response.error) {
                reject(new Error(response.error))
                return
              }

              const expiresAt = Date.now() + response.expires_in * 1000

              let userEmail: string | null = null
              let userName: string | null = null
              try {
                const res = await fetch(
                  `https://www.googleapis.com/oauth2/v3/userinfo`,
                  { headers: { Authorization: `Bearer ${response.access_token}` } },
                )
                if (res.ok) {
                  const info = await res.json()
                  userEmail = info.email ?? null
                  userName = info.name ?? null
                }
              } catch {}

              set({
                accessToken: response.access_token,
                expiresAt,
                userEmail,
                userName,
                isSignedIn: true,
              })
              resolve()
            },
            error_callback: (error) => {
              reject(new Error(error.message))
            },
          })

          client.requestAccessToken()
        })
      },

      signOut: () => {
        const { accessToken } = get()
        if (accessToken) {
          google.accounts.oauth2.revoke(accessToken)
        }
        set({
          accessToken: null,
          expiresAt: null,
          userEmail: null,
          userName: null,
          isSignedIn: false,
        })
      },
    }),
    {
      name: 'google-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        userEmail: state.userEmail,
        userName: state.userName,
        isSignedIn: state.isSignedIn,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.expiresAt && state.expiresAt <= Date.now()) {
          state.accessToken = null
          state.expiresAt = null
          state.isSignedIn = false
        }
      },
    },
  ),
)

export function isTokenValid(): boolean {
  const { expiresAt, accessToken } = useGoogleAuthStore.getState()
  return !!accessToken && !!expiresAt && expiresAt > Date.now()
}
