import Vector from "./vector";
import { Agent } from "./agent";
import { Environment, Powerup, PowerupType } from "./environment";
import { Renderer } from "./render";
import { flatten, mapValue, scale, rotate, translate, otherAgentAsInput as posRelativeToAgent } from "./helpers";

import NeuralNetwork from "./nn";

const exploreEpoch = 1000

const agentDetectRange = 150
const inputCheckpoints = 5
const otherAgentPositions = 2 * 3
const velocityInput = 1
const powerupPositionInputs = 2 * 6
const hasPowerupInputs = 2
const boosActive = 1
const inputNodes = (inputCheckpoints * 2) + velocityInput + otherAgentPositions + powerupPositionInputs + hasPowerupInputs + boosActive

export const steeringActions = [-8, -5, -3, 0, 3, 5, 8]
export const accActions = [0, 0.1, .25, 0.5, 1, 1.5, 2]

const actions = [...steeringActions, ...accActions, 0] // two more for use of powerups
const outputNodes = actions.length + 1 // last action is do nothing
const hiddenNodes = Math.floor((inputNodes + outputNodes) / 2)

export const getInputs = (environment: Environment, agent: Agent) => {
    const checkpoints = environment.getCheckpoints(inputCheckpoints, agent.score)
    const translated = translate(checkpoints, agent.pos)
    const rotated = rotate(translated, -agent.direction.heading())
    const scaled = scale(rotated)
    const inputs = flatten(scaled).map(v => mapValue(v, -1, 1, 0, 1))
    return { inputs, checkpoints, rotated, translated }
}

interface MoveOp {
    agent: Agent
    move: Vector
}

interface BrainScore {
    nn: NeuralNetwork
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

    constructor(agents: Agent[], environment: Environment, neuralNets: NeuralNetwork[]) {
        this.agents = agents
        this.environment = environment
        this.neuralNets = neuralNets
        this.step = 0
    }

    finished() {
        const failed = this.agents.every(a => !a.alive)
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
        const others = this.agents.filter(a => a != agent)
        const otherPosInputs = otherAgentsToInput(agent, others)
        const powerUpsAsInput = powerupsToInput(agent, this.environment.powerups)
        const agentHasPowers = [agent.hasBoosterPowerup ? 1 : 0, agent.hasRocketPowerup ? 1 : 0]
        const velMagInput = mapValue(agent.vel.mag(), 0, this.maxVelMag, 0, 1)

        //  ...otherPosInputs,
        let action = neuralNet.predict([velMagInput, ...inputs, ...otherPosInputs, ...powerUpsAsInput, ...agentHasPowers, agent.boosterTicks > 0 ? 1 : 0])

        let steeringChange = 0
        let accChange = 0

        if (action <= steeringActions.length - 1) {
            steeringChange = steeringActions[action]
        } else if (action > steeringActions.length - 1 && action < actions.length - 3) {
            accChange = accActions[action - steeringActions.length]
        } else if (action == actions.length - 2) {
            const boosted = agent.activateBooster()
            if (boosted) {
                agent.score += 50
            }
        } else if (action == actions.length - 1) {
            if (agent.hasRocketPowerup) {

            }
        }

        agent.update(steeringChange, accChange)

        // things that let the agent lose and stop the current round
        // const startPos = this.environment.checkpoints[this.environment.startCheckpoint]
        //const didNotMove = agent.pos.dist(startPos) < 50 && agent.score < 5 && this.step > 100
        //const collectedWrongCP = checkpoints.slice(1, checkpoints.length - 1).some(c => agent.pos.dist(c) < 40)
        //const leftCourse = this.environment.hasAgentLeftCourse(agent)

        //if (didNotMove || collectedWrongCP || leftCourse) {
        if (agent.ticksSinceLastCheckpoint > 25) {
            agent.alive = false
        }

        // update score if agent is close to target
        const reachedCheckpoint = agent.pos.dist(checkpoints[0]) < 40

        if (reachedCheckpoint) {
            agent.ticksSinceLastCheckpoint = 0
            agent.score++
        }

        // powerups
        const validPowerup = this.environment.powerups.filter(p => p.isAvailable()).find(p => p.pos.dist(agent.pos) < 15)
        if (validPowerup) {
            validPowerup.coolDown = 300
            agent.hasBoosterPowerup = true
            if (validPowerup.pType == PowerupType.Booster) {
            }
            if (validPowerup.pType == PowerupType.Rocket) {

            }
        }

    }

    run() {

        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i]
            if (!agent.alive) continue

            const neuralNet = this.neuralNets[i]
            this.updateAgent(agent, neuralNet)
        }

        this.agents.forEach(a => {
            if (a.maxVelMag > this.maxVelMag) {
                this.maxVelMag = a.maxVelMag
            }
        })

        this.environment.updatePowerups()
        // this.handleCollisions()

        this.step++
    }

    reset() {
        this.step = 0
        const { startPositions } = this.environment.getStartSettings()
        startPositions.sort((a, b) => 0.5 - Math.random());
        this.agents.forEach((a, i) => {
            a.startPos = startPositions[i]
            a.reset()
        })
        this.environment.powerups.forEach(p => p.coolDown = 0)
    }

}

const getNewRace = () => {
    const neuralNetworks = []
    const agents = []

    const env = new Environment(false)
    env.initBPark()

    const { startPositions, startDir } = env.getStartSettings()

    for (let i = 0; i < 4; i++) {
        neuralNetworks.push(new NeuralNetwork(inputNodes, hiddenNodes, outputNodes))
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

    constructor() {
        this.bestScore = 0
        this.scoreHistory = []
        this.epsilonMax = 0.5
        this.epsilonMin = 0.01
        this.bestBrains = [new NeuralNetwork(inputNodes, hiddenNodes, outputNodes)]
        this.trainingPhase = 0

        while (this.races.length < 10) {
            this.races.push(getNewRace())
        }
    }

    epsilonMutate(epoch: number) {
        const epsilon = this.epsilonMax - ((this.epsilonMax - this.epsilonMin) * (epoch / exploreEpoch));
        if (this.epoch % 1000 == 0) {
            console.log(epsilon)
        }
        return epsilon
    }

    exploration(renderer: Renderer) {
        // lets the agent explore the environment by somethimes picking random actions

        for (let epoch = 0; epoch < exploreEpoch; epoch++) {

            // run all races
            this.races.forEach(race => {
                while (!race.finished()) {
                    race.run()
                }
            })


            const brainScores: BrainScore[] = []

            let allVelocityMagnitudes: number[] = []
            this.races.forEach(race => {
                const highscore = Math.max(...race.agents.map(a => a.score))
                const bestIndex = race.agents.map(a => a.score).indexOf(highscore)
                const bestNeuralnet = race.neuralNets[bestIndex]
                brainScores.push({ nn: bestNeuralnet, score: highscore })
                allVelocityMagnitudes = allVelocityMagnitudes.concat(race.agents.map(a => a.maxVelMag))
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
            const mutRate = this.epsilonMutate(epoch)
            for (let i = 0; i < this.races.length; i++) {
                const race = this.races[i]
                race.reset()
                race.neuralNets = []
                race.neuralNets.push(a1.nn.copy().mutate(mutRate))
                race.neuralNets.push(a1.nn.copy().mutate(mutRate))
                race.neuralNets.push(a1.nn.copy().mutate(mutRate))
                race.neuralNets.push(a1.nn.copy().mutate(mutRate))
            }

            this.races.forEach(r => {
                if (r.maxVelMag > this.globalMaxVelMag) {
                    this.globalMaxVelMag = r.maxVelMag
                }
            })

            this.races.forEach(r => {
                r.maxVelMag = this.globalMaxVelMag
            })

        }

        this.races[0].maxSteps = 2000
        this.races[0].neuralNets = []
        for (let i = 0; i < 4; i++) {
            this.races[0].neuralNets.push(this.bestBrains[i].copy())
        }

        renderer.renderScoreHistory(this.scoreHistory)
        console.log("exploration finished!")
    }
}