import styles from './styles.css';
import parcel from 'url:./parcel.webp';
import {message} from './message';

import('./async');
import('./async2');

new Worker('worker.js');

console.log(message);
console.log('hi');
console.log('hello');
console.log(hi);

// const message = require('./message');
// const fs = require('fs');

// console.log(message);
// console.log(fs.readFileSync(__dirname + '/test.txt', 'utf8'));

// class Test {}
