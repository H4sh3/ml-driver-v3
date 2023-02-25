const { Dann } = require('dannjs');

export const getNN = () => {
    const nn = new Dann(4, 2);
    nn.addHiddenLayer(6, 'leakyReLU');
    nn.addHiddenLayer(6, 'leakyReLU');
    nn.outputActivation('tanH');
    nn.makeWeights();
    nn.lr = 0.0001;
}
nn.log({ details: true });