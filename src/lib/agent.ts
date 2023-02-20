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

    hasBoosterPowerup: boolean
    boosterTicks: number
    hasRocketPowerup: boolean


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
        this.maxVelMag = 0
        this.hasRocketPowerup = false
        this.hasBoosterPowerup = false
        this.boosterTicks = 0
    }

    activateBooster() {
        if (!this.hasBoosterPowerup) return

        this.hasBoosterPowerup = false
        this.boosterTicks = 150
    }

    update(steeringChange: number, accChange: number) {
        this.direction.rotate(steeringChange)

        const boostActive = this.boosterTicks > 0

        const newAcc = this.acc + accChange + (boostActive ? 1 : 0)
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

        this.boosterTicks -= 1
    }
}