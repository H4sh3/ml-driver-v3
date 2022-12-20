import { NNT } from "./gym";
import { mapValue } from "./helpers";
import Vector from "./vector";

export class Agent {
    brain: NNT
    pos: Vector
    direction: Vector
    vel: Vector
    score: number

    constructor(startPos: Vector, startDirection: Vector) {
        this.pos = startPos.copy()
        this.direction = startDirection.copy()
        this.vel = new Vector(0, 0)
        this.score = 0
    }

    predict(brain: NNT, input: number[]): number[] {
        const output = brain.run(input)
        return output
    }

    update(steerOutput: number, accOutput: number) {

        this.direction.rotate(mapValue(steerOutput, 0, 1, -15, 15))
        const acc = this.direction.copy().mult(mapValue(accOutput, 0, 1, 0.1, 2))
        this.vel.add(acc)

        this.vel.div(1.3)
        this.pos.add(this.vel)
    }
}