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
    console.log("setup start")
    // Define your initial environment props & other stuff here
    p.createCanvas(750, 1000)
    state.gym = new Gym()
    state.renderer = new Renderer(p)

    console.log("setup end")
    const button = p.createButton("Stop training")
    button.position(10, 10)
    button.mousePressed(() => {
      state.gym.toggleTrainning()
    })

    const trackButton = p.createButton("Change track")
    trackButton.position(110, 10)
    trackButton.mousePressed(() => {
      state.gym.environment.initRandomTrack()
    })

    const startButton = p.createButton("Start")
    startButton.position(210, 10)
    startButton.mousePressed(() => {
      state.started = !state.started
    })
    p.frameRate(120)
  }


  p.draw = () => {


    if (false) {
      p.background(255)
      state.renderer.renderEnvironment(state.gym.environment)
    } else {

      if (state.started && state.renderer instanceof Renderer && state.gym instanceof Gym) {

        const finished = state.gym.exploration(state.renderer)

        if (finished) {
          state.gym.run(false)
          state.renderer.renderEnvironment(state.gym.environment)
          state.renderer.renderAgent(state.gym.agent)
          state.renderer.renderGym(state.gym)

          if (state.gym.finished()) {
            console.log(`Score: ${state.gym.agent.score}`)
            state.gym.reset()
          }
        }
      } else {
        p.background(255)
        state.renderer.renderEnvironment(state.gym.environment)
      }
    }

  }
}
