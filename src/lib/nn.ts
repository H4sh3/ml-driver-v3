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
  input_nodes: number
  hidden_nodes: number
  output_nodes: number
  weights_ih: Matrix
  weights_ho: Matrix
  bias_h: Matrix
  bias_o: Matrix
  activation_function: ActivationFunction
  learning_rate: number

  constructor(in_nodes: number, hid_nodes: number, out_nodes: number) {

    this.input_nodes = in_nodes;
    this.hidden_nodes = hid_nodes;
    this.output_nodes = out_nodes;

    this.weights_ih = new Matrix(this.hidden_nodes, this.input_nodes);
    this.weights_ho = new Matrix(this.output_nodes, this.hidden_nodes);
    this.weights_ih.randomize();
    this.weights_ho.randomize();

    this.bias_h = new Matrix(this.hidden_nodes, 1);
    this.bias_o = new Matrix(this.output_nodes, 1);
    this.bias_h.randomize();
    this.bias_o.randomize();

    // TODO: copy these as well
    this.setLearningRate();
    this.setActivationFunction();
  }

  predict(input_array: number[]) {

    // Generating the Hidden Outputs
    let inputs = Matrix.fromArray(input_array);
    let hidden = Matrix.multiply(this.weights_ih, inputs);
    hidden.add(this.bias_h);
    // activation function!
    hidden.map(this.activation_function.func);

    // Generating the output's output!
    let output = Matrix.multiply(this.weights_ho, hidden);
    output.add(this.bias_o);
    output.map(this.activation_function.func);

    // Sending back to the caller!
    const arr = output.toArray()
    const max = Math.max(...arr)
    return arr.indexOf(max);
  }

  setLearningRate(learning_rate = 0.1) {
    this.learning_rate = learning_rate;
  }

  setActivationFunction(func = sigmoid) {
    this.activation_function = func;
  }

  train(input_array: number[], target_array: number[]) {
    // Generating the Hidden Outputs
    let inputs = Matrix.fromArray(input_array);
    let hidden = Matrix.multiply(this.weights_ih, inputs);
    hidden.add(this.bias_h);
    // activation function!
    hidden.map(this.activation_function.func);

    // Generating the output's output!
    let outputs = Matrix.multiply(this.weights_ho, hidden);
    outputs.add(this.bias_o);
    outputs.map(this.activation_function.func);

    // Convert array to matrix object
    let targets = Matrix.fromArray(target_array);

    // Calculate the error
    // ERROR = TARGETS - OUTPUTS
    let output_errors = Matrix.subtract(targets, outputs);

    // let gradient = outputs * (1 - outputs);
    // Calculate gradient
    let gradients = Matrix.map(outputs, this.activation_function.dfunc);
    gradients.multiply(output_errors);
    gradients.multiply(this.learning_rate);


    // Calculate deltas
    let hidden_T = Matrix.transpose(hidden);
    let weight_ho_deltas = Matrix.multiply(gradients, hidden_T);

    // Adjust the weights by deltas
    this.weights_ho.add(weight_ho_deltas);
    // Adjust the bias by its deltas (which is just the gradients)
    this.bias_o.add(gradients);

    // Calculate the hidden layer errors
    let who_t = Matrix.transpose(this.weights_ho);
    let hidden_errors = Matrix.multiply(who_t, output_errors);

    // Calculate hidden gradient
    let hidden_gradient = Matrix.map(hidden, this.activation_function.dfunc);
    hidden_gradient.multiply(hidden_errors);
    hidden_gradient.multiply(this.learning_rate);

    // Calcuate input->hidden deltas
    let inputs_T = Matrix.transpose(inputs);
    let weight_ih_deltas = Matrix.multiply(hidden_gradient, inputs_T);

    this.weights_ih.add(weight_ih_deltas);
    // Adjust the bias by its deltas (which is just the gradients)
    this.bias_h.add(hidden_gradient);

    // outputs.print();
    // targets.print();
    // error.print();
  }

  serialize() {
    return JSON.stringify(this);
  }

  static deserialize(data: any) {
    if (typeof data == 'string') {
      data = JSON.parse(data);
    }
    let nn = new NeuralNetwork(data.input_nodes, data.hidden_nodes, data.output_nodes);
    nn.weights_ih = Matrix.deserialize(data.weights_ih);
    nn.weights_ho = Matrix.deserialize(data.weights_ho);
    nn.bias_h = Matrix.deserialize(data.bias_h);
    nn.bias_o = Matrix.deserialize(data.bias_o);
    nn.learning_rate = data.learning_rate;
    return nn;
  }

  copy() {
    const x = new NeuralNetwork(this.input_nodes, this.hidden_nodes, this.output_nodes)
    x.weights_ih = this.weights_ih.copy()
    x.weights_ho = this.weights_ho.copy()
    x.bias_h = this.bias_h.copy()
    x.bias_o = this.bias_o.copy()
    return x
  }

  mutate(learningRate: number) {

    function func(x: number) {
      if (Math.random() < learningRate) {
        let offset = randn_bm() * 0.5;
        let newx = x + offset;
        return newx;
      } else {
        return x;
      }
    }


    this.weights_ih.map(func);
    this.weights_ho.map(func);
    this.bias_h.map(func);
    this.bias_o.map(func);
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
