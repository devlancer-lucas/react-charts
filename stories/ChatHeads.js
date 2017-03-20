import React, { Component } from 'react'
import _ from 'lodash'
//
import Transition from '../src/utils/Transition'
//
import CodeHighlight from './components/codeHighlight.js'

class Line extends Component {
  constructor () {
    super()
    this.state = {
      x: 250,
      y: 300
    }
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleTouchMove = this.handleTouchMove.bind(this)
  }
  componentDidMount () {
    window.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('touchmove', this.handleTouchMove)
  }
  componentWillUnmount () {
    window.removeEventListener('mousemove', this.handleMouseMove)
    window.removeEventListener('touchmove', this.handleTouchMove)
  }
  handleMouseMove ({pageX: x, pageY: y}) {
    this.setState({x, y})
  }
  handleTouchMove ({touches}) {
    this.handleMouseMove(touches[0])
  }
  render () {
    return (
      <div>
        <p>
          The "Animate" component, inspired by react-motion, can animate anything you throw at it.
        </p>

        <br />
        <br />

        <button
          onClick={() => this.setState({
            items: makeItems()
          })}
        >
          Randomize Data
        </button>

        <br />
        <br />

        <div
          style={{
            height: '500px'
          }}
        >
          <Transition
            data={_.range(6).map(d => ({x: 0, y: 0}))}
            getKey={(d, i) => i}
            // default={{
            //   scale: 0,
            //   color: 'blue',
            //   rotate: 0
            // }}
            update={d => this.state}
          >
            {data => {
              return (
                <div>
                  {data.map(({state: {x, y}}, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        width: '50px',
                        height: '50px',
                        top: '0',
                        left: '0',
                        background: 'black',
                        transform: `translate3d(${x - 25}px, ${y - 25}px, 0)`,
                        zIndex: data.length - i
                      }}
                    />
                  ))}
                </div>
              )
            }}
          </Transition>
        </div>

        <br />
        <br />

        Code:
        <CodeHighlight>{() => `
TDB
        `}</CodeHighlight>

        <br />
        <br />
      </div>
    )
  }
}

export default () => <Line />

function makeItems () {
  return _.range(5).map(d => {
    const colorNum = Math.random()
    const color = colorNum > 0.6 ? 'red' : colorNum > 0.3 ? 'gold' : 'blue'
    return {
      scale: Math.random() * 1,
      color,
      rotate: Math.random() > 0.5 ? 360 : 0
    }
  })
}
