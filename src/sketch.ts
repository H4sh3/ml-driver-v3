import p5 from 'p5'
import { Gym } from './lib/gym'
import { Renderer } from './lib/render'

/**
 * @param {p5} p
 */

interface State {
  gym: Gym | undefined
  renderer: Renderer | undefined
  started: boolean
}

export const sketch = (p: p5) => {

  let state: State = {
    gym: undefined,
    renderer: undefined,
    started: true
  }

  p.setup = () => {
    // Define your initial environment props & other stuff here
    p.createCanvas(750, 1000)
    state.gym = new Gym()
    state.renderer = new Renderer(p)

    const button = p.createButton("Stop training")
    button.position(10, 10)
    const trackButton = p.createButton("reset")
    trackButton.position(110, 10)
    trackButton.mousePressed(() => {
      state.gym.race.reset()
    })

    const startButton = p.createButton("Start")
    startButton.position(210, 10)
    startButton.mousePressed(() => {
      state.started = !state.started
    })

    state.gym.exploration(state.renderer)
  }


  p.draw = () => {


    if (false) {
      p.background(255)
      state.renderer.renderEnvironment(state.gym.environment)
    } else {

      if (state.started && state.renderer instanceof Renderer && state.gym instanceof Gym) {
        p.background(255)
        state.gym.race.run()
        state.renderer.renderEnvironment(state.gym.race.environment)

        for (let agent of state.gym.race.agents) {
          state.renderer.renderAgent(agent)
        }
        // state.renderer.renderGym(state.gym)
      } else {
        p.background(255)
        state.renderer.renderEnvironment(state.gym.environment)
      }

    }

  }
}
