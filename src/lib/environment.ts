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
    maxDist = 100
    center = new Vector(0, 0)
    startCheckpoint: number
    startRandom: boolean

    constructor(startRandom: boolean) {
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
        const w = 100
        const numCornerCP = 10
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
    }

    initRandomTrack() {

        this.checkpoints = []
        //circle

        const n = 10
        let prevX = 150
        for (let i = 0; i < n; i++) {
            const x = prevX + getRandomInt(-125, 125)
            this.checkpoints.push(new Vector(x, 0).rotate((360 / n) * i))
            prevX = x
        }

        /*
  const n = 10;
  while (this.checkpoints.length < n) {
      const x = getRandomInt(-250, 250)
      const y = getRandomInt(-250, 250)
      const newCP = new Vector(x, y)

      // only checkpoints with min dist to all others
      if (!this.checkpoints.find(cp => newCP.dist(cp) < 100)) {
          this.checkpoints.push(newCP)
      }
  }
*/
        const desiredDistance = 50;

        let finished = false
        let iterations = 0
        while (!finished && iterations < 100000) {
            iterations++
            for (let i = 0; i < this.checkpoints.length; i++) {
                const el1 = this.checkpoints[i]
                let el2 = this.checkpoints[i + 1]
                if (i + 1 == this.checkpoints.length) {
                    el2 = this.checkpoints[0]
                }
                let distance = el1.dist(el2);

                while (distance > desiredDistance) {
                    let newVector = el1.lerp(el2, desiredDistance / distance);
                    this.checkpoints.splice(i + 1, 0, newVector);
                    distance = el1.dist(el2)
                    break
                }


            }
            finished = true
        }
        this.numCheckpoints = this.checkpoints.length
    }

    getStartSettings() {
        this.startCheckpoint = 10
        if (this.startRandom) {
            this.startCheckpoint = getRandomInt(0, this.numCheckpoints - 2)
        }
        const c1 = this.checkpoints[this.startCheckpoint]
        const c2 = this.checkpoints[this.startCheckpoint + 1]

        const difference = c1.copy().sub(c2)

        const startPos = c1.copy().add(difference.mult(0.5))
        const startDir = c1.copy().sub(startPos).normalize()
        return { startPos, startDir }
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
}