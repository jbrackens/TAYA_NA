var BOX = 1;
var CIRCLE = 2;
var POLY = 3;

var objects = [
{
	name: "ball",
	image: "ball.png",
	type: 1,
	width: 38,
	height: 38,
	frames: 1,
	bodyType: CIRCLE,
	remove: false,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8
},

{
	name: "platform1",
	image: "platform1.png",
	type: 2,
	width: 250,
	height: 24,
	frames: 4,
	animDelay: 4,
	bodyType: BOX,
	remove: false,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 0.9
},

{
	name: "platform2",
	image: "platform2.png",
	type: 2,
	width: 126,
	height: 24,
	frames: 2,
	animDelay: 4,
	bodyType: BOX,
	remove: false,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 0.9
},

{
	name: "circle1",
	image: "circle1.png",
	type: 0,
	width: 50,
	height: 50,
	frames: 1,
	bodyType: CIRCLE,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8
},

{
	name: "circle2",
	image: "circle2.png",
	type: 0,
	width: 28,
	height: 28,
	frames: 1,
	bodyType: CIRCLE,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8
},

{
	name: "neostar1",
	image: "neostar1.png",
	type: 0,
	width: 74,
	height: 74,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-26, -26], [26, -26], [26, 26], [-26, 26]],
		[[0, -37], [37, 0], [0, 37], [-37, 0]]
	]
},

{
	name: "pentagon1",
	image: "pentagon1.png",
	type: 0,
	width: 50,
	height: 47,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[0, -23], [25, -6], [15, 24], [-18, 24], [-25, -6]]
	]
},

{
	name: "rectangle1",
	image: "rectangle1.png",
	type: 0,
	width: 251,
	height: 27,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "rectangle2",
	image: "rectangle2.png",
	type: 0,
	width: 126,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "rectangle3",
	image: "rectangle3.png",
	type: 0,
	width: 101,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "rectangle4",
	image: "rectangle4.png",
	type: 0,
	width: 76,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "rectangle5",
	image: "rectangle5.png",
	type: 0,
	width: 51,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "rectangle6",
	image: "rectangle6.png",
	type: 0,
	width: 76,
	height: 50,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "slippyrectangle1",
	image: "slippyrectangle1.png",
	type: 0,
	width: 250,
	height: 25,
	frames: 1,
	bodyType: BOX,
	remove: false,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "slippyrectangle2",
	image: "slippyrectangle2.png",
	type: 0,
	width: 125,
	height: 25,
	frames: 1,
	bodyType: BOX,
	remove: false,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "srectangle1",
	image: "srectangle1.png",
	type: 0,
	width: 251,
	height: 27,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "srectangle2",
	image: "srectangle2.png",
	type: 0,
	width: 126,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "srectangle3",
	image: "srectangle3.png",
	type: 0,
	width: 101,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "srectangle4",
	image: "srectangle4.png",
	type: 0,
	width: 76,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "srectangle5",
	image: "srectangle5.png",
	type: 0,
	width: 51,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: true,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "square1",
	image: "square1.png",
	type: 0,
	width: 51,
	height: 51,
	frames: 1,
	bodyType: BOX,
	remove: true,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1
},

{
	name: "triangle1",
	image: "triangle1.png",
	type: 0,
	width: 49,
	height: 41,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-24, 20], [0, -20], [24, 20]]
	]
},

{
	name: "trapezoid1",
	image: "trapezoid1.png",
	type: 0,
	width: 52,
	height: 51,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-26, -25], [26, -25], [14, 25], [-14, 25]]
	]
},

{
	name: "tetriscorner1",
	image: "tetriscorner1.png",
	type: 0,
	width: 76,
	height: 76,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-38, 13], [38, 13], [38, 38], [-38, 38]],
		[[-38, -38], [-13, -38], [-13, 38], [-38, 38]]
	]
},

{
	name: "tetriscorner2",
	image: "tetriscorner2.png",
	type: 0,
	width: 51,
	height: 51,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-25, -25], [0, -25], [0, 25], [-25, 25]],
		[[-25, 0], [25, 0], [25, 25], [-25, 25]]
	]
},

{
	name: "tetriscross1",
	image: "tetriscross1.png",
	type: 0,
	width: 76,
	height: 76,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-12, -38], [12, -38], [12, 38], [-12, 38]],
		[[-38, -12], [38, -12], [38, 12], [-38, 12]]
	]
},

{
	name: "tetrisj1",
	image: "tetrisj1.png",
	type: 0,
	width: 51,
	height: 76,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-25, 13], [25, 13], [25, 38], [-25, 38]],
		[[0, -38], [25, -38], [25, 38], [0, 38]]
	]
},

{
	name: "tetrisl1",
	image: "tetrisl1.png",
	type: 0,
	width: 51,
	height: 76,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-25, 13], [25, 13], [25, 38], [-25, 38]],
		[[-25, -38], [0, -38], [0, 38], [-25, 38]]
	]
},

{
	name: "tetrist1",
	image: "tetrist1.png",
	type: 0,
	width: 76,
	height: 76,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-38, -38], [38, -38], [38, -13], [-38, -13]],
		[[-13, -38], [13, -38], [13, 38], [-13, 38]]
	]
},

{
	name: "tetrist2",
	image: "tetrist2.png",
	type: 0,
	width: 76,
	height: 51,
	frames: 1,
	bodyType: POLY,
	remove: true,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-38, -25], [38, -25], [38, -0], [-38, -0]],
		[[-13, -25], [13, -25], [13, 25], [-13, 25]]
	]
},

{
	name: "mill",
	image: "mill.png",
	type: 0,
	width: 125,
	height: 125,
	frames: 1,
	bodyType: POLY,
	remove: false,
	fixed: false,
	density: 0.8,
	restitution: 0.2,
	friction: 0.8,
	points: [
		[[-62.5, -12.5], [62.5, -12.5], [62.5, 12.5], [-62.5, 12.5]],
		[[-12.5, -62.5], [12.5, -62.5], [12.5, 62.5], [-12.5, 62.5]]
	],
	joints: [
		{type: "pivot", x: 0, y: 0}
	]
},

{
	name: "jrectangle1",
	image: "jrectangle1.png",
	type: 0,
	width: 251,
	height: 27,
	frames: 1,
	bodyType: BOX,
	remove: false,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1,
	joints: [
		{type: "pivot", x: -112, y: 0}
	]
},

{
	name: "jrectangle2",
	image: "jrectangle2.png",
	type: 0,
	width: 126,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: false,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1,
	joints: [
		{type: "pivot", x: -49.5, y: 0}
	]
},

{
	name: "jrectangle3",
	image: "jrectangle3.png",
	type: 0,
	width: 101,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: false,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1,
	joints: [
		{type: "pivot", x: -37, y: 0}
	]
},

{
	name: "jrectangle4",
	image: "jrectangle4.png",
	type: 0,
	width: 76,
	height: 26,
	frames: 1,
	bodyType: BOX,
	remove: false,
	fixed: false,
	density: 2.0,
	restitution: 0,
	friction: 1,
	joints: [
		{type: "pivot", x: -24.5, y: 0}
	]
},

];
