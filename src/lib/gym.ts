import Vector from "./vector";
import { Agent } from "./agent";
import { Environment } from "./environment";
import { Renderer } from "./render";
import { flatten, mapValue, scale, rotate, translate } from "./helpers";

import { DQNSolver, DQNOpt, DQNEnv } from 'reinforce-js';

import { deepqlearn } from "convnetjs-ts";
import NeuralNetwork from "./nn";

const inputCheckpoints = 5
const inputNodes = (inputCheckpoints * 2)// + 1

export const steeringActions = [-16, -8, -5, -3, 0, 3, 5, 8, 16]
export const accActions = [0, 0.1, .25, 0.5, 1, 1.5, 2, 3]

const actions = [...steeringActions, ...accActions]
const outputNodes = actions.length + 1 // last action is do nothing
const hiddenNodes = Math.floor((inputNodes + outputNodes) / 2)


enum TrainingsMethodEnum {
    Genetic = "Genetic",
    DQN = "DQN"
}
const trainingsMethod: TrainingsMethodEnum = TrainingsMethodEnum.Genetic
console.log(`Trainings method: ${trainingsMethod}`)

export const getInputs = (environment: Environment, agent: Agent) => {
    const checkpoints = environment.getCheckpoints(inputCheckpoints, agent.score)
    const translated = translate(checkpoints, agent.pos)
    const rotated = rotate(translated, -agent.direction.heading())
    const scaled = scale(rotated)
    const inputs = flatten(scaled).map(v => mapValue(v, -1, 1, 0, 1))

    let velInput = mapValue(agent.vel.mag(), 0, 7, 0, 1)
    velInput = velInput > 1 ? 1 : velInput
    // inputs.push(velInput)

    return { inputs, checkpoints, rotated, translated }
}

class Race {
    agents: Agent[]
    neuralNets: NeuralNetwork[]
    environment: Environment
    step: number
    maxSteps: number = 500

    constructor(agents: Agent[], environment: Environment, neuralNets: NeuralNetwork[]) {
        this.agents = agents
        this.environment = environment
        this.neuralNets = neuralNets
        this.step = 0
    }

    finished() {
        const failed = this.agents.every(a => !a.alive)
        const outOfTime = this.step >= this.maxSteps

        // if (failed) console.log("failed")
        // if (outOfTime) console.log("outOfTime")

        return failed || outOfTime
    }


    run() {

        for (let i = 0; i < this.agents.length; i++) {

            const agent = this.agents[i]
            const neuralNet = this.neuralNets[i]

            const { inputs, checkpoints, rotated } = getInputs(this.environment, agent)

            // for vis
            // const activeCheckpoints = checkpoints
            // const rotatedCheckpoints = rotated

            let action = neuralNet.predict(inputs)

            let steeringChange = 0
            let accChange = 0

            if (action <= steeringActions.length - 1) {
                steeringChange = steeringActions[action]
            } else if (action > steeringActions.length - 1 && action < actions.length - 1) {
                accChange = accActions[action - steeringActions.length]
            } else {

            }

            agent.update(steeringChange, accChange)

            // things that let the agent lose and stop the current round
            const startPos = this.environment.checkpoints[this.environment.startCheckpoint]
            const didNotMove = agent.pos.dist(startPos) < 50 && agent.score < 5 && this.step > 100
            const collectedWrongCP = checkpoints.slice(1, checkpoints.length - 1).some(c => agent.pos.dist(c) < 40)
            const leftCourse = this.environment.hasAgentLeftCourse(agent)

            if (didNotMove || collectedWrongCP || leftCourse) {
                agent.alive = false
            }

            // update score if agent is close to target
            const reachedCheckpoint = agent.pos.dist(checkpoints[0]) < 40

            if (reachedCheckpoint) {
                agent.score++
            }

        }

        this.step++
    }

    reset() {
        this.step = 0
        const { startPositions, startDir } = this.environment.getStartSettings()
        this.agents.sort((a, b) => 0.5 - Math.random());
        for (let i = 0; i < this.agents.length; i++) {
            this.agents[i].alive = true
            this.agents[i].score = 0
            this.agents[i].pos = startPositions[i].copy()
            this.agents[i].direction = startDir.copy()
        }
    }

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

    // todo tune width height
    bestBrain: NeuralNetwork

    epsilonMax: number
    epsilonMin: number

    race: Race

    constructor() {

        this.bestScore = 0
        this.scoreHistory = []

        this.bestBrain = new NeuralNetwork(inputNodes, hiddenNodes, outputNodes)

        this.epsilonMax = 0.5
        this.epsilonMin = 0.01

        this.exploreEpoch = 500
        // race wrapper

        const neuralNetworks = []
        const agents = []

        const env = new Environment(false)
        env.initBPark()
        const { startPositions, startDir } = env.getStartSettings()

        for (let i = 0; i < 4; i++) {
            neuralNetworks.push(new NeuralNetwork(inputNodes, hiddenNodes, outputNodes))
            agents.push(new Agent(startPositions[i], startDir))
        }

        this.race = new Race(agents, env, neuralNetworks)
    }

    epsilonMutate(epoch: number) {
        const epsilon = this.epsilonMax - ((this.epsilonMax - this.epsilonMin) * (epoch / this.exploreEpoch));
        if (this.epoch % 1000 == 0) {
            console.log(epsilon)
        }
        return epsilon
    }

    exploration(renderer: Renderer) {
        // lets the agent explore the environment by somethimes picking random actions

        for (let epoch = 0; epoch < this.exploreEpoch; epoch++) {

            while (!this.race.finished()) {
                this.race.run()
            }


            const highscore = Math.max(...this.race.agents.map(a => a.score))
            const bestIndex = this.race.agents.map(a => a.score).indexOf(highscore)
            const bestNeuralnet = this.race.neuralNets[bestIndex]

            if (highscore > this.bestScore) {
                this.bestScore = highscore
                this.bestBrain = bestNeuralnet
                console.log(`Exploration score: ${highscore} in ${epoch}/${this.exploreEpoch}`)
            }

            this.race.neuralNets = [this.bestBrain.copy()]

            while (this.race.neuralNets.length < this.race.agents.length) {
                const brain = this.bestBrain.copy()
                brain.mutate(this.epsilonMutate(epoch))
                this.race.neuralNets.push(brain)
            }

            this.scoreHistory.push(highscore)

            this.race.reset()
        }

        renderer.renderScoreHistory(this.scoreHistory)
        console.log("exploration finished!")
    }
}