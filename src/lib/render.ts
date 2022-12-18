import p5 from "p5";
import { Agent } from "./agent";
import { Environment } from "./environment";
import { Gym } from "./gym";

export class Renderer {
    p5: p5
    constructor(p5: p5) {
        this.p5 = p5
        this.p5.angleMode(this.p5.DEGREES)
    }

    private translate() {
        this.p5.translate(this.p5.width / 2, this.p5.height / 2)
    }

    renderEnvironment = (env: Environment) => {
        this.p5.push()
        this.translate()
        env.checkpoints.forEach(c => {
            this.p5.ellipse(c.x, c.y, 3, 3)
        })
        this.p5.pop()
    }

    renderAgent = (agent: Agent) => {
        this.p5.push()
        this.translate()
        this.p5.text(agent.score, 0, 0)
        this.p5.ellipse(agent.pos.x, agent.pos.y, 5, 5)
        this.p5.line(agent.pos.x, agent.pos.y, agent.pos.x + agent.direction.x * 15, agent.pos.y + agent.direction.y * 15)
        this.p5.pop()
    }

    renderGym = (gym: Gym) => {
        this.p5.push()
        this.translate()
        gym.activeCheckpoints.forEach(c => {
            this.p5.fill(255, 0, 0)
            this.p5.rect(c.x, c.y, 6, 6)
        })
        this.p5.line(0, 0, 50, 0)
        // this.p5.rotate(-gym.agent.direction.heading())
        gym.rotatedCheckpoints.forEach(c => {
            this.p5.fill(0, 255, 0)
            this.p5.ellipse(c.x, c.y, 5, 5)
        })
        this.p5.pop()
    }
}
