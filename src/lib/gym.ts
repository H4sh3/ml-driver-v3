import { Agent } from "./agent";
import { Environment } from "./environment";
import { NeuralNetwork } from "brain.js"
import Vector from "./vector";
import { flattenVectors, mapValue, normalizeVectors } from "./helpers";


const inputCheckpoints = 3

const brainConfig = {
    binaryThresh: 0.5,
    inputSize: (inputCheckpoints * 2),
    outputSize: 1,
    hiddenLayers: [4], // array of ints for the sizes of the hidden layers in the network
    activation: 'sigmoid', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
}

interface Memory {
    input: number[]
    output: number[]
}


interface Statistics {
    hits: number
    misses: number
}

export type NNT = NeuralNetwork<number[], number[]>

export class Gym {
    agent: Agent
    environment: Environment

    currentMemory: Memory[]
    memoryData: Memory[]
    statistics: Statistics

    epoch: number
    exploreEpoch: number
    explore: boolean
    startLearningRate: number
    learningRate: number
    gotTrained: boolean
    brain: NNT
    count: number
    maxCount: number
    bestScore: number
    rotatedCheckpoints: Vector[]
    needsTraining: boolean

    activeCheckpoints: Vector[]

    constructor() {
        this.explore = true

        this.memoryData = []

        this.statistics = {
            hits: 0,
            misses: 0
        }

        this.maxCount = 500

        this.epoch = 1
        this.exploreEpoch = 30000 // 200k got 100% hit rate
        this.gotTrained = false

        this.startLearningRate = 0.85
        this.learningRate = this.startLearningRate
        this.brain = new NeuralNetwork(brainConfig)
        this.bestScore = 0

        this.needsTraining = false

        this.environment = new Environment()
        this.init()
    }

    init() {
        this.currentMemory = []
        this.count = 0
        const startPos = this.environment.getStartPosition()
        const startDir = this.environment.getStartDirection()
        this.agent = new Agent(startPos, new Vector(1, 0).rotate(startDir))
    }

    runTraining() {
        while (this.epoch < this.exploreEpoch) {
            this.run()
        }
        this.explore = false
        console.log("Initial Training Finished!")
    }

    runEvaluation() {
        console.log(`starting eval at ${this.epoch}`)

        this.brain = new NeuralNetwork(brainConfig)
        this.brain.train(this.memoryData, { iterations: 100, learningRate: 0.9 })

        while (this.epoch < this.exploreEpoch + 1000) {
            this.run()
        }
        console.log(`finished eval at ${this.epoch}`)
    }

    forget() {
        while (this.memoryData.length > 1000) {
            this.memoryData.splice(Math.floor(Math.random() * this.memoryData.length), 1);
        }
    }

    trainNetwork(trainingsData: Memory[], learningRate: number) {
        // forget random training data
        this.brain.train(trainingsData, { iterations: 100, learningRate: learningRate })
        this.gotTrained = true
    }

    evaluate() {

        if (this.agent.score >= this.bestScore) {
            this.needsTraining = true
            this.bestScore = this.agent.score

            console.log(`SCORE: ${this.agent.score} in ${this.epoch}`)

            // this.memoryData = []

            this.currentMemory.forEach(memory => {
                this.memoryData.push(memory)
            })

            this.forget()
            this.trainNetwork(this.memoryData, this.learningRate)
        }


        if (!this.explore) {
            console.log(`Eval score ${this.agent.score}`)
        }

        this.epoch++
        this.init()

        if (this.epoch % (this.exploreEpoch / 10) === 0) {
            console.log(`${Math.floor((this.epoch / this.exploreEpoch) * 100)}% tdl: ${this.memoryData.length} lr:${this.learningRate}`)
        }

        if (this.epoch % (this.exploreEpoch / 100) === 0 && this.needsTraining) {
            if (this.memoryData.length == 0) return

            const newLR = this.startLearningRate // + ((0.90 - this.startLearningRate) * (this.epoch / this.exploreEpoch))
            if (newLR < 1) {
                this.learningRate = newLR
            }
            this.needsTraining = false
        }
    }

    run() {
        const checkpoints = this.environment.getCheckpoints(inputCheckpoints, this.agent.score)
        this.activeCheckpoints = checkpoints

        const relative = checkpoints.map(c => c.copy()).map(c => c.sub(this.agent.pos))
        //const rotated = relative.map(c => c.rotate(0))
        const rotated = relative.map(c => c.rotate(-this.agent.direction.heading()))

        this.rotatedCheckpoints = rotated

        const normalized = normalizeVectors(rotated)
        const inputs = flattenVectors(normalized)//.map(v => mapValue(v, -1, 1, 0, 1))

        let output: number[] = [Math.random()]
        if (this.explore) {
            if (Math.random() < 0.2 && this.epoch > 1 && this.gotTrained) {
                output = this.agent.predict(this.brain, inputs)
            }
        } else {
            // normal run no explore
            output = this.agent.predict(this.brain, inputs)
        }

        this.agent.direction.rotate(mapValue(output[0], 0, 1, -15, 15))

        this.currentMemory.push({ "input": [...inputs], "output": [...output] })

        // update agents position
        this.agent.update()

        // update score if agent is close to target
        if (this.agent.pos.dist(checkpoints[0]) < 25) {
            this.agent.score++
        }

        this.count++

        if (this.count >= this.maxCount || this.environment.hasAgentLeftCourse(this.agent)) {
            this.evaluate()
        }
    }
}