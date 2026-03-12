import { useGoogleAuthStore } from '../stores/google-auth-store'

export function useGoogleAuth() {
  const isSignedIn = useGoogleAuthStore((s) => s.isSignedIn)
  const userEmail = useGoogleAuthStore((s) => s.userEmail)
  const accessToken = useGoogleAuthStore((s) => s.accessToken)
  const signIn = useGoogleAuthStore((s) => s.signIn)
  const signOut = useGoogleAuthStore((s) => s.signOut)

  return { isSignedIn, userEmail, accessToken, signIn, signOut }
}
