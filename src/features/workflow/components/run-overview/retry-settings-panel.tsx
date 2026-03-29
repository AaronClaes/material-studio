import { IconRefresh } from '@tabler/icons-react'
import type { RunChainStep } from '@/features/workflow/lib/run-store'
import type { StudioNodeData } from '@/features/workflow/types'
import {
  NodeSettingsEditor,
  hasEditableSettings,
} from './node-settings-editor'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'

interface RetrySettingsPanelProps {
  /** The chain from the first selected group (used as the template). */
  chain: Array<RunChainStep>
  draftSettings: Map<string, StudioNodeData>
  originalSettings: Map<string, StudioNodeData>
  onUpdateNodeData: (nodeId: string, patch: Partial<StudioNodeData>) => void
  onResetNodeData: (nodeId: string) => void
}

export function RetrySettingsPanel({
  chain,
  draftSettings,
  originalSettings,
  onUpdateNodeData,
  onResetNodeData,
}: RetrySettingsPanelProps) {
  // Only show processing steps (not input/output nodes without meaningful settings)
  const editableSteps = chain.filter((step) =>
    hasEditableSettings(step.nodeData.kind),
  )

  if (editableSteps.length === 0) {
    return (
      <div className="w-72 border-l shrink-0 flex items-center justify-center h-full text-xs text-muted-foreground">
        No editable settings
      </div>
    )
  }

  return (
    <div className="w-72 border-l shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-xs font-semibold">Adjust Settings</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={editableSteps.map((s) => s.nodeId)}
        >
          {editableSteps.map((step) => {
            const draft = draftSettings.get(step.nodeId)
            const original = originalSettings.get(step.nodeId)
            if (!draft) return null

            const isModified =
              original && JSON.stringify(draft) !== JSON.stringify(original)

            return (
              <AccordionItem key={step.nodeId} value={step.nodeId}>
                <AccordionTrigger className="px-4 text-xs gap-2">
                  <span className="truncate flex-1 text-left">
                    {step.nodeData.label}
                  </span>
                  {isModified && (
                    <span className="text-[10px] text-primary font-normal shrink-0">
                      modified
                    </span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-2">
                  <NodeSettingsEditor
                    nodeData={draft}
                    onChange={(patch) => onUpdateNodeData(step.nodeId, patch)}
                  />
                  {isModified && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2 w-full"
                      onClick={() => onResetNodeData(step.nodeId)}
                    >
                      <IconRefresh className="size-3" />
                      Reset to original
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
  )
}
