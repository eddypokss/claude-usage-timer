import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { UsageLimit, UsageView } from '../types'

const PANE = 'usage-timer'
const TITLE = 'Usage timer'
const LABELS: Record<string, string> = {
  five_hour: '5-hour limit',
  seven_day: 'Weekly limit',
  spend_limit: 'Spend limit',
}
const SHORT: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

const view = atom({ plugin: 'usage-timer', key: 'view' } as const, null, { shape: 'view-1' })

function span(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(sec).padStart(2, '0')}s`
}

function bar(percent: number): string {
  const filled = Math.max(0, Math.min(20, Math.round(percent / 5)))
  return '█'.repeat(filled) + '░'.repeat(20 - filled)
}

function line(v: UsageView): string {
  const parts = [`⏱ ${span(v.now - v.startedAt)}`]
  for (const l of v.limits) {
    const reset = l.resetsAt ? ` (resets in ${span(Date.parse(l.resetsAt) - v.now)})` : ''
    parts.push(`${SHORT[l.kind] ?? l.kind} ${l.percentUsed}%${reset}`)
  }
  if (v.usd !== undefined && v.usd > 0) parts.push(`$${v.usd.toFixed(2)}`)
  return parts.join('  |  ')
}

async function tick($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const next = await update($, view, v => (v ? { ...v, now } : v))
  if (next) $.ui.status(line(next))
}

async function load($: EngineInterface): Promise<void> {
  const u = await $.session.usage()
  const now = await $.clock.now()
  const limits: UsageLimit[] = u.rateLimits.map(l => ({ ...l }))
  const usd = u.cost?.usd
  await update($, view, () => ({ startedAt: u.startedAt, now, limits, usd }))
}

export const register: Register = on => {
  let ticker: Timer | undefined
  let refresher: Timer | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    ticker?.cancel()
    refresher?.cancel()
    await $.command.register({ name: 'usage-timer', description: 'Open the Usage timer pane' })
    await load($)
    await tick($)
    ticker = $.clock.every(1000, () => void tick($))
    refresher = $.clock.every(60_000, () => void load($))
    void $.ui.open({ id: PANE, title: TITLE })
    return result
  })

  on('command.run', { command: 'usage-timer' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Usage timer pane opened.' }
  })

  on('session.measure', async ($, e, next) => {
    const limits: UsageLimit[] = e.rateLimits.map(l => ({ ...l }))
    const usd = e.cost?.usd
    await update($, view, v => (v ? { ...v, limits, usd } : v))
    await tick($)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const v = await read($, view)
    if (!v) return <Text dimColor>Starting…</Text>

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text dimColor>Session time</Text>
          <Text bold>⏱ {span(v.now - v.startedAt)}</Text>
        </Box>
        {v.limits.length === 0 && (
          <Text dimColor>Usage limits appear after Claude's next reply.</Text>
        )}
        {v.limits.map(l => (
          <Box flexDirection="column">
            <Text dimColor>{LABELS[l.kind] ?? l.kind}</Text>
            <Text color={l.percentUsed >= 90 ? 'red' : l.percentUsed >= 70 ? 'yellow' : 'green'}>
              {bar(l.percentUsed)} {l.percentUsed}%
            </Text>
            {l.resetsAt && (
              <Text dimColor>Resets in {span(Date.parse(l.resetsAt) - v.now)}</Text>
            )}
          </Box>
        ))}
        {v.usd !== undefined && v.usd > 0 && (
          <Box flexDirection="column">
            <Text dimColor>Session cost</Text>
            <Text>${v.usd.toFixed(2)}</Text>
          </Box>
        )}
      </Box>
    )
  })
}
