import { Agent } from "./agent";
import { Environment } from "./environment";
import { NeuralNetwork } from "brain.js"
import Vector from "./vector";
import { flatten, mapValue, normalize, randomArray, rotate, transpose } from "./helpers";


const inputCheckpoints = 4
const inputNodes = (inputCheckpoints * 2) + 1
const outputNodes = 2
const hiddenNodes = Math.floor((inputNodes + outputNodes) / 2)

const brainConfig = {
    binaryThresh: 0.5,
    inputSize: inputNodes, // +1 = vel
    outputSize: outputNodes,
    hiddenLayers: [hiddenNodes, hiddenNodes], // array of ints for the sizes of the hidden layers in the network
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
    failed: boolean

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
        // this.environment.initCircleTrack()
        this.environment.initSinTrack()
        this.reset()

        this.scoreCount = new Map()
    }

    reset() {
        this.failed = false
        this.currentMemory = []
        this.count = 0
        const startPos = this.environment.getStartPosition()
        const startDir = this.environment.getStartDirection()
        this.agent = new Agent(startPos, new Vector(1, 0).rotate(startDir))
    }

    exploration() {
        // lets the agent explore the environment by somethimes picking random actions
        while (this.epoch < this.exploreEpoch) {

            // run till finished -> then evaluate
            while (!this.finished()) {
                this.run(true)
            }
            if (this.agent.score > this.bestScore) {
                console.log(`Exploration score: ${this.agent.score} / ${this.bestScore} in ${this.epoch}/${this.exploreEpoch}`)
            }
            this.evaluate()
        }
    }

    finished() {
        return this.count >= this.maxCount || this.environment.hasAgentLeftCourse(this.agent) || this.failed
    }

    runEvaluation() {
        this.reset()

        // run till finished
        while (!this.finished()) {
            this.run(false)
        }
        const score = this.agent.score
        this.reset()

        return score
    }

    forget() {
        while (this.memoryData.length > 1000) {
            this.memoryData.splice(Math.floor(Math.random() * this.memoryData.length), 1);
        }
    }

    trainNetwork(trainingsData: Memory[], learningRate: number) {
        if (trainingsData.length == 0) return

        const trainingsConfig = {
            errorThresh: 0.005,
            iterations: 10000,
            learningRate: learningRate
        }

        trainingsData = shuffle(trainingsData)

        // batch training with 25%
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

            // add memories with reward and previous n to trainingsdata
            const rewardIndexes = this.currentMemory.filter(c => c.reward == 1).reduce((acc, c) => [...acc, this.currentMemory.indexOf(c)], [])
            let newMemories: Memory[] = []
            rewardIndexes.forEach(r => {
                newMemories = newMemories.concat(this.currentMemory.slice(r - 5, r))
            })

            this.forget()

            const backupBrain = this.brain.toJSON()

            this.trainNetwork([...this.memoryData, ...newMemories], this.learningRate)


            if (this.gotTrained) {
                const evalScore = this.runEvaluation()
                console.log(`Eval Score: ${evalScore}`)
                if (evalScore >= this.bestScore) {
                    this.bestScore = evalScore
                    this.memoryData = this.memoryData.concat(newMemories)

                    if (this.bestScore >= 50) {
                        this.epoch = this.exploreEpoch
                    }
                } else {
                    // evalualtion resulted in worse performance
                    this.brain = this.brain.fromJSON(backupBrain)
                }
            }
        }

        this.epoch++
        this.reset()
    }

    run(explore: boolean) {
        const checkpoints = this.environment.getCheckpoints(inputCheckpoints, this.agent.score)
        this.activeCheckpoints = checkpoints

        let reward = 0
        // update score if agent is close to target
        const reachedCheckpoint = this.agent.pos.dist(checkpoints[0]) < 40

        // check if it reached a differen cp first
        this.failed = checkpoints.slice(1, checkpoints.length - 1).some(c => this.agent.pos.dist(c) < 40)

        // ignore first few rewards
        const relevantCheckpoint = this.count > 25

        if (reachedCheckpoint) {
            this.agent.score++
        }

        if (reachedCheckpoint && relevantCheckpoint) {
            reward = 1
        }

        const transposed = transpose(checkpoints, this.agent.pos)
        const rotated = rotate(transposed, -this.agent.direction.heading())
        const normalized = normalize(rotated)
        const inputs = flatten(normalized)//.map(v => mapValue(v, -1, 1, 0, 1))
        inputs.push(mapValue(this.agent.vel.mag(), 0, 5, -1, 1))

        let output: number[] = randomArray(brainConfig.outputSize)
        if (explore) {
            if (Math.random() > 0.15 && this.gotTrained) {
                output = this.agent.predict(this.brain, inputs)
            }
        } else {
            // normal run no explore
            output = this.agent.predict(this.brain, inputs)
        }
        this.currentMemory.push({ "input": [...inputs], "output": [...output], "reward": reward })

        // update agents position
        const steerOutput = output[0]
        const accelerationOutpupt = output[1]
        this.agent.update(steerOutput, accelerationOutpupt)

        this.count++

        // for visualization
        this.rotatedCheckpoints = rotated
    }
}