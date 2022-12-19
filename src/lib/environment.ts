import { Agent } from "./agent";
import { mapValue } from "./helpers";
import Vector from "./vector";
function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
export class Environment {
    numCheckpoints: number
    checkpoints: Vector[]
    radius = 200
    maxDist = 100
    center = new Vector(0, 0)
    startCheckpoint: number

    constructor() {
        this.checkpoints = []
    }

    initCircleTrack() {
        this.numCheckpoints = 36
        for (let i = 0; i < this.numCheckpoints; i++) {
            const rotation = (360 / this.numCheckpoints) * i
            const v = new Vector(this.radius, 0).rotate(rotation)
            this.checkpoints.push(v)
        }
    }

    initSinTrack() {
        this.numCheckpoints = 40
        for (let i = 0; i < this.numCheckpoints / 2; i++) {
            const v = new Vector(Math.sin((i) / 2) * 50, mapValue(i, 0, this.numCheckpoints / 2, this.radius, -this.radius))
            this.checkpoints.push(v)
        }

        for (let i = 0; i < this.numCheckpoints / 2; i++) {
            const mappedY = mapValue(i, 0, this.numCheckpoints / 2, -this.radius, this.radius)
            const v = new Vector(-30 - Math.sin((i) / 2) * 50, mappedY + 20)
            this.checkpoints.push(v)
        }

    }

    getStartPosition() {
        // return a start position close to the first checkpoint

        this.startCheckpoint = 0
        // this.startCheckpoint = getRandomInt(0, this.numCheckpoints - 2)
        const c1 = this.checkpoints[this.startCheckpoint]
        const c2 = this.checkpoints[this.startCheckpoint + 1]

        const difference = c1.copy().sub(c2)

        return c1.copy().add(difference.mult(0.5))
    }

    getStartDirection(): number {
        const startPos = this.getStartPosition()
        const firstCheckpoint = this.checkpoints[this.startCheckpoint]
        return firstCheckpoint.copy().sub(startPos).heading()
    }

    // agents input based on passed score
    // returns copies
    getCheckpoints(n: number, score: number) {
        const checkpoints = []
        for (let i = 0; i < n; i++) {
            const index = (this.startCheckpoint + score + i) % this.numCheckpoints
            checkpoints.push(this.checkpoints[index])
        }
        return checkpoints
    }

    getNextCheckpoint(agent: Agent) {
        return this.checkpoints[(this.startCheckpoint + agent.score) % this.numCheckpoints]
    }

    hasAgentLeftCourse(agent: Agent) {
        const nextCheckpoint = this.getNextCheckpoint(agent)
        return nextCheckpoint.dist(agent.pos) > this.maxDist
    }
}