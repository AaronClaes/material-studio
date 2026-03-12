import { IconBrandGoogleDrive } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useGoogleAuth } from '../hooks/use-google-auth'

export function GoogleAuthButton() {
  const { isSignedIn, userEmail, signIn, signOut } = useGoogleAuth()

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <IconBrandGoogleDrive size={16} className="shrink-0 text-muted-foreground" />
          <span className="text-sm truncate">{userEmail}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" className="gap-2 w-full" onClick={signIn}>
      <IconBrandGoogleDrive size={16} />
      Connect Google Drive
    </Button>
  )
}
