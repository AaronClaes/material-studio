import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type ConfirmRemoveWorkflow = {
  onConfirm: () => void
  children: React.ReactNode
}

export function ConfirmRemoveWorkflow({
  children,
  onConfirm,
}: ConfirmRemoveWorkflow) {
  return (
    <AlertDialog>
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            workflow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type ConfirmRemoveWorkflowTrigger = React.ComponentProps<
  typeof AlertDialogTrigger
>

function ConfirmRemoveWorkflowTrigger(props: ConfirmRemoveWorkflowTrigger) {
  return <AlertDialogTrigger asChild {...props} />
}

ConfirmRemoveWorkflow.Trigger = ConfirmRemoveWorkflowTrigger
