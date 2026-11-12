import { createCanvas } from '@napi-rs/canvas';
const canvas = createCanvas(200, 200);
console.log(typeof canvas.toBuffer);
try {
  console.log(canvas.toBuffer('image/png').length);
} catch(e) {
  console.log('Error with format:', e.message);
}
try {
  console.log(canvas.toBuffer().length);
} catch(e) {
  console.log('Error without format:', e.message);
}