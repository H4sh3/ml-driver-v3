import p5 from 'p5'
import { Gym } from './lib/gym'
import { Renderer } from './lib/render'

/**
 * @param {p5} p
 */

// main state
interface State {
  gym: Gym | undefined
  renderer: Renderer | undefined
}

export const sketch = (p: p5) => {

  let state: State = {
    gym: undefined,
    renderer: undefined,
  }

  p.setup = () => {
    p.createCanvas(1000, 1000)
    state.gym = new Gym()
    state.renderer = new Renderer(p)
    state.gym.exploration(state.renderer)
  }

  p.draw = () => {
      if (state.renderer instanceof Renderer && state.gym instanceof Gym) {

        // do one simulation step
        const rotated = state.gym.races[0].run()
        
        // render environment, agent, etc.
        state.renderer.render(state.gym, rotated)

        // if done -> reset
        if (state.gym.races[0].finished()) state.gym.races[0].reset()

      } else {
        state.renderer.renderEnvironment(state.gym.environment)
      }
  }
}
