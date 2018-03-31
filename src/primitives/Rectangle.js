import React, { PureComponent } from 'react'
//
import { Animate } from '../components/ReactMove'

const defaultStyle = {
  strokeWidth: 0,
  fill: '#333',
  opacity: 1,
  rx: 0,
  ry: 0,
}

export default class Rectangle extends PureComponent {
  static defaultProps = {
    opacity: 1,
  }
  render () {
    const {
      style, opacity, x1, y1, x2, y2, ...rest
    } = this.props

    const resolvedStyle = {
      ...defaultStyle,
      ...style,
    }

    const updateResolvedStyle = {}
    Object.keys(resolvedStyle).forEach(key => {
      updateResolvedStyle[key] = [resolvedStyle[key]]
    })

    const xStart = Math.min(x1, x2)
    const yStart = Math.min(y1, y2)
    const xEnd = Math.max(x1, x2)
    const yEnd = Math.max(y1, y2)

    const height = Math.max(yEnd - yStart, 0)
    const width = Math.max(xEnd - xStart, 0)

    return (
      <Animate start={resolvedStyle} update={updateResolvedStyle}>
        {inter => (
          <rect
            {...rest}
            x={xStart}
            y={yStart}
            width={width}
            height={height}
            style={{
              ...inter,
              opacity: opacity * inter.opacity,
            }}
          />
        )}
      </Animate>
    )
  }
}
