import Vector from "./vector";
import { Agent } from "./agent";
import { Environment, Powerup, PowerupType } from "./environment";
import { Renderer } from "./render";
import { flatten, mapValue, scale, rotate, translate, otherAgentAsInput as posRelativeToAgent } from "./helpers";
import NeuralNetwork from "./nn";
import { LocalStorageManager } from "./storage";

// const dannjs = require('dannjs');

const exploreEpoch = 2500
const numRaces = 20
const numAgents = 4

const agentDetectRange = 150
const inputCheckpoints = 10
const velocityInput = 1
const hasPowerupInputs = 2
const boostActive = 1
const inputNodes = (inputCheckpoints * 2) + velocityInput + hasPowerupInputs + boostActive

export const steeringActions = [-8, -5, -3, 0, 3, 5, 8]
export const accActions = [0, 0.1, .25, 0.5, 1]

const actions = [...steeringActions, ...accActions, 0] // two more for use of powerups
const outputNodes = actions.length + 1 // last action is do nothing
const hiddenNodes = Math.floor((inputNodes + outputNodes) / 2)

export const getInputs = (environment: Environment, agent: Agent) => {
    const checkpoints = environment.getCheckpoints(inputCheckpoints, agent.reachedCheckpoints)
    const translated = translate(checkpoints.map(c => c.copy()), agent.pos)
    const rotated = rotate(translated, -agent.direction.heading())
    const scaled = scale(rotated.map(c => c.copy()))
    const inputs = flatten(scaled).map(v => mapValue(v, -1, 1, 0, 1))
    return { inputs, checkpoints, rotated, translated }
}

export const getNN = () => {
    return new NeuralNetwork(inputNodes, hiddenNodes, outputNodes)
}

const cloneNN = (nn: NeuralNetwork) => nn.copy() //dannjs.Dann.createFromJSON(nn.toJSON()) 

interface MoveOp {
    agent: Agent
    move: Vector
}

interface BrainScore {
    nn: any
    score: number
}

const otherAgentsToInput = (agent: Agent, others: Agent[]): number[] => {

    const othersPosInputs: number[] = []

    others.forEach(other => {
        const otherRel = posRelativeToAgent(agent.pos, agent.direction, other.pos)
        if (agent.pos.dist(other.pos) < agentDetectRange) {
            othersPosInputs.push(Math.abs(otherRel.x / agentDetectRange))
            othersPosInputs.push(Math.abs(otherRel.y / agentDetectRange))
        } else {
            othersPosInputs.push(0)
            othersPosInputs.push(0)
        }
    })

    return othersPosInputs
}

const powerupsToInput = (agent: Agent, powerups: Powerup[]): number[] => {

    const othersPosInputs: number[] = []

    powerups.forEach(powerup => {
        const otherRel = posRelativeToAgent(agent.pos, agent.direction, powerup.pos)
        if (powerup.isAvailable() && agent.pos.dist(powerup.pos) < agentDetectRange) {
            othersPosInputs.push(Math.abs(otherRel.x / agentDetectRange))
            othersPosInputs.push(Math.abs(otherRel.y / agentDetectRange))
        } else {
            othersPosInputs.push(0)
            othersPosInputs.push(0)
        }
    })

    return othersPosInputs
}

class Race {
    agents: Agent[]
    neuralNets: NeuralNetwork[]
    environment: Environment
    step: number
    maxSteps: number = 1000
    maxVelMag = 1
    stopped = false
    booscount = 0


    constructor(agents: Agent[], environment: Environment, neuralNets: NeuralNetwork[]) {
        this.agents = agents
        this.environment = environment
        this.neuralNets = neuralNets
        this.step = 0
    }

    finished() {
        const failed = !this.agents.find(a => a.alive)
        const outOfTime = this.step >= this.maxSteps
        return failed || outOfTime
    }

    handleCollisions() {
        // collisions
        const moveOps: MoveOp[] = []
        for (let i = 0; i < this.agents.length; i++) {
            for (let j = 0; j < this.agents.length; j++) {
                if (i == j) continue

                const a1 = this.agents[i]
                const a2 = this.agents[j]

                if (a1.pos.dist(a2.pos) > 5) continue

                const a1VelMag = a1.vel.mag()
                const a2VelMag = a2.vel.mag()

                if (a1VelMag > a2.vel.mag()) {
                    if (moveOps.find(op => op.agent === a2)) continue
                    moveOps.push({
                        agent: a2,
                        move: a2.pos.copy().sub(a1.pos).normalize().mult(a1VelMag)
                    })
                } else {
                    if (moveOps.find(op => op.agent === a1)) continue
                    moveOps.push({
                        agent: a1,
                        move: a1.pos.copy().sub(a2.pos).normalize().mult(a2VelMag)
                    })
                }
            }
        }

        moveOps.forEach(op => {
            op.agent.vel.add(op.move)
        })
    }

    updateAgent(agent: Agent, neuralNet: NeuralNetwork) {
        const { inputs, checkpoints, rotated } = getInputs(this.environment, agent)
        const agentHasPowers = [agent.hasBoosterPowerup ? 1 : 0, agent.hasRocketPowerup ? 1 : 0]
        const velMagInput = mapValue(agent.vel.mag(), 0, this.maxVelMag, 0, 1)

        let action = neuralNet.predict([velMagInput, ...inputs, ...agentHasPowers, agent.boosterTicks > 0 ? 1 : 0])

        let steeringChange = 0
        let accChange = 0
        let boosting = false

        if (action <= steeringActions.length - 1) {
            steeringChange = steeringActions[action]
        } else if (action > steeringActions.length - 1 && action < actions.length - 3) {
            accChange = accActions[action - steeringActions.length]
        } else if (action == actions.length - 2) {
            if (agent.activateBooster()) {
                agent.score += 5
                boosting = true
            }
        }

        agent.update(steeringChange, accChange, boosting)

        // update score if agent is close to target
        const dist = agent.pos.dist(checkpoints[0])
        const reachedCheckpoint = dist < 40

        agent.nextCpPos = checkpoints[0]

        if (reachedCheckpoint) {
            agent.ticksSinceLastCheckpoint = 0
            agent.reachedCheckpoints += 1

            if (agent.reachedCheckpoints > 0 && agent.reachedCheckpoints % this.environment.checkpoints.length == 0) {

                const rankedAgents = [...this.agents].sort((a, b) => a.reachedCheckpoints > b.reachedCheckpoints ? -1 : 1)

                agent.score += 100
            }
        }

        // powerups
        const validPowerup = this.environment.powerups.filter(p => p.isAvailable()).find(p => p.pos.dist(agent.pos) < 15)
        if (validPowerup) {
            validPowerup.coolDown = 250
            agent.hasBoosterPowerup = true
            const pType = validPowerup.getType()
            if (pType == PowerupType.Booster) {
                // agent.hasBoosterPowerup = true
                agent.boosterTicks = 100
            }
            if (pType == PowerupType.Rocket) {
                agent.hasRocketPowerup = true
            }
        }

        return rotated
    }

    run() {
        let rotatedA0: Vector[] = []

        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i]
            if (!agent.alive) continue

            const neuralNet = this.neuralNets[i]
            let r = this.updateAgent(agent, neuralNet)
            if (i == 0) {
                rotatedA0 = r
            }
        }

        this.agents.forEach(a => {
            if (a.maxVelMag > this.maxVelMag) {
                this.maxVelMag = a.maxVelMag
            }
        })

        this.environment.updatePowerups()

        this.step++

        return rotatedA0
    }

    reset() {
        this.booscount = 0
        this.step = 0
        const { startPositions } = this.environment.getStartSettings()

        this.agents.forEach((a, i) => {
            a.startPos = startPositions[i]
            a.reset()
        })

        this.environment.powerups.forEach(p => p.coolDown = 0)
    }

}

const getNewRace = () => {
    const neuralNetworks: NeuralNetwork[] = []
    const agents = []

    const env = new Environment(false)
    env.initBPark()
    // env.initNewTrack()

    const { startPositions, startDir } = env.getStartSettings()

    for (let i = 0; i < numAgents; i++) {
        neuralNetworks.push(getNN())
        agents.push(new Agent(startPositions[i], startDir))
    }
    return new Race(agents, env, neuralNetworks)
}

export class Gym {
    agent: Agent
    environment: Environment

    epoch: number
    exploreEpoch: number

    step: number
    maxSteps: number

    bestScore: number
    rotatedCheckpoints: Vector[]
    activeCheckpoints: Vector[]

    failed: boolean

    scoreHistory: number[]

    bestBrains: NeuralNetwork[]

    epsilonMax: number
    epsilonMin: number

    trainingPhase: number

    races: Race[] = []

    globalMaxVelMag = 1

    storage:LocalStorageManager

    constructor() {
        this.bestScore = 0
        this.scoreHistory = []
        this.epsilonMax = 0.5
        this.epsilonMin = 0.01


        const stored = LocalStorageManager.getObject('bestBrain')

        this.bestBrains = []

        if(stored != undefined){
            console.log("using stored brain")
            this.bestBrains.push(stored)
            this.bestBrains.push(stored)
            this.bestBrains.push(stored)
            this.bestBrains.push(stored)
        }else{
            this.bestBrains.push(getNN())
        }

        this.trainingPhase = 0

        while (this.races.length < numRaces) {
            this.races.push(getNewRace())
        }

        this.races[0].neuralNets = [
            stored,
            stored.copy(),
            stored.copy(),
            stored.copy(),
        ]
    }

    epsilonMutate(epoch: number) {
        return this.epsilonMax - ((this.epsilonMax - this.epsilonMin) * (epoch / exploreEpoch));
    }

    exploration(renderer: Renderer) {
        // lets the agent explore the environment by somethimes picking random actions

        for (let epoch = 0; epoch < exploreEpoch; epoch++) {

            // run all races
            this.races.forEach(race => {
                while (!race.finished() && !race.stopped) {
                    race.run()
                }
            })

            const brainScores: BrainScore[] = []

            // evaluate scores
            this.races.forEach(race => {
                const highscore = Math.max(...race.agents.map(a => a.getScore()))
                const bestIndex = race.agents.map(a => a.getScore()).indexOf(highscore)
                const bestNeuralnet = race.neuralNets[bestIndex]
                brainScores.push({ nn: bestNeuralnet, score: highscore })

                if (race.maxVelMag > this.globalMaxVelMag) {
                    this.globalMaxVelMag = race.maxVelMag
                    console.log(`New max velocity: ${this.globalMaxVelMag}`)
                }
            })

            // populate races for next epoch
            brainScores.sort((a, b) => a.score > b.score ? -1 : 1)

            const highscore = brainScores[0].score
            if (highscore > this.bestScore) {
                this.bestScore = highscore
                this.bestBrains = [brainScores[0].nn, ...this.bestBrains]
                console.log(`Exploration score: ${highscore} in ${epoch}/${exploreEpoch}`)
            }
            this.scoreHistory.push(highscore)

            // keep best
            const a1 = brainScores[0]
            const a2 = brainScores[1]
            const mutRate = this.epsilonMutate(epoch)
            for (let i = 0; i < this.races.length / 2; i++) {
                const race = this.races[i]
                race.reset()
                race.neuralNets = []

                // nn1.mutateRandom(mutationChange, mutRate)
                const nn1 = cloneNN(a1.nn)
                nn1.mutate(mutRate)
                race.neuralNets.push(nn1)

                const nn2 = cloneNN(a2.nn)
                nn2.mutate(mutRate)
                race.neuralNets.push(nn2)

                const nn3 = getNN()
                race.neuralNets.push(nn3)

                const nn4 = getNN()
                race.neuralNets.push(nn4)
            }

            this.races.forEach(r => {
                if (r.maxVelMag > this.globalMaxVelMag) {
                    this.globalMaxVelMag = r.maxVelMag
                }
            })

            this.races.forEach(r => {
                r.maxVelMag = this.globalMaxVelMag
            })

            if (epoch % 50 == 0) {
                console.log(`${epoch} / ${exploreEpoch}: ${this.bestScore}`)
            }

        }

        LocalStorageManager.saveObject('bestBrain', this.bestBrains[0])

        this.races[0].maxSteps = 2000
        this.races[0].neuralNets = []
        for (let i = 0; i < numAgents; i++) {
            this.races[0].neuralNets.push(cloneNN(this.bestBrains[i]))
        }

        renderer.renderScoreHistory(this.scoreHistory)
        console.log("exploration finished!")
    }
}