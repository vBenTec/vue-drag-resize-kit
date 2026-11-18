import { describe, expectTypeOf, it } from 'vitest'
import type { Ref } from 'vue'

import {
  DraggableContainer,
  DraggableResizable,
  type BoundaryTarget,
  type DraggableContainerProps,
  type DraggableResizableEmits,
  type DraggableResizableProps,
  type DragPayload,
  type FlowAnchor,
  type KeyboardMode,
  type LayoutMode,
  type LogicalResizeHandle,
  type PhysicalResizeHandle,
  type Rect,
  type ResizeHandle,
  type ResizePayload,
  type ResizeToSize,
  type ToolbarPlacement,
  type ToolbarSlotProps,
} from './index'

type Props = InstanceType<typeof DraggableResizable>['$props']
type ContainerProps = InstanceType<typeof DraggableContainer>['$props']

describe('ResizeHandle', () => {
  it('accepts the eight physical and the six logical handles only', () => {
    expectTypeOf<PhysicalResizeHandle>().toEqualTypeOf<
      'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br'
    >()
    expectTypeOf<LogicalResizeHandle>().toEqualTypeOf<'ts' | 'te' | 'ms' | 'me' | 'bs' | 'be'>()
    expectTypeOf<ResizeHandle>().toEqualTypeOf<PhysicalResizeHandle | LogicalResizeHandle>()
    expectTypeOf<''>().not.toExtend<ResizeHandle>()
    expectTypeOf<'top'>().not.toExtend<ResizeHandle>()
    expectTypeOf<'ss'>().not.toExtend<ResizeHandle>()
  })
})

describe('DraggableResizable', () => {
  it('types its props', () => {
    expectTypeOf<Props['handles']>().toEqualTypeOf<readonly ResizeHandle[] | undefined>()
    expectTypeOf<Props['parent']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Props['layout']>().toEqualTypeOf<LayoutMode | undefined>()
    expectTypeOf<Props['layout']>().toEqualTypeOf<'absolute' | 'flow' | undefined>()
    expectTypeOf<Props['boundary']>().toEqualTypeOf<BoundaryTarget | undefined>()
    expectTypeOf<string>().toExtend<BoundaryTarget>()
    expectTypeOf<HTMLElement>().toExtend<BoundaryTarget>()
    expectTypeOf<Ref<HTMLElement | null>>().toExtend<BoundaryTarget>()
    expectTypeOf<() => HTMLElement | null>().toExtend<BoundaryTarget>()
    expectTypeOf<Props['minW']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['maxW']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['maxH']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['classNameHandle']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Props['flowAnchor']>().toEqualTypeOf<FlowAnchor | undefined>()
    expectTypeOf<FlowAnchor>().toEqualTypeOf<'auto' | 'start' | 'end' | 'center' | 'none'>()
    expectTypeOf<Props['hideAnchoredHandles']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Props['keyboard']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Props['keyboardStep']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['keyboardMode']>().toEqualTypeOf<KeyboardMode | undefined>()
    expectTypeOf<KeyboardMode>().toEqualTypeOf<'move' | 'resize'>()
    expectTypeOf<Props['ariaRoleDescription']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Props['ariaSizeText']>().toEqualTypeOf<
      ((w: number, h: number) => string) | undefined
    >()
    expectTypeOf<Props['toolbarLabel']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Props['toolbarPlacement']>().toEqualTypeOf<ToolbarPlacement | undefined>()
    expectTypeOf<ToolbarPlacement>().toEqualTypeOf<'bottom' | 'top' | 'auto'>()
    expectTypeOf<Props['ignoreOutside']>().toEqualTypeOf<
      ((target: Element) => boolean) | undefined
    >()
    expectTypeOf<Props>().toExtend<DraggableResizableProps>()
  })

  it('types its models', () => {
    expectTypeOf<Props['x']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['y']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['w']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['h']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Props['active']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<NonNullable<Props['onUpdate:x']>>().parameters.toEqualTypeOf<[value: number]>()
    expectTypeOf<NonNullable<Props['onUpdate:active']>>().parameters.toEqualTypeOf<
      [value: boolean]
    >()
  })

  it('types its event payloads', () => {
    expectTypeOf<DragPayload>().toEqualTypeOf<{ x: number; y: number }>()
    expectTypeOf<ResizePayload>().toEqualTypeOf<Rect>()
    expectTypeOf<Rect>().toMatchObjectType<{ x: number; y: number; w: number; h: number }>()

    expectTypeOf<NonNullable<Props['onActivated']>>().parameters.toEqualTypeOf<[]>()
    expectTypeOf<NonNullable<Props['onDeactivated']>>().parameters.toEqualTypeOf<[]>()
    expectTypeOf<NonNullable<Props['onDrag-start']>>().parameters.toEqualTypeOf<
      [payload: DragPayload]
    >()
    expectTypeOf<NonNullable<Props['onDragging']>>().parameters.toEqualTypeOf<
      [payload: DragPayload]
    >()
    expectTypeOf<NonNullable<Props['onDrag-end']>>().parameters.toEqualTypeOf<
      [payload: DragPayload]
    >()
    expectTypeOf<NonNullable<Props['onResize-start']>>().parameters.toEqualTypeOf<
      [payload: ResizePayload]
    >()
    expectTypeOf<NonNullable<Props['onResizing']>>().parameters.toEqualTypeOf<
      [payload: ResizePayload]
    >()
    expectTypeOf<NonNullable<Props['onResize-end']>>().parameters.toEqualTypeOf<
      [payload: ResizePayload]
    >()

    expectTypeOf<DraggableResizableEmits['resize-end']>().toEqualTypeOf<[payload: ResizePayload]>()
  })

  it('types the toolbar slot and the exposed resizeTo', () => {
    type Instance = InstanceType<typeof DraggableResizable>
    expectTypeOf<Parameters<NonNullable<Instance['$slots']['toolbar']>>>().toEqualTypeOf<
      [props: ToolbarSlotProps]
    >()
    expectTypeOf<ToolbarSlotProps['rect']>().toEqualTypeOf<Rect>()
    expectTypeOf<ToolbarSlotProps['gesture']>().toEqualTypeOf<'drag' | 'resize' | null>()
    expectTypeOf<ToolbarSlotProps['deactivate']>().toEqualTypeOf<() => void>()
    expectTypeOf<ToolbarSlotProps['resizeTo']>().toEqualTypeOf<(size: ResizeToSize) => void>()
    expectTypeOf<Instance['resizeTo']>().toEqualTypeOf<(size: ResizeToSize) => void>()

    expectTypeOf<{ w: number }>().toExtend<ResizeToSize>()
    expectTypeOf<{ h: number }>().toExtend<ResizeToSize>()
    expectTypeOf<{ w: number; h: number }>().toExtend<ResizeToSize>()
    expectTypeOf<{}>().not.toExtend<ResizeToSize>()
    expectTypeOf<{ w: string }>().not.toExtend<ResizeToSize>()
  })

  it('rejects wrong prop types', () => {
    expectTypeOf<{ handles: ['tl', ''] }>().not.toExtend<Props>()
    expectTypeOf<{ handles: string[] }>().not.toExtend<Props>()
    expectTypeOf<{ handles: ['te', 'me', 'be'] }>().toExtend<Props>()
    expectTypeOf<{ flowAnchor: 'left' }>().not.toExtend<Props>()
    expectTypeOf<{ keyboardMode: 'scale' }>().not.toExtend<Props>()
    expectTypeOf<{ toolbarPlacement: 'left' }>().not.toExtend<Props>()
    expectTypeOf<{ ignoreOutside: true }>().not.toExtend<Props>()
    expectTypeOf<{ parent: 'yes' }>().not.toExtend<Props>()
    expectTypeOf<{ layout: 'inline' }>().not.toExtend<Props>()
    expectTypeOf<{ boundary: 42 }>().not.toExtend<Props>()
    expectTypeOf<{ x: '10' }>().not.toExtend<Props>()
    expectTypeOf<{ 'onDrag-end': (event: MouseEvent) => void }>().not.toExtend<Props>()
  })
})

describe('DraggableContainer', () => {
  it('types its props', () => {
    expectTypeOf<ContainerProps['guidesX']>().toEqualTypeOf<readonly number[] | undefined>()
    expectTypeOf<ContainerProps['guideColor']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<ContainerProps>().toExtend<DraggableContainerProps>()
    expectTypeOf<{ guidesY: string[] }>().not.toExtend<ContainerProps>()
  })
})
