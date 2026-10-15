import { cn } from '@/lib/utils'

// Same wordmark as the main Propalyst site header (propalyst/src/components/site/site-header.tsx)
const SIZES = {
    sm: { name: 'text-xl', tagline: 'text-[0.625rem]' },
    lg: { name: 'text-6xl', tagline: 'text-sm' },
}

export function PropalystLogo({ size = 'sm', className }: { size?: keyof typeof SIZES; className?: string }) {
    const s = SIZES[size]
    return (
        <span className={cn('inline-block leading-tight', className)}>
            <span className={cn('block font-bold tracking-tight text-foreground', s.name)}>Propalyst</span>
            <span className={cn('block text-muted-foreground', s.tagline)}>
                Powered by <span className="font-medium text-[#f87171]">RealBroker</span>
            </span>
        </span>
    )
}
