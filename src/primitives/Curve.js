import React from 'react'
import { line, curveBasis } from 'd3-shape'
//
import Path from '../primitives/Path'
import Circle from '../primitives/Circle'

export default React.createClass({
  getDefaultProps () {
    return {
      strokeWidth: '2',
      stroke: 'royalblue',
      fill: 'transparent',
      showPoints: true
    }
  },
  render () {
    const {
      points,
      showPoints,
      ...rest
    } = this.props
    const path = line()(points)
    // const path = line().curve(curveBasis)(points)
    return (
      <g>
        <Path
          {...rest}
          d={path}
        />
        {showPoints && points.map((d, i) => (
          <Circle
            key={i}
            x={d[0]}
            y={d[1]}
          />
        ))}
      </g>
    )
  }
})
