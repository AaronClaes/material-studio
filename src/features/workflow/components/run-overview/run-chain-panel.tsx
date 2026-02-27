import { useCallback, useMemo, useState } from 'react'
import { IconChevronsDown, IconChevronsUp } from '@tabler/icons-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { RunResultItem } from '@/features/workflow/lib/run-store'

interface RunChainPanelProps {
  activeItem: RunResultItem | null
  selectedStepId: string | null
  onSelectStep: (stepId: string) => void
}

export function RunChainPanel({
  activeItem,
  selectedStepId,
  onSelectStep,
}: RunChainPanelProps) {
  const [accordionValue, setAccordionValue] = useState<Array<string>>([])

  const allStepIds = useMemo(
    () => activeItem?.chain.map((s) => s.nodeId) ?? [],
    [activeItem],
  )
  const openAll = useCallback(() => setAccordionValue(allStepIds), [allStepIds])
  const closeAll = useCallback(() => setAccordionValue([]), [])

  if (!activeItem) {
    return (
      <div className="w-72 border-l shrink-0 flex items-center justify-center h-full text-xs text-muted-foreground">
        Select a result
      </div>
    )
  }

  return (
    <div className="w-72 border-l shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-end border-b p-1 gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={openAll}
        >
          <IconChevronsDown className="size-3" />
          Open All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={closeAll}
        >
          <IconChevronsUp className="size-3" />
          Close All
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          {activeItem.chain.map((step) => {
            const isSelected =
              step.nodeId ===
              (selectedStepId ?? activeItem.chain.at(-1)?.nodeId)
            return (
              <AccordionItem
                key={step.nodeId}
                value={step.nodeId}
                className={cn(
                  'border-l-2 transition-colors',
                  isSelected
                    ? 'border-l-primary'
                    : 'border-l-transparent',
                )}
              >
                <AccordionTrigger className="px-4 text-xs gap-2">
                  <span className="truncate">
                    {step.nodeData.label}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-2">
                  {step.outputDataUrl && (
                    <div className="relative group">
                      <img
                        src={step.outputDataUrl}
                        alt={step.nodeData.label}
                        className="w-full aspect-square object-cover border "
                      />
                      {selectedStepId === step.nodeId ? null : (
                        <div
                          onClick={() => onSelectStep(step.nodeId)}
                          className="absolute cursor-default top-0 left-0 w-full h-full bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition group-hover:transition-opacity"
                        >
                          <p className="text-sm text-white">
                            View image
                          </p>
                        </div>
                      )}
                    </div>
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
