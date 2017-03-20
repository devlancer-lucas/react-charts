import React from 'react'
import now from 'performance-now'
import RAF from 'raf'
import { interpolate } from 'd3-interpolate'
import * as Easing from 'd3-ease'

const msPerFrame = 1000 / 60

const defaultEasing = 'easeCubicOut'

const TransitionMotion = React.createClass({
  getDefaultProps () {
    return {
      data: [],
      duration: 1000,
      ignore: [],
      easing: defaultEasing,
      onRest: () => null
    }
  },

  getInitialState () {
    return {
      items: []
    }
  },

  componentWillMount () {
    this.unmounting = false
    this.animationID = null
    this.prevTime = 0
    this.accumulatedTime = 0
  },

  componentDidMount () {
    this.pivot(this.props)
    this.ranFirst = true
  },

  componentWillReceiveProps (props) {
    this.pivot(props)
  },

  componentWillUnmount () {
    this.unmounting = true
    if (this.animationID != null) {
      RAF.cancel(this.animationID)
      this.animationID = null
    }
  },

  pivot (props, first) {
    const {
      getKey,
      data,
      update,
      enter,
      leave,
      easing,
      ignore
    } = props

    // Detect if we need to animate
    let noChanges = this.props.data === data

    // If this is the first time, animate regardless
    if (this.ranFirst && noChanges) {
      return
    }

    // Update the easing function
    this.easer = Easing[easing] || Easing[defaultEasing]

    // Get the original items from the current state
    const currentItems = this.state.items.map(d => ({
      ...d,
      entering: false, // Be sure to reset their status
      leaving: false
    }))

    // Get the new items with their keys and data
    const newItems = data.map((d, i) => {
      return {
        key: getKey(d, i),
        data: d
      }
    })

    // Find items that are entering
    this.enteringItems = newItems.filter(
      destItem => !currentItems.find(
        originItem => originItem.key === destItem.key
      )
    ).forEach(item => {
      item.entering = true
    })

    // Find items that are leaving
    this.leavingItems = currentItems.filter(
      originItem => !newItems.find(
        destItem => destItem.key === originItem.key
      )
    ).forEach(item => {
      item.leaving = true
    })

    // Merge all of the items together
    this.allItems = mergeItems(currentItems, newItems)

    // Used to make all the interpolators from origin to destination states
    const makeInterpolators = (originState, destState) => {
      // Make sure we interpolate new and old keys
      const allKeys = dedupe(Object.keys(originState), Object.keys(destState))
      const interpolators = {}
      allKeys.forEach(key => {
        if (ignore.indexOf(key) > -1) {
          interpolators[key] = null
          return
        }
        interpolators[key] = interpolate(originState[key], destState[key])
      })
      return interpolators
    }

    // Give each items it's proper origin/destination states
    // and corresponding interpolators
    this.allItems = this.allItems.map(item => {
      let originState
      let destState
      let interpolators

      if (item.leaving) {
        destState = leave(item.data, item.key)
        originState = item.state
        interpolators = makeInterpolators(originState, destState)
      } else if (item.entering) {
        destState = item.state || update(item.data, item.key)
        originState = enter(item.data, item.key) || destState
        interpolators = makeInterpolators(originState, destState)
      } else {
        let previous = currentItems.find(d => d.key === item.key)
        destState = update(item.data, item.key)
        originState = previous.state
        interpolators = makeInterpolators(originState, destState)
      }

      return {
        ...item,
        originState,
        destState,
        interpolators
      }
    })

    // Reset the startTime and progress
    this.startTime = now()
    this.progress = 0

    // Animate if needed
    this.animate()
  },

  animate () {
    // If we're unmounting, bail out.
    if (this.unmounting) {
      return
    }

    // If we're already animated, bail out.
    if (this.animationID) {
      return
    }

    const {
      onRest,
      duration
    } = this.props

    this.animationID = RAF((timestamp) => {
      // Double check that we are still mounted, since RAF can perform
      // asyncronously sometimes
      if (this.unmounting) {
        return
      }

      // If the animation is complete, tie up any loose ends...
      if (this.progress === 1) {
        if (this.wasAnimating) {
          onRest()
        }

        this.animationID = null
        this.wasAnimating = false
        this.accumulatedTime = 0

        // Remove the items that have exited
        this.setState(state => ({
          items: state.items.filter(item => !item.leaving)
        }))

        return
      }

      // It's time to animate!
      this.wasAnimating = true

      // Keep track of time
      let currentTime = timestamp || now()
      const timeSinceLastFrame = currentTime - this.prevTime
      this.prevTime = currentTime
      this.accumulatedTime = this.accumulatedTime + timeSinceLastFrame

      // more than 10 frames? they probably switched browser tabs
      // just carry on from this point in time
      if (this.accumulatedTime > msPerFrame * 10) {
        this.startTime = now()
        this.accumulatedTime = 0
        this.animationID = null
        this.animate()
        return
      }

      // How many milliseconds behind are we?
      const timeToCatchUp = Math.max(Math.floor(this.accumulatedTime - msPerFrame), 0)

      // Add that to the previous time and currentTime
      this.prevTime = this.prevTime + timeToCatchUp
      currentTime += timeToCatchUp

      // Set the progress percentage
      this.progress = Math.min((currentTime - this.startTime) / duration, 1)

      let newItems = this.allItems.map(item => {
        const state = {}
        const allKeys = dedupe(Object.keys(item.originState), Object.keys(item.destState))

        allKeys.forEach(key => {
          // If ignored, skip right to the value
          if (!item.interpolators[key]) {
            state[key] = item.destState[key]
          } else {
            // Otherwise, interpolate with the progress
            state[key] = item.interpolators[key](this.easer(this.progress))
          }
        })

        return {
          ...item,
          state
        }
      })

      // Mark the frame as done
      this.animationID = null
      // Reset the accumulatedTime
      this.accumulatedTime = 0

      this.setState({
        items: newItems
      })

      this.animate()
    })
  },

  render () {
    const renderedChildren = this.props.children(this.state.items)
    return renderedChildren && React.Children.only(renderedChildren)
  }
})

export default TransitionMotion

// Taken from react-motion's mergeDiff (https://github.com/chenglou/react-motion/blob/446a8d0130072c4a59fec1ab788bfc2cc5c5b788/src/mergeDiff.js)
function mergeItems (prev, next) {
  let prevKeyIndex = {}
  for (let i = 0; i < prev.length; i++) {
    prevKeyIndex[prev[i].key] = i
  }
  let nextKeyIndex = {}
  for (let i = 0; i < next.length; i++) {
    nextKeyIndex[next[i].key] = i
  }
  // Merge the arrays
  let allItems = []
  for (let i = 0; i < next.length; i++) {
    allItems[i] = next[i]
  }
  for (let i = 0; i < prev.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(nextKeyIndex, prev[i].key)) {
      allItems.push(prev[i])
    }
  }
  // now all the items all present. Core sorting logic to have the right order
  return allItems.sort(function (a, b) {
    let nextOrderA = nextKeyIndex[a.key]
    let nextOrderB = nextKeyIndex[b.key]
    let prevOrderA = prevKeyIndex[a.key]
    let prevOrderB = prevKeyIndex[b.key]
    if (nextOrderA != null && nextOrderB != null) {
      // both keys in next
      return nextKeyIndex[a.key] - nextKeyIndex[b.key]
    } else if (prevOrderA != null && prevOrderB != null) {
      // both keys in prev
      return prevKeyIndex[a.key] - prevKeyIndex[b.key]
    } else if (nextOrderA != null) {
      // key a in next, key b in prev
      // how to determine the order between a and b? We find a "pivot" (term
      // abuse), a key present in both prev and next, that is sandwiched between
      // a and b. In the context of our above example, if we're comparing a and
      // d, b's (the only) pivot
      for (let i = 0; i < next.length; i++) {
        let pivot = next[i].key
        if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
          continue
        }
        if (
          nextOrderA < nextKeyIndex[pivot] && prevOrderB > prevKeyIndex[pivot]
        ) {
          return -1
        } else if (
          nextOrderA > nextKeyIndex[pivot] && prevOrderB < prevKeyIndex[pivot]
        ) {
          return 1
        }
      }
      // pluggable. default to: next bigger than prev
      return 1
    }
    // prevOrderA, nextOrderB
    for (let i = 0; i < next.length; i++) {
      let pivot = next[i].key
      if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
        continue
      }
      if (
        nextOrderB < nextKeyIndex[pivot] && prevOrderA > prevKeyIndex[pivot]
      ) {
        return 1
      } else if (
        nextOrderB > nextKeyIndex[pivot] && prevOrderA < prevKeyIndex[pivot]
      ) {
        return -1
      }
    }
    // pluggable. default to: next bigger than prev
    return -1
  })
}

function dedupe (...arrs) {
  const allItems = arrs.reduce((a, b) => a.concat(b), [])
  for (let i = 0; i < allItems.length; ++i) {
    for (var j = i + 1; j < allItems.length; ++j) {
      if (allItems[i] === allItems[j]) {
        allItems.splice(j--, 1)
      }
    }
  }
  return allItems
}
