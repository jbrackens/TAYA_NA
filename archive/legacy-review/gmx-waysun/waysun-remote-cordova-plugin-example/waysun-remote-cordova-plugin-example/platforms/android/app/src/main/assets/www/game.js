var GAME_ID = "red_green";
var stage;
var world;
var mc;
var fps = 30;
var bitmaps;
var GET;
var createCloudTimer;
var createCloudTimer2;
var cannon;
var ball;
var balls = [];
var ballDestroyTimer = [];
var explosion;
var indicator;
var mPosX;
var mPosY;
var soundOn = true;
var musicOn = true;
var winkVector;
var green;
var red;
var r;
var g;
var greenDream;
var redDream;
var greenHappy;
var redHappy;
var greenTimer;
var redTimer;
var touchTimerRed = false;
var timeRed = 0;
var touchTimerGreen = false;
var timeGreen = 0;
var shootTimeout;
var scoreText;

var lastLevel = 0;
var curLevel = 0;

var LANDSCAPE_MODE = true;

var STATE_LOAD = 0;
var STATE_LOGO = 1;
var STATE_MENU = 2;
var STATE_GAME = 3;
var STATE_LEVEL_SELECT = 4;
var STATE_PAUSE = 5;
var STATE_LOOSE = 6;
var STATE_VICTORY = 7;

var gameState = STATE_LOAD;
var gameScore;
var levelsScores;
var scoreToWin;

var showDebugDraw = false;

var isWebAudio = AudioMixer.isWebAudioSupport();

window.onload = function()
{
	GET = Utils.parseGet();

	Utils.addMobileListeners(LANDSCAPE_MODE);
	Utils.mobileCorrectPixelRatio();

	Utils.addFitLayoutListeners();

	I18.init(ExternalAPI.exec('getLanguage'));

	if (ExternalAPI.init({appId: '57397fbde694aa7c14010ba1', leaderboardsTable: 'highscores'}, startLoad) !== true) setTimeout(startLoad, 600);
};
//7777
function startLoad()
{
	var resolution = Utils.getMobileScreenResolution(LANDSCAPE_MODE);

	if(GET.debug
		|| Utils.mobileCheckSlowDevice()
		|| Utils.touchScreen && (Utils.isFirefox() || Utils.isPlayFreeBrowser()))
	{
		resolution = Utils.getScaleScreenResolution(1, LANDSCAPE_MODE);
	}

	//resolution = Utils.getScaleScreenResolution(2, LANDSCAPE_MODE);

	Utils.globalScale = resolution.scale;

	Utils.createLayout(document.getElementById("main_container"), resolution);

	Utils.addEventListener("fitlayout", function()
	{
		if(stage)
		{
			stage.drawScene(stage.canvas);
			stage.drawScene(stage.backgroundCanvas, true);
		}

		if(world)
		{
			box2d.setDebugDrawScale(world);
		}

		resizeCSSBack();
	});
	Utils.addEventListener("lockscreen", function()	{ if(stage && stage.started) stage.stop(); });
	Utils.addEventListener("unlockscreen", function()	{ if(stage && !stage.started) stage.start(); });

	Utils.mobileHideAddressBar();

	if(GET["debug"] != 1) Utils.checkOrientation(LANDSCAPE_MODE);

	var path = Utils.imagesRoot+"/"+Utils.globalScale+"/";

	var preloader = new ImagesPreloader();
	var data = [];
	for(var i=0; i<objects.length; i++)
	{
		data.push({name: objects[i].name, src: path+objects[i].image});
	}

	data.push({name: "hourglass", src: path+"hourglass.png"});
	data.push({name: "color_bugs", src: path+"menu/color_bugs.png"});
	data.push({name: "fon", src: path+"menu/fon.jpg"});
	data.push({name: "movie", src: path+"menu/movie.png"});
	data.push({name: "rabbit", src: path+"menu/rabbit.png"});
	data.push({name: "movie_and", src: path+"menu/movie_and.png"});
	data.push({name: "movie_2", src: path+"menu/movie_2.png"});
	data.push({name: "logo", src: path+"menu/logo.png"});
	data.push({name: "movie_play_game", src: path+"anime/button/movie_play_game.png"});
	data.push({name: "movie_fun_games", src: path+"anime/button/movie_fun_games.png"});
	data.push({name: "select_level", src: path+"png_object/select_level/select_level.jpg"});
	data.push({name: "level_sprite", src: path+"anime/button/level_sprite.png"});
	data.push({name: "sound", src: path+"anime/button/sound.png"});
	data.push({name: "restart", src: path+"anime/button/restart.png"});
	data.push({name: "replay", src: path+"anime/button/replay.png"});
	data.push({name: "next", src: path+"anime/button/next.png"});
	data.push({name: "music", src: path+"anime/button/music.png"});
	data.push({name: "menu", src: path+"anime/button/menu.png"});
	data.push({name: "main_menu", src: path+"anime/button/main_menu.png"});
	data.push({name: "menu_button", src: path+"anime/button/menu_button.png"});
	data.push({name: "numbers_level_select", src: path+"png_object/select_level/numbers_level_select.png"});
	data.push({name: "lvl", src: path+"png_object/select_level/lvl.png"});
	data.push({name: "total_shots", src: path+"png_object/select_level/total_shots.png"});
	data.push({name: "numbers_level_complete", src: path+"png_object/level_complete/numbers_level_complete.png"});
	data.push({name: "level_complete", src: path+"png_object/level_complete/level_complete.png"});
	data.push({name: "game_complete", src: path+"png_object/level_complete/game_complete.png"});
	data.push({name: "level_failed", src: path+"png_object/level_complete/level_failed.png"});
	data.push({name: "level_fail", src: path+"png_object/level_complete/level_fail.png"});
	data.push({name: "movie_fail", src: path+"png_object/level_complete/movie_fail.png"});
	data.push({name: "level_pause", src: path+"png_object/level_complete/level_pause.png"});
	data.push({name: "shots_level_complete", src: path+"png_object/level_complete/shots_level_complete.png"});
	data.push({name: "slash", src: path+"png_object/select_level/slash.png"});
	data.push({name: "cannon", src: path+"anime/cannon/cannon.png"});
	data.push({name: "dream_green", src: path+"anime/dream/dream_green.png"});
	data.push({name: "dream_red", src: path+"anime/dream/dream_red.png"});
	data.push({name: "explosion", src: path+"anime/cannon/explosion.png"});
	data.push({name: "indicator", src: path+"anime/cannon/indicator.png"});
	data.push({name: "cannon_wink", src: path+"anime/cannon/cannon_wink.png"});
	data.push({name: "red_complete", src: path+"anime/ball/red_complete.png"});
	data.push({name: "green_complete", src: path+"anime/ball/green_complete.png"});
	data.push({name: "button_back", src: path+"anime/button/button_back.png"});
	data.push({name: "pause_menu_button", src: path+"anime/button/pause_menu_button.png"});
	data.push({name: "btn_more_lvl_complete", src: path+"btn_more_lvl_complete.png"});
	data.push({name: "btn_more_menu", src: path+"btn_more_menu.png"});
	data.push({name: "btn_more_select", src: path+"btn_more_select.png"});
	data.push({name: "fonts/font_select_level", src: path+"fonts/font_select_level.png"});
	data.push({name: "fonts/font_1", src: path+"fonts/font_1.png"});
	data.push({name: "fonts/font_2", src: path+"fonts/font_2.png"});
	data.push({name: "fonts/font_3", src: path+"fonts/font_3.png"});
	data.push({name: "fonts/font_but1", src: path+"fonts/font_but1.png"});
	data.push({name: "fonts/font_but2", src: path+"fonts/font_but2.png"});
	data.push({name: "fonts/font_but3", src: path+"fonts/font_but3.png"});
	data.push({name: "y8_popup", src: path+"y8/y8_popup.png"});
	data.push({name: "y8_button", src: path+"y8/y8_button.png"});

	//levels backs
	for (var i = 1; i <= 20; i++)
	{
		data.push({name: "lvl_"+i, src: path+"level/lvl_"+i+".png"});
	};


	TTLoader.create(loadSoundsEnd, true, GET["debug"] == 1);
	preloader.maxProgressVal = 50;
	preloader.minProgressVal = 0;
	preloader.load(data, loadImagesEnd, TTLoader.showLoadProgress);
}

function loadImagesEnd(data)
{
	bitmaps = data;

	var sounds = [], path = "music/";

	sounds.push(path + "fon");
	sounds.push(path + "click");
	sounds.push(path + "green_konfeta");
	sounds.push(path + "green_nya");
	sounds.push(path + "green_udar");
	sounds.push(path + "level_complete1");
	sounds.push(path + "level_complete2");
	sounds.push(path + "level_complete3");
	sounds.push(path + "proval");
	sounds.push(path + "proval1");
	sounds.push(path + "proval2");
	sounds.push(path + "pushka");
	sounds.push(path + "pushka2");
	sounds.push(path + "red_konfeta");
	sounds.push(path + "red_nya");
	sounds.push(path + "red_udar");
	sounds.push(path + "rost1");
	sounds.push(path + "rost2");
	sounds.push(path + "rost3");
	sounds.push(path + "smena_ekrana");
	sounds.push(path + "udar_alternativa_2");
	sounds.push(path + "zvezda_finish_1");
	sounds.push(path + "zvezda_finish_2");

	var soundsPreloader = new SoundsPreloader(sounds, TTLoader.loadComplete, TTLoader.showLoadProgress);
	soundsPreloader.maxProgressVal = 50;
	soundsPreloader.minProgressVal = 50;
	soundsPreloader.load();
}

function loadSoundsEnd()
{
	document.getElementById('progress_container').style.display = 'none';
	document.getElementById('screen_container').style.display = 'block';
	document.getElementById('screen_background_container').style.display = 'block';

	getLevelsScores();

	var channels = 5;

	if(!isWebAudio)
	{
		soundOn = false;
		channels = 1;
	}

	mixer = new AudioMixer("music", channels);
	ExternalAPI.exec("setMixer", mixer);

	if(GET["debug"] != 1)
	{
		if(!ExternalAPI.exec("showCompanyLogo", showMenu)) showMenu();
		//prepareLevel(0);
	}
}

var backgroundImage = null;
function setCSSBack(img, color)
{
	if(img)
	{
		backgroundImage = img;
		document.body.style.backgroundImage = "url(" + img.src + ")";
	}

	if(color) document.body.style.backgroundColor = color;

	document.body.style.backgroundPosition = "center top";
	document.body.style.backgroundRepeat = "no-repeat";

	resizeCSSBack();
}

function resizeCSSBack()
{
	if(!backgroundImage) return;

	var rect = Utils.getWindowRect();
	var scale = rect.height / backgroundImage.height;

	var w = Math.floor(backgroundImage.width * scale);
	var h = Math.floor(backgroundImage.height * scale);

	document.body.style.backgroundSize = w + "px " + h + "px";
}

function showMenu()
{
	gameState = STATE_MENU;
	createScene();

	ExternalAPI.exec('showCopyright');
}

function showMoreGames()
{
	window.open(ExternalAPI.getMoreGamesURL(), "_blank");
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
	stage.showFPS = false;
	stage.setBackgroundCanvas('screen_background');
}

function createScene()
{
	createStage();
	if(gameState == STATE_MENU)
	{
		buildMenu();

		ExternalAPI.exec("addY8Logos", 40, 290, 440, 290);
	}

	if (gameState == STATE_LEVEL_SELECT)
	{
		buildLevelSelect();

		ExternalAPI.exec("addY8Logos", 40, 290, 440, 290);
		ExternalAPI.exec('showCopyright');
	}

	stage.refreshBackground();
	stage.start();
}

function buildMenu()
{
	ExternalAPI.exec("showBanner");
	if(musicOn){
    	playingMusic = mixer.play('fon', true, false, 0);
    	playingMusic.track = 'fon';
		//playingMusic.locked = true;
	}

	mc = new Sprite(bitmaps.fon, 480, 320, 1);
	mc.setStatic(true);
	mc.x = 240;
	mc.y = 160;
	mc.setZIndex(0);
	stage.addChild(mc);

	mc = new Sprite(bitmaps.logo, 304, 48);
	mc.setStatic(true);
	mc.x = 235;
	mc.y = 98;
	stage.addChild(mc);

	addMusicButtons();

	mc = new Sprite(bitmaps.movie, 210, 68, 19);
	mc.x = 258;
	mc.y = 44;
	mc.setZIndex(10);
	mc.animDelay = 2;
	stage.addChild(mc);

	/*mc = new Sprite(bitmaps.movie_and, 22, 24, 15);
	mc.x = 195;
	mc.y = 108;
	mc.setZIndex(10);
	mc.animDelay = 2;
	stage.addChild(mc);*/

	mc = new Sprite(bitmaps.rabbit, 49, 43, 40);
	mc.x = 380;
	mc.y = 290;
	mc.setZIndex(10);
	stage.addChild(mc);

	mc = new Sprite(bitmaps.movie_play_game, 146, 38, 3);
	mc.stop();
	mc.x = 240;
	mc.y = 180;
	mc.setZIndex(10);
	stage.addChild(mc);
	mc.onmousedown = setButtonFrameOne;
	mc.onmouseup = setButtonFrameZero;
	mc.onclick = function(){
		playBtnSound();
		handleEnterGame(showLevelSelect);
	};
	mc.txt = 'play';
	mc.text = setBitmapText({
		fontBitmap: 'fonts/font_but1',
		font: font_but1,
		text: I18.f(mc.txt),
		parent: mc,
		x: 0,
		y: -3,
		scale: 0.8
	});

	mc = new Sprite(bitmaps.movie_play_game, 146, 38, 3);
	mc.stop();
	mc.x = 240;
	mc.y = 240;
	mc.setZIndex(10);
	if (!ExternalAPI.exec("getMoreGamesButtonDisable")) stage.addChild(mc);
	mc.onclick = function(){
		playBtnSound();
		showMoreGames();
	};
	mc.onmousedown = setButtonFrameOne;
	mc.onmouseup = setButtonFrameZero;
	mc.txt = 'more';
	mc.text = setBitmapText({
		fontBitmap: 'fonts/font_but1',
		font: font_but1,
		text: I18.f(mc.txt),
		parent: mc,
		x: 0,
		y: -3,
		scale: 0.8
	});

	/*
	if(ExternalAPI.type == "y8")
	{
		mc = new Sprite(bitmaps.movie_play_game, 146, 38, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 240;
		mc.setZIndex(10);
		stage.addChild(mc);
		mc.onclick = function(){
			playBtnSound();
			ExternalAPI.exec("showHighScores");
		};
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'leaderboard';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 0.8
		});
	}
	*/

	ExternalAPI.exec("addLogo", 60, 30);
	ExternalAPI.exec("addFacebookIcon", 30, 290);
	ExternalAPI.exec("addTwitterIcon", 70, 290);
	var i_btn = ExternalAPI.exec("addInviteButton", 240, 292, 528, 132);
	if (i_btn) i_btn.scaleTo(0.28);
}

function handleEnterGame(callback){
	if(ExternalAPI.type == "y8"){
		var ret = ExternalAPI.exec('showWelcomeScreen', stage, {
			windowBack: bitmaps.y8_popup,
			buttonBack: bitmaps.y8_button,
			headerColor: '#dd1010',
			headerStroke: '#740505',
			textColor: '#23b20d',
			textStroke: '#093c02',
			buttonColor: '#ffcd00',
			buttonStroke: '#ca5d1f',
			hideShader: true,
			onSelect: function(e){
				getLevelsScores(function(){
					e.target.safeRemove();
					callback();
				});
			}
		});

		if (ret) {
		} else {
			callback();
		}
	}
	else callback();
}

function buildLevelSelect()
{
	ExternalAPI.exec("showBanner");

	mc = new Sprite(bitmaps.select_level, 480, 320, 1);
	mc.setStatic(true);
	mc.x = 240;
	mc.y = 160;
	stage.addChild(mc);
	setBitmapText({
		fontBitmap: 'fonts/font_select_level',
		font: font_select_level,
		text: I18.f('select_level'),
		parent: stage,
		x: 240,
		y: 25
	});

	addMusicButtons();

	mc = new Sprite(bitmaps.main_menu, 132, 36, 3);
	mc.stop();
	mc.x = 350;
	mc.y = 250;
	mc.setZIndex(10);
	stage.addChild(mc);
	mc.onclick = function(){
		playBtnSound();
		showMenu();
	};
	mc.onmousedown = setButtonFrameOne;
	mc.onmouseup = setButtonFrameZero;
	mc.txt = 'main_menu';
	mc.text = setBitmapText({
		fontBitmap: 'fonts/font_but1',
		font: font_but1,
		text: I18.f(mc.txt),
		parent: mc,
		x: 0,
		y: -3,
		scale: 0.8
	});

	mc = new Sprite(bitmaps.main_menu, 132, 36, 3);
	mc.stop();
	mc.x = 350;
	mc.y = 290;
	mc.setZIndex(10);
	if (!ExternalAPI.exec("getMoreGamesButtonDisable")) stage.addChild(mc);
	mc.onclick = function(){
		playBtnSound();
		showMoreGames();
	};
	mc.onmousedown = setButtonFrameOne;
	mc.onmouseup = setButtonFrameZero;
	mc.txt = 'more';
	mc.text = setBitmapText({
		fontBitmap: 'fonts/font_but1',
		font: font_but1,
		text: I18.f(mc.txt),
		parent: mc,
		x: 0,
		y: -3,
		scale: 0.8
	});
	/*
	mc = new Sprite(bitmaps.total_shots, 100, 20, 1);
	mc.x = 160;
	mc.y = 250;
	mc.setZIndex(10);
	stage.addChild(mc);
	*/
	setBitmapText({
		fontBitmap: 'fonts/font_3',
		font: font_3,
		text: I18.f('total_shots', getTotalLevelsScores()),
		parent: stage,
		x: 160,
		y: 250,
		scale: 1
	});

	//textLevelSelect(getTotalLevelsScores(), 230, 250);

	var x, y, n;
	for(var i=0; i<20; i++)
	{
		n = Math.floor(i/5);
		x = (i-n*5)*50 + 135;
		y = n*45 + 70;

		mc = new Sprite(bitmaps.level_sprite, 40, 40, 3);
		mc.setStatic(true);
		mc.x = x;
		mc.y = y;
		if (i > lastLevel)
		{
			mc.gotoAndStop(0);
		} else {

			if ((i == lastLevel) && (lastLevel != (levels.length - 1)))
			{
				mc.gotoAndStop(1);
			}
			if ((i < lastLevel)||(((i == lastLevel) && (lastLevel == (levels.length - 1)))))
			{
				mc.gotoAndStop(2);
			}
			mc.levelId = i;
			mc.onclick = function(e){
				playBtnSound();
				selectLevel(e);
			}
		}
		stage.addChild(mc);

		if (i<9) textLevelSelect(i+1, x, y-5);
		else textLevelSelect(i+1, x-7, y-5);
		if(levelsScores[i]<10) textLevelComplete(levelsScores[i], x, y+10);
		else textLevelComplete(levelsScores[i], x-4, y+10);
	}

	ExternalAPI.exec("addLogo", 60, 30);
}

function setButtonFrameOne(e)
{
	e.target.gotoAndStop(2);
	var text = e.target.text;
	destroyChildren(e.target.text);
	var txt = e.target.txt;
	e.target.text = setBitmapText({
		fontBitmap: 'fonts/font_but3',
		font: font_but3,
		text: I18.f(txt),
		parent: e.target,
		x: text.x,
		y: text.y,
		scale: text.scale
	});
}

function setButtonFrameZero(e)
{
	e.target.gotoAndStop(0);
	var text = e.target.text;
	destroyChildren(e.target.text);
	var txt = e.target.txt;
	e.target.text = setBitmapText({
		fontBitmap: 'fonts/font_but1',
		font: font_but1,
		text: I18.f(txt),
		parent: e.target,
		x: text.x,
		y: text.y,
		scale: text.scale
	});
}

function destroyChildren(obj)
{
	if(obj.sprites)
	{
		for(var i = 0; i < obj.sprites.length; i ++)
		{
			obj.sprites[i].destroy = true;
		}
	}
}

function selectLevel(e)
{
	curLevel = e.target.levelId;
	prepareLevel(e.target.levelId);
}

function textLevelComplete(text, x, y)
{
	var st = new SimpleText(bitmaps.numbers_level_complete, 13, 14);
	st.charMap = ['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'];
	st.align = st.ALIGN_LEFT;
	st.charSpacing = -5;
	st.x = x;
	st.y = y;
	st.write(text);

	return st;
}

function textLevelSelect(text, x, y)
{
	var st = new SimpleText(bitmaps.numbers_level_select, 15, 16);
	st.align = st.ALIGN_LEFT;
	st.charSpacing = -3;
	st.static = true;
	st.x = x;
	st.y = y;
	st.write(text);

	return st;
}

function showLevelSelect()
{
    gameState = STATE_LEVEL_SELECT;
	createScene();
}

function rand(x, div)
{
	var res = Math.floor(Math.random()*x) + div;
	return res;
}

function findObject(name)
{
	for(var i=0; i<objects.length; i++)
	{
		if(objects[i].name == name) return objects[i];
	}
	return false;
}

function prepareLevel(id)
{
	ExternalAPI.exec("hideBanner");

	if(stage)
	{
		mc = new Sprite(bitmaps.hourglass, 100, 150, 1);
		mc.x = 240;
		mc.y = 130;
		stage.addChild(mc);
	}
	setTimeout(function() {	startLevel(id);	}, (1000/fps)*2);
}

function mousePos(e)
{
	mPosX = e.x + e.target.x;
	mPosY = e.y + e.target.y;
}

function playBtnSound(){
	if(soundOn){
		mixer.play('click', false);
	}
}

function addMusicButtons()
{
	mc = new Sprite(bitmaps.sound, 26, 26, 4);
	mc.stop();
	if(soundOn) mc.gotoAndStop(0);
	else mc.gotoAndStop(2);
	mc.x = 420;
	mc.y = 18;
	mc.setZIndex(10);
	stage.addChild(mc);

	mc.onmousedown = function(e){
		if(isWebAudio)
		{
			if(soundOn)
			{
				e.target.gotoAndStop(3);
				soundOn = false;
				Utils.setCookie('red_and_green_2_sound', 0);
			}else{
				e.target.gotoAndStop(1);
				soundOn = true;
				Utils.setCookie('red_and_green_2_sound', 1);
			}
		}
	};
	mc.onmouseup = function(e){
		if(soundOn) e.target.gotoAndStop(0);
		else e.target.gotoAndStop(2);
	};

	mc = new Sprite(bitmaps.music, 26, 26, 4);
	mc.stop();
	if(musicOn) mc.gotoAndStop(0);
	else mc.gotoAndStop(2);
	mc.x = 450;
	mc.y = 18;
	mc.setZIndex(10);
	stage.addChild(mc);

	mc.onmousedown = function(e){
		if(musicOn)
		{
			e.target.gotoAndStop(3);
			musicOn = false;
			mixer.stop(0);
			Utils.setCookie('red_and_green_2_music', 0);
		}else{
			e.target.gotoAndStop(1);
			musicOn = true;
			mixer.play('fon', true, false, 0);
			Utils.setCookie('red_and_green_2_music', 1);
		}
	};
	mc.onmouseup = function(e){
		if(musicOn) e.target.gotoAndStop(0);
		else e.target.gotoAndStop(2);
	};
}

function addButtons()
{
	addMusicButtons();

	mc = new Sprite(bitmaps.menu, 26, 26, 3);
	mc.stop();
	mc.x = 360;
	mc.y = 18;
	mc.setZIndex(10);
	stage.addChild(mc);
	mc.onmousedown = function(e){
		e.target.gotoAndStop(2);
	};
	mc.onmouseup = function(e) {e.target.gotoAndStop(0)};
	mc.onclick = function(){
		if(gameState != STATE_GAME) return;
		playBtnSound();
		gameState = STATE_PAUSE;
		showPause();
	};

	mc = new Sprite(bitmaps.restart, 26, 26, 3);
	mc.stop();
	mc.x = 390;
	mc.y = 18;
	mc.setZIndex(10);
	stage.addChild(mc);
	mc.onmousedown = function(e){e.target.gotoAndStop(2)};
	mc.onmouseup = function(e){e.target.gotoAndStop(0)};
	mc.onclick = function(e){
		if(gameState != STATE_GAME) return;
		playBtnSound();
		startLevel(curLevel);
	}
}

function showPause()
{
	if (gameState == STATE_PAUSE)
	{
		var mcs = [];
		mc = new Sprite(bitmaps.level_pause, 134.5, 152.5, 1);
		mc.x = 240;
		mc.y = 160;
		stage.addChild(mc);
		mcs.push(mc);
		setBitmapText({
			fontBitmap: 'fonts/font_2',
			font: font_2,
			text: I18.f('pause'),
			parent: mc,
			x: 0,
			y: -55,
			scale: 0.8
		});

		mc = new Sprite(bitmaps.btn_more_menu, 162, 68, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 140;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'more';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 1
		});
		mc.onclick = showMoreGames;
		if (!ExternalAPI.exec("getMoreGamesButtonDisable")) stage.addChild(mc);
		mc.setPropScale(0.43);
		mcs.push(mc);

		mc = new Sprite(bitmaps.pause_menu_button, 70, 32, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 175;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'menu';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 0.8
		});
		mc.onclick = function(){
			playBtnSound();
			showLevelSelect();
		};
		stage.addChild(mc);
		mcs.push(mc);

		mc = new Sprite(bitmaps.button_back, 66, 32, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 210;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'back';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 0.8
		});
		mc.onclick = function(){
			red.play();
			green.play();
			playBtnSound();
			for (var i = 0; i < mcs.length; i ++) mcs[i].destroy = true;
			setTimeout(function(){gameState = STATE_GAME}, 10);
		};
		stage.addChild(mc);
		mcs.push(mc);


	}
}

function startLevel(id, data)
{
	world = box2d.createWorld();
	box2d.setDebugDraw(world, document.getElementById('screen'));
	world.m_gravity.y = 7;

	createStage();

	addButtons();
	gameScore = 0;
	greenHappy = false;
	redHappy = false;
	shootTimeout = fps;

	for(var i = 0; i< ballDestroyTimer.length; i ++) clearTimeout(ballDestroyTimer[i]);
	balls = [];
	stars = [];

	mc = new Sprite(bitmaps["lvl_"+(id+1)], 480, 320, 1);
	mc.setStatic(true);
	mc.setZIndex(0);
	mc.x = 240;
	mc.y = 160;
	mc.onclick = function(e){
		if(((e.x+240)>340)&&((e.y+160)<35)) return;
		else fire(e);
	};
	mc.onmousemove = mousePos;
	stage.addChild(mc);

	scoreText = setBitmapText({
		fontBitmap: 'fonts/font_2',
		font: font_2,
		text: I18.f('shots', gameScore),
		parent: stage,
		x: 37,
		y: 30,
		scale: 0.55
	});

	setBitmapText({
		fontBitmap: 'fonts/font_3',
		font: font_3,
		text: I18.f('level', (id + 1)),
		parent: stage,
		x: 8,
		y: 10,
		scale: 1,
		align: BitmapText.ALIGN_LEFT
	});

	var levelObjs;
	var levelJoints;
	if(data)
	{
		id = 0;
		levels = [data];
		gameState = STATE_GAME;
	}
	levelObjs = levels[id].objects;
	levelJoints = levels[id].joints;

	if(!levels[id]) return;
	curLevel = id;

	var lo, ob;
	for(var i=0; i<levelObjs.length; i++)
	{
		lo = levelObjs[i];
		ob = findObject(lo.type);
		mc = createObject(lo, ob);
		if(lo.type == 'red_wait_1') red = mc;
		if(lo.type == 'green_wait_1') green = mc;
		if(lo.type == 'red_candy') r = mc;
		if(lo.type == 'green_candy') g = mc;
	}

	if(curLevel == 0)
	{
		greenDream = new Sprite(bitmaps.dream_green, 86, 50, 15);
		greenDream.x = green.x + 60;
		greenDream.y = green.y - 42;
		stage.addChild(greenDream);

		redDream = new Sprite(bitmaps.dream_red, 86, 50, 16);
		redDream.x = red.x + 59;
		redDream.y = red.y - 43;
		stage.addChild(redDream);
	}

	cannon = new Sprite(bitmaps.cannon, 40, 30, 11);
	cannon.stop();
	cannon.x = 50;
	//if((curLevel==9)||(curLevel==19))
	if(curLevel==9)
	{
		cannon.y = 260;
	}
	else
	{
		cannon.y = 290;
	}
	cannon.setZIndex(20);
	cannon.onenterframe = syncCannonWink;
	stage.addChild(cannon);

	wink = new Sprite(bitmaps.cannon_wink, 12, 10, 34);
	wink.x = cannon.x + 3;
	wink.y = cannon.y - 6;
	wink.animDelay = 2;
	wink.setZIndex(21);
	stage.addChild(wink);

	indicator = new Sprite(bitmaps.indicator, 50, 14, 6);
	indicator.stop();
	indicator.x = cannon.x + 50;
	indicator.y = cannon.y;
	indicator.setZIndex(19);
	stage.addChild(indicator);

	if(levelJoints)
	{
		var j, joint, stack, body1, body2;
		for(var i=0; i<levelJoints.length; i++)
		{
			joint = levelJoints[i];
			body1 = getBodyByPoint(joint.point1);
			body2 = getBodyByPoint((joint.point2 ? joint.point2 : joint.point1), body1);

			if(joint.type == 0)
			{
				var options = {
					body1: body1,
					body2: body2,
					point: joint.point1
				};

				if(typeof joint.custom != "undefined")
				{
					options.enableMotor = true;
					options.motorSpeed = joint.custom;
					options.maxMotorTorque = Math.PI*2;
				}

				j = box2d.createRevoluteJoint(world, options);
			}

			if(joint.type == 1)
			{
				j = box2d.createDistanceJoint(world, {
					body1: body1,
					body2: body2,
					point1: joint.point1,
					point2: joint.point2
				});
			}
		}
	}

	ExternalAPI.exec("addLogo", 420, 50);

	gameState = STATE_GAME;

	stage.refreshBackground();
	stage.start();
}

var winkVector = new Vector(0, 0);
function syncCannonWink()
{
	var x = 2;

	if (cannon.currentFrame == 10) cannon.stop();
	if((cannon.currentFrame >= 2)&&(cannon.currentFrame < 8)) x = 1;
	if(cannon.currentFrame == 8) x = 2;

	winkVector.x = x;
	winkVector.y = -6;
	winkVector.rotate(-cannon.rotation);

	wink.x = cannon.x + winkVector.x;
	wink.y = cannon.y + winkVector.y;
	wink.rotation = cannon.rotation;
}

function fire(e)
{
	if((gameState != STATE_GAME) || (shootTimeout<fps/2)) return;

	if(ball)
	{
		ball.destroy = true;
		world.DestroyBody(ball.box2dBody);
	}

	if(soundOn)
	{
		mixer.play('pushka2', false);
	}
	shootTimeout = 0;
	cannon.gotoAndPlay(0);

	var x = (e.target.x + e.x) - cannon.x;
	var y = (e.target.y + e.y) - cannon.y;
	var angle = Math.atan2(y, x);

	var len = Math.sqrt(x*x+y*y);

	var p = new Vector(15, 0);
	p.rotate(-angle);
	p.x += cannon.x;
	p.y += cannon.y;

	ball = {};

	lo = {x: p.x, y: p.y, rotation: 0, restitution: 0.01};
	ob = findObject("ball");
	mc = createObject(lo, ob);
	ball = mc;
	balls.push(ball);
	stage.setZIndex(mc, 11);

	var p = new Vector(40, 0);
	p.rotate(-angle);
	p.x += cannon.x;
	p.y += cannon.y;

	if(explosion) explosion.destroy = true;
	explosion = new Sprite(bitmaps.explosion, 72, 56, 11);
	explosion.x = p.x;
	explosion.y = p.y;
	explosion.rotateTo(angle - Math.PI*3/2);
	explosion.setZIndex(20);
	stage.addChild(explosion);

	if((curLevel==2)||(curLevel==13)||(curLevel==16)||(curLevel==17)||(curLevel==18))
	{
		len /= 250;
	}
	else
	{
		if((curLevel==3)||(curLevel==5)||(curLevel==7)||(curLevel==9)||(curLevel==11)||(curLevel==12)||(curLevel==19))
		{
			len /= 350;
		}
		else
		{
			len /= 450;
		}
	}
	var b = ball.box2dBody;
	b.SetBullet(true);
	b.ApplyImpulse(new b2Vec2(Math.cos(angle)*len, Math.sin(angle)*len), b.GetPosition());

	gameScore ++;
	scoreText.write(I18.f('shots', gameScore));

	ballDestroyTimer.push(stage.setTimeout(function(){destroyBall()}, fps*4));


	//Вращение пушки, перемещение индикатора направления
	var p = new Vector(3, -7);
	p.rotate(-angle);
	p.x += cannon.x;
	p.y += cannon.y;
	wink.x = p.x;
	wink.y = p.y;
	cannon.rotation = angle;
	wink.rotation = angle;

	var x = mPosX - cannon.x;
	var y = mPosY - cannon.y;
	var len = Math.sqrt(x*x+y*y);
	if (len<stage.screenWidth/10) indicator.gotoAndStop(0);
	if ((len<stage.screenWidth*2/10) && (len>stage.screenWidth/10)) indicator.gotoAndStop(1);
	if ((len<stage.screenWidth*3/10) && (len>stage.screenWidth*2/10)) indicator.gotoAndStop(2);
	if ((len<stage.screenWidth*4/10) && (len>stage.screenWidth*3/10)) indicator.gotoAndStop(3);
	if ((len<stage.screenWidth*5/10) && (len>stage.screenWidth*4/10)) indicator.gotoAndStop(4);

	var p = new Vector(45, 0);
	p.rotate(-angle);
	p.x += cannon.x;
	p.y += cannon.y;
	indicator.x = p.x;
	indicator.y = p.y;
	indicator.rotation = angle;
}

function destroyBall()
{
	var b = balls.shift();
	if(b)
	{
		b.destroy = true;
		world.DestroyBody(b.box2dBody);
	}
}

function getBodyByPoint(point, presentBody)
{
	var body = world.GetGroundBody();

	if(point)
	{
		stack = stage.getObjectsStackByCoord(point.x, point.y, false);
		if(stack.length > 0)
		{
			for(var i=stack.length-1; i >= 0; i--)
			{
				if(stack[i].box2dBody && stack[i].box2dBody != presentBody) body = stack[i].box2dBody;
			}
		}
	}

	return body;
}

function createObject(lo, ob)
{
	var body, points, density, restitution, friction, fixed, x, y, width, height;

	mc = new Sprite(bitmaps[ob.name], ob.width, ob.height, ob.frames);
	mc.x = lo.x;
	mc.y = lo.y;
	mc.rotation = lo.rotation;
	stage.addChild(mc);

	if(ob.bodyType != NONE)
	{
		fixed = (typeof(lo.fixed) != "undefined") ? lo.fixed : ob.fixed;
		density = (typeof(lo.density) != "undefined") ? lo.density : ob.density;
		restitution = (typeof(lo.restitution) != "undefined") ? lo.restitution : ob.restitution;
		friction = (typeof(lo.friction) != "undefined") ? lo.friction : ob.friction;

		if(density <= 0) fixed = true;

		width = ob.bodyWidth ? ob.bodyWidth : ob.width;
		height = ob.bodyHeight ? ob.bodyHeight : ob.height;
		x = lo.x;
		y = lo.y;
		if(ob.bodyPosCorrect)
		{
			x += ob.bodyPosCorrect.x;
			y += ob.bodyPosCorrect.y;
			mc.syncX = ob.bodyPosCorrect.x;
			mc.syncY = ob.bodyPosCorrect.y;
			mc.onbox2dsync = spritesSync;
		}

		if(ob.bodyType == BOX)
		{
			body = box2d.createBox(world, {
				x: x,
				y: y,
				width: width,
				height: height,
				rotation: lo.rotation,
				bodyType: fixed ? box2d.bodyType.static : box2d.bodyType.dynamic,
				density: density,
				restitution: restitution,
				friction: friction
			});
		}
		if(ob.bodyType == CIRCLE)
		{
			body = box2d.createCircle(world, {
				x: x,
				y: y,
				radius: width/2,
				rotation: lo.rotation,
				bodyType: fixed ? box2d.bodyType.static : box2d.bodyType.dynamic,
				density: density,
				restitution: restitution,
				friction: friction
			});
		}
		if(ob.bodyType == POLY)
		{
			body = box2d.createPoly(world, {
				x: x,
				y: y,
				points: ob.points,
				rotation: lo.rotation,
				bodyType: fixed ? box2d.bodyType.static : box2d.bodyType.dynamic,
				density: density,
				restitution: restitution,
				friction: friction
			});
		}

		body.sprite = mc;
		mc.box2dBody = body;
	}

	if(GET["debug"] != 1 && (fixed || ob.bodyType == NONE)) mc.setStatic(true);

	mc.obType = ob.type;

	return mc;
}

function getLevelsScores(callback)
{
	levelsScores = [];

	function parseGameData(s)
	{
		if(s && s != "null")
		{
			levelsScores = s.split(',');
		}
		for(var i=0; i < levels.length; i++)
		{
			if((!levelsScores[i])||(isNaN(levelsScores[i]))) levelsScores[i] = 0;
			levelsScores[i] *= 1;
			if(levelsScores[i] > 0) lastLevel = i+1;
			if (lastLevel == levels.length) lastLevel = levels.length-1;
		}

		if(parseInt(Utils.getCookie('red_and_green_2_sound')) === 0)
		{
			soundOn = false;
		}

		if(parseInt(Utils.getCookie('red_and_green_2_music')) === 0)
		{
			musicOn = false;
		}

		if(callback) callback();
	}

	if(ExternalAPI.exec("loadGameData", parseGameData) !== true) parseGameData(Utils.getCookie('red_and_green_2_levels_scores'));
}

function saveLevelsScores()
{
	var s = levelsScores.join(",");
	if(ExternalAPI.exec("saveGameData", s) !== true) Utils.setCookie('red_and_green_2_levels_scores', s);

	//ExternalAPI.exec("submitScore", getTotalLevelsScores());
}

function getTotalLevelsScores()
{
	var sum = 0;
	for(var i=0; i<levels.length; i++)
	{
		if(levelsScores[i] >= 0) sum += levelsScores[i];
	}
	return sum;
}

function showLevelFailed()
{
	if (gameState == STATE_LOOSE)
	{
		if(soundOn)
		{
			var randFail = rand(3, 1);
			switch(randFail)
			{
				case 1:
					randFail = mixer.play('proval', false);
					break;
				case 2:
					randFail = mixer.play('proval1', false);
					break;
				case 3:
					randFail = mixer.play('proval2', false);
					break;
			}
		}
		mc = new Sprite(bitmaps.level_fail, 217, 170, 1);
		mc.x = 240;
		mc.y = 160;
		stage.addChild(mc);

		setBitmapText({
			fontBitmap: 'fonts/font_2',
			font: font_2,
			text: I18.f('level_failed'),
			parent: mc,
			x: 0,
			y: -60,
			scale: 1
		});

		mc = new TilesSprite(bitmaps.movie_fail, 178, 42, 40, 20, 2);
		mc.x = 240;
		mc.y = 160-20;
		stage.addChild(mc);

		mc = new Sprite(bitmaps.menu_button, 82, 34, 3);
		mc.stop();
		mc.x = 190;
		mc.y = 200-20;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'menu';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 0.8
		});
		mc.onclick = function(){
			if(soundOn) randFail.stop();
			playBtnSound();
			showLevelSelect();
		};
		stage.addChild(mc);

		mc = new Sprite(bitmaps.replay, 82, 34, 3);
		mc.stop();
		mc.x = 290;
		mc.y = 200-20;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'replay';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -1,
			scale: 0.8
		});
		mc.onclick = function(){
			if(soundOn) randFail.stop();
			playBtnSound();
			setTimeout(function(){startLevel(curLevel)}, 10)
		};
		stage.addChild(mc);

		mc = new Sprite(bitmaps.btn_more_lvl_complete, 175, 44, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 240-20;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'more';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 1
		});
		mc.onclick = showMoreGames;
		if (!ExternalAPI.exec("getMoreGamesButtonDisable")) stage.addChild(mc);
		mc.setPropScale(0.8);

		ExternalAPI.exec('showAds');
	};
}

function preTick()
{
	if(touchTimerRed)
	{
		timeRed ++;
		if(timeRed > 10) touchTimerRed = false;
	}
	if(touchTimerGreen)
	{
		timeGreen ++;
		if(timeGreen > 10) touchTimerGreen = false;
	}

	if((gameState == STATE_PAUSE) || (gameState == STATE_LOOSE))
	{
		red.stop();
		green.stop();
	}
	if(gameState == STATE_GAME)
	{
		world.Step(1/fps, 10, 10);
		box2d.syncStage(world);

		if(shootTimeout<fps) shootTimeout++;

		var candyMobSprites = [];

		for(var i=0; i<stage.objects.length; i++)
		{
			if((stage.objects[i].obType == REDCANDY)||(stage.objects[i].obType == GREENCANDY)||(stage.objects[i].obType == REDMOB)||(stage.objects[i].obType == GREENMOB)) candyMobSprites.push(stage.objects[i]);
		}

		//Проверка на вылет моба/конфеты за пределы экрана

		for(var i = 0; i < candyMobSprites.length; i++)
		{
			var c = candyMobSprites[i];
			if(c.x > 530 || c.x < -50 || c.y > 370)
			{
				gameState = STATE_LOOSE;
				stage.setTimeout(showLevelFailed, fps/2);
			}
		}

		//Мечты на 1 уровне

		if(curLevel == 0)
		{
			if (greenDream.currentFrame == 14)
			{
				greenDream.stop();
				stage.setTimeout(function(){greenDream.destroy = true}, fps);
			}
			if (redDream.currentFrame == 15)
			{
				redDream.stop();
				stage.setTimeout(function(){redDream.destroy = true}, fps);
			}
		}

		//Анимация красного

		if ((red.bitmap == bitmaps.red_happy) && (red.currentFrame == 18))
		{
			red.stop();
			redHappy = true;
		}
		if ((red.currentFrame == 27) && (red.bitmap == bitmaps.red_wait_1))
		{
			red.bitmap = bitmaps.red_wait_2;
			red.gotoAndStop(0);
			redTimer = setTimeout(function(){red.gotoAndPlay(0)}, 2000);
		}
		if ((red.currentFrame == 16) && (red.bitmap == bitmaps.red_wait_2))
		{
			red.bitmap = bitmaps.red_wait_1;
			red.gotoAndStop(0);
			redTimer = setTimeout(function(){red.gotoAndPlay(0)}, 2000);
		}

		//Анимация зелёного

		if ((green.bitmap == bitmaps.green_happy) && (green.currentFrame == 21))
		{
			green.stop();
			greenHappy = true;
		}
		if ((green.currentFrame == 17) && (green.bitmap == bitmaps.green_wait_1))
		{
			green.bitmap = bitmaps.green_wait_2;
			green.gotoAndStop(0);
			greenTimer = setTimeout(function(){green.gotoAndPlay(0)}, 2000);
		}
		if ((green.currentFrame == 16) && (green.bitmap == bitmaps.green_wait_2))
		{
			green.bitmap = bitmaps.green_wait_1;
			green.stop();
			greenTimer = setTimeout(function(){green.gotoAndPlay(0)}, 2000);
		}

		var angle = Math.atan2((mPosY - cannon.y), (mPosX - cannon.x));
		if (angle > 1.2) angle = 1.2;
		if (angle < -1.2) angle = -1.2;

		//Проверка на контакт с мобами нужного цвета

		for (var n = r.box2dBody.GetContactList(); n; n = n.next)
		{
			if(n.other.sprite && n.other.sprite.obType == REDMOB && n.contact.IsTouching())
			{
				red = makeHappy(r, red, 'red_happy', 'red_nya', 'red_konfeta', redTimer);
				break;
			}
		}
		for (var n = g.box2dBody.GetContactList(); n; n = n.next)
		{
			if(n.other.sprite && n.other.sprite.obType == GREENMOB && n.contact.IsTouching())
			{
				green = makeHappy(g, green, 'green_happy', 'green_nya', 'green_konfeta', greenTimer);
				break;
			}
		}
		for (var i = 0; i < balls.length; i ++)
		{
			for (var n = ball.box2dBody.GetContactList(); n; n = n.next)
				if(n.other.sprite && n.other.sprite.obType == GREENMOB && n.contact.IsTouching())
				{
					if((soundOn)&&(!touchTimerGreen))
					{
						mixer.play('red_udar', false);
						timeGreen = 0;
						touchTimerGreen = true;
					}
				} else {
					if(n.other.sprite && n.other.sprite.obType == REDMOB && n.contact.IsTouching())
					{
						if((soundOn)&&(!touchTimerRed))
						{
							mixer.play('udar_alternativa_2', false);
							timeRed = 0;
							touchTimerRed = true;
						}
					}
				}
		}
		if((redHappy)&&(greenHappy)) showLevelVictory();
		if(curLevel == 6)
		{
			b1 = getBodyByPoint({x: 185, y: 123});
			b1.m_angularVelocity = 4;
			var b2 = getBodyByPoint({x: 218, y: 123});
			b2.m_angularVelocity = 4;
			var b3 = getBodyByPoint({x: 251, y: 123});
			b3.m_angularVelocity = 4;
		}
		if(curLevel == 12)
		{
			b1 = getBodyByPoint({x: 326, y: 170});
			for (var n = b1.GetContactList(); n; n = n.next)
			{
				if(!n.contact.IsTouching())
				{
					b1.ApplyImpulse(new b2Vec2(0, 2), new b2Vec2(10, 0));
				}
			}
		}

		if(curLevel == 14)
		{
			b1 = getBodyByPoint({x: 349, y: 184});
			b1.m_angularVelocity = -4;
		}
	}
}

function makeHappy(candy, nyaka, nyakaName, nyaSound1, nyaSound2, nyaTimer)
{
	candy.destroy = true;
	world.DestroyBody(candy.box2dBody);
	nyaka.destroy = true;
	world.DestroyBody(nyaka.box2dBody);

	lo = {x: candy.x, y: candy.y, rotation: 0};
	ob = findObject(nyakaName);
	mc = createObject(lo, ob);
	nyaka = mc;
	nyaka.animDelay = 2;
	stage.setZIndex(mc, 10);
	var randHappy = rand(2, 1)
	if(randHappy == 1) happySounds(nyaSound1);
	else happySounds(nyaSound2);
	clearTimeout(nyaTimer);
	return nyaka;
}

function happySounds(track)
{
	if(soundOn)
	{
		var j = mixer.play('rost3', true);
		setTimeout(function(){j.stop(); mixer.play(track, false)}, 600);
	}
}

function setBitmapText(params)
{
	var width = (params.maxWidth ? params.maxWidth : null);
	var diff = typeof params.diff !== 'undefined' && params.diff !== null ? params.diff : 10;

	var txt = new BitmapText(bitmaps[params.fontBitmap], params.font);
	txt.scale = typeof params.scale !== 'undefined' && params.scale !== null ? params.scale : 1;
	txt.x = typeof params.x !== 'undefined' && params.x !== null ? params.x : 0;
	txt.y = typeof params.y !== 'undefined' && params.y !== null ? params.y : -1;
	txt.align = typeof params.align !== 'undefined' && params.align !== null ? params.align : BitmapText.ALIGN_CENTER;
	txt.charSpacing = typeof params.charSpacing !== 'undefined' && params.charSpacing !== null ? params.charSpacing : 0;
	txt.lineSpacing = typeof params.lineSpacing !== 'undefined' && params.lineSpacing !== null ? params.lineSpacing : 0;
	txt.parent = params.parent;

	txt.write(params.text);

	if (width)
	{
		txt.setScaleToFitContainer(width - diff, null, txt.scale);
		txt.refresh();
	}

	return txt;
}

function showLevelVictory()
{
	if(gameState == STATE_GAME)
	{
		gameState = STATE_PAUSE;

		if ((levelsScores[curLevel] > gameScore)||(levelsScores[curLevel] == 0)) levelsScores[curLevel] = gameScore;
		saveLevelsScores();
		if (lastLevel == curLevel) lastLevel++;
		if (lastLevel == levels.length) lastLevel = levels.length-1;

		if(curLevel == 19)
		{
			mc = new Sprite(bitmaps.game_complete, 265, 207, 1);
			mc.x = 240;
			mc.y = 160;
			stage.addChild(mc);
			setBitmapText({
				fontBitmap: 'fonts/font_2',
				font: font_2,
				text: I18.f('game_complete'),
				parent: mc,
				x: 0,
				y: -82,
				scale: 1
			});
		}
		else
		{
			mc = new Sprite(bitmaps.level_complete, 266, 208, 1);
			mc.x = 240;
			mc.y = 160;
			stage.addChild(mc);
			setBitmapText({
				fontBitmap: 'fonts/font_2',
				font: font_2,
				text: I18.f('level_complete'),
				parent: mc,
				x: 0,
				y: -82,
				scale: 1
			});
		}

		var randComplete = rand(3, 1);
		if(soundOn) mixer.play('level_complete'+randComplete, false);

		/*
		mc = new Sprite(bitmaps.shots_level_complete, 37, 12.5, 1);
		mc.x = 235;
		mc.y = 195;
		stage.addChild(mc);

		scoreText = textLevelComplete(gameScore, 265, 197);
		*/

		setBitmapText({
			fontBitmap: 'fonts/font_2',
			font: font_2,
			text: I18.f('shots', gameScore),
			parent: stage,
			x: 235,
			y: 195,
			scale: 0.55
		});

		mc = new Sprite(bitmaps.menu_button, 82, 34, 3);
		mc.stop();
		mc.x = 155;
		mc.y = 240;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'menu';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 0.8
		});
		mc.onclick = function(){
			playBtnSound();
			showLevelSelect();
		};
		stage.addChild(mc);

		mc = new Sprite(bitmaps.next, 78, 34, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 240;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'next';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 0.8
		});
		mc.onclick = function(){
			if(curLevel != (levels.length-1))
			{
				playBtnSound();
				curLevel++;
				setTimeout(function(){startLevel(curLevel)}, 10)
			}
		};
		stage.addChild(mc);

		mc = new Sprite(bitmaps.replay, 82, 34, 3);
		mc.stop();
		mc.x = 325;
		mc.y = 240;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'replay';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -1,
			scale: 0.8
		});
		mc.onclick = function(){
			playBtnSound();
			setTimeout(function(){startLevel(curLevel)}, 10);
		};
		stage.addChild(mc);

		mc = new Sprite(bitmaps.btn_more_lvl_complete, 175, 44, 3);
		mc.stop();
		mc.x = 240;
		mc.y = 140;
		mc.onmousedown = setButtonFrameOne;
		mc.onmouseup = setButtonFrameZero;
		mc.txt = 'more';
		mc.text = setBitmapText({
			fontBitmap: 'fonts/font_but1',
			font: font_but1,
			text: I18.f(mc.txt),
			parent: mc,
			x: 0,
			y: -3,
			scale: 1
		});
		mc.onclick = showMoreGames;
		if (!ExternalAPI.exec("getMoreGamesButtonDisable")) stage.addChild(mc);
		mc.setPropScale(0.8);

		mc = new Sprite(bitmaps.red_complete, 34, 62, 11);
		mc.x = 155;
		mc.y = 190;
		mc.animDelay = 2;
		stage.addChild(mc);

		mc = new Sprite(bitmaps.green_complete, 48, 38, 11);
		mc.x = 325;
		mc.y = 200;
		mc.animDelay = 2;
		stage.addChild(mc);

		ExternalAPI.exec('showAds');
		ExternalAPI.exec("openWidget", 160, 50, "I scored " + getTotalLevelsScores() + " in Red_And_Green_2 game! Try to beat me!");

		ExternalAPI.exec("sendScore", getTotalLevelsScores());
	}
}

function postTick()
{
	if(world && showDebugDraw) world.DrawDebugData();

	if(explosion)
	{
		if (explosion.currentFrame == 10) explosion.destroy = true;
	}
}