import p5 from 'p5'
import { Gym } from './lib/gym'
import { Renderer } from './lib/render'

/**
 * @param {p5} p
 */

interface State {
  gym: Gym | undefined
  renderer: Renderer | undefined
}

export const sketch = (p: p5) => {

  let state: State = {
    gym: undefined,
    renderer: undefined
  }

  p.setup = () => {
    console.log("setup start")
    // Define your initial environment props & other stuff here
    p.createCanvas(500, 500)
    state.gym = new Gym()
    state.renderer = new Renderer(p)

    state.gym.exploration()
    state.gym.runEvaluation()
    console.log("setup end")
  }


  p.draw = () => {
    p.background(120)
    if (state.renderer instanceof Renderer && state.gym instanceof Gym) {
      state.gym.run()
      state.renderer.renderEnvironment(state.gym.environment)
      state.renderer.renderAgent(state.gym.agent)
      state.renderer.renderGym(state.gym)
    }
  }
}
