import Vector from "./vector";

export class Environment {
    numCheckpoints: number
    checkpoints: Vector[]

    constructor(numCheckpoints: number) {
        this.numCheckpoints = numCheckpoints
        this.init()
    }

    init() {
        this.checkpoints = []
        const radius = 200
        for (let i = 0; i < this.numCheckpoints; i++) {
            const rotation = (360 / this.numCheckpoints) * i
            const v = new Vector(radius, 0).rotate(rotation)
            this.checkpoints.push(v)
        }
    }
}