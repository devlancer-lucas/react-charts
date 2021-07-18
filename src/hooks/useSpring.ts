import React from 'react'
import { Spring } from '../utils/spring'
import useGetLatest from './useGetLatest'

export function useSpring(
  value: number,
  config: [number, number, number],
  cb: (x: number) => void,
  immediate?: boolean,
  debug?: boolean
) {
  const springRef = React.useRef(new Spring(value, ...config))
  const getValue = useGetLatest(value)

  const [startRaf, stopRaf] = useRaf(() => {
    cb(springRef.current.x())
    return springRef.current.done()
  })

  // Immediate
  React.useEffect(() => {
    if (immediate) {
      springRef.current.snap(getValue())
      startRaf()
      return
    }
    springRef.current.setEnd(value)
    startRaf()
  }, [debug, getValue, immediate, startRaf, stopRaf, value])

  React.useEffect(() => {
    return () => {
      stopRaf()
    }
  }, [stopRaf])

  return springRef.current
}

export function useRaf(callback: () => any) {
  const raf = React.useRef<number | null>(null)
  const rafCallback = React.useRef(callback)
  rafCallback.current = callback
  const tick = React.useCallback(() => {
    if (rafCallback.current()) return
    raf.current = requestAnimationFrame(tick)
  }, [])

  return [
    React.useMemo(() => tick, [tick]),
    React.useMemo(
      () => () => raf.current && cancelAnimationFrame(raf.current),
      []
    ),
  ]
}
