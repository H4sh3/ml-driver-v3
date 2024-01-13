// Toy neural network from Daniel Shiffman
// https://github.com/CodingTrain/Toy-Neural-Network-JS/tree/master/lib

import { Matrix } from "./matrix";

type ValueFunc = (v: number) => number

class ActivationFunction {
  func: ValueFunc
  dfunc: ValueFunc
  constructor(func: ValueFunc, dfunc: ValueFunc) {
    this.func = func;
    this.dfunc = dfunc;
  }
}

let sigmoid = new ActivationFunction(
  x => 1 / (1 + Math.exp(-x)),
  y => y * (1 - y)
);

let tanh = new ActivationFunction(
  x => Math.tanh(x),
  y => 1 - (y * y)
);


class NeuralNetwork {
  input_nodes: number;
  hidden_nodes: number[];
  output_nodes: number;
  weights: Matrix[];
  biases: Matrix[];
  activation_function: ActivationFunction;
  learning_rate: number;

  constructor(input_nodes: number, hidden_nodes: number[], output_nodes: number) {
    this.input_nodes = input_nodes;
    this.hidden_nodes = hidden_nodes;
    this.output_nodes = output_nodes;

    this.weights = [];
    this.biases = [];

    // Initialize weights and biases for all layers
    let nodes_previous_layer = this.input_nodes;
    for (let i = 0; i < this.hidden_nodes.length; i++) {
      this.weights[i] = new Matrix(this.hidden_nodes[i], nodes_previous_layer);
      this.weights[i].randomize();
      this.biases[i] = new Matrix(this.hidden_nodes[i], 1);
      this.biases[i].randomize();
      nodes_previous_layer = this.hidden_nodes[i];
    }
    // Initialize weights and biases for the output layer
    this.weights.push(new Matrix(this.output_nodes, nodes_previous_layer));
    this.weights[this.weights.length - 1].randomize();
    this.biases.push(new Matrix(this.output_nodes, 1));
    this.biases[this.biases.length - 1].randomize();

    this.setLearningRate();
    this.setActivationFunction();
  }
  
  predict(input_array: number[]): number[] {
    // Convert input array to matrix
    let inputs = Matrix.fromArray(input_array);
  
    // Forward propagation through each layer
    let current_output = inputs;
    for (let i = 0; i < this.weights.length; i++) {
      current_output = Matrix.multiply(this.weights[i], current_output);
      current_output.add(this.biases[i]);
      current_output.map(this.activation_function.func);
    }
  
    // Convert output matrix to array and return
    return current_output.toArray();
  }

  setLearningRate(learning_rate = 0.1) {
    this.learning_rate = learning_rate;
  }

  setActivationFunction(func = sigmoid) {
    this.activation_function = func;
  }

  train(input_array: number[], target_array: number[]) {
    // Convert arrays to matrix objects
    let inputs = Matrix.fromArray(input_array);
    let targets = Matrix.fromArray(target_array);
  
    // Forward propagation (same as in predict)
    let outputs = [];
    outputs.push(inputs);
    for (let i = 0; i < this.weights.length; i++) {
      let input = outputs[outputs.length - 1];
      let output = Matrix.multiply(this.weights[i], input);
      output.add(this.biases[i]);
      output.map(this.activation_function.func);
      outputs.push(output);
    }
  
    // Backpropagation
    let errors = Matrix.subtract(targets, outputs[outputs.length - 1]);
    for (let i = this.weights.length - 1; i >= 0; i--) {
      let output = outputs[i + 1];
      let gradients = Matrix.map(output, this.activation_function.dfunc);
      gradients.multiply(errors);
      gradients.multiply(this.learning_rate);
  
      let inputs_transposed = Matrix.transpose(outputs[i]);
      let weight_deltas = Matrix.multiply(gradients, inputs_transposed);
  
      this.weights[i].add(weight_deltas);
      this.biases[i].add(gradients);
  
      if (i !== 0) {
        let weights_transposed = Matrix.transpose(this.weights[i]);
        errors = Matrix.multiply(weights_transposed, errors);
      }
    }
  }

  serialize() {
    return JSON.stringify(this);
  }

  static deserialize(data: any) {
    if (typeof data == 'string') {
      data = JSON.parse(data);
    }

    let tdata = data as NeuralNetwork
    let nn = new NeuralNetwork(data.input_nodes, data.hidden_nodes, data.output_nodes);

    nn.weights = tdata.weights
    nn.biases = tdata.biases
    nn.activation_function = tdata.activation_function
    nn.learning_rate = tdata.learning_rate

    return nn;
  }

  copy() {
    return NeuralNetwork.deserialize(this.serialize())
  }

  mutate(mutationRate: number) {
    function mutateValue(val: number): number {
      if (Math.random() < mutationRate) {
        // This is just one way to mutate the value; there are many others.
        // You can choose to add/subtract a small value, or completely replace it.
        return val + randomGaussian() * 0.1; // Adjust the 0.1 factor to control mutation magnitude
      } else {
        return val;
      }
    }
  
    // Apply the mutation to all weights
    for (let i = 0; i < this.weights.length; i++) {
      let weight = this.weights[i];
      for (let j = 0; j < weight.rows; j++) {
        for (let k = 0; k < weight.cols; k++) {
          weight.data[j][k] = mutateValue(weight.data[j][k]);
        }
      }
    }
  
    // Apply the mutation to all biases
    for (let i = 0; i < this.biases.length; i++) {
      let bias = this.biases[i];
      for (let j = 0; j < bias.rows; j++) {
        for (let k = 0; k < bias.cols; k++) {
          bias.data[j][k] = mutateValue(bias.data[j][k]);
        }
      }
    }
  }
}

export function randn_bm() {
  var u = 0, v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function randomGaussian() {
  const sd = 1
  let y1, x1, x2, w;
  let y2 = 0
  do {
    x1 = (Math.random() * 2) - 1;
    x2 = (Math.random() * 2) - 1;
    w = x1 * x1 + x2 * x2;
  } while (w >= 1);
  w = Math.sqrt(-2 * Math.log(w) / w);
  y1 = x1 * w;
  y2 = x2 * w;

  return y1 * sd;
};

export default NeuralNetwork;
