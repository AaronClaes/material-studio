import { IconBrandGoogleDrive } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useGoogleAuth } from '../hooks/use-google-auth'

export function GoogleAuthButton() {
  const { isSignedIn, userEmail, userName, signIn, signOut } = useGoogleAuth()

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <IconBrandGoogleDrive size={16} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-col min-w-0">
            {userName && <span className="text-sm truncate">{userName}</span>}
            {userEmail && (
              <span className={`truncate text-muted-foreground ${userName ? 'text-xs' : 'text-sm'}`}>
                {userEmail}
              </span>
            )}
          </div>
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
