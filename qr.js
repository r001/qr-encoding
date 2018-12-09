const program = require('commander');
// Require logic.js file and extract controller functions using JS destructuring assignment
const { encode, decode } = require('./code');

program
  .version('0.0.1')
  .description('Ethereum transaction and message encoder/decoder');

program
  .command('encode <jsondata>')
  .alias('e')
  .description('Encode ethereum transaction or message to numeric data')
  .action((jsondata) => {
    encode(jsondata);
  });

program
  .command('decode <numeric>')
  .alias('d')
  .description('Decode numeric transaction or message to json')
  .action(numeric => decode(numeric));

program.parse(process.argv);
