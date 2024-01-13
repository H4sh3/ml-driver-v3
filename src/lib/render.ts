import p5 from "p5";
import { Agent } from "./agent";
import { Environment, tileSize } from "./environment";
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
        this.p5.translate(500 + offsetX, 250 + offsetY)
    }

    render(gym: Gym, rotated: Vector[]) {
        // this.renderScoreHistory(gym.scoreHistory)
        this.renderEnvironment(gym.races[0].environment)

        // this.renderRotated(rotated)

        gym.races[0].agents.forEach((agent, i) => {
            this.renderAgent(agent, i)
        })

        // this.renderScore(gym.races[0].agents)
        this.renderGym(gym)
    }

    renderEnvironment = (env: Environment) => {
        this.p5.background(255, 255, 255)
        /*
        this.p5.strokeWeight(80)
        this.p5.stroke(120, 120, 120)
        for (let i = 1; i < env.checkpoints.length; i++) {
            const c1 = env.checkpoints[i - 1]
            const c2 = env.checkpoints[i]
            this.p5.line(c1.x, c1.y, c2.x, c2.y)
        }

        this.p5.strokeWeight(1)
        this.p5.fill(0, 0, 255)
        this.p5.stroke(0)
        for (let i = 0; i < env.checkpoints.length; i++) {
            const cp = env.checkpoints[i]
            this.p5.ellipse(cp.x, cp.y, 5, 5)
        }

        this.p5.stroke(0)
        this.p5.strokeWeight(1)
        this.p5.fill(0, 255, 0)
        for (let i = 0; i < env.powerups.length; i++) {
            const cp = env.powerups[i].pos
            this.p5.rect(cp.x, cp.y, 10, 10)
        }
        */

        // render tiles

        this.p5.push()
        this.translate()
        
        const DEBUG = true
        if (DEBUG) {
            this.p5.stroke(0)

            env.tiles.forEach((t, i) => {

                // render tile
                this.p5.fill(120, 120, 255, 25)
                this.p5.rect(t.center.x, t.center.y, tileSize, tileSize)

                this.p5.stroke(0)
                this.p5.text(i, t.center.x, t.center.y - 15)

                // render connections
                t.connections.forEach(c => {
                    this.p5.fill(0, 255, 0)
                    this.p5.ellipse(c.x, c.y, 15, 15)
                })

                t.checkpoints.forEach(c => {
                    this.p5.fill(255)
                    this.p5.ellipse(c.x, c.y, 10, 10)
                })
            })
        } else {


            for (let tI = 0; tI < env.tiles.length; tI++) {
                let t1 = env.tiles[tI]

                for (let cI = 1; cI < t1.checkpoints.length; cI++) {

                    let c1 = t1.checkpoints[cI - 1]
                    let c2 = t1.checkpoints[cI]


                    this.p5.strokeWeight(50)
                    this.p5.stroke(120,120,120)
                    this.p5.fill(120, 120, 120)
                    this.p5.line(c1.x, c1.y, c2.x, c2.y)

                    this.p5.stroke(0)
                    this.p5.strokeWeight(5)
                    this.p5.fill(120, 120, 120)
                    if(cI%2 == 0){
                        this.p5.line(c1.x, c1.y, c2.x, c2.y)
                    }
                }

                const last = t1.checkpoints[t1.checkpoints.length - 1]
                const next = tI == env.tiles.length - 1 ? env.tiles[0] : env.tiles[tI + 1]
                this.p5.line(last.x, last.y, next.checkpoints[0].x, next.checkpoints[0].y)

            }
        }

        this.p5.pop()
    }

    renderRotated(rotated: Vector[]) {
        this.p5.push()
        this.translate(-200, -200)
        this.p5.text("Agent-1 inputs", -100, 25)

        this.p5.strokeWeight(2)
        this.p5.line(-50, 0, 50, 0)
        this.p5.line(0, -50, 0, 50)
        this.p5.line(0, -50, -10, -40)
        this.p5.line(0, -50, 10, -40)

        this.p5.rotate(-90)

        rotated.forEach(r => this.p5.ellipse(r.x, r.y, 5, 5))

        this.p5.pop()
    }

    renderScore(agents: Agent[]) {
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

        this.translate(agent.pos.x, agent.pos.y)

        const agentSize = 40

        this.p5.fill(0)

        this.p5.push()
        this.p5.rotate(agent.direction.heading())
        this.p5.rect(0, 0, agentSize, agentSize / 2)
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
        this.p5.background(255, 255, 255, 10)
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

    renderLogs(gym: Gym) {

        const data = gym.scoreHistory

        const epoch = gym.epoch
        const epochMax = gym.exploreEpoch

        if (data.length >= 2) {

            const max = data.reduce(function (a, b) {
                return Math.max(a, b);
            });
            const logWindowHeight = 150;
            const logWindowWidth = 225;
            this.p5.fill(255)
            this.p5.rect(0, 0, logWindowWidth * 2, logWindowHeight * 2)
            this.p5.stroke(0, 255, 0)
            this.p5.fill(0)
            for (let i = 0; i < data.length - 1; i++) {
                const p1 = data[i]
                const p2 = data[i + 1]
                if (p1 && p2) {
                    const x1 = mapValue(i, 0, data.length, 0, logWindowWidth)
                    const y1 = mapValue(p1, 0, max, 0, logWindowHeight - 40)
                    const x2 = mapValue(i + 1, 0, data.length, 0, logWindowWidth)
                    const y2 = mapValue(p2, 0, max, 0, logWindowHeight - 40)
                    this.p5.stroke(0)
                    this.p5.strokeWeight(2)
                    this.p5.line(x1, logWindowHeight - y1, x2, logWindowHeight - y2)
                }
            }

            const hs = data[data.length - 1]

            this.p5.strokeWeight(0.5)
            this.p5.stroke(255, 0, 0)
            this.p5.fill(255, 0, 0)
            this.p5.text("Exploring...", 4, 10)
            this.p5.fill(0)
            this.p5.stroke(0)
            this.p5.text(`Epoch: ${epoch} / ${epochMax}`, 4, 25)
            this.p5.text(`Score: ${hs}`, 4, 40)

            if (data.length > logWindowWidth) {
                data.shift()
            }
        }
    }
}

function smoothArray(arr: number[], n: number) {
    if (arr.length === 0) {
        return [];
    }

    const smoothed = [];

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


