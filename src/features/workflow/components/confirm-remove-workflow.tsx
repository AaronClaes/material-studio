import { useShallow } from 'zustand/react/shallow'
import { Badge } from '@/components/ui/badge'
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
import { useWorkflowStore } from '@/features/workflow/store/workflow-store'

type ConfirmRemoveWorkflow = {
  children: React.ReactNode
  workflowId: string
}

export function ConfirmRemoveWorkflow({
  children,
  workflowId,
}: ConfirmRemoveWorkflow) {
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow)

  const dependantWorkflows = useWorkflowStore(
    useShallow((s) => {
      const workflows = s.workflows.filter((w) => {
        return w.nodes.some(
          (n) => n.type === 'workflowNode' && n.data.workflowId === workflowId,
        )
      })

      return workflows
    }),
  )

  const hasDependantWorkflows = dependantWorkflows.length > 0
  const hasMultiple = dependantWorkflows.length > 1

  return (
    <AlertDialog>
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            workflow and all associated files including inputs, results, and run
            history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasDependantWorkflows && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {dependantWorkflows.length} other{' '}
              {hasMultiple ? 'workflows depend' : 'workflow depends'} on this
              workflow and will break.
            </p>
            <div className="flex flex-wrap gap-2">
              {dependantWorkflows.map((w) => (
                <Badge variant="destructive" key={w.id}>
                  {w.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteWorkflow(workflowId)}
          >
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
