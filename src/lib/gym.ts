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

const trainingEpochs = 150000

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
    mutateBrain: NeuralNetwork
    bestMutateBrain: NeuralNetwork

    epsilonMax: number
    epsilonMin: number

    constructor() {

        this.maxSteps = 500

        this.epoch = 1
        this.exploreEpoch = trainingEpochs // 200k got 100% hit rate

        this.env = new DQNEnv(inputNodes, outputNodes, inputNodes, outputNodes)

        const opt = new DQNOpt();
        opt.setTrainingMode(true);
        opt.setNumberOfHiddenUnits([hiddenNodes]);  // mind the array here, currently only one layer supported! Preparation for DNN in progress...
        opt.setEpsilonDecay(1, 0.05, trainingEpochs * 10);
        opt.setEpsilon(0);
        opt.setGamma(0.8);
        opt.setAlpha(0.015);
        opt.setLossClipping(false);
        opt.setLossClamp(1);
        opt.setRewardClipping(false);
        opt.setRewardClamp(5);
        opt.setExperienceSize(1e6);
        opt.setReplaySteps(10);

        this.bestScore = 0

        this.environment = new Environment(false)
        // this.environment.initCircleTrack()
        // this.environment.initSinTrack()
        // this.environment.initRandomTrack()
        this.environment.initBPark()

        this.reset()
        this.scoreHistory = []

        this.mutateBrain = new NeuralNetwork(inputNodes, hiddenNodes, outputNodes)
        this.bestMutateBrain = this.mutateBrain.copy()

        this.epsilonMax = 0.5
        this.epsilonMin = 0.01
    }

    epsilonMutate() {
        const epsilon = this.epsilonMax - ((this.epsilonMax - this.epsilonMin) * (this.epoch / this.exploreEpoch));
        if (this.epoch % 1000 == 0) {
            console.log(epsilon)
        }
        return epsilon
    }

    reset() {
        this.failed = false
        this.step = 0
        const { startPos, startDir } = this.environment.getStartSettings()
        this.agent = new Agent(startPos, startDir)
    }

    exploration(renderer: Renderer) {
        // lets the agent explore the environment by somethimes picking random actions

        const finished = this.epoch >= this.exploreEpoch || this.bestScore > 200

        if (!finished) {
            for (let i = 0; i < this.exploreEpoch / 100; i++) {

                while (!this.finished()) {
                    this.run()
                }

                const newBestScore = this.agent.score > this.bestScore
                if (newBestScore) {
                    this.bestScore = this.agent.score
                    console.log(`Exploration score: ${this.agent.score} in ${this.epoch}/${this.exploreEpoch}`)

                }

                if (newBestScore) {
                    this.bestMutateBrain = this.mutateBrain.copy()
                    this.mutateBrain.mutate(this.epsilonMutate())
                } else {
                    this.mutateBrain = this.bestMutateBrain.copy()
                    this.mutateBrain.mutate(this.epsilonMutate())
                }

                this.scoreHistory.push(this.agent.score)

                this.epoch++
                this.reset()

            }

        } else {
            this.mutateBrain = this.bestMutateBrain.copy()
        }

        renderer.renderScoreHistory(this.scoreHistory)

        return finished

    }

    finished() {
        const failed = this.failed
        const outOfTime = this.step >= this.maxSteps
        const leftCourse = this.environment.hasAgentLeftCourse(this.agent)
        return failed || outOfTime || leftCourse
    }


    run() {
        const { inputs, checkpoints, rotated } = getInputs(this.environment, this.agent)
        this.activeCheckpoints = checkpoints
        this.rotatedCheckpoints = rotated

        let action = this.mutateBrain.predict(inputs)

        let steeringChange = 0
        let accChange = 0

        if (action <= steeringActions.length - 1) {
            steeringChange = steeringActions[action]
        } else if (action > steeringActions.length - 1 && action < actions.length - 1) {
            accChange = accActions[action - steeringActions.length]
        } else {

        }

        this.agent.update(steeringChange, accChange)

        // things that let the agent lose and stop the current round
        const startPos = this.environment.checkpoints[this.environment.startCheckpoint]
        const didNotMove = this.agent.pos.dist(startPos) < 50 && this.agent.score < 5 && this.step > 100
        const collectedWrongCP = checkpoints.slice(1, checkpoints.length - 1).some(c => this.agent.pos.dist(c) < 40)
        const leftCourse = this.environment.hasAgentLeftCourse(this.agent)
        this.failed = didNotMove || collectedWrongCP || leftCourse

        // update score if agent is close to target
        const reachedCheckpoint = this.agent.pos.dist(checkpoints[0]) < 40
        let reward = -0.1
        if (reachedCheckpoint) {
            this.agent.score++
            reward = this.agent.score
        }

        if (didNotMove) {
            reward = -5
        }
        if (collectedWrongCP) {
            reward = -5
        }
        if (leftCourse) {
            reward = -1
        }

        this.step++
    }
}