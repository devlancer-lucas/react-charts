import React, { Component } from 'react'
import { Connect } from 'react-state'
import { quadtree as QuadTree } from 'd3-quadtree'
//
import { NodeGroup } from './ReactMove'
import Selectors from '../utils/Selectors'

const debug = process.env.NODE_ENV === 'development'

const defaultColors = [
  '#4ab5eb',
  '#fc6868',
  '#DECF3F',
  '#60BD68',
  '#FAA43A',
  '#c63b89',
  '#1aaabe',
  '#734fe9',
  '#1828bd',
  '#cd82ad',
]

const getType = (type, data, i) => {
  // Allow dynamic types
  const typeGetter =
    typeof type === 'function' && type.prototype.isReactComponent ? () => type : type
  return typeGetter(data, i)
}

class Series extends Component {
  static defaultProps = {
    getStyles: () => ({}),
    getDataStyles: () => ({}),
  }
  componentDidMount () {
    this.updateStackData(this.props)
  }
  componentWillReceiveProps (newProps) {
    const oldProps = this.props

    // If any of the following change,
    // we need to update the stack
    if (
      newProps.materializedData !== oldProps.materializedData ||
      newProps.axes !== oldProps.axes ||
      newProps.type !== oldProps.type ||
      newProps.seriesKey !== oldProps.seriesKey ||
      newProps.primaryAxis !== oldProps.primaryAxis ||
      newProps.secondaryAxis !== oldProps.secondaryAxis
    ) {
      this.updateStackData(newProps)
    }
  }
  shouldComponentUpdate (nextProps) {
    if (nextProps.stackData !== this.props.stackData) {
      this.stackData = [...nextProps.stackData].reverse() // For proper svg stacking
      return true
    }
    return false
  }
  updateStackData (props) {
    const {
      type,
      getStyles,
      getDataStyles,
      //
      materializedData,
      primaryAxis,
      secondaryAxis,
    } = props

    // We need materializedData to proceed
    if (!materializedData) {
      return
    }

    // If the axes are not ready, just provide the materializedData
    if (!primaryAxis || !secondaryAxis) {
      return
    }

    // If the axes are ready, let's decorate the materializedData for visual plotting
    const secondaryStacked = secondaryAxis.stacked

    // Make sure we're mapping x and y to the correct axes
    const xKey = primaryAxis.vertical ? 'secondary' : 'primary'
    const yKey = primaryAxis.vertical ? 'primary' : 'secondary'
    const xAxis = primaryAxis.vertical ? secondaryAxis : primaryAxis
    const yAxis = primaryAxis.vertical ? primaryAxis : secondaryAxis
    const xScale = xAxis.scale
    const yScale = yAxis.scale

    // "totals" are kept and used for bases if secondaryAxis stacking is enabled
    const totals = {}
    if (secondaryStacked) {
      materializedData.forEach(series => {
        series.data.forEach(datum => {
          totals[datum.primary] = {
            negative: 0,
            positive: 0,
          }
        })
      })
    }

    let stackData = materializedData.map((series, seriesIndex) => {
      const SeriesComponent = getType(type, series, seriesIndex)
      if (debug && !SeriesComponent) {
        console.log(series)
        throw new Error(
          `An invalid series component was passed for the series above (index: ${seriesIndex}.`
        )
      }
      return {
        ...series,
        Component: SeriesComponent,
        data: series.data.map(d => {
          const datum = {
            ...d,
            xValue: d[xKey],
            yValue: d[yKey],
            base: 0,
          }
          if (secondaryStacked) {
            const start = totals[d.primary]
            // Stack the x or y values (according to axis positioning)
            if (primaryAxis.vertical) {
              // Should we use positive or negative base?
              const totalKey = datum.xValue >= 0 ? 'positive' : 'negative'
              // Assign the base
              datum.baseValue = start[totalKey]
              // Add the value for a total
              datum.totalValue = datum.baseValue + datum.xValue
              // Update the totals
              totals[d.primary][totalKey] = datum.totalValue
              // Make the total the new value
              datum.xValue = datum.totalValue
            } else {
              // Should we use positive or negative base?
              const totalKey = datum.yValue >= 0 ? 'positive' : 'negative'
              // Assign the base
              datum.baseValue = start[totalKey]
              // Add the value to the base
              datum.totalValue = datum.baseValue + datum.yValue
              // Update the totals
              totals[d.primary][totalKey] = datum.totalValue
              // Make the total the new value
              datum.yValue = datum.totalValue
            }
          }
          return datum
        }),
      }
    })

    // Now, scale the datapoints to their axis coordinates
    // (mutation is okay here, since we have already made a materialized copy)
    stackData.forEach((series, i) => {
      if (debug && !series.Component.plotDatum) {
        console.log(series)
        throw new Error(
          `Could not find a [SeriesType].plotDatum() static method for the series Component above (index: ${i})`
        )
      }
      series.data = series.data.map(d => {
        // Data for cartesian charts
        const result = series.Component.plotDatum(d, {
          xScale,
          yScale,
          primaryAxis,
          secondaryAxis,
          xAxis,
          yAxis,
        })

        return result || d
      })
    })

    // Not we need to precalculate all of the possible status styles by
    // calling the seemingly 'live' getStyles, and getDataStyles callbacks ;)
    stackData = stackData.map(series => {
      if (debug && !series.Component.buildStyles) {
        console.log(series)
        throw new Error(
          `Could not find a SeriesType.plotDatum() static method for the series Component above (index: ${i})`
        )
      }
      const result = series.Component.buildStyles(series, {
        getStyles,
        getDataStyles,
        defaultColors,
      })

      return result || series
    })

    const allPoints = []

    stackData.forEach(s => {
      s.data.forEach(d => {
        d.cursorPoints.forEach(p => {
          allPoints.push(p)
        })
      })
    })

    const quadTree = QuadTree()
      .x(d => d.x)
      .y(d => d.y)
      .addAll(allPoints)

    this.props.dispatch(
      state => ({
        ...state,
        stackData,
        quadTree,
      }),
      {
        type: 'stackData',
      }
    )
  }
  render () {
    const {
      type, getStyles, getDataStyles, ...rest
    } = this.props
    const { stackData } = this

    if (!stackData) {
      return null
    }

    // Force lines to render on top
    const sortedStackData = stackData.sort(a => (a.type === 'Line' ? 1 : 0))

    return (
      <NodeGroup
        data={sortedStackData}
        keyAccessor={d => d.id}
        start={() => ({
          visibility: 0,
        })}
        enter={() => ({
          visibility: [1],
        })}
        update={() => ({
          visibility: [1],
        })}
        leave={() => ({
          visibility: [0],
        })}
        duration={500}
      >
        {inters => (
          <g className="Series">
            {inters.map(inter => {
              const StackCmp = getType(type, inter.data, inter.data.id)
              return (
                <StackCmp
                  {...rest}
                  key={inter.key}
                  series={inter.data}
                  stackData={stackData}
                  visibility={inter.state.visibility}
                />
              )
            })}
          </g>
        )}
      </NodeGroup>
    )
  }
}

export default Connect(
  () => {
    const selectors = {
      primaryAxis: Selectors.primaryAxis(),
      secondaryAxis: Selectors.secondaryAxis(),
    }
    return state => ({
      materializedData: state.materializedData,
      stackData: state.stackData,
      primaryAxis: selectors.primaryAxis(state),
      secondaryAxis: selectors.secondaryAxis(state),
      hovered: state.hovered,
      selected: state.selected,
    })
  },
  {
    filter: (oldState, newState, meta) => meta.type !== 'cursor',
  }
)(Series)
