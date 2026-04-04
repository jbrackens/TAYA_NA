var data = [];
var bitmaps;
var world;
var stage;
var mc;

var fps = 60;

var LANDSCAPE_MODE = true;

window.onload = function()
{
	GET = Utils.parseGet();
	
	Utils.addMobileListeners(LANDSCAPE_MODE);
	Utils.mobileCorrectPixelRatio();
	
	Utils.addFitLayoutListeners();
	
	setTimeout(startLoad, 600);
}

function startLoad()
{
	var resolution = Utils.getMobileScreenResolution(LANDSCAPE_MODE);
	
	if(GET["debug"] == 1) resolution = Utils.getScaleScreenResolution(1, LANDSCAPE_MODE);
	
	//resolution = Utils.getScaleScreenResolution(2, LANDSCAPE_MODE);
	
	Utils.globalScale = resolution.scale;
	
	Utils.createLayout(document.getElementById("main_container"), resolution);
	
	Utils.addEventListener("fitlayout", function()
	{
		if(stage)
		{
			stage.drawScene(document.getElementById("screen"));
			buildBackground();
		}
		
		if(world)
		{
			box2d.setDebugDrawScale(world);
		}
	});
	Utils.addEventListener("lockscreen", function()	{ if(stage && stage.started) stage.stop(); });
	Utils.addEventListener("unlockscreen", function()	{ if(stage && !stage.started) stage.start(); });
	
	Utils.mobileHideAddressBar();
	
	if(GET["debug"] != 1) Utils.checkOrientation(LANDSCAPE_MODE);
	
	var path = Utils.imagesRoot+"/"+Utils.globalScale+"/";
	
	var preloader = new ImagesPreloader();

	for(var i=0; i<objects.length; i++)
	{
		data.push({name: objects[i].name, src: path+objects[i].image});
	}

	data.push({name: "hourglass", src: path+"hourglass.png"});
	
	TTLoader.create(loadImagesEnd, true, true);
	preloader.load(data, TTLoader.loadComplete, TTLoader.showLoadProgress);
}

function loadImagesEnd(data)
{
	bitmaps = data;
	
	document.getElementById('progress_container').style.display = 'none';
	document.getElementById('screen_container').style.display = 'block';
	document.getElementById('screen_background_container').style.display = 'block';
	
	startGame();
}

var ttt;
function startGame()
{
	createStage();
	
	world = box2d.createWorld();
	box2d.setDebugDraw(world, document.getElementById('screen'));
	
	var b1 = box2d.createCircle(world, {x: 240, y: 30, radius: 25, bodyType: box2d.bodyType.static});
	mc = new Sprite(bitmaps.circle1, 50, 50);
	stage.addChild(mc);
	b1.SetUserData(mc);
	
	var b2 = box2d.createBox(world, {
		x: 240,
		y: 120,
		width: 51,
		height: 51,
		rotation: Math.PI/4,
		restitution: 1
	});
	
	ttt = b2;
	
	mc = new Sprite(bitmaps.square1, 51, 51);
	stage.addChild(mc);
	b2.SetUserData(mc);
	
	box2d.createDistanceJoint(world, {body1: b1, body2: b2, point1: new b2Vec2(240, 30), point2: new b2Vec2(220, 106)});
	
	b1 = box2d.createBox(world, {
		x: 140,
		y: 70,
		width: 40,
		height: 40,
		rotation: Math.PI/4,
		bodyType: box2d.bodyType.static
	});
	
	b2 = box2d.createBox(world, {
		x: 140,
		y: 160,
		width: 40,
		height: 40,
		rotation: Math.PI/4,
		bodyType: box2d.bodyType.dynamic
	});
	
	box2d.createPrismaticJoint(world, {body1: b1, body2: b2, point: new b2Vec2(140, 110), axis: new b2Vec2(5, 0.1),
									  lowerTranslation: 0,
									  upperTranslation: 10,
									  enableLimit: true,
									  motorForce: 1,
									  motorSpeed: 0,
									  enableMotor: true});
									  
	
	box2d.createBox(world, {
		x: 240,
		y: 280,
		width: 480,
		heiht: 20,
		bodyType: box2d.bodyType.static
	});
	
	b1 = box2d.createCircle(world, {x: 51, y: 60, radius: 15});
	
	b1 = box2d.createPoly(world, {
		x: 50,
		y: 160,
		points: [
			[[-10, 0], [0, -20], [10, 0]]
		]});
	
	box2d.setBodyPositionAndRotation(b1, 420, 0, Math.PI/4);
	
	b1 = box2d.createBox(world, {
		x: 320,
		y: 100,
		width: 20,
		height: 40
	});
	
	b2 = box2d.createBox(world, {
		x: 360,
		y: 140,
		width: 25,
		height: 30,
		density: 1.5
	});
	
	box2d.createPulleyJoint(world, {
		body1: b1,
		body2: b2,
		groundAnchor1: new b2Vec2(320, 30),
		groundAnchor2: new b2Vec2(360, 30),
		anchor1: new b2Vec2(320, 100),
		anchor2: new b2Vec2(360, 140),
		ratio: 1.5,
		maxLength1: 0,
		maxLength2: 0,
		});
	
	b1 = box2d.createCircle(world, {x: 390, y: 200, radius: 10});
	var j1 = box2d.createRevoluteJoint(world, {body1: b1, 
											   body2: world.GetGroundBody(),
											   point: new b2Vec2(390, 200),
											   enableMotor: true,
											   motorSpeed: 2,
											   maxMotorTorque: 10});
	
	b2 = box2d.createCircle(world, {x: 430, y: 220, radius: 10});
	var j2 = box2d.createPrismaticJoint(world, {body1: b2, 
											    body2: world.GetGroundBody(),
											    point: new b2Vec2(430, 210),
											    axis: new b2Vec2(0, 1),
											    lowerTranslation: 0,
											    upperTranslation: 0.5,
											    enableLimit: true});
	
	box2d.createGearJoint(world, {
			body1: b1,
			body2: b2,
			joint1: j1,
			joint2: j2,
		});
	
	
	/*
	box2d.setContactFilter(world, {
		shouldCollide: function(fix1, fix2)
		{
			return  false;
		}
	});
	*/
	
	buildBackground();
	stage.start();
}

function createStage()
{
	if(stage)
	{
		stage.destroy();
		stage.stop();
	}
	stage = new Stage('screen', 480, 320, false);
	stage.delay = 1000/fps;
	stage.onpretick = preTick;
	stage.onposttick = postTick;
	stage.ceilSizes = true;
	stage.showFPS = true;
	
	stage.fillColor = "#333";
}

function buildBackground()
{
	if(world) stage.box2dSync(world);
	stage.drawScene(document.getElementById("screen_background"), true);
}

function preTick()
{
	world.Step(1/fps, 4, 4);
    world.ClearForces();
    
    box2d.syncStage(world);
}

function postTick()
{
	world.DrawDebugData();
}