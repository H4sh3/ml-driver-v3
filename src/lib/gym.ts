import Vector from "./vector";
import { Agent } from "./agent";
import { Environment } from "./environment";
import { Renderer } from "./render";
import { flatten, mapValue, scale, rotate, translate, otherAgentAsInput as posRelativeToAgent } from "./helpers";
import NeuralNetwork from "./nn";
import { LocalStorageManager } from "./storage";
import { actions, numAgents } from "./config";
import { Race } from "./race";

const numRaces = 20

const inputCheckpoints = 10
const velocityInput = 1
const hasPowerupInputs = 2
const boostActive = 1
const inputNodes = (inputCheckpoints * 2) + velocityInput + hasPowerupInputs + boostActive
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

export const getNewRace = () => {
    const neuralNetworks: NeuralNetwork[] = []
    const agents = []

    const env = new Environment()

    const { startPosition, startDir } = env.getStartSettings()

    for (let i = 0; i < numAgents; i++) {
        neuralNetworks.push(getNN())
        agents.push(new Agent(startPosition, startDir))
    }
    
    return new Race(agents, env, neuralNetworks)
}

interface BrainScore {
    nn: any
    score: number
}

export class Gym {
    agent: Agent
    environment: Environment
    storage:LocalStorageManager

    epoch: number = 0
    exploreEpoch: number = 2500
    exploring: boolean = true

    step: number
    maxSteps: number
    failed: boolean

    bestScore: number
    rotatedCheckpoints: Vector[]
    activeCheckpoints: Vector[]

    scoreHistory: number[]
    bestBrains: NeuralNetwork[]

    epsilonMax: number
    epsilonMin: number
    globalMaxVelMag:number = 1

    races: Race[] = []


    constructor() {
        this.bestScore = 0
        this.scoreHistory = []
        this.epsilonMax = 0.5
        this.epsilonMin = 0.01

        while (this.races.length < numRaces) {
            this.races.push(getNewRace())
        }

        const stored = LocalStorageManager.getObject('bestBrain')

        this.bestBrains = []

        if(stored != undefined){
            console.log("using stored brain")
            this.bestBrains.push(stored.copy())
            this.bestBrains.push(stored.copy())
            this.bestBrains.push(stored.copy())
            this.bestBrains.push(stored.copy())

            this.races[0].neuralNets = []

            while(this.races[0].neuralNets.length < numAgents){
                this.races[0].neuralNets.push(stored.copy())
            }
        }else{
            console.log("using new brains")
            this.bestBrains.push(getNN())
            this.bestBrains.push(getNN())            
        }
    }

    epsilonMutate(epoch: number) {
        return this.epsilonMax - ((this.epsilonMax - this.epsilonMin) * (epoch / this.exploreEpoch));
    }

    exploration(renderer: Renderer) {
        // lets the agent explore the environment by somethimes picking random actions

        while (this.epoch < this.exploreEpoch) {
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
                console.log(`Exploration score: ${highscore} in ${this.epoch}/${this.exploreEpoch}`)
            }

            const bestScore = Math.max(...this.scoreHistory)
            if(highscore > bestScore){
                this.scoreHistory.push(highscore)
            }else{
                this.scoreHistory.push(bestScore)
            }

            // keep best
            const a1 = this.bestBrains[0]
            const a2 = this.bestBrains[1]

            //const a1 = brainScores[0].nn
            //const a2 = brainScores[1].nn
            const mutRate = this.epsilonMutate(this.epoch)

            for (let i = 0; i < this.races.length / 2; i++) {
                const race = this.races[i]
                race.reset()
                race.neuralNets = []

                const nn1 = a1.copy()
                nn1.mutate(mutRate)
                race.neuralNets.push(nn1)

                const nn2 = a2.copy()
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

            this.epoch++

            // return every few epochs to render progress
            if (this.epoch % 100 == 0) {
                console.log(`${this.epoch} / ${this.exploreEpoch}: ${this.bestScore}`)
                return
            }
        }

        LocalStorageManager.saveObject('bestBrain', this.bestBrains[0])

        this.races[0].maxSteps = 2000
        this.races[0].neuralNets = []
        for (let i = 0; i < numAgents; i++) {
            this.races[0].neuralNets.push(this.bestBrains[i].copy())
        }

        renderer.renderScoreHistory(this.scoreHistory)

        this.exploring = false
        console.log("exploration finished!")
    }
}