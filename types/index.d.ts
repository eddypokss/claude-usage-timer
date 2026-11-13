export type UsageLimit = { kind: string; percentUsed: number; resetsAt?: string }
export type UsageView = { startedAt: number; now: number; limits: UsageLimit[]; usd?: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-timer': { view: Shaped<UsageView | null> }
  }
}
