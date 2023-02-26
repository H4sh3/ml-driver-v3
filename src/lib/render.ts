import p5 from "p5";
import { Agent } from "./agent";
import { Environment } from "./environment";
import { Gym, Rocket } from "./gym";
import { mapValue } from "./helpers";
import Vector from "./vector";

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
export class Renderer {
    p5: p5
    constructor(p5: p5) {
        this.p5 = p5
        this.p5.angleMode(this.p5.DEGREES)
    }

    private translate(offsetX = 0, offsetY = 0) {
        this.p5.translate((this.p5.width / 2) + offsetX, (this.p5.height / 2) + offsetY)
    }

    renderEnvironment = (env: Environment) => {
        this.p5.push()
        this.translate()
        this.p5.strokeWeight(80)
        this.p5.stroke(48, 219, 94)
        for (let i = 1; i < env.checkpoints.length; i++) {
            const c1 = env.checkpoints[i - 1]
            const c2 = env.checkpoints[i]
            //this.p5.ellipse(c1.x, c1.y, 5, 5)
            this.p5.line(c1.x, c1.y, c2.x, c2.y)
        }

        const last = env.checkpoints[env.checkpoints.length - 1]
        //this.p5.ellipse(last.x, last.y, 5, 5)
        const first = env.checkpoints[0]
        this.p5.line(last.x, last.y, first.x, first.y)

        this.p5.strokeWeight(2)
        this.p5.stroke(0)

        // powerups

        env.powerups.forEach(p => {
            if (p.isAvailable()) {
                this.p5.fill(0, 0, 255)
                this.p5.ellipse(p.pos.x, p.pos.y, 4, 4)
            }
        })

        this.p5.pop()
    }

    renderRotated(rotated: Vector[]) {
        this.p5.push()
        this.translate(-200)
        this.p5.line(-50, 0, 50, 0)
        this.p5.line(0, -50, 0, 50)
        rotated.forEach(r => this.p5.ellipse(r.x, r.y, 5, 5))
        this.p5.pop()
    }


    renderRockets = (rockets: Rocket[]) => {
        this.p5.push()
        this.translate()
        rockets.forEach(r => {
            this.p5.stroke(255, 0, 0)
            this.p5.fill(0)
            this.p5.ellipse(r.pos.x, r.pos.y, 5, 5)
        })
        this.p5.stroke(0)
        this.p5.pop()
    }

    renderAgent = (agent: Agent, i: number) => {
        this.p5.push()
        this.translate()
        this.p5.text(agent.score, 50, -10 * i)
        this.p5.text(agent.reachedCheckpoints, 100, -10 * i)
        this.p5.text(agent.boosterTicks, 150, -10 * i)
        this.p5.line(agent.pos.x, agent.pos.y, agent.pos.x + agent.direction.x * 30, agent.pos.y + agent.direction.y * 30)

        this.p5.fill(0, 255, 255)
        this.p5.ellipse(agent.nextCpPos.x, agent.nextCpPos.y, 10, 10)

        this.p5.pop()



        this.p5.push()
        this.p5.translate(agent.pos.x + this.p5.width / 2, agent.pos.y + this.p5.height / 2)

        if (agent.isBoosting) {
            this.p5.fill(0, 0, 255)
            this.p5.ellipse(0, 0, 20, 20)
        }



        this.p5.push()




        if (agent.alive) {
            this.p5.fill(90, 90, 90)
        } else {
            this.p5.fill(0, 255, 0)
        }
        this.p5.rotate(agent.direction.heading())
        this.p5.rect(-10, -4, 20, 8)
        this.p5.pop()

        this.p5.pop()
    }

    renderGym = (gym: Gym) => {
        this.p5.push()
        this.translate(100, 0)
        if (gym.rotatedCheckpoints) {
            gym.rotatedCheckpoints.forEach(c => {
                this.p5.fill(0, 255, 0)
                this.p5.ellipse(c.x, c.y, 5, 5)
            })
        }
        this.p5.ellipse(0, 0, 5, 5)
        this.p5.line(0, 0, 50, 0)
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
        this.p5.background(255)
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
