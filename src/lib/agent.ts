import { NNT } from "./gym";
import Vector from "./vector";

export class Agent {
    brain: NNT
    pos: Vector
    direction: Vector
    vel: number
    score: number

    constructor(startPos: Vector, startDirection: Vector) {
        this.pos = startPos.copy()
        this.direction = startDirection.copy()
        this.vel = 2
        this.score = 0
    }

    predict(brain: NNT, input: number[]): number[] {
        const output = brain.run(input)
        return output
    }

    update() {
        const step = this.direction.copy().mult(this.vel)
        this.vel *= 0.85
        this.pos.add(step)
    }
}