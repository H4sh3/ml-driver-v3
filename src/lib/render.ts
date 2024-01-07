import p5 from "p5";
import { Agent } from "./agent";
import { Environment } from "./environment";
import { Gym } from "./gym";
import { mapValue } from "./helpers";
import Vector from "./vector";


export class Renderer {
    p5: p5
    constructor(p5: p5) {
        this.p5 = p5
        this.p5.angleMode(this.p5.DEGREES)
        this.p5.rectMode(this.p5.CENTER)
    }

    private translate(offsetX = 0, offsetY = 0) {
        this.p5.translate((this.p5.width / 2) + offsetX, (this.p5.height / 2) + offsetY)
    }

    render(gym: Gym, rotated: Vector[]) {
        this.renderScoreHistory(gym.scoreHistory)
        this.renderEnvironment(gym.races[0].environment)
        
        this.renderRotated(rotated)
        
        gym.races[0].agents.forEach((agent, i) => {
          this.renderAgent(agent, i)
        })
        
        this.renderScore(gym.races[0].agents)
        this.renderGym(gym)
    }

    renderEnvironment = (env: Environment) => {
        this.p5.background(255,255,255)
        this.p5.push()
        this.translate()
        this.p5.strokeWeight(80)
        this.p5.stroke(120, 120, 120)
        for (let i = 1; i < env.checkpoints.length; i++) {
            const c1 = env.checkpoints[i - 1]
            const c2 = env.checkpoints[i]
            this.p5.line(c1.x, c1.y, c2.x, c2.y)
        }

        this.p5.strokeWeight(1)
        this.p5.fill(0,0,255)
        this.p5.stroke(0)
        for (let i = 0; i < env.checkpoints.length; i++) {
            const cp = env.checkpoints[i]
            this.p5.ellipse(cp.x, cp.y, 5, 5)
        }
        
        this.p5.stroke(0)
        this.p5.strokeWeight(1)
        this.p5.fill(0,255,0)
        for (let i = 0; i < env.powerups.length; i++) {
            const cp = env.powerups[i].pos
            this.p5.rect(cp.x, cp.y, 10, 10)
        }

        this.p5.pop()
    }

    renderRotated(rotated: Vector[]) {
        this.p5.push()
        this.translate(-200,-200)
        this.p5.text("Agent-1 inputs",-100,25)

        this.p5.strokeWeight(2)
        this.p5.line(-50, 0, 50, 0)
        this.p5.line(0, -50, 0, 50)
        this.p5.line(0, -50, -10, -40)
        this.p5.line(0, -50, 10, -40)
        
        this.p5.rotate(-90)

        rotated.forEach(r => this.p5.ellipse(r.x, r.y, 5, 5))

        this.p5.pop()
    }

    renderScore(agents:Agent[]) {
        this.p5.push()
        this.translate(-300)
        const size = 20
        this.p5.textSize(size)
        this.p5.text("Scores:", 0, -size)
        agents.forEach((agent, i) => {
            this.p5.text(`Agent-${i}: ${agent.getScore()}`, 0, size * i)
        })
        this.p5.pop()
    }

    renderAgent = (agent: Agent, i: number) => {
        this.p5.push()
        
        this.translate(agent.pos.x,agent.pos.y)
        
        const agentSize = 30
        this.p5.fill(250, 90, 90)

        this.p5.push()
        this.p5.rotate(agent.direction.heading())
        this.p5.rect(0, 0, agentSize,agentSize/2)
        this.p5.pop()

        this.p5.pop()
    }

    renderGym = (gym: Gym) => {
        this.p5.push()
        this.translate()

        if (gym.rotatedCheckpoints) {
            gym.rotatedCheckpoints.forEach(c => {
                this.p5.fill(255, 255, 0)
                this.p5.ellipse(c.x, c.y, 5, 5)
            })
        }

        this.p5.pop()

        this.p5.push()
        this.translate()
        this.p5.text(gym.step, 0, -30)
        if (gym.activeCheckpoints) {
            gym.activeCheckpoints.forEach(c => {
                this.p5.fill(0, 255, 0)
                this.p5.rect(c.x, c.y, 6, 6)
            })
        }
        this.p5.pop()

    }

    renderScoreHistory(scoreHistory: number[]) {
        this.p5.background(255,255,255,10)
        const smoothed = smoothArray(scoreHistory, 100)
        const maxScore = Math.max(...smoothed)

        const windowHeight = 50
        const windowWidth = 400
        const mapped = smoothed.map((v, i) => {
            return {
                "x": 15 + mapValue(i, 0, smoothed.length, 0, windowWidth),
                "y": 15 + mapValue(v, 0, maxScore, windowHeight, 0)
            }
        })
        for (let i = 1; i < mapped.length; i++) {
            const p1 = mapped[i - 1]
            const p2 = mapped[i]
            this.p5.line(p1.x, p1.y, p2.x, p2.y)
        }
    }
}

function smoothArray(arr: number[], n: number) {
    // Check if the input array is empty
    if (arr.length === 0) {
        return [];
    }

    // Initialize the smoothed array with the same length as the input array
    const smoothed = [];

    // Calculate the moving average for each element of the input array

    const windowSize = Math.floor(arr.length / n)

    for (let window = 0; window < n; window++) {
        let sum = 0
        for (let i = window * windowSize; i < (window + 1) * windowSize; i++) {
            sum += arr[i]
        }
        smoothed.push(sum / windowSize)
    }

    return smoothed;
}

