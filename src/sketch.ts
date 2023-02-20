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
    state.gym.exploration(state.renderer)
  }


  p.draw = () => {


    if (false) {
      p.background(255)
      state.renderer.renderEnvironment(state.gym.races[0].environment)
    } else {

      if (state.started && state.renderer instanceof Renderer && state.gym instanceof Gym) {
        p.background(255)

        if (state.gym.races[0].finished()) state.gym.races[0].reset()

        state.gym.races[0].run()
        state.renderer.renderEnvironment(state.gym.races[0].environment)

        state.gym.races[0].agents.forEach((agent, i) => {
          state.renderer.renderAgent(agent, i)
        })
        // state.renderer.renderGym(state.gym)
      } else {
        p.background(255)
        state.renderer.renderEnvironment(state.gym.environment)
      }

    }

  }
}
