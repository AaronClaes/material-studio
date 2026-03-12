import { create } from 'zustand'
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../lib/config'
import { loadGoogleScripts } from '../lib/load-google-scripts'

interface GoogleAuthState {
  accessToken: string | null
  expiresAt: number | null
  userEmail: string | null
  isSignedIn: boolean
  signIn: () => Promise<void>
  signOut: () => void
}

export const useGoogleAuthStore = create<GoogleAuthState>((set, get) => ({
  accessToken: null,
  expiresAt: null,
  userEmail: null,
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

          // Fetch user email from tokeninfo
          let userEmail: string | null = null
          try {
            const res = await fetch(
              `https://www.googleapis.com/oauth2/v3/userinfo`,
              { headers: { Authorization: `Bearer ${response.access_token}` } },
            )
            if (res.ok) {
              const info = await res.json()
              userEmail = info.email ?? null
            }
          } catch {}

          set({
            accessToken: response.access_token,
            expiresAt,
            userEmail,
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
      isSignedIn: false,
    })
  },
}))

export function isTokenValid(): boolean {
  const { expiresAt, accessToken } = useGoogleAuthStore.getState()
  return !!accessToken && !!expiresAt && expiresAt > Date.now()
}
