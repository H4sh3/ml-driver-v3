import { Agent } from "./agent";
import { Environment } from "./environment";
import { NeuralNetwork } from "brain.js"
import Vector from "./vector";
import { flatten, mapValue, normalize, rotate, transpose } from "./helpers";


const inputCheckpoints = 3

const brainConfig = {
    binaryThresh: 0.5,
    inputSize: (inputCheckpoints * 2) + 1, // +1 = vel
    outputSize: 2,
    hiddenLayers: [3, 3], // array of ints for the sizes of the hidden layers in the network
    activation: 'sigmoid', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
}

interface Memory {
    input: number[]
    output: number[]
    reward: number
}


interface Statistics {
    hits: number
    misses: number
}



function shuffle(a: Memory[]) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
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
    scoreCount: Map<number, number>

    constructor() {
        this.explore = true

        this.memoryData = []

        this.statistics = {
            hits: 0,
            misses: 0
        }

        this.maxCount = 500

        this.epoch = 1
        this.exploreEpoch = 50000 // 200k got 100% hit rate
        this.gotTrained = false

        this.startLearningRate = 0.85
        this.learningRate = this.startLearningRate
        this.brain = new NeuralNetwork(brainConfig)
        this.bestScore = 0

        this.needsTraining = false

        this.environment = new Environment()
        this.environment.initSinTrack()
        this.init()

        this.scoreCount = new Map()
    }

    init() {
        this.currentMemory = []
        this.count = 0
        const startPos = this.environment.getStartPosition()
        const startDir = this.environment.getStartDirection()
        this.agent = new Agent(startPos, new Vector(1, 0).rotate(startDir))
    }

    exploration() {
        // lets the agent explore the environment by somethimes picking random actions

        while (this.epoch < this.exploreEpoch) {
            this.run()
        }
        this.explore = false
        console.log("Initial Training Finished!")
        // forget random training data
        const trainingsConfig = {
            errorThresh: 0.005,
            iterations: 100000,
            learningRate: 0.85
        }
        this.brain.train(this.memoryData, trainingsConfig)

        this.gotTrained = true
    }

    runEvaluation() {
        console.log(`starting eval at ${this.epoch}`)
        while (this.epoch < this.exploreEpoch + 1) {
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
        if (trainingsData.length == 0) return
        // forget random training data
        const trainingsConfig = {
            errorThresh: 0.005,
            iterations: 10000,
            learningRate: learningRate
        }

        trainingsData = shuffle(trainingsData)
        // trainingsData = trainingsData.slice(0, Math.floor(trainingsData.length * 0.25))
        console.log(`training with ${trainingsData.length} entries`)
        this.brain.train(trainingsData, trainingsConfig)
        this.gotTrained = true
    }

    evaluate() {

        if (this.scoreCount.has(this.agent.score)) {
            this.scoreCount.set(this.agent.score, this.scoreCount.get(this.agent.score) + 1)
        } else {
            this.scoreCount.set(this.agent.score, 1)
        }

        if (this.agent.score > this.bestScore) {
            this.needsTraining = true
            this.bestScore = this.agent.score

            console.log(`SCORE: ${this.agent.score} in ${this.epoch}`)

            // this.memoryData = []

            // search entries that have a reward
            // this.memoryData = this.memoryData.concat(this.currentMemory.filter(c => c.reward == 1))

            // add memories with reward and previous n to trainingsdata
            const rewardIndexes = this.currentMemory.filter(c => c.reward == 1).reduce((acc, c) => [...acc, this.currentMemory.indexOf(c)], [])
            rewardIndexes.forEach(r => {
                this.memoryData = this.memoryData.concat(this.currentMemory.slice(r - 5, r))
            })

            this.forget()
            this.trainNetwork(this.memoryData, this.learningRate)
        }


        if (!this.explore) {
            console.log(`Eval score ${this.agent.score}`)
            /* console.log(this.scoreCount) */
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

        let gotReward = false
        // update score if agent is close to target
        if (this.agent.pos.dist(checkpoints[0]) < 40) {
            this.agent.score++

            if (this.count > 25) {
                gotReward = true
            }
        }

        const transposed = transpose(checkpoints, this.agent.pos)
        const rotated = rotate(transposed, -this.agent.direction.heading())
        const normalized = normalize(rotated)
        const inputs = flatten(normalized).map(v => mapValue(v, -1, 1, 0, 1))

        this.rotatedCheckpoints = rotated

        inputs.push(mapValue(this.agent.vel, 0, 4, -1, 1))

        let output: number[] = []
        for (let i = 0; i < brainConfig.outputSize; i++) {
            output.push(Math.random())
        }

        if (this.explore) {
            if (Math.random() > 0.15 && this.gotTrained) {
                output = this.agent.predict(this.brain, inputs)
            }
        } else {
            // normal run no explore
            output = this.agent.predict(this.brain, inputs)
        }

        this.agent.direction.rotate(mapValue(output[0], 0, 1, 15, -15))

        this.currentMemory.push({ "input": [...inputs], "output": [...output], "reward": gotReward ? 1 : 0 })

        this.agent.vel += mapValue(output[1], 0, 1, 0, 1)

        // update agents position
        this.agent.update()


        this.count++

        if (this.count >= this.maxCount || this.environment.hasAgentLeftCourse(this.agent)) {
            this.evaluate()
        }
    }
}