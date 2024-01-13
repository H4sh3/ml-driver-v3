import { Agent } from "./agent";
import { mapValue } from "./helpers";
import Vector from "./vector";

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export enum PowerupType {
    Booster
}

export class Powerup {
    pos: Vector
    coolDown: number

    constructor(pos: Vector) {
        this.pos = pos
    }

    getType() {
        return PowerupType.Booster
    }
}

export const tileSize = 400

const tileOffsets = [
    new Vector(0, -tileSize / 2),
    new Vector(+tileSize / 2, 0),
    new Vector(0, +tileSize / 2),
    new Vector(-tileSize / 2, 0),
]

export class Tile {
    center: Vector
    connections: Vector[]

    startConnection: Vector
    endConnection: Vector
    checkpoints: Vector[] = []

    constructor(cellX: number, cellY: number, startConnection: number, endConnection: number) {
        this.center = new Vector(cellX * tileSize, cellY * tileSize)
        this.connections = tileOffsets.map(o => o.copy().add(this.center))
        this.startConnection = this.connections[startConnection]
        this.endConnection = this.connections[endConnection]

        this.initCheckpoints()
    }

    initCheckpoints() {
        const numPoints = 10; // Number of points to generate on the curve

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const x = Math.pow(1 - t, 2) * this.startConnection.x + 2 * (1 - t) * t * this.center.x + Math.pow(t, 2) * this.endConnection.x;
            const y = Math.pow(1 - t, 2) * this.startConnection.y + 2 * (1 - t) * t * this.center.y + Math.pow(t, 2) * this.endConnection.y;
            this.checkpoints.push(new Vector(x, y));
        }

        // remove last element
        this.checkpoints.pop()
    }
}

export const combineCheckpoints = (tiles: Tile[]) => {
    const checkpoints: Vector[] = []
    tiles.forEach(t => checkpoints.push(...t.checkpoints))
    return checkpoints
}

const connectionsPossibilities = [
    new Vector(0, 1),
    new Vector(0, 2),
    new Vector(0, 3),
    new Vector(1, 0),
    new Vector(1, 2),
    new Vector(1, 3),
    new Vector(2, 0),
    new Vector(2, 1),
    new Vector(2, 3),
    new Vector(3, 0),
    new Vector(3, 1),
    new Vector(3, 2),
]

function generateCombinations(n: number, current: Vector[] = [], result: Vector[][] = []): Vector[][] {
  
    if (n === 0) {
      result.push(current);
      return result;
    }
  
    for (let i = 0; i < connectionsPossibilities.length; i++) {
      const newPrefix = [...current, connectionsPossibilities[i]];
      generateCombinations(n - 1, newPrefix, result);
    }
  
    return result;
}

export class Environment {
    startCheckpoint: number
    numCheckpoints: number
    maxDist = 250
    center = new Vector(0, 0)

    checkpoints: Vector[] = []
    powerups: Powerup[] = []
    tiles: Tile[] = []



    constructor() {

        console.log(generateCombinations(2).length)

        this.tiles.push(new Tile(1, 0, 1, 3))
        this.tiles.push(new Tile(0, 0, 1, 2))
        this.tiles.push(new Tile(0, 1, 0, 1))
        this.tiles.push(new Tile(1, 1, 3, 2))
        this.tiles.push(new Tile(1, 2, 0, 3))
        this.tiles.push(new Tile(0, 2, 1, 2))
        this.tiles.push(new Tile(0, 3, 0, 1))
        this.tiles.push(new Tile(1, 3, 3, 0))
        this.tiles.push(new Tile(1, 2, 2, 1))
        this.tiles.push(new Tile(2, 2, 3, 0))
        this.tiles.push(new Tile(2, 1, 2, 1))
        this.tiles.push(new Tile(3, 1, 3, 0))
        this.tiles.push(new Tile(3, 0, 2, 3))
        this.tiles.push(new Tile(2, 0, 1, 3))
        this.checkpoints = combineCheckpoints(this.tiles)
        this.numCheckpoints = this.checkpoints.length
    }

    getStartSettings() {
        this.startCheckpoint = 10

        const c1 = this.checkpoints[this.startCheckpoint]
        const c2 = this.checkpoints[this.startCheckpoint + 1]

        const difference = c1.copy().sub(c2)

        const startPosition = c1.copy().add(difference.mult(2))
        const startDir = c1.copy().sub(startPosition).normalize()

        return { startPosition, startDir }
    }

    // agents input based on passed score
    getCheckpoints(n: number, reachedCheckpoints: number) {
        const checkpoints = []
        for (let i = 0; i < n; i++) {
            const index = (this.startCheckpoint + reachedCheckpoints + i) % this.numCheckpoints
            checkpoints.push(this.checkpoints[index])
        }
        return checkpoints
    }

    getNextCheckpoint(agent: Agent) {
        return this.checkpoints[(this.startCheckpoint + agent.reachedCheckpoints) % this.numCheckpoints]
    }

    hasAgentLeftCourse(agent: Agent) {
        const nextCheckpoint = this.getNextCheckpoint(agent)
        return nextCheckpoint.dist(agent.pos) > this.maxDist
    }

    updatePowerups() {
        this.powerups.filter(p => p.coolDown > 0).forEach(p => p.coolDown -= 1)
    }
}