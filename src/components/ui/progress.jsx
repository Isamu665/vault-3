"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"
import { useAppReady } from "@/lib/appReady"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => {
  const { ready } = useAppReady();
  const [displayValue, setDisplayValue] = React.useState(0);
  React.useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => setDisplayValue(value || 0));
    return () => cancelAnimationFrame(id);
  }, [value, ready]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}>
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${100 - (displayValue || 0)}%)` }} />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }