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
    p.createCanvas(2000, 2000)

    let button = p.createButton('delete stored brain');
    button.position(0, 0);
    button.mousePressed(()=>{
      localStorage.clear()
    })

    state.gym = new Gym()
    state.renderer = new Renderer(p)
  }
  
  p.draw = () => {

    if(state.gym.exploring){
      state.gym.exploration(state.renderer)
      state.renderer.renderLogs(state.gym)
    }else{
   
      if (state.renderer instanceof Renderer && state.gym instanceof Gym) {
        
        // do one simulation step
        const rotated = state.gym.races[0].run()
        
        // render environment, agent, etc.
        state.renderer.render(state.gym, rotated)
        
        state.renderer.renderLogs(state.gym)
        // if done -> reset
        if (state.gym.races[0].finished()) state.gym.races[0].reset()
        
      } else {
        state.renderer.renderEnvironment(state.gym.environment)
      }
    }
  }
}
