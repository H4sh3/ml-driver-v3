import Vector from "./vector";

export class Agent {
    pos: Vector
    direction: Vector
    vel: Vector
    acc: number
    score: number
    alive: boolean = true

    constructor(startPos: Vector, startDirection: Vector) {
        this.pos = startPos.copy()
        this.direction = startDirection.copy()
        this.vel = new Vector(0, 0)
        this.acc = 0
        this.score = 0
    }

    update(steeringChange: number, accChange: number) {
        // steering
        this.direction.rotate(steeringChange)

        const newAcc = this.acc + accChange
        if (newAcc < 1 && newAcc > 0) {
            this.acc = newAcc
        }
        const tmpAcc = this.direction.copy().mult(this.acc)


        if (this.vel.mag() < 5) {
            this.vel.add(tmpAcc)
        }

        this.vel.div(1.1)
        this.pos.add(this.vel)
    }
}