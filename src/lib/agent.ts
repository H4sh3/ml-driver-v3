import { accActions, actions, steeringActions } from "./config";
import Vector from "./vector";

export class Agent {
    startPos: Vector
    startDirection: Vector
    pos: Vector
    direction: Vector
    vel: Vector
    acc: number
    score: number
    reachedCheckpoints: number
    alive: boolean
    steerSum: number
    maxVelMag: number

    hasBoosterPowerup: boolean
    boosterTicks: number
    isBoosting: boolean
    hasRocketPowerup: boolean
    ticksSinceLastCheckpoint = 0
    nextCpPos: Vector

    getScore() {
        return this.reachedCheckpoints + this.score
    }

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
        this.reachedCheckpoints = 0
        this.alive = true
        this.maxVelMag = 0
        this.hasRocketPowerup = false
        this.hasBoosterPowerup = false
        this.boosterTicks = 0
        this.ticksSinceLastCheckpoint = 0
        this.isBoosting = false
        this.nextCpPos = new Vector(0, 0)
    }

    activateBooster() {
        if (this.boosterTicks <= 0) return false

        this.boosterTicks -= 1
        return true
    }

    update(action: number) {

        let steeringChange = 0
        let accChange = 0
        let boosting = false

        if (action <= steeringActions.length - 1) {
            steeringChange = steeringActions[action]
        } else if (action > steeringActions.length - 1 && action < actions.length - 3) {
            accChange = accActions[action - steeringActions.length]
        } else if (action == actions.length - 2) {
            if (this.activateBooster()) {
                this.score += 5
                boosting = true
            }
        }


        if(!this.alive) return

        this.isBoosting = boosting

        this.direction.rotate(steeringChange)

        const newAcc = this.acc + accChange + (boosting ? 0.25 : 0)
        if (newAcc < 1 && newAcc > 0) {
            this.acc = newAcc
        }

        const tmpAcc = this.direction.copy().mult(this.acc)

        this.vel.add(tmpAcc)
        // this.vel.div(boosting ? 1.10 : 1.15)
        this.vel.mult(0.92)

        this.pos.add(this.vel)

        const velMag = this.vel.mag()
        if (velMag > this.maxVelMag) {
            this.maxVelMag = velMag
        }

        this.ticksSinceLastCheckpoint += 1


        if (this.ticksSinceLastCheckpoint > 25) {
            this.score = 0
            this.alive = false
        }
    }
}