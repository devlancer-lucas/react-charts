import React from 'react'
import RAF from 'raf'

export default {
  requestAnimationFrame: RAF,
  throttle,
  seriesStatus,
  datumStatus,
  getStatusStyles,
  getStatusStyle,
  getMultiFocus,
  getClosestPoint,
  normalizeComponent,
  materializeStyles,
  normalizeGetter,
  normalizePathGetter,
  get,
  mapValues,
  uniq,
  groupBy,
  orderBy,
  isArray,
}

function throttle (func) {
  let running
  return (...args) => {
    if (running) return
    running = RAF(() => {
      func(...args)
      running = false
    })
  }
}

function seriesStatus (series, hovered, selected) {
  const status = {
    selected: false,
    hovered: false,
    otherSelected: false,
    otherHovered: false,
  }
  if (selected && selected.active && selected.series) {
    status.selected = selected.series.id === series.id
    status.otherSelected = !status.selected
  }
  if (hovered && hovered.active && hovered.series) {
    status.hovered = hovered.series.id === series.id
    status.otherHovered = !status.hovered
  }

  return status
}

function datumStatus (series, datum, hovered, selected) {
  const status = {
    selected: false,
    hovered: false,
    otherSelected: false,
    otherHovered: false,
  }

  let d
  if (selected && selected.active && selected.datums) {
    for (let i = 0; i < selected.datums.length; i++) {
      d = selected.datums[i]
      if (d.seriesID === series.id && d.index === datum.index) {
        status.selected = true
        break
      }
    }
    status.otherSelected = !status.selected
  }
  if (hovered && hovered.active && hovered.datums) {
    for (let i = 0; i < hovered.datums.length; i++) {
      d = hovered.datums[i]
      if (d.seriesID === series.id && d.index === datum.index) {
        status.hovered = true
        break
      }
    }
    status.otherHovered = !status.hovered
  }

  return status
}

function getStatusStyles (item, decorator, defaults = {}) {
  const styles = {
    default: decorator(item),
    selected: decorator({
      ...item,
      selected: true,
    }),
    selectedHovered: decorator({
      ...item,
      selected: true,
      hovered: true,
    }),
    selectedOtherHovered: decorator({
      ...item,
      selected: true,
      otherHovered: true,
    }),
    otherSelected: decorator({
      ...item,
      otherSelected: true,
    }),
    otherSelectedHovered: decorator({
      ...item,
      otherSelected: true,
      hovered: true,
    }),
    otherSelectedOtherHovered: decorator({
      ...item,
      otherHovered: true,
      otherSelected: true,
    }),
    hovered: decorator({
      ...item,
      hovered: true,
    }),
    otherHovered: decorator({
      ...item,
      otherHovered: true,
    }),
  }
  Object.keys(styles).forEach(key => {
    styles[key] = materializeStyles(styles[key], defaults)
  })
  return styles
}

function getStatusStyle (status, styles) {
  if (status.selected) {
    if (status.hovered) {
      return styles.selectedHovered
    }
    return styles.selected
  }
  if (status.hovered) {
    return styles.hovered
  }
  return styles.default
}

function getMultiFocus ({
  focus, points, gridX, gridY, gridWidth, gridHeight, width, height,
}) {
  const invalid = () => {
    throw new Error(
      `${JSON.stringify(
        focus
      )} is not a valid tooltip focus option. You should use a single focus option or 2 non-conflicting focus options.`
    )
  }

  let x
  let y

  let xMin = points[0].focus.x
  let xMax = points[0].focus.x
  let yMin = points[0].focus.y
  let yMax = points[0].focus.y

  points.forEach(point => {
    xMin = Math.min(point.focus.x, xMin)
    xMax = Math.max(point.focus.x, xMax)
    yMin = Math.min(point.focus.y, yMin)
    yMax = Math.max(point.focus.y, yMax)
  })

  if (focus.length > 2) {
    return invalid()
  }

  focus = focus.sort(a => (a.includes('center') || a.includes('Center') ? 1 : -1))

  for (let i = 0; i < focus.length; i++) {
    const focusPart = focus[i]

    // Horizontal Positioning
    if (['left', 'right', 'gridLeft', 'gridRight', 'chartLeft', 'chartRight'].includes(focusPart)) {
      if (typeof x !== 'undefined') {
        invalid()
      }
      if (focusPart === 'left') {
        x = xMin
      } else if (focusPart === 'right') {
        x = xMax
      } else if (focusPart === 'gridLeft') {
        x = gridX
      } else if (focusPart === 'gridRight') {
        x = gridX + gridWidth
      } else if (focusPart === 'chartLeft') {
        x = 0
      } else if (focusPart === 'chartRight') {
        x = width
      } else {
        invalid()
      }
    }

    // Vertical Positioning
    if (['top', 'bottom', 'gridTop', 'gridBottom', 'chartTop', 'chartBottom'].includes(focusPart)) {
      if (typeof y !== 'undefined') {
        invalid()
      }
      if (focusPart === 'top') {
        y = yMin
      } else if (focusPart === 'bottom') {
        y = yMax
      } else if (focusPart === 'gridTop') {
        y = gridY
      } else if (focusPart === 'gridBottom') {
        y = gridY + gridHeight
      } else if (focusPart === 'chartTop') {
        y = 0
      } else if (focusPart === 'chartBottom') {
        y = height
      } else {
        invalid()
      }
    }

    // Center Positioning
    if (['center', 'gridCenter', 'chartCenter'].includes(focusPart)) {
      if (focusPart === 'center') {
        if (typeof y === 'undefined') {
          y = (yMin + yMax) / 2
        }
        if (typeof x === 'undefined') {
          x = (xMin + xMax) / 2
        }
      } else if (focusPart === 'gridCenter') {
        if (typeof y === 'undefined') {
          y = gridY + gridHeight / 2
        }
        if (typeof x === 'undefined') {
          x = gridX + gridWidth / 2
        }
      } else if (focusPart === 'chartCenter') {
        if (typeof y === 'undefined') {
          y = height / 2
        }
        if (typeof x === 'undefined') {
          x = width / 2
        }
      } else {
        invalid()
      }
    }

    // Auto center the remainder if there is only one focusPart listed
    if (focus.length === 1) {
      if (focus[0].includes('grid')) {
        focus.push('gridCenter')
      } else if (focus[0].includes('chart')) {
        focus.push('chartCenter')
      } else {
        focus.push('center')
      }
    }
  }

  return { x, y }
}

function getClosestPoint (position, datums) {
  if (!datums || !position || !datums.length) {
    return
  }
  let closestDistance = Infinity
  let closestDatum = datums[0]
  datums.forEach(datum => {
    datum.cursorPoints.forEach(cursorPoint => {
      const distance = Math.sqrt(
        (cursorPoint.x - position.x) ** 2 + (cursorPoint.y - position.y) ** 2
      )
      if (distance < closestDistance) {
        closestDistance = distance
        closestDatum = datum
      }
    })
  })
  return closestDatum
}

function normalizeComponent (Comp, params = {}, fallback = Comp) {
  return typeof Comp === 'function' ? (
    Object.getPrototypeOf(Comp).isReactComponent ? (
      <Comp {...params} />
    ) : (
      Comp(params)
    )
  ) : (
    fallback
  )
}

function materializeStyles (style = {}, defaults = {}) {
  style = {
    ...style,
    stroke: style.stroke || style.color || defaults.stroke || defaults.color,
    fill: style.fill || style.color || defaults.fill || defaults.color,
  };
  ['area', 'line', 'rectangle', 'circle'].forEach(type => {
    style[type] = style[type] ? materializeStyles(style[type], defaults) : {}
  })
  return style
}

function normalizeGetter (getter) {
  if (!getter) {
    return
  }
  if (typeof getter === 'function') {
    return getter
  }
  return () => getter
}

function normalizePathGetter (getter) {
  if (typeof getter === 'function') {
    return getter
  }
  return d => get(d, getter)
}

function get (obj, path, def) {
  if (typeof obj === 'function') {
    try {
      return obj()
    } catch (e) {
      return path
    }
  }
  if (!path) {
    return obj
  }
  const pathObj = makePathArray(path)
  let val
  try {
    val = pathObj.reduce((current, pathPart) => current[pathPart], obj)
  } catch (e) {
    // do nothing
  }
  return typeof val !== 'undefined' ? val : def
}

function mapValues (obj, cb) {
  const newObj = {}
  Object.keys(obj).forEach(key => {
    newObj[key] = cb(obj[key], key, obj)
  })
  return newObj
}

function uniq (arr) {
  return arr.filter(d => arr.filter(dd => dd === d).length === 1)
}

function groupBy (xs, key) {
  return xs.reduce((rv, x, i) => {
    const resKey = typeof key === 'function' ? key(x, i) : x[key]
    rv[resKey] = isArray(rv[resKey]) ? rv[resKey] : []
    rv[resKey].push(x)
    return rv
  }, {})
}

function orderBy (arr, funcs, dirs = []) {
  funcs = isArray(funcs) ? funcs : [funcs]
  return arr.sort((a, b) => {
    for (let i = 0; i < funcs.length; i++) {
      const comp = funcs[i]
      const ca = comp(a)
      const cb = comp(b)
      const desc = dirs[i] === false || dirs[i] === 'desc'
      if (ca > cb) {
        return desc ? -1 : 1
      }
      if (ca < cb) {
        return desc ? 1 : -1
      }
    }
    return dirs[0] ? a.__index - b.__index : b.__index - b.__index
  })
}

function isArray (a) {
  return Array.isArray(a)
}

// ########################################################################
// Non-exported Helpers
// ########################################################################

function makePathArray (obj) {
  return flattenDeep(obj)
    .join('.')
    .replace('[', '.')
    .replace(']', '')
    .split('.')
}

function flattenDeep (arr, newArr = []) {
  if (!isArray(arr)) {
    newArr.push(arr)
  } else {
    for (let i = 0; i < arr.length; i++) {
      flattenDeep(arr[i], newArr)
    }
  }
  return newArr
}
