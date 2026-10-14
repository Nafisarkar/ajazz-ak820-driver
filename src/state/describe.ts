import type { Action, Macro, Trigger } from './api'
import { modifierLabel } from './api'

export function describeTrigger(trigger: Trigger, nameOf: (vk: number) => string): string {
  switch (trigger.kind) {
    case 'vk':
      return nameOf(trigger.vk)
    case 'combo': {
      const mods = modifierLabel(trigger.mods)
      return mods ? `${mods}+${nameOf(trigger.vk)}` : nameOf(trigger.vk)
    }
  }
}

export function describeAction(
  action: Action,
  nameOf: (vk: number) => string,
  macros: Macro[],
): string {
  switch (action.kind) {
    case 'key': {
      const mods = modifierLabel(action.mods)
      return mods ? `${mods}+${nameOf(action.vk)}` : nameOf(action.vk)
    }
    case 'media':
      return `Media: ${nameOf(action.vk)}`
    case 'mouse':
      return `Mouse ${action.button}`
    case 'macro': {
      const macro = macros.find((m) => m.id === action.id)
      const play =
        action.play.kind === 'once'
          ? ''
          : action.play.kind === 'repeat'
            ? ` ×${action.play.times}`
            : ' (hold)'
      return `Macro: ${macro?.name ?? action.id}${play}`
    }
    case 'app':
      return `Open ${action.path.split(/[\\/]/).pop() ?? action.path}`
    case 'text':
      return `Text "${action.text.slice(0, 12)}${action.text.length > 12 ? '…' : ''}"`
    case 'layer':
      return `Layer ${action.layer} (hold)`
    case 'disabled':
      return 'Disabled'
  }
}
