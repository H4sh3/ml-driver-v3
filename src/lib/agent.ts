import Vector from "./vector";

export class Agent {
    startPos: Vector
    startDirection: Vector
    pos: Vector
    direction: Vector
    vel: Vector
    acc: number
    score: number
    alive: boolean
    steerSum: number
    maxVelMag: number
    othersPosRel: Vector[]

    constructor(startPos: Vector, startDirection: Vector) {
        this.startPos = startPos.copy()
        this.startDirection = startDirection.copy()
        this.reset()
    }

    reset() {
        this.pos = this.startPos.copy()
        this.direction = this.startDirection.copy()
        this.vel = new Vector(0, 0)
        this.acc = 0
        this.score = 0
        this.alive = true
        this.steerSum = 0
        this.maxVelMag = 0
    }

    update(steeringChange: number, accChange: number) {
        // steering
        this.steerSum += steeringChange
        this.direction.rotate(steeringChange)

        const newAcc = this.acc + accChange
        if (newAcc < 1 && newAcc > 0) {
            this.acc = newAcc
        }
        const tmpAcc = this.direction.copy().mult(this.acc)

        this.vel.add(tmpAcc)
        this.vel.div(1.15)
        this.pos.add(this.vel)

        if (this.vel.mag() > this.maxVelMag) {
            this.maxVelMag = this.vel.mag()
        }
    }
}