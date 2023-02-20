import { Agent } from "./agent";
import { mapValue } from "./helpers";
import Vector from "./vector";

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export enum PowerupType {
    Rocket,
    Booster
}

export class Powerup {
    pos: Vector
    pType: PowerupType
    coolDown: number

    constructor(pos: Vector, pType: PowerupType) {
        this.pos = pos
        this.pType = pType
        this.coolDown = 0
    }

    isAvailable() {
        return this.coolDown <= 0
    }
}

export class Environment {
    numCheckpoints: number
    checkpoints: Vector[]
    maxDist = 75
    center = new Vector(0, 0)
    startCheckpoint: number
    startRandom: boolean
    powerups: Powerup[]

    constructor(startRandom: boolean = false) {
        this.startRandom = startRandom
        this.checkpoints = []
    }

    initCircleTrack() {
        const radius = 200
        this.numCheckpoints = 36
        for (let i = 0; i < this.numCheckpoints; i++) {
            const rotation = (360 / this.numCheckpoints) * i
            const v = new Vector(radius, 0).rotate(rotation)
            this.checkpoints.push(v)
        }
    }

    initSinTrack() {
        const height = 300
        for (let i = 0; i < 20; i++) {
            const mappedY = mapValue(i, 0, 20, height, -height)
            const v = new Vector(Math.sin((i) / 2) * 50, mappedY - 20)
            this.checkpoints.push(v)
        }

        let lcp = this.checkpoints[this.checkpoints.length - 1]
        this.checkpoints.push(new Vector(lcp.x - 36, lcp.y - 10))

        const xOffset = 80
        for (let i = 0; i < 20; i++) {
            const mappedY = mapValue(i, 0, 20, -height, height)
            const v = new Vector(-xOffset - Math.sin((i) / 2) * 50, mappedY + 10)
            this.checkpoints.push(v)
        }
        lcp = this.checkpoints[this.checkpoints.length - 1]
        this.checkpoints.push(new Vector(lcp.x + 36, lcp.y + 10))

        this.numCheckpoints = this.checkpoints.length
    }

    initBPark() {
        // left
        const h = 600
        const w = 200
        const numCornerCP = 16
        const numCornerCPHalf = numCornerCP / 2

        const numCP = 20

        for (let y = numCP / 2; y >= -numCP / 2; y--) {
            this.checkpoints.push(new Vector(0, y * (h / numCP)))
        }

        // top curve
        const center = new Vector(w / 2, 0)
        for (let i = -numCornerCPHalf; i <= numCornerCPHalf; i++) {
            const cp = center.copy().rotate(mapValue(i, -numCornerCPHalf, numCornerCPHalf, -180, 0))
            cp.y += (-h / 2) - 20
            cp.x += w / 2
            this.checkpoints.push(cp)
        }

        // right
        for (let y = -numCP / 2; y <= numCP / 2; y++) {
            this.checkpoints.push(new Vector(w, y * (h / numCP)))
        }

        // bottom cuve
        for (let i = -numCornerCPHalf; i <= numCornerCPHalf; i++) {
            const cp = center.copy().rotate(mapValue(i, -numCornerCPHalf, numCornerCPHalf, 0, 180))
            cp.y += (h / 2) + 20
            cp.x += w / 2
            this.checkpoints.push(cp)
        }
        this.numCheckpoints = this.checkpoints.length

        // add powerups 
        const yPos = (h / 2) - 30
        const dist = 30
        this.powerups = []
        this.powerups.push(new Powerup(new Vector(-dist, -yPos), PowerupType.Booster))
        this.powerups.push(new Powerup(new Vector(0, -yPos), PowerupType.Booster))
        this.powerups.push(new Powerup(new Vector(dist, -yPos), PowerupType.Booster))

        this.powerups.push(new Powerup(new Vector(-dist + w, yPos), PowerupType.Booster))
        this.powerups.push(new Powerup(new Vector(0 + w, yPos), PowerupType.Booster))
        this.powerups.push(new Powerup(new Vector(dist + w, yPos), PowerupType.Booster))
    }

    getStartSettings() {
        this.startCheckpoint = 10
        if (this.startRandom) {
            this.startCheckpoint = getRandomInt(0, this.numCheckpoints - 2)
        }
        const c1 = this.checkpoints[this.startCheckpoint]
        const c2 = this.checkpoints[this.startCheckpoint + 1]

        const difference = c1.copy().sub(c2)

        const startPositions = []
        const startPos = c1.copy().add(difference.mult(0.5))

        startPositions.push(startPos.copy().add(new Vector(10, 40)))
        startPositions.push(startPos.copy().add(new Vector(-10, 20)))
        startPositions.push(startPos.copy().add(new Vector(10, 0)))
        startPositions.push(startPos.copy().add(new Vector(-10, -20)))

        const startDir = c1.copy().sub(startPos).normalize()
        return { startPositions, startDir }
    }

    // agents input based on passed score
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

    updatePowerups() {
        this.powerups.filter(p => p.coolDown > 0).forEach(p => p.coolDown -= 1)
    }
}