/**
 * @fileOverview Набор утилит для спрайтового рендеринга на канвасе
 * @author <a href="mailto:dev@playtomax.com">Александр Dev Норинчак</a>
 * @author <a href="mailto:jet@playtomax.com">Евгений Jet Савичев</a>
 * @version 1.3
 */

var CRENDER_DEBUG = false;

/**
 * @ignore
 */
if(typeof window.console == 'undefined')
{
	window.console =
	{
		log: function() {}
	};
}

/**
 * @class
 * @description Набор утилитарных функций
 */
var Utils;
if(!window.Utils) Utils = {};

/**
 * @description определение по userAgent является ли текущий браузер мобильным
 */
Utils.detectMobileBrowser = function()
{
    var mobileBrowser =  !!(navigator.userAgent.match(/Android/i) ||
							navigator.userAgent.match(/webOS/i) ||
							navigator.userAgent.match(/iPhone/i) ||
							navigator.userAgent.match(/iPad/i) ||
							navigator.userAgent.match(/iPod/i) ||
							navigator.userAgent.match(/BlackBerry/i) ||
							navigator.userAgent.match(/Windows Phone/i));

	return mobileBrowser;
};

Utils.detectTouchScreen = function()
{
    return (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
};

Utils.getTouchStartEvent = function()
{
    return Utils.isWindowsPhone() ? "MSPointerDown" : "touchstart";
};

Utils.getTouchMoveEvent = function()
{
    return Utils.isWindowsPhone() ? "MSPointerMove" : "touchmove";
};

Utils.getTouchEndEvent = function()
{
    return Utils.isWindowsPhone() ? "MSPointerUp" : "touchend";
};

/**
 * Является ли текущее устройство мобильным
 * @type boolean
 */
Utils.touchScreen = Utils.detectMobileBrowser();

/**
 * @description текущий масштаб (1, 1.5, 2)
 * @type Number
 */
Utils.globalScale = 1;

/**
 * Глобальный пиксельный масштаб
 * @type Number
 */
Utils.globalPixelScale = 1;

/**
 * Является ли текущая вкладка не активной
 * @type Boolean
 */
Utils.isWindowHidden = false;

Utils.DOMMainContainerId = "main_container";
Utils.DOMProgressContainerId = "progress_container";
Utils.DOMProgressId = "progress";
Utils.DOMScreenBackgroundContainerId = "screen_background_container";
Utils.DOMScreenBackgroundWrapperId = "screen_background_wrapper";
Utils.DOMScreenBackgroundId = "screen_background";
Utils.DOMScreenContainerId = "screen_container";
Utils.DOMScreenWrapperId = "screen_wrapper";
Utils.DOMScreenId = "screen";
Utils.DOMP2lContainerId = "p2l_container";
Utils.DOMP2lId = "p2l";
Utils.DOMMarkId = "mark";

/**
 * @description Выводит в консоль и возвращает стек вызова
 * @param {Boolean} ret Если флаг установлен - только возвращает без вывода в консоль
 */
Utils.trace = function(ret)
{
	var stack;
	try { throw new Error(''); } catch (e) { stack = e.stack || ''; }
	stack = stack.split("\n"); stack.splice(0, 2); stack = stack.join("\n");
	if (!ret) console.log(stack);
	return stack;
};

/**
 * @description Установка куки
 * @param {String} name имя
 * @param {String} value значение
 */
Utils.setCookie = function(name, value)
{
	try
	{
		window.localStorage.setItem(name, value);
	}
	catch(e)
	{
		var exp = new Date();
		exp.setDate(exp.getDate() + 365*10);
		document.cookie = name + "=" + value + "; expires=" + exp.toUTCString();
	}
};

/**
 * @description Получение куки
 * @param {String} name имя
 * @returns {String} значение куки
 */
Utils.getCookie = function(name)
{
	var ret;

	try
	{
		ret = window.localStorage.getItem(name);
	}
	catch(e)
	{
		var prefix = name + "=";
		var cookieStartIndex = document.cookie.indexOf(prefix);
		if (cookieStartIndex == -1) return null;
		var cookieEndIndex = document.cookie.indexOf(";", cookieStartIndex + prefix.length);
		if (cookieEndIndex == -1) cookieEndIndex = document.cookie.length;
		ret = decodeURIComponent(document.cookie.substring(cookieStartIndex + prefix.length, cookieEndIndex));
	}

	return ret;
};

/**
 * @ignore
 */
Utils.bindEvent = function(el, eventName, eventHandler)
{
	if(el.addEventListener)
	{
		el.addEventListener(eventName, eventHandler, false);
	}
	else if(el.attachEvent)
	{
		el.attachEvent('on' + eventName.toLowerCase(), eventHandler);
	}
};

/**
 * @ignore
 */
Utils.unbindEvent = function(el, eventName, eventHandler)
{
    if(el.removeEventListener)
    {
        el.removeEventListener(eventName, eventHandler, false);
    }
    else if(el.detachEvent)
    {
        el.detachEvent('on' + eventName, eventHandler);
    }
};

/**
 * @description Получение абсолютной X координаты левого верхнего угла DOM-элемента
 * @param {HTMLElement} element ссылка на DOM-элемент
 * @returns {Number} координата
 */
Utils.getObjectLeft = function(element)
{
	var result = element.offsetLeft;
	if(element.offsetParent) result += Utils.getObjectLeft(element.offsetParent);
	return result;
};

/**
 * @description Получение абсолютной Y координаты левого верхнего угла DOM-элемента
 * @param {HTMLElement} element ссылка на DOM-элемент
 * @returns {Number} координата
 */
Utils.getObjectTop = function(element)
{
	var result = element.offsetTop;
	if(element.offsetParent) result += Utils.getObjectTop(element.offsetParent);
	return result;
};

/**
 * @description Парсинг GET-параметров страницы
 * @returns {Object} ассоциативный массив ключ-значение
 */
Utils.parseGet = function()
{
	var get = {};

	var s = window.location.toString();
	var p = window.location.toString().indexOf("?");
	var tmp, params;
	if(p >= 0)
	{
		s = s.substr(p + 1, s.length);
		params = s.split("&");
		for(var i = 0; i < params.length; i++)
		{
			tmp = params[i].split("=");
			get[tmp[0]] = tmp[1];
		}
	}

	return get;
};

/**
 * @description Определение координат мыши относительно объекта
 * @param {Event} event событие
 * @param {HTMLElement} [object] ссылка на DOM-элемент, относительно которого необходимо получить координаты
 * @returns {Object} объект, содержащий в свойствах x и y координаты
 */
Utils.getMouseCoord = function(event, object)
{
	var e = event || window.event;
	if(e.touches) e = e.touches[0];
	if(!e) return {x: 0, y: 0};

	var x = 0;
	var y = 0;
	var mouseX = 0;
	var mouseY = 0;

	if(object)
	{
		x = Utils.getObjectLeft(object);
		y = Utils.getObjectTop(object);
	}

	if(e.pageX || e.pageY)
	{
		mouseX = e.pageX;
		mouseY = e.pageY;
	}
	else if(e.clientX || e.clientY)
	{
		mouseX = e.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft) - document.documentElement.clientLeft;
		mouseY = e.clientY + (document.documentElement.scrollTop || document.body.scrollTop) - document.documentElement.clientTop;
	}

	var retX = (mouseX - x);
	var retY = (mouseY - y);

	return {x: retX, y: retY};
};

/**
 * @description Удаление объекта и всех его копий из массива
 * @param {Array} arr Массив
 * @param {Object} item Объект для удаление
 * @returns {Array} Массив без указанного объекта
 */
Utils.removeFromArray = function(arr, item)
{
	var tmp = [];
	for(var i = 0; i < arr.length; i++)
	{
		if(arr[i] != item) tmp.push(arr[i]);
	}
	return tmp;
};

/**
 * @description Анимация процесса загрузки. Создает и отображает в элементе с id progress визуальное отображение состояния загрузки. Рекомендуется использовать вместе с <b>Utils.createLayout</b>.
 * @param {Number} val процент загрузки
 * @example
 * var preloader = new ImagesPreloader();
 * preloader.load({"logo", "logo.png"}, loadImagesEnd, Utils.showLoadProgress);
 */
Utils.showLoadProgress = function(val)
{
	var scl = Utils.globalScale;

	var s = 'Loading: ' + val + '%';
	s += '<br><br>';
	s += '<div style="display: block; background: #000; width: ' + (val * scl * 2) + 'px; height: ' + (10 * scl) + 'px;">&nbsp;</div>';

	document.getElementById(Utils.DOMProgressId).innerHTML = s;
};

/**
 * Отключение попыток убрать адресную строку мобильного браузера
 * @type Boolean
 */
Utils.hideAddressBarLock = false;

/**
 * @description Убирание адресной строки мобильного браузера
 */
Utils.mobileHideAddressBar = function()
{
	if(Utils.hideAddressBarLock) return;
	window.scrollTo(0, 1);
};

/**
 * @description Проверка на то, запущено ли приложение на 4-м IPhone
 * @returns {Boolean}
 */
Utils.mobileCheckIphone4 = function()
{
	return (Utils.detectMobileBrowser() && navigator.userAgent.indexOf('iPhone') >= 0 && window.devicePixelRatio == 2);
};

/** @ignore */
Utils.mobileCheckBrokenAndroid = function()
{
	return ( Utils.detectMobileBrowser() &&
			 Utils.isAndroid() &&
			!Utils.isChrome() &&
			!Utils.isFirefox() );
};

/** @ignore */
Utils.mobileCheckSlowDevice = function()
{
    return (Utils.mobileCheckBrokenAndroid() && navigator.userAgent.toLowerCase().indexOf("sm-t310") >= 0) ||
           (Utils.detectMobileBrowser() && Utils.isAndroid() && Utils.isFirefox() && navigator.userAgent.toLowerCase().indexOf("sm-t310") >= 0);
};

/**
 * @description Проверка является ли текущий браузер Chrome
 * @returns {Boolean}
 */
Utils.isChrome = function()
{
	var ret = false;

	if(navigator.userAgent.toLowerCase().indexOf('chrome') >= 0)
	{
		ret = true;
		if(Utils.isAndroid())
		{
			var version = parseInt((/Chrome\/([0-9]+)/.exec(navigator.appVersion) || 0)[1], 10) || 0;
			if(version < 22) ret = false;
		}
	}

	return ret;
};

/**
 * @description Проверка является ли текущее устройство Android
 * @returns {Boolean}
 */
Utils.isAndroid = function()
{
	return navigator.userAgent.toLowerCase().indexOf('android') >= 0;
};

Utils.isIOS = function()
{
    return !Utils.isWindowsPhone() && navigator.userAgent.toLowerCase().match(/(ipad|iphone|ipod)/g) ? true : false;
};

/**
 * @description Проверка является ли текущий браузер PlayFreeBrowser
 * @returns {Boolean}
 */
Utils.isPlayFreeBrowser = function()
{
	return navigator.userAgent.toLowerCase().indexOf('playfreebrowser') >= 0;
};

/**
 * @description Проверка является ли текущий браузер Firefox
 * @returns {Boolean}
 */
Utils.isFirefox = function()
{
	return navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
};

/**
 * @description Проверка является ли текущий браузер Internet Explorer
 * @returns {Boolean}
 */
Utils.isIE = function()
{
    return navigator.userAgent.toLowerCase().indexOf('MSIE') >= 0 || navigator.appName == "Microsoft Internet Explorer";
};

/**
 * @description Проверка является ли текущее устройство Windows Phone
 * @returns {Boolean}
 */
Utils.isWindowsPhone = function()
{
    return navigator.userAgent.toLowerCase().indexOf('windows phone') >= 0;
};

/** @description Отключение корректировки viewport мобильных устройств */
Utils.disableCorrectPixelRatio = false;

/**
 * @description Добавление meta-тегов, корректирующих viewport мобильных устройств
 */
Utils.mobileCorrectPixelRatio = function()
{
    if(Utils.isWindowsPhone()) return;

    var head = document.getElementsByTagName("head")[0];
    var list = head.getElementsByTagName("meta");
    var newTag = true, meta = null, content = "";
    for(var i=0; i<list.length; i++)
    {
        if(list[i].name == "viewport")
        {
            meta = list[i];
            newTag = false;
            break;
        }
    }

	if(newTag)
	{
	   meta = document.createElement('meta');
	   meta.name = "viewport";
	}

	content += "width=device-width, user-scalable=no";

	var scale = 1/(window.devicePixelRatio ? window.devicePixelRatio : 1);
	scale = scale.toFixed(2);
	if(Utils.disableCorrectPixelRatio) scale = 1;

	content += ", initial-scale="+scale+", maximum-scale="+scale+", minimum-scale="+scale;

	meta.content = content;

	if(newTag) document.getElementsByTagName('head')[0].appendChild(meta);
};

/** Список поддерживаемых разрешений */
Utils.supportedScales = [
    {scale: 1, width: 320, height: 480},
    {scale: 1.5, width: 480, height: 720},
    {scale: 2, width: 640, height: 960}
];

/**
 * @description Определение разрешения мобильного устройства. Возвращает одно из 4-х поддерживаемых: 240x400, 320х480, 480х800 или 640х960
 * @returns {Object} Объект со свойствами width, height и scale (1 для 320х480, 1.5 или 2)
 */
Utils.getMobileScreenResolution = function(landscape)
{
	var scale = 1;

	var w = window.innerWidth;
	var h = window.innerHeight;

	if(!w || !h)
	{
		w = screen.width;
		h = screen.height;
	}

	if(Utils.disableCorrectPixelRatio) scale = (window.devicePixelRatio ? window.devicePixelRatio : 1);

	w *= scale;
	h *= scale;

	var scales = Utils.clone(Utils.supportedScales);

	var container =	{width: 0, height: 0};

	var prop = "";

	if(Utils.detectMobileBrowser())
	{
		container.width = Math.min(w, h);
		container.height = Math.max(w, h);
		prop = "height";
	}
	else
	{
		if(landscape)
		{
			for(var i=0; i<scales.length; i++)
            {
                var tmp = scales[i].width;
                scales[i].width = scales[i].height;
                scales[i].height = tmp;
            }
		}

		container.width = w;
		container.height = h;
		prop = "height";
	}

	var min = Number.MAX_VALUE;
	for(i = 0; i < scales.length; i++)
	{
		var diff = Math.abs(container[prop]-scales[i][prop]);
		if(min > diff)
		{
			min = diff;
			scale = scales[i].scale;
		}
	}

	return Utils.getScaleScreenResolution(scale, landscape);
};

/**
 * @ignore
 */
Utils.getScaleScreenResolution = function(scale, landscape)
{
	var w = Math.round(320 * scale);
	var h = Math.round(480 * scale);

	return {width: landscape ? h : w, height: landscape ? w : h, scale: scale};
};

/**
 * Базовый путь для загрузки изображений
 * @type String
 */
Utils.imagesRoot = 'images';

/**
 * @ignore
 */
Utils.initialResolution = {width: 320, height: 480, scale: 1};

/**
 * Отключение корректировки высоты страницы на мобильных браузерах
 * @type Boolean
 */
Utils.ignoreMobileHeightCorrection = false;

/** Путь к картинке ротейш-скрина */
Utils.p2lImagePath = null;

/**
 * @description Создание стандартного набора элементов окружения: прогресс загрузки, экран для подложки, основной экран и сигнализация о неверном повороте экрана
 * @param {HTMLElement} container элемент-контейнер
 * @param {Object} resolution объект, полученный с помощью Utils.getMobileScreenResolution
 */
Utils.createLayout = function(container, resolution)
{
	var scl = Utils.globalScale;

	Utils.initialResolution = resolution;

	var height = window.innerHeight;
    document.body.style.overflow = "hidden";

	var p2lImagePath = Utils.p2lImagePath || (Utils.imagesRoot + "/p2l.jpg");

	var s = "";
	s += '<div id="' + Utils.DOMProgressContainerId + '" align="center" style="width: 100%; height: ' + height + 'px; display: block; position: absolute; left: 0px; top: 0px;">';
	s += '<table cellspacing="0" cellpadding="0" border="0"><tr><td id="' + Utils.DOMProgressId + '" align="center" valign="middle" style="width: ' + resolution.width + 'px; height: ' + resolution.height + 'px; color: #000; background: #fff; font-weight: bold; font-family: Verdana; font-size: ' + (12 * scl) + 'px; vertical-align: middle; box-sizing: border-box; text-align: center;"></td></tr></table>';
	s += '</div>';
	s += '<div id="' + Utils.DOMScreenBackgroundContainerId + '" style="width: 100%; height: ' + height + 'px; position: absolute; left: 0px; top: 0px; display: none; z-index: 2;">';
	s += '<div id="' + Utils.DOMScreenBackgroundWrapperId + '" style="width: ' + resolution.width + 'px; height: ' + resolution.height + 'px; position: relative; left: 0px; overflow: hidden;">';
	s += '<canvas id="' + Utils.DOMScreenBackgroundId + '" width="' + resolution.width + '" height="' + resolution.height + '" style="transform: translateZ(0)"></canvas>';
	s += '</div>';
	s += '</div>';
	s += '<div id="' + Utils.DOMScreenContainerId + '" style="width: 100%; height: ' + height + 'px; position: absolute; left: 0px; top: 0px; display: none; z-index: 3;">';
	s += '<div id="' + Utils.DOMScreenWrapperId + '" width="' + resolution.width + '" height="' + resolution.height + '" style="width: ' + resolution.width + 'px; height: ' + resolution.height + 'px; position: relative; left: 0px; overflow: hidden;">';
	s += '<canvas id="' + Utils.DOMScreenId + '" style="position: absolute; left: 0px; top: 0px;" width="' + resolution.width + '" height="' + resolution.height + '">You browser does not support this application :(</canvas>';
	s += '</div>';
	s += '</div>';

	container.innerHTML = s;

	var p = document.createElement("div");
	p.setAttribute("id", Utils.DOMP2lContainerId);
	p.setAttribute("align", "center");

	p.setAttribute("style", "width: 100%; height: " + height + "px; position: absolute; left: 0px; top: 0px; visibility: hidden; z-index: 1000; background-color: #fff; background-image: url(" + p2lImagePath + "); background-repeat: no-repeat; background-position: center center");
	var img = document.createElement("img");
	img.setAttribute("id", Utils.DOMP2lId);
	img.width = 1;
	img.height = 1;
	img.style.display = "none";
	p.appendChild(img);

	container.appendChild(p);

	if(window.parent == window && Utils.isAndroid() && Utils.isFirefox()){
		var m = document.createElement("div");
		m.setAttribute("id", Utils.DOMMarkId);
		m.style.position = "fixed";
		m.style.right = "0px";
		m.style.bottom = "0px";
		m.style.width = "1px";
		m.style.height = "1px";
		m.style.background = "";
		m.style.zIndex = "100000";
		container.appendChild(m);
	}

    var style = document.createElement('style');
    style.type = 'text/css';

    var content = "html body {-ms-content-zooming:none;";
    content += "content-zooming:none;";
    content += "-ms-touch-action:none;";
    content += "touch-action: none;} ";

    content += "body {margin:0;";
    content += "padding:0;";
    content += "background:#000;}";
    style.innerHTML = content;

    document.getElementsByTagName('head')[0].appendChild(style);

    Utils.addDetectTouchScreenEvents();
    Utils.fitLayoutToScreen();
};

/** @ignore */
Utils.addDetectTouchScreenEvents = function()
{
    var el = document.getElementById(Utils.DOMScreenId);
    Utils.bindEvent(el, "mousemove", function() { Utils.touchScreen = false; } );
    Utils.bindEvent(el, Utils.getTouchStartEvent(), function() { Utils.touchScreen = true; } );
};

/** @description Переключение лайаута в стандартный режим после загрузки */
Utils.showMainLayoutContent = function()
{
	document.getElementById(Utils.DOMProgressContainerId).style.display = 'none';
	document.getElementById(Utils.DOMScreenContainerId).style.display = 'block';
	document.getElementById(Utils.DOMScreenBackgroundContainerId).style.display = 'block';
};

/**
 * @description Превент любого бразурного события
 * @param {Event} e Событие
 */
Utils.preventEvent = function(e)
{
	e.preventDefault();
	e.stopPropagation();
	e.cancelBubble = true;
	e.returnValue = false;
	return false;
};

/** @ignore */
Utils.touchStartEventDisabled = false;

/** @ignore */
Utils.preventTouchStart = function()
{
    if(!Utils.touchStartEventDisabled) return;
    Utils.bindEvent(document.body, Utils.getTouchStartEvent(), Utils.preventEvent);
};

Utils.removePreventTouchStart = function()
{
    if(!Utils.touchStartEventDisabled) return;
    Utils.unbindEvent(document.body, Utils.getTouchStartEvent(), Utils.preventEvent);
};

/**
 * @description Добавление стандартных обработчиков событий для контроля прокрутки страница и поворота экрана
 * @param {Boolean} landscape правильная ориентация экрана
 * @param {Boolean} ignoreIOS7 при true будел лочится скролл даже на IOS7
 */
Utils.addMobileListeners = function(landscape, ignoreIOS7)
{
	if(ignoreIOS7 || !navigator.userAgent.match(/(iPad|iPhone|iPod).*CPU.*OS 7_\d/i))
	{
		Utils.touchStartEventDisabled = true;
        Utils.preventTouchStart();
	}

	if(!Utils.isPlayFreeBrowser())
	{
		Utils.bindEvent(window, "scroll", function()
		{
			setTimeout(Utils.mobileHideAddressBar, 300);
		});
	}

    var props = Utils.getVisibiltyProps();
    if(props.visibilityChange) document.addEventListener(props.visibilityChange, Utils.handleVisibilityChange, false);

	setInterval(function(){Utils.checkOrientation(landscape)}, 500);
	setTimeout(Utils.mobileHideAddressBar, 500);
};

/** @ignore */
Utils.handleVisibilityChange = function()
{
	Utils.isWindowHidden = document[Utils.getVisibiltyProps().hidden];
    Utils.dispatchEvent(Utils.isWindowHidden ? "hidewindow" : "showwindow");
	Utils.fixChromeContext();
};

/** @ignore */
Utils.getVisibiltyProps = function()
{
    var hidden, visibilityChange;

    if (typeof document.hidden !== "undefined")
    {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    }
    else if (typeof document.mozHidden !== "undefined")
    {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    }
    else if (typeof document.msHidden !== "undefined")
    {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    }
    else if (typeof document.webkitHidden !== "undefined")
    {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }

    return {hidden: hidden, visibilityChange: visibilityChange};
};

/** @ignore */
Utils.staticWindowRect = null;

Utils.setWindowRect = function(width, height)
{
    Utils.staticWindowRect = {width: width, height: height};
};

/**
 * @description Определение размеров доступного пространства
 * @returns {Object} {"width": width, "height": height}
 */
Utils.getWindowRect = function()
{
    if(window.parent == window && Utils.isAndroid() && Utils.isFirefox() && document.getElementById(Utils.DOMMarkId))
    {
        return {width: window.innerWidth, height: document.getElementById(Utils.DOMMarkId).offsetTop+1};
    }

	return {width: window.innerWidth, height: window.innerHeight};
};

/**
 * @ignore
 */
Utils.storeOrient = null;

/**
 * Отключение проверки на ориентацию устройства
 * @type Boolean
 */
Utils.noCheckOrient = false;

/**
 * @description Проверка на правильную ориентацию устройства
 * @param {Boolean} landscape Верная ориантация: false - портретная, true - лэндскейпная
 */
Utils.checkOrientation = function(landscape)
{
	if(!Utils.detectMobileBrowser()) return;
	if(!document.getElementById(Utils.DOMScreenContainerId)) return;

	if(Utils.noCheckOrient || Utils.parseGet().nocheckorient == 1) return;

	var rect = Utils.getWindowRect();
	var orient = rect.width > rect.height;

	if(Utils.storeOrient === orient) return;

	Utils.storeOrient = orient;

	var ok = (orient == landscape);

	if(!ok)
	{
		Utils.dispatchEvent("lockscreen");

		document.getElementById(Utils.DOMP2lContainerId).style.visibility = 'visible';
		document.getElementById(Utils.DOMProgressContainerId).style.visibility = 'hidden';
		document.getElementById(Utils.DOMScreenBackgroundContainerId).style.display = 'none';
		document.getElementById(Utils.DOMScreenContainerId).style.display = 'none';
	}
	else
	{
		Utils.dispatchEvent("unlockscreen");

		document.getElementById(Utils.DOMP2lContainerId).style.visibility = 'hidden';
		document.getElementById(Utils.DOMProgressContainerId).style.visibility = 'visible';
		document.getElementById(Utils.DOMScreenBackgroundContainerId).style.display = 'block';
		document.getElementById(Utils.DOMScreenContainerId).style.display = 'block';
	}

	setTimeout(Utils.mobileHideAddressBar, 900);
	setTimeout(Utils.fitLayoutToScreen, 1000);
};

/** @ignore */
Utils.fitLayoutTimer = 0;

/**
 * Добавление обработчика изменения размеров экрана
 */
Utils.addFitLayoutListeners = function()
{
	Utils.fitLayoutTimer = setInterval(Utils.fitLayoutToScreen, 500);
};

/**
 * Убирание обработчика изменения размеров экрана
 */
Utils.removeFitLayoutListeners = function()
{
	clearInterval(Utils.fitLayoutTimer);
};

/**
 * Отключение автоматического масштабирования
 * @type Boolean
 */
Utils.fitLayoutLock = false;

/**
 * Отступ по высоте при автоматической коррекции размера
 * @type Number
 */
Utils.fitLayoutCorrectHeight = 0;

/**
 * Способ выравнивания контента по горизонтали. Поддерживаемые значения: left, center, right. По умолчанию - center.
 * @type String
 */
Utils.fitLayoutAlign = "center";

/**
 * Способ выравнивания контента по вертикали. Поддерживаемые значения: top, center, bottom. По умолчанию - top.
 * @type String
 */
Utils.fitLayoutVerticalAlign = "top";

Utils.layoutMargin = {left: 0, right: 0, top: 0, bottom: 0};

Utils.fixChromeContext = function()
{
	if(Utils.isChrome())
	{
		var el = document.getElementById(Utils.DOMScreenId);
		if(el)
		{
			el.width++;
			el.width--;
		}
	}
}

/**
 * @ignore
 */
Utils.fitLayoutToScreen = function(container)
{
	var s, width, height, windowRect, realWindowRect;

	if(Utils.isWindowHidden) Utils.fixChromeContext();

	if(Utils.fitLayoutLock)	return;

	realWindowRect = Utils.getWindowRect();

	if((typeof container != "object") || !container.width)
	{
		windowRect = Utils.staticWindowRect ? Utils.staticWindowRect : realWindowRect;

		width = windowRect.width;
		height = windowRect.height;

		height += Utils.fitLayoutCorrectHeight;

		height -= Utils.layoutMargin.top;
		height -= Utils.layoutMargin.bottom;

		width -= Utils.layoutMargin.left;
        width -= Utils.layoutMargin.right;

		container = {width: width, height: height};
	}

	if(!container.width || !container.height) return;

	s = document.getElementById(Utils.DOMScreenWrapperId);
	if(!s) return;

	if(!s.initWidth)
	{
		s.initWidth = Utils.initialResolution.width;
		s.initHeight = Utils.initialResolution.height;
	}

	width = s.initWidth;
	height = s.initHeight;

	var scaleX = container.width / width;
	var scaleY = container.height / height;

	var scale = (scaleX < scaleY ? scaleX : scaleY);
	Utils.globalPixelScale = scale;

	width = Math.floor(width * scale);
	height = Math.floor(height * scale);

	if(s.lastWidth == container.width &&
	   s.lastHeight == container.height &&
	   s.lastRealWidth == realWindowRect.width &&
	   s.lastRealHeight == realWindowRect.height) return;

    s.lastWidth = container.width;
    s.lastHeight = container.height;
    s.lastRealWidth = realWindowRect.width;
    s.lastRealHeight = realWindowRect.height;

	Utils.resizeElement(Utils.DOMScreenId, width, height);
	Utils.resizeElement(Utils.DOMScreenBackgroundId, width, height);

	Utils.resizeElement(Utils.DOMProgressContainerId, windowRect.width, windowRect.height);

	Utils.resizeElement(Utils.DOMProgressId, width, height);

	s = Utils.resizeElement(Utils.DOMScreenWrapperId, width, height);
	Utils.alignElement(s, realWindowRect, width, height);

	s = Utils.resizeElement(Utils.DOMScreenBackgroundWrapperId, width, height);
	Utils.alignElement(s, realWindowRect, width, height);

	Utils.resizeElement(Utils.DOMP2lContainerId, windowRect.width, windowRect.height);

	Utils.resizeElement(Utils.DOMScreenContainerId, windowRect.width, windowRect.height);
	Utils.resizeElement(Utils.DOMScreenBackgroundContainerId, windowRect.width, windowRect.height);

    var sz = Math.floor(Math.min(realWindowRect.width, realWindowRect.height)/2);
    s = document.getElementById(Utils.DOMP2lContainerId);
    if(s) s.style.backgroundSize = sz + "px " + sz + "px";

	Utils.dispatchEvent("fitlayout");

	if(Utils.isPlayFreeBrowser()) window.scrollTo(1, 2);
	setTimeout(Utils.mobileHideAddressBar, 10);

	Utils.fixChromeContext();
};

/**
 * @ignore
 */
Utils.alignElement = function(s, windowRect, width, height)
{
    if(!s) return;

    if(Utils.fitLayoutAlign == "left") s.style.left = Utils.layoutMargin.left + "px";
    else if(Utils.fitLayoutAlign == "right") s.style.left = Math.floor(windowRect.width - width - Utils.layoutMargin.right) + "px";
    else s.style.left = Math.floor((windowRect.width - width - Utils.layoutMargin.left - Utils.layoutMargin.right)/2) + "px";

    if(Utils.fitLayoutVerticalAlign == "top") s.style.top = Utils.layoutMargin.top + "px";
    else if(Utils.fitLayoutVerticalAlign == "bottom") s.style.top = Math.floor(windowRect.height - height - Utils.layoutMargin.bottom) + "px";
    else s.style.top = Math.floor((windowRect.height - height - Utils.layoutMargin.top - Utils.layoutMargin.bottom)/2) + "px";
};

/**
 * @ignore
 */
Utils.resizeElement = function(id, width, height)
{
	var s = document.getElementById(id);
	if(!s) return null;

	s.style.width = Math.floor(width) + "px";
	s.style.height = Math.floor(height) + "px";

	return s;
};

/**
 * Отрисовка на сцене области, в которую не должны попадать игровые объекты в связи с ограниченим в IPhone по высоте видимой области браузера.
 * @deprecated
 * @param {Stage} stage сцена
 * @param {Boolean} landscape ориентация экрана игры
 */
Utils.drawIphoneLimiter = function(stage, landscape)
{
	if(landscape) stage.drawRectangle(240, 295, 480, 54, "#f00", true, 0.5, true);
	else stage.drawRectangle(160, 448, 320, 64, "#f00", true, 0.5, true);
};

/** @ignore */
Utils.drawGrid = function(stage, landscape, col)
{
	if( typeof landscape == 'undefined') landscape = false;
	var dx = 10;
	var dy = 10;
	if( typeof col == 'undefined') col = '#FFF';
	var w = 1;

	var s = {w: ( landscape ? 480 : 320), h: ( landscape ? 320 : 480)};

	for(var x = dx; x < s.w; x += dx)
	{
		var o = 0.1 + 0.1 * (((x - dx) / dx) % 10);
		stage.drawLine(x, 0, x, s.h, w, col, o);
	}
	for(var y = dy; y < s.h; y += dy)
	{
		o = 0.1 + 0.1 * (((y - dy) / dy) % 10);
		stage.drawLine(0, y, s.w, y, w, col, o);
	}
};

/**
 * Заливка неиспользуемого пространства на канвасе для нестандартных масштабов
 * @deprecated
 * @param {Stage} stage сцена
 * @param {Boolean} landscape ориентация экрана
 */
Utils.drawScaleFix = function(stage, landscape)
{
	if(Utils.globalScale == 0.75)
	{
		if(landscape) stage.drawRectangle(507, 160, 54, 320, "#000", true, 1, true);
		else stage.drawRectangle(160, 507, 320, 54, "#000", true, 1, true);
	}
	if(Utils.globalScale == 1.5)
	{
		if(landscape) stage.drawRectangle(510, 160, 60, 320, "#000", true, 1, true);
		else stage.drawRectangle(160, 510, 320, 60, "#000", true, 1, true);
	}
};

/**
 * Перевод градусов в радианы
 * @param val значение
 */
Utils.grad2radian = function(val)
{
	return val / (180 / Math.PI);
};

/**
 * Перевод радиан в градусы
 * @param val значение
 */
Utils.radian2grad = function(val)
{
	return val * (180 / Math.PI);
};

/** @ignore */
Utils.eventsListeners = [];

/**
 * @event
 * @description Callback, вызываемый при блокировании экрана
 */
Utils.onlockscreen = null;

/**
 * @event
 * @description Callback, вызываемый при разблокировании экрана
 */
Utils.onunlockscreen = null;

/**
 * @event
 * @description Callback, вызываемый при переключении на другую вкладку
 */
Utils.onhidewindow = null;

/**
 * @event
 * @description Callback, вызываемый при переключении на текущую вкладку
 */
Utils.onshowwindow = null;

/**
 * @event
 * @description Callback, вызываемый при изменении размера окна
 */
Utils.onfitlayout = null;

/**
 * @description добавление обработчика событий
 * @param {String} type Тип события (lockscreen, unlockscreen, fitlayout)
 * @param {Function} callback Функция обработчик события
 */
Utils.addEventListener = function(type, callback)
{
	EventsManager.addEvent(Utils, type, callback, false);
};

/**
 * @description добавление обработчика событий, который будет выполнен один раз
 * @param {String} type Тип события (lockscreen, unlockscreen, fitlayout)
 * @param {Function} callback Функция обработчик события
 */
Utils.addEventListenerOnce = function(type, callback)
{
    EventsManager.addEvent(Utils, type, callback, true);
};

/**
 * @description удаление обработчика событий
 * @param {String} type Тип события
 * @param {Function} callback Функция обработчик события
 */
Utils.removeEventListener = function(type, callback)
{
	EventsManager.removeEvent(Utils, type, callback);
};

/**
 * @description генерирование события
 * @param {String} type Тип события
 * @param {Object} params Параметры, которые будут переданы в обработчик
 */
Utils.dispatchEvent = function(type, params)
{
	return EventsManager.dispatchEvent(Utils, type, params);
};

/**
 * @description Проверка на то, является ли объект массивом
 * @param {Object} obj Проверяемый объект
 */
Utils.isArray = function(obj)
{
	return Array.isArray ? Array.isArray(obj) : Object.prototype.toString.call(obj) === '[object Array]';
};

/**
 * @description Проверка на то, является ли объект "чистым" объектом, а не инстансом какого-либо класса
 * @param {Object} obj Проверяемый объект
 */
Utils.isPlainObject = function(obj)
{
	if(!obj || !obj.constructor) return false;
	return obj.constructor === Object;
};

/**
 * @description Преобразование в массив аргументов функции
 * @param {Object} arg Арументы функции
 * @param {Number} from Начиная с какого аргумента возвращать значения
 */
Utils.getFunctionArguments = function(arg, from)
{
	if(typeof from == "undefined") from = 0;
    return [].slice.call(arg, from);
};

/**
 * @description Привязка функции к контексту.
 * @param {Function} fn
 * @param {Object} context
 */
Utils.proxy = function(fn, context)
{
	var proxyArgs = [];
    for(var i=2; i<arguments.length; i++) proxyArgs.push(arguments[i]);
	return function()
	{
		var args = [];
		for(var i=0; i<arguments.length; i++) args.push(arguments[i]);
		return fn.apply(context || this, args.concat(proxyArgs));
	};
};

/**
 * @description Имитация наследования
 * @param {Function} Child дочерняя функция
 * @param {Function} Parent родительская функция
 */
Utils.extend = function(Child, Parent)
{
	var F = function() {};

	F.prototype = Parent.prototype;
	Child.prototype = new F();
	Child.prototype.constructor = Child;
	Child.superclass = Parent.prototype;
};

/**
 * @description Вызов конструктора родительского класса. Все аргументы после обязательных будут переданы в конструктор.
 * @param {Function} fn Дочерняя функция
 * @param {Object} context Дочерний объект
 * @example Utils.callSuperConstructor(MyVector, this, 10, 20);
 */
Utils.callSuperConstructor = function(fn, context)
{
    var args = [];
    for(var i=2; i<arguments.length; i++) args.push(arguments[i]);
	fn.superclass.constructor.apply(context, args);
};

/**
 * @description Вызов метода родительского класса. Все аргументы после обязательных будут переданы в метод.
 * @param {Function} fn Фунция текущего объекта функция
 * @param {Object} context Текущий объект (в общем случае - this)
 * @param {String} method Имя метода
 * @example Utils.callSuperMethod(MyVector, this, "rotate", Math.PI);
 */
Utils.callSuperMethod = function(fn, context, method)
{
    var args = [];
    for(var i=3; i<arguments.length; i++) args.push(arguments[i]);
    return fn.superclass[method].apply(context, args);
};

/**
 * Копирование свойств из одного объекта в другой. Функции и инстансы классов копируются по ссылке. Остальные - по значению.
 * @param {*} objFrom
 * @param {*} objTo
 */
Utils.copyObjectProps = function(objFrom, objTo)
{
	for(var i in objFrom)
    {
        if(!objFrom.hasOwnProperty(i)) continue;

        if(Utils.isArray(objFrom[i]))
        {
            objTo[i] = [];
            for(var n=0; n<objFrom[i].length; n++)
            {
				if(typeof objFrom[i][n] == "object" && objFrom[i][n] !== null)
				{
					objTo[i][n] = Utils.cloneEmptyObject(objFrom[i][n]);
					Utils.copyObjectProps(objFrom[i][n], objTo[i][n]);
				}
				else objTo[i][n] = objFrom[i][n];
            }
            continue;
        }

        if(Utils.isPlainObject(objFrom[i]))
        {
            objTo[i] = {};
            Utils.copyObjectProps(objFrom[i], objTo[i]);
            continue;
        }

        objTo[i] = objFrom[i];
    }
};

/** @ignore */
Utils.cloneEmptyObject = function(obj)
{
    if(obj.constructor) return new obj.constructor();
    return {};
};

/**
 * Клонирование объекта
 * @param {Object} obj
 */
Utils.clone = function(obj)
{
    if(!obj || (typeof obj != "object")) return obj;

    var clone = Utils.cloneEmptyObject(obj);

    Utils.copyObjectProps(obj, clone);

    return clone;
};

/**
 * Переключение работы всех классов на тайминг по времени, а не по кадрам
 * @param {Number} delta Таймаут на переключение кадров
 */
Utils.switchToTimeMode = function(delta)
{
    Stage.TIMER_MODE = Stage.TIMER_MODE_TIME;
    Tween.STEP_TYPE = Tween.STEP_BY_TIME;
    StageTimer.TIMEOUT_TYPE = StageTimer.TIMEOUT_BY_TIME;
    Sprite.CHANGE_FRAME_TYPE = Sprite.CHANGE_FRAME_BY_TIME;
    Sprite.CHANGE_FRAME_DELAY = delta;
};

Utils.getGameID = function()
{
    if(window.GAME_ID && window.GAME_ID != "my_game") return window.GAME_ID;

    var s = window.location.toString(), tmp = s.split("/"), id = "";
    while(!id)
    {
        id = tmp.pop();
        if(id.split(".").length > 1) id = "";
        if(tmp.length == 0) id = "my_game";
    }
    return id;
};

/** @ignore */
Utils.ajax = function(url, method, params, dataType, successCallback, failCallback)
{
    var xmlhttp, isXDomainRequest = false;

    function finalizeResponse(ret)
    {
        if(dataType == "json") ret = JSON.parse(ret);
        if(dataType == "xml") ret = Utils.parseXMLString(ret);

        if(successCallback) successCallback(ret, xmlhttp);
    }

    if (window.XMLHttpRequest) xmlhttp = new XMLHttpRequest();
    else xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");

    if(Utils.isIE() && window.XDomainRequest && !document.addEventListener)
    {
        var a = document.createElement("a");
        a.href = url;

        if(window.location.hostname && a.hostname && window.location.hostname != a.hostname)
        {
            xmlhttp = new XDomainRequest();
            isXDomainRequest = true;
        }
    }

    if(isXDomainRequest)
    {
        xmlhttp.onload = function()
        {
            finalizeResponse(xmlhttp.responseText);
        };

        xmlhttp.onerror = function()
        {
            if(failCallback) failCallback(1, xmlhttp);
        };

        xmlhttp.ontimeout = function()
        {
            if(failCallback) failCallback(0, xmlhttp);
        };
    }
    else
    {
        xmlhttp.onreadystatechange = function()
        {
            if (xmlhttp.readyState == 4)
            {
                var ret = xmlhttp.responseText;
                if ((xmlhttp.status == 200 || xmlhttp.status == 0) && ret)
                {
                    finalizeResponse(ret);
                }
                else
                {
                    if(failCallback) failCallback(xmlhttp.status, xmlhttp);
                }
            }
        };
    }

    if(params)
    {
        if(typeof params != "string")
        {
            var p = [];
            for(var i in params) p.push(encodeURIComponent(i) + "=" + encodeURIComponent(params[i]));
            params = p.join("&");
        }
    }
    else params = "";

    if(!method) method = "GET";

    xmlhttp.open(method, url + (method == "GET" ? "?"+params : ""), true);

    if(method == "POST" && !isXDomainRequest) xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xmlhttp.send(method != "GET" ? params : null);
};

/**
 * GET-запрос
 * @param {String} url ссылка
 * @param {Object} params объект ключ-значение параметров запроса
 * @param {String} dataType тип ожидаемых данных (string, xml или json)
 * @param {Function} successCallback обработчик успешного запроса
 * @param {Function} failCallback обработчик ошибочного запроса
 */
Utils.get = function(url, params, dataType, successCallback, failCallback)
{
    Utils.ajax(url, "GET", params, dataType, successCallback, failCallback);
};

/**
 * POST-запрос
 * @param {String} url ссылка
 * @param {Object} params объект ключ-значение параметров запроса
 * @param {String} dataType тип ожидаемых данных (string, xml или json)
 * @param {Function} successCallback обработчик успешного запроса
 * @param {Function} failCallback обработчик ошибочного запроса
 */
Utils.post = function(url, params, dataType, successCallback, failCallback)
{
    Utils.ajax(url, "POST", params, dataType, successCallback, failCallback);
};

/** @ignore */
Utils.getBezierBasis = function(i, n, t)
{
    function f(n) {return (n <= 1) ? 1 : n * f(n - 1);}
    return (f(n)/(f(i)*f(n - i)))* Math.pow(t, i)*Math.pow(1 - t, n - i);
};

/**
 * Рассчет кривой безье
 * @param {Array} points массив точек ({x: x, y: y})
 * @param {Number} [step] шаг рассчета (от >0 до 1)
 */
Utils.getBezierCurve = function(points, step)
{
    if (typeof step == "undefined") step = 0.1;

    var res = [];

    step = step / points.length;

    for (var t = 0.0; t < 1 + step; t += step)
    {
        if (t > 1) t = 1;

        var ind = res.length;

        res[ind] = {x: 0, y: 0};

        for (var i = 0; i < points.length; i++)
        {
            var b = Utils.getBezierBasis(i, points.length - 1, t);

            res[ind].x += points[i].x * b;
            res[ind].y += points[i].y * b;
        }
    }

    return res;
};

/**
 * Парсинг xml-строки
 * @param {String} data
 */
Utils.parseXMLString = function(data)
{
    var xml = null;

    if (typeof window.DOMParser != "undefined")
    {
        xml = (new window.DOMParser()).parseFromString(data, "text/xml");
    }
    else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM"))
    {
        xml = new window.ActiveXObject("Microsoft.XMLDOM");
        xml.async = "false";
        xml.loadXML(data);
    }
    else
    {
        throw new Error("No XML parser found");
    }

    return xml;
};

/** Перевод страницы в полноэкранный режим */
Utils.gotoFullScreen = function(element)
{
    element = element || document.documentElement;

    if(element.requestFullscreen) element.requestFullscreen();
    if(element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    if(element.mozRequestFullScreen) element.mozRequestFullScreen();
    if(element.msRequestFullscreen) element.msRequestFullscreen();
};

/** Выход из полноэкранного режима */
Utils.cancelFullScreen = function()
{
    if(document.cancelFullScreen) document.cancelFullScreen();
    if(document.webkitCancelFullScreen) document.webkitCancelFullScreen();
    if(document.mozCancelFullScreen) document.mozCancelFullScreen();
    if(document.msExitFullscreen) document.msExitFullscreen();
    if(document.exitFullscreen) document.exitFullscreen();
};

/** Проверка на то, отображается ли сейчас страница в полноэкранном режиме */
Utils.isFullScreen = function()
{
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
};

/** Проверка доступности полноэкранного api */
Utils.isFullScreenEnabled = function()
{
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
};

/** Переключение состояния полноэкранного режима */
Utils.toggleFullScreen = function(element)
{
    if(Utils.isFullScreen()) Utils.cancelFullScreen();
    else Utils.gotoFullScreen(element);
};

/** Определение знака числа */
Utils.sign = function(val)
{
    if(val == 0) return 0;
    return val > 0 ? 1 : -1;
};

/**
 * @class
 * @description Класс для загрузки картинок
 */
function ImagesPreloader()
{
	this.loadedImages =	{};

	this.data = null;
	this.endCallback = null;
	this.processCallback = null;
	
	/**
	 * стартовое значение прогресса загрузки
	 * @type Number
	 */
	this.minProgressVal = 0;
	/**
	 * на сколько процентов максимум может поменяться прогресс загрузки
	 * @type Number
	 */
	this.maxProgressVal = 100;
	
	this.wait = Utils.proxy(this.wait, this);
}

/**
 * @method load
 * @description Старт загрузки
 * @param {Array} data Массив объектов вида [{name: '', src: ''}, {...}...], где name - идентификатор картинки, src - ссылка на картинку.
 * @param {Function} endCallback Callback функция, которая будет вызвана при окончании загрузки. Передаваемый параметр - массив объектов вида [{name: Image}, {...}...]
 * @param {Function} processCallback (Optional) Callback функция, которая вызывается в процессе загрузки. Передаваемый параметр - процент загрузки.
 * @example
 * var preloader = new ImagesPreloader();
 * var data = [];
 * data.push({'test1', 'test1.jpg'});
 * data.push({'test2', 'test2.jpg'});
 * preloader.load(data, endLoad, processLoad);
 */
ImagesPreloader.prototype.load = function(data, endCallback, processCallback)
{
	this.data = data;
	this.endCallback = endCallback;
	this.processCallback = processCallback;

	for(var i = 0; i < this.data.length; i++)
	{
		var item = this.data[i];
		var img = new Image();
		img.src = item.src;
		this.loadedImages[item.name] = img;
	}

	this.wait();
};

/**
 * @ignore
 */
ImagesPreloader.prototype.wait = function()
{
	var itemsLoaded = 0;
	var itemsTotal = 0;
	for(var key in this.loadedImages)
	{
		if(this.loadedImages[key].complete)	itemsLoaded++;
		itemsTotal++;
	}

	if(itemsLoaded >= itemsTotal)
	{
		if(this.endCallback) this.endCallback(this.loadedImages);
	}
	else
	{
		if(this.processCallback) this.processCallback(Math.floor(itemsLoaded / itemsTotal * this.maxProgressVal + this.minProgressVal));
		setTimeout(this.wait, 50);
	}
};

/**
 * @class
 * @description Класс для загрузки звуков
 */
function SoundsPreloader(sounds, endCallback, progressCallback)
{
	this.sounds = sounds;
	this.endCallback = endCallback;
	this.progressCallback = progressCallback;
	
	this.loadedCount = 0;
	
	/**
	 * стартовое значение прогресса загрузки
	 * @type Number
	 */
	this.minProgressVal = 0;
	/**
	 * на сколько процентов максимум может поменяться прогресс загрузки
	 * @type Number
	 */
	this.maxProgressVal = 100;
}

/**
 * @method
 * @description Проверка на поддержку формата mp3 браузером
 */
SoundsPreloader.prototype.isMp3Support = function()
{
	return document.createElement('audio').canPlayType('audio/mpeg') != "";
};

/**
 * @method
 * @description Проверка на поддержку WebAudio браузером
 */
SoundsPreloader.prototype.isWebAudio = function()
{
	return Boolean(window.AudioMixer) && AudioMixer.isWebAudioSupport();
};

/**
 * @method
 * @description Старт загрузки
 * @param {Array} sounds Массив имен звуков для загрузки.
 * @param {Function} endCallback Callback функция, которая будет вызвана при окончании загрузки.
 * @param {Function} [progressCallback] Callback функция, которая вызывается в процессе загрузки. Передаваемый параметр - процент загрузки.
 */
SoundsPreloader.prototype.load = function(sounds, endCallback, progressCallback)
{
	if(sounds) this.sounds = sounds;
	if(endCallback) this.endCallback = endCallback;
	if(progressCallback) this.progressCallback = progressCallback;
	
	if(!this.sounds || this.sounds.length < 1 || !this.isWebAudio())
	{
		if(this.endCallback) this.endCallback();
		return;
	}
	
	var ext = this.isMp3Support() ? "mp3" : "ogg";
	var xmlhttp, src, wrapper;
	
	this.loadedCount = 0;
	
	var self = this;
	
	for(var i=0; i<this.sounds.length; i++)
	{
	    src = this.sounds[i] + "." + ext;
	    
	    if(this.isWebAudio())
	    {
		    if (window.XMLHttpRequest)
		    {
		        xmlhttp = new XMLHttpRequest();
		    }
		    else
		    {
		        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
		    }
		    
		    xmlhttp.open("GET", src, true);
		    xmlhttp.responseType = 'arraybuffer';
		    
		    xmlhttp.onreadystatechange = function()
		    {
		        if (this.readyState == 4 && (this.status == 200 || this.status == 0))
		        {
					var url = this.soundSrc;
					
					if(!AudioMixer.waContext) AudioMixer.waContext = new AudioContext();
					AudioMixer.waContext.decodeAudioData(this.response,
						function(buffer)
						{
							AudioMixer.buffer[url] = buffer;
							self.soundIsLoaded(null, self);
						},
						function()
						{
							self.soundIsLoaded(null, self);
						});
		        }
				
				if (this.readyState == 4 && this.status == 404)
				{
					self.soundIsLoaded(null, self);
				}
		    };
		    
		    xmlhttp.soundSrc = src;
		    xmlhttp.send();
	    }
	    else
	    {
	    	wrapper = document.createElement('audio');
	    	wrapper.src = src;
			wrapper.type = (ext == "mp3" ? "audio/mpeg" : "audio/ogg");
			wrapper.preload = "auto";
			wrapper.load();
			wrapper.addEventListener("canplay", Utils.proxy(this.soundIsLoaded, wrapper, this));
			wrapper.addEventListener("canplaythrough", Utils.proxy(this.soundIsLoaded, wrapper, this));
	    }
	}
};

/**
 * @ignore
 */
SoundsPreloader.prototype.soundIsLoaded = function(e, self)
{
	if(this.nodeName && this.nodeName.toLowerCase() == "audio")
	{
		if(this.alreadyLoaded) return;
		this.alreadyLoaded = true;
	}
	
	self.loadedCount++;
	
	if(self.progressCallback) self.progressCallback(Math.floor(self.loadedCount / self.sounds.length * self.maxProgressVal + self.minProgressVal));
	
	if(self.loadedCount >= self.sounds.length)
	{
		if(self.endCallback) self.endCallback();
	}
};


/**
 * @class
 * @description Класс элемента в библиотеке <a href="AssetsLibrary.html">AssetsLibrary</a>
 * @param {String} name Уникальное название, по которому можно будет обращаться к элементу в библиотеке
 * @param {String} src URL изображения
 * @param {Number} w ширина одного кадра в спрайте в масштабе 1х
 * @param {Number} h высота одного кадра спрайта в масштабе 1х
 * @param {Number} f количество кадров в спрайте (расположены вертикально)
 * @param {Number} l количество слоёв в спрайте (расположены горизонтально)
 * @example см. описание <a href="Sprite.html#constructor">Sprite</a>
 */
function Asset(name, src, w, h, f, l)
{
	/**
	 * @description Название, по которому потом можно обращаться к элементу в библиотеке
	 * @type {String}
	 */
	this.name = name + '';

	/**
	 * @description URL изображения
	 * @type {String}
	 */
	this.src = src + '';

	/**
	 * @description ширина одного кадра в спрайте в масштабе 1х
	 * @type {Number}
	 */
	this.width = w;

	/**
	 * @description высота одного кадра спрайта в масштабе 1х
	 * @type {Number}
	 */
	this.height = h;

	/**
	 * @description количество кадров в спрайте (расположены вертикально)
	 * @type {Number}
	 */
	this.frames = f;

	/**
	 * @description количество слоёв в спрайте (расположены горизонтально)
	 * @type {Number}
	 */
	this.layers = l;

	/**
	 * @description Изображение после загрузки
	 * @type {Image}
	 */
	this.bitmap = null;

	/**
	 * @ignore
	 * @description Associated game object
	 * @type {Object}
	 */
	this.object = null;

	/**
	 * @description Флаг выставляется в TRUE после того, как изображение загружено и готово к использованию.
	 * @type {Boolean}
	 */
	this.ready = !!(this.width && this.height);
	
	/**
	 * @description Конструктор спрайта (строка или функция)
	 * @type {Function}
	 */
	this.spriteClass = null;
}

/**
 * @ignore
 * @method detectSize
 * @description Определяет размеры спрайта либо как указано, либо пытается автоматом
 */
Asset.prototype.detectSize = function()
{
	if(!this.bitmap) return false;
	try
	{
		if(isNaN(this.width))
		{
			this.width = this.bitmap.width ? parseInt(this.bitmap.width) : 0;
		}
		
		if(isNaN(this.height))
		{
			this.height = this.bitmap.height ? parseInt(this.bitmap.height) : 0;
		}
	}
	catch (e)
	{
		if(CRENDER_DEBUG) console.log(e);
	}
	
	return (!isNaN(this.width) && !isNaN(this.height));
};

/**
 * @ignore
 * @method normalize
 * @description Преобразовывает размеры соответственно указанному масштабу и количеству кадров/слоёв. Если размер неизвестен - пытается определить его сам.
 */
Asset.prototype.normalize = function(scale)
{
	if(this.ready) return;
	if(!this.detectSize()) return;

	if(isNaN(this.frames) || this.frames < 1) this.frames = 1;
	if(isNaN(this.layers) || this.layers < 1) this.layers = 1;

	this.width = Math.ceil((this.width / this.layers) / scale);
	this.height = Math.ceil((this.height / this.frames) / scale);

	this.ready = true;
};

/**
 * @class
 * @description Класс для предзагрузки растра и его использования
 * @param {String} path Путь к изображениям относительно JS, в котором используется библиотека
 * @param {Number} scale Используемый масштаб
 * @param {Array} [assets] Необязательный массив описаний для загрузки (см. <a href="Asset.html">Asset</a>). Удобно использовать, если эти данные определяются в отдельном JS.
 * @example
 * Использовать примерно так:
 * <code>
 * var library = new AssetsLibrary('images', Utils.globalScale);
 *
 * library.addAsset('%PATH%/blank.gif', 'blank'); // %PATH% указывается в конструкторе
 * library.addAsset('%SCALE%/hourglass.png', 'hourglass'); // %SCALE% = %PATH%/scale
 * library.addAsset('%SCALE%/ui/background.jpg', 'background', 480, 320); // 1 frame, 1 layer
 * library.addAsset('%SCALE%/ui/button.png', 'button', 480, 320, 1, 3); // 1 frame, 3 layers
 * library.addAsset('%SCALE%/animations/thing.png', 'thing', 120, 100, 5); // 5 frames animation
 *
 * library.load(
 * 	function(assets) {
 * 		// всё загружено
 * 	},
 * 	function(progress) {
 * 		// загружено (progress * 100) процентов
 * 	}
 * );
 *
 * // --------------------------------
 *
 * var params = {
 * 	x: 100, y: 200, zIndex: 20,
 * 	animated: false,
 * 	onclick: myClickHandler
 * }
 *
 * var mc = library.getSprite('thing', params);
 * stage.addChild(mc);
 * </code>
 */
function AssetsLibrary(path, scale, assets)
{
	/**
	 * @description Папка с картинками
	 * @type {String}
	 */
	this.path = 'images';

	/**
	 * @description Масштаб
	 * @type {String}
	 */
	this.scale = 1;

	/**
	 * @description Массив описаний мувиков
	 */
	this.items = {};

	/**
	 * @description Хеш загруженных мувиков имя:Sprite. Доступен после загрузки.
	 */
	this.bitmaps = {};

	/**
	 * @description Флаг полной загрузки последней очереди.
	 * @type {Boolean}
	 */
	this.loaded = false;

	/**
	 * @description callback на загрузку очереди
	 * @type {Function}
	 */
	this.onload = null;

	/**
	 * @description callback на прогресс загрузки очереди
	 * @type {Function}
	 */
	this.onloadprogress = null;
	
	/**
	 * @description Класс спрайта, который будет возвращаться библиотекой
	 * @type {Function}
	 */
	this.spriteClass = Sprite;
	
	this.onLoadHandler = Utils.proxy(this.onLoadHandler, this);
	this.onLoadProgressHandler = Utils.proxy(this.onLoadProgressHandler, this);
	
	this.init(path, scale);
	this.addAssets(assets);
}

/**
 * @method init
 * @description Инициализация библиотеки
 * @param {String} path папка с картинками
 * @param {float} scale масштаб
 * @returns {void}
 */
AssetsLibrary.prototype.init = function(path, scale)
{
	if( typeof path != 'undefined')
	{
		this.path = path + '';
	}
	if( typeof scale != 'undefined')
	{
		this.scale = parseFloat(scale);
		if(isNaN(this.scale)) this.scale = 1;
	}
};

/**
 * @method load
 * @description Загрузка AssetsLibrary.items
 * @param {Function} onload callback завершения
 * @param {Function} onloadprogress callback прогресса
 * @param {Number} minProgressVal стартовое значение прогресса загрузки
 * @param {Number} maxProgressVal на сколько процентов максимум может поменяться прогресс загрузки
 * @returns {void}
 */
AssetsLibrary.prototype.load = function(onload, onloadprogress, minProgressVal, maxProgressVal)
{
	this.onload = onload;
	this.onloadprogress = onloadprogress;

	var preloader = new ImagesPreloader();
	var data = [];
	for(var n in this.items) data.push(this.items[n]);
	
	if(typeof minProgressVal != "undefined") preloader.minProgressVal = minProgressVal;
	if(typeof maxProgressVal != "undefined") preloader.maxProgressVal = maxProgressVal;
	
	preloader.load(data, this.onLoadHandler, this.onLoadProgressHandler);
};

/** @ignore */
AssetsLibrary.prototype.onLoadProgressHandler = function(val)
{
	if( typeof this.onloadprogress == 'function')
	{
		this.onloadprogress(val);
	}
};

/** @ignore */
AssetsLibrary.prototype.onLoadHandler = function(data)
{
	this.loaded = true;
	for(var n in data)
	{
		var bmp = data[n];
		var asset = this.items[n];

		asset.bitmap = bmp;
		asset.normalize(this.scale);
	}
	
	if( typeof this.onload == 'function')
	{
		this.onload(this.items);
	}
	};

/**
 * @method addAssets
 * @description Добавляет набор картинок
 * @param {Array} data Набор картинок, массив объектов-описаний, например из конфига приложения.
 * @returns {void}
 */
AssetsLibrary.prototype.addAssets = function(data)
{
	if( typeof data == 'undefined') return;
	if( typeof data != 'object') return;
	
	for(var i = 0; i < data.length; i++)
	{
		var item = data[i];
		item.noscale = ( typeof item.noscale == 'undefined') ? false : item.noscale;
		if(!item.noscale) item.src = '%SCALE%/' + item.src;
		
		//this.addAsset(item.src, item.name, item.width, item.height, item.frames, item.layers);
		this.addAsset(item);
	}
};

/**
 * @method addAsset
 * @description Ставит мувик в очередь на загрузку
 * @param {String} src Путь к картинке. Используйте %SCALE%/path/asset.ext для картинок с масштабом
 * @param {String} name Название в bitmaps. Если не указано, будет использовано имя файла без расширения.
 * @param {Number} w Ширина в масштабе 1x. Если не указана, будет произведена попытка определить автоматически (Внимание! Автоопределение не везде поддерживается)
 * @param {Number} h Высота в масштабе 1x. Если не указана, будет произведена попытка определить автоматически (Внимание! Автоопределение не везде поддерживается)
 * @param {Number} [f=1] Количество фреймов (вертикально)
 * @param {Number} [l=1] Количество слоёв (горизонтально)
 * @returns {Asset}
 */
AssetsLibrary.prototype.addAsset = function(src, name, w, h, f, l)
{
	function src2name(src)
	{
		var name = src.split('/');
		name = name.pop();
		name = name.split('.');
		name = name.shift() + '';
		return name;
	}

	var spriteClass = null, properties = null;
	if (typeof src == 'object' && (arguments.length == 1))
	{
		name = src.name;
		w = src.width || NaN;
		h = src.height || NaN;
		f = src.frames || 1;
		l = src.layers || 1;
		spriteClass = src.spriteClass || null;
		properties = src.properties || null;
		src = src.src;
	}

	src = src.replace('%SCALE%', '%PATH%/' + this.scale);
	src = src.replace('%PATH%', this.path);
	if( typeof name == 'undefined') name = src2name(src);

	var asset = new Asset(name, src, w, h, f, l);
	asset.spriteClass = spriteClass;
	
	// extend asset with custom properties
	if (properties)
    {
        for (var prop in properties)
        {
            if (typeof asset[prop] == 'undefined') asset[prop] = properties[prop];
        }
    }

	this.items[name] = asset;
	return asset;
};

/**
 * @method addObject
 * @description Добавляет новый игровой объект в очередь загрузки
 * @param {Object} obj Объект из levels.js
 * @returns {Asset}
 */
AssetsLibrary.prototype.addObject = function(obj)
{
	// objects are always scaled and size is 1x
	var asset = this.addAsset('%SCALE%/' + obj.image, obj.name, obj.width * this.scale, obj.height * this.scale, obj.frames, obj.layers);
	if(asset) asset.object = obj;
	return asset;
};

/**
 * @method getAsset
 * @description Получить спрайт по имени
 * @param {String} name Имя спрайта
 * @param {Boolean} [checkLoad=false] Проверка, загружен ли и готов ли к использованию спрайт. Default = TRUE
 * @returns {Asset}
 */
AssetsLibrary.prototype.getAsset = function(name, checkLoad)
{
	var asset = null;
	
	if(( typeof this.items[name] != 'undefined') && (this.items[name].bitmap))
	{
		checkLoad = ( typeof checkLoad == 'undefined') ? true : checkLoad;
		asset = (!checkLoad || this.items[name].ready) ? this.items[name] : null;
	}
	
	if(!asset)
	{
		throw new Error('Trying to get undefined asset "' + name + '"');
	}
	
	return asset;
};

/**
 * @method getSprite
 * @description Возвращает спрайт в нужном масштабе и размере.
 * @param {String} name Название картинки
 * @param {Object} [params] Стартовые значениея свойств спрайта (например {x:10, y:20, opacity:0.5, onclick:myOnClick})
 * @param {Function} [spriteClass=Sprite] Конструктор спрайта. По умолчанию Sprite. Этот аргумент можно использовать, если требуется инстанциировать объект класса, наследующего Sprite
 * @returns {Sprite}
 */
AssetsLibrary.prototype.getSprite = function(name, params, spriteClass)
{
	var mc = null, asset = null;
	try
	{
		asset = this.getAsset(name, true);
	}
	catch (e)
	{
		asset = new Asset();
	}
	
	spriteClass = spriteClass || asset.spriteClass || this.spriteClass || Sprite;

    if(typeof spriteClass == "string")
    {
        if(window[spriteClass]) spriteClass = window[spriteClass];
        else spriteClass = eval(spriteClass);
    }

	if (spriteClass.create && (typeof spriteClass.create == 'function'))
	{
		mc = spriteClass.create(asset, this);
	}
	else
	{
		// TODO: remove default sprite constructor usage
		mc = new spriteClass(asset.bitmap, asset.width, asset.height, asset.frames, asset.layers);
	}
	
	if (params && (typeof params == 'object'))
	{
		// override sprite defaults
		for(var prop in params)	mc[prop] = params[prop];
	}

	return mc;
};

/**
 * @method getBitmap
 * @description Возвращает bitmap в нужном масштабе и размере.
 * @param {String} name Название картинки
 * @returns {Image}
 */
AssetsLibrary.prototype.getBitmap = function(name)
{
	try
	{
		var asset = this.getAsset(name, true);
		return asset.bitmap;
	}
	catch (e)
	{
		return null;
	}
};

/**
 * @class
 * @description Абстрактная точка
 * @param {Number} x координата
 * @param {Number} y координата
 */
function Vector(x, y)
{
	if( typeof (x) == 'undefined') x = 0;
	/**
	 * координата x
	 * @type Number
	 */
	this.x = x;
	
	if( typeof (y) == 'undefined') y = 0;
	/**
	 * координата y
	 * @type Number
	 */
	this.y = y;
}

/**
 * Проверка на нулевые значения x и y 
 */
Vector.prototype.isZero = function()
{
	return this.x == 0 && this.y == 0;
};

/**
 * Клонирование точки
 * @returns {Vector} копия точки
 */
Vector.prototype.clone = function()
{
	return new Vector(this.x, this.y);
};

/**
 * Сложение точек
 * @param {Vector} p точка
 */
Vector.prototype.add = function(p)
{
	this.x += p.x;
	this.y += p.y;
	return this;
};

/**
 * Вычитание точек
 * @param {Vector} p точка
 */
Vector.prototype.subtract = function(p)
{
	this.x -= p.x;
	this.y -= p.y;
	return this;
};

/**
 * Скалярное умножение
 * @param {Number} n число
 */
Vector.prototype.mult = function(n)
{
	this.x *= n;
	this.y *= n;
	return this;
};

/**
 * Инвертирование
 */
Vector.prototype.invert = function()
{
	this.mult(-1);
	return this;
};

/**
 * Поворот точки
 * @param {Number} angle угол поворота
 * @param {Vector} offset смещение
 */
Vector.prototype.rotate = function(angle, offset)
{
	if( typeof (offset) == 'undefined') offset = new Vector(0, 0);
	var r = this.clone();
	r.subtract(offset);
	r.x = this.x * Math.cos(angle) + this.y * Math.sin(angle);
	r.y = this.x * -Math.sin(angle) + this.y * Math.cos(angle);
	r.add(offset);
	this.x = r.x;
	this.y = r.y;
	return this;
};

/**
 * Нормализация точки
 * @param {Number} angle угол поворота
 * @param {Vector} offset смещение 
 */
Vector.prototype.normalize = function(angle, offset)
{
	if( typeof (offset) == 'undefined') offset = new Vector(0, 0);
	this.subtract(offset);
	this.rotate(-angle);
	return this;
};

/**
 * Возвращает скалярную длину вектора
 * @returns {Number} длина вектора
 */
Vector.prototype.getLength = function()
{
	return Math.sqrt(this.x * this.x + this.y * this.y);
};

/**
 * Вычисление расстояния до другой точки 
 * @param {Vector} p точка
 */
Vector.prototype.distanceTo = function(p)
{
	var p2 = this.clone();
	p2.subtract(p);
	return p2.getLength();
};

/**
 * @class
 * @description Абстрактный прямоугольник
 * @param {Number} x x координата центра
 * @param {Number} y y координата центра
 * @param {Number} w ширина
 * @param {Number} h высота
 * @param {Number} angle угол поворота
 */
function Rectangle(x, y, w, h, angle)
{
	/**
	 * центр
	 * @type Vector
	 */
	this.center = new Vector(x, y);
	
	/**
	 * ширина
	 * @type Number
	 */
	this.width = w;
	
	/**
	 * высота
	 * @type Number
	 */
	this.height = h;
	
	/**
	 * угол поворота
	 * @type Number
	 */
	this.angle = angle;
	
	/**
	 * массив вершин (Vector)
	 * @type Array
	 */
	this.vertices = [];
	
	/**
	 * Координаты верхнего левого и нижнего правого угла Axis-Aligned Bounding Box прямоугольника (Vector)
	 * @type Array
	 */
	this.AABB = [];

	this.refreshVertices();
}

/**
 * Клонирование прямоугольника
 * @returns {Rectangle} копия прямоугольника
 */
Rectangle.prototype.clone = function()
{
	return new Rectangle(this.center.x, this.center.y, this.width, this.height, this.angle);
};

/**
 * Пересчет вершин прямоугольника
 */
Rectangle.prototype.refreshVertices = function()
{
	var w = this.width / 2;
	var h = this.height / 2;
	this.vertices = [];
	this.vertices.push(new Vector(-w, h));
	this.vertices.push(new Vector(w, h));
	this.vertices.push(new Vector(w, -h));
	this.vertices.push(new Vector(-w, -h));

	this.AABB = [this.center.clone(), this.center.clone()];

	for(var i = 0; i < 4; i++)
	{
		this.vertices[i].rotate(-this.angle, this.center);
		if(this.vertices[i].x < this.AABB[0].x) this.AABB[0].x = this.vertices[i].x;
		if(this.vertices[i].x > this.AABB[1].x) this.AABB[1].x = this.vertices[i].x;
		if(this.vertices[i].y < this.AABB[0].y) this.AABB[0].y = this.vertices[i].y;
		if(this.vertices[i].y > this.AABB[1].y) this.AABB[1].y = this.vertices[i].y;
	}
};

/**
 * Смещение прямоугольника
 * @param {Number} x смещение по оси x
 * @param {Number} y смещение по оси y
 */
Rectangle.prototype.move = function(x, y)
{
	this.center.add(new Vector(x, y));
	this.refreshVertices();
};

/**
 * Поворот прямоугольника
 * @param {Number} angle угол поворота
 */
Rectangle.prototype.rotate = function(angle)
{
	this.angle += angle;
	this.refreshVertices();
};

/**
 * Проверка на вхождение точки в прямоугольник
 * @param {Vector} point точка
 * @returns {Boolean}
 */
Rectangle.prototype.hitTestPoint = function(point)
{
	var p = point.clone();
	p.normalize(-this.angle, this.center);
	return ((Math.abs(p.x) <= (this.width / 2)) && (Math.abs(p.y) <= (this.height / 2)));
};

/**
 * Проверка на пересечение с другим прямоугольником
 * @param {Rectangle} rect прямоугольник
 * @returns {Boolean}
 */
Rectangle.prototype.hitTestRectangle = function(rect)
{
	var r1 = this.clone();
	var r2 = rect.clone();
	var len, len1, len2;

	r1.move(-this.center.x, -this.center.y);
	r2.move(-this.center.x, -this.center.y);
	r2.center.rotate(this.angle);
	r1.rotate(-this.angle);
	r2.rotate(-this.angle);
	len = Math.max(r1.AABB[0].x, r1.AABB[1].x, r2.AABB[0].x, r2.AABB[1].x) - Math.min(r1.AABB[0].x, r1.AABB[1].x, r2.AABB[0].x, r2.AABB[1].x);
	len1 = r1.AABB[1].x - r1.AABB[0].x;
	len2 = r2.AABB[1].x - r2.AABB[0].x;
	if(len > len1 + len2) return false;
	
	len = Math.max(r1.AABB[0].y, r1.AABB[1].y, r2.AABB[0].y, r2.AABB[1].y) - Math.min(r1.AABB[0].y, r1.AABB[1].y, r2.AABB[0].y, r2.AABB[1].y);
	len1 = r1.AABB[1].y - r1.AABB[0].y;
	len2 = r2.AABB[1].y - r2.AABB[0].y;
	if(len > len1 + len2) return false;

	r1.move(-r2.center.x, -r2.center.y);
	r2.move(-r2.center.x, -r2.center.y);
	r1.center.rotate(r2.angle);
	r1.refreshVertices();
	r1.rotate(-r2.angle);
	r2.rotate(-r2.angle);

	len = Math.max(r1.AABB[0].x, r1.AABB[1].x, r2.AABB[0].x, r2.AABB[1].x) - Math.min(r1.AABB[0].x, r1.AABB[1].x, r2.AABB[0].x, r2.AABB[1].x);
	len1 = r1.AABB[1].x - r1.AABB[0].x;
	len2 = r2.AABB[1].x - r2.AABB[0].x;
	if(len > len1 + len2) return false;
	
	len = Math.max(r1.AABB[0].y, r1.AABB[1].y, r2.AABB[0].y, r2.AABB[1].y) - Math.min(r1.AABB[0].y, r1.AABB[1].y, r2.AABB[0].y, r2.AABB[1].y);
	len1 = r1.AABB[1].y - r1.AABB[0].y;
	len2 = r2.AABB[1].y - r2.AABB[0].y;

	return (len <= len1 + len2);
};

/** @ignore */
var EventsManager = {};

/** @ignore */
EventsManager.addEvent = function(obj, type, callback, once)
{
	if(!obj.eventsListeners) return;

	for(var i = 0; i < obj.eventsListeners.length; i++)
	{
		if(obj.eventsListeners[i].type === type && obj.eventsListeners[i].callback === callback) return;
	}

	obj.eventsListeners.push({type: type, callback: callback, once: !!once});
};

/** @ignore */
EventsManager.removeEvent = function(obj, type, callback)
{
	if(!obj.eventsListeners) return;

    if(obj["on"+type] == callback) obj["on"+type] = null;

	for(var i = 0; i < obj.eventsListeners.length; i++)
	{
		if(obj.eventsListeners[i].type === type && obj.eventsListeners[i].callback === callback)
		{
			obj.eventsListeners = Utils.removeFromArray(obj.eventsListeners, obj.eventsListeners[i]);
			return;
		}
	}
};

/** @ignore */
EventsManager.dispatchEvent = function(obj, type, params)
{
	if(!obj.eventsListeners) return;

	var ret = true;

	if( typeof obj["on" + type] == "function")
	{
		ret = obj["on"+type](params);
		if(ret === false) return false;
	}

	var removeList = [];
	for(var i = 0; i < obj.eventsListeners.length; i++)
	{
		if(obj.eventsListeners[i].type === type)
		{
            if(obj.eventsListeners[i].once) removeList.push(obj.eventsListeners[i]);
			ret = obj.eventsListeners[i].callback(params);
			if(ret === false) break;
		}
	}

	for(i=0; i<removeList.length; i++)
    {
        EventsManager.removeEvent(obj, type, removeList[i].callback);
    }

    if(ret === false) return false;
};

/** @ignore */
EventsManager.hasEventListener = function(obj, type)
{
    if(!obj.eventsListeners) return false;

	if(obj["on"+type]) return true;

	for(var i = 0; i < obj.eventsListeners.length; i++)
	{
		if(obj.eventsListeners[i].type === type) return true;
	}
	
	return false;
};

/** @ignore */
EventsManager.removeAllEventListeners = function(obj, type)
{
	if(!obj.eventsListeners) return;
	if(typeof type == "undefined") obj.eventsListeners = [];
	else
    {
        if(obj["on"+type]) obj["on"+type] = null;
    }
	
	var result = [];
	
	for(var i = 0; i < obj.eventsListeners.length; i++)
	{
		if(obj.eventsListeners[i].type !== type) result.push(obj.eventsListeners[i]);
	}
	
	obj.eventsListeners = result;
};

/**
 * @class
 * @description Класс, реализующий механизм менеджмента событий 
 */
function EventsProxy()
{
	/** @ignore */
	this.eventsListeners = [];
}

/**
 * @description добавление обработчика событий
 * @param {String} type Тип события
 * @param {Function} callback Функция обработчик события
 */
EventsProxy.prototype.addEventListener = function(type, callback)
{
	EventsManager.addEvent(this, type, callback, false);
};

/**
 * @description добавление обработчика событий, который будет выполнен один раз
 * @param {String} type Тип события
 * @param {Function} callback Функция обработчик события
 */
EventsProxy.prototype.addEventListenerOnce = function(type, callback)
{
    EventsManager.addEvent(this, type, callback, true);
};

/**
 * @description удаление обработчика событий
 * @param {String} type Тип события
 * @param {Function} callback Функция обработчик события
 */
EventsProxy.prototype.removeEventListener = function(type, callback)
{
	EventsManager.removeEvent(this, type, callback);
};

/**
 * @description генерирование события
 * @param {String} type Тип события
 * @param {Object} [params] Параметры, которые будут переданы в обработчик
 */
EventsProxy.prototype.dispatchEvent = function(type, params)
{
	return EventsManager.dispatchEvent(this, type, params);
};

/**
 * @description проверка, имеет ли объект обработчики событий указанного типа
 * @param {String} type Тип события
 */
EventsProxy.prototype.hasEventListener = function(type)
{
	return EventsManager.hasEventListener(this, type);
};

/**
 * @description удаление всех обработчиков событий
 * @param {String} [type] Тип события. Если тип не указан, будут удалены все обработчики
 */
EventsProxy.prototype.removeAllEventListeners = function(type)
{
	EventsManager.removeAllEventListeners(this, type);
};

/**
 * @class
 * @description Коллекция обработчиков анимации. Все типы обработчиков состоят из функций easeIn, easeOut и easeInOut
 * @example Easing.bounce.easeIn
 */
var Easing = {};

// t - the current time, between 0 and duration inclusive.
// b - the initial value of the animation property.
// c - the total change in the animation property.
// d - the duration of the motion.

/**
 * Анимация движения вперед-назад
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.back =
{
	easeIn: function(t, b, c, d)
	{
		var s = 1.70158;
		return c * (t /= d) * t * ((s + 1) * t - s) + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		var s = 1.70158;
		return c * (( t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		var s = 1.70158;
		if((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
		return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
	}
};

/**
 * Анимация подпрыгивания
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.bounce =
{
	easeIn: function(t, b, c, d)
	{
		return c - Easing.bounce.easeOut(d - t, 0, c, d) + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		if((t /= d) < (1 / 2.75)) return c * (7.5625 * t * t) + b;
		else if(t < (2 / 2.75)) return c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;
		else if(t < (2.5 / 2.75)) return c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;
		else return c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if(t < d / 2) return Easing.bounce.easeIn(t * 2, 0, c, d) * 0.5 + b;
		else return Easing.bounce.easeOut(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
	}
};

/**
 * Анимация с имитацией движения по кругу
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.circular =
{
	easeIn: function(t, b, c, d)
	{
		return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return c * Math.sqrt(1 - ( t = t / d - 1) * t) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
		return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
	}
};

/**
 * Анимация с гиперболическим ускорением
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.cubic =
{
	easeIn: function(t, b, c, d)
	{
		return c * (t /= d) * t * t + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return c * (( t = t / d - 1) * t * t + 1) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if((t /= d / 2) < 1) return c / 2 * t * t * t + b;
		return c / 2 * ((t -= 2) * t * t + 2) + b;
	}
};

/**
 * Анимация с "резиновым" эффектом
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.elastic =
{
	easeIn: function(t, b, c, d)
	{
		if (c == 0) return b;
		var s=1.70158,p=0,a=c*1;
		if(t==0) return b; if((t/=d)==1) return b+c; if(!p) p=d*.3;
		if(a<Math.abs(c)){a=c*1;s=p/4;}
		else s=p/(2*Math.PI)*Math.asin(c/a);
		return -(a*Math.pow(2,10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p))+b;
	},
	
	easeOut: function(t, b, c, d)
	{
		if (c == 0) return b;
		var s=1.70158,p=0,a=c*1;
		if(t==0) return b; if((t/=d)==1) return b+c; if(!p) p=d*.3;
		if(a<Math.abs(c)) {a=c*1;s=p/4;}
		else s=p/(2*Math.PI)*Math.asin(c/a);
		return a*Math.pow(2,-10*t)*Math.sin((t*d-s)*(2*Math.PI)/p)+c+b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if (c == 0) return b;
		var s=1.70158,p=0,a=c*1;
		if (t==0) return b; if ((t/=d/2)==2) return b+c; if (!p) p=d*(.3*1.5);
		if (a<Math.abs(c)){a=c*1;s=p/4;}
		else s=p/(2*Math.PI)*Math.asin(c/a);
		return (t<1)
			? -.5*(a*Math.pow(2,10*(t-=1))*Math.sin( (t*d-s)*(2*Math.PI)/p ))+b
			: a*Math.pow(2,-10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p)*.5+c+b
		;
	}
};

/**
 * Анимация с экспоненциальным ускорением
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.exponential =
{
	easeIn: function(t, b, c, d)
	{
		return t == 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return t == d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if(t == 0) return b;
		if(t == d) return b + c;
		if((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
		return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
	}
};

/**
 * Анимация без ускорения (линейное изменение параметра)
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.linear =
{
	easeIn: function(t, b, c, d)
	{
		return c * t / d + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return c * t / d + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		return c * t / d + b;
	}
};

/**
 * Анимация с параболическим ускорением
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.quadratic =
{
	easeIn: function(t, b, c, d)
	{
		return c * (t /= d) * t + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return -c * (t /= d) * (t - 2) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if((t /= d / 2) < 1) return c / 2 * t * t + b;
		return -c / 2 * ((--t) * (t - 2) - 1) + b;
	}
};

/**
 * Анимация с квадратичным ускорением
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.quartic =
{
	easeIn: function(t, b, c, d)
	{
		return c * (t /= d) * t * t * t + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return -c * (( t = t / d - 1) * t * t * t - 1) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
		return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
	}
};

/**
 * Анимация с ускорением в 5 степени
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.quintic =
{
	easeIn: function(t, b, c, d)
	{
		return c * (t /= d) * t * t * t * t + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return c * (( t = t / d - 1) * t * t * t * t + 1) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		if((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
		return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
	}
};

/**
 * Анимация с синусоидальным ускорением
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.sine =
{
	easeIn: function(t, b, c, d)
	{
		return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		return c * Math.sin(t / d * (Math.PI / 2)) + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
	}
};

/**
 * Анимация с плавным шагом
 * @property {Function} easeIn
 * @property {Function} easeOut
 * @property {Function} easeInOut
 */
Easing.smoothstep =
{
	easeIn: function(t, b, c, d)
	{
		var mt = (t / d) / 2;
        return (2 * (mt * mt * (3 - 2 * mt))) * c + b;
	},
	
	easeOut: function(t, b, c, d)
	{
		var mt = ((t / d) + 1) / 2;
        return ((2 * (mt * mt * (3 - 2 * mt))) - 1) * c + b;
	},
	
	easeInOut: function(t, b, c, d)
	{
		var mt = (t / d);
        return (mt * mt * (3 - 2 * mt)) * c + b;
	}
};

/**
 * @class
 * @augments EventsProxy
 * @description Класс Анимации
 * @example Рекомендуется использовать посредством метода <a href="Stage.html#createTween">Stage.createTween</a>
 */
function Tween(obj, prop, start, end, duration, callback)
{
	Utils.callSuperConstructor(Tween, this);
	
	if( typeof obj != 'object') obj = null;

	if(obj)
	{
		if( typeof obj[prop] == 'undefined') throw new Error('Trying to tween undefined property "' + prop + '"');
		if(isNaN(obj[prop])) throw new Error('Tweened value can not be ' + ( typeof obj[prop]));
	}
	else
	{
		if(isNaN(prop)) throw new Error('Tweened value can not be ' + ( typeof prop));
	}

	if( typeof callback != 'function') callback = Easing.linear.easeIn;

	/**
	 * Объект, содержащий анимируемое свойство
	 * @type Object
	 */
	this.obj = obj;

	/**
	 * Название анимируемого свойства. Значение свойства должно быть числом.
	 * @type String
	 */
	this.prop = prop;

	/**
	 * Начальное значение
	 * @type Number
	 */
	this.start = start;

	/**
	 * Конечное значение
	 * @type Number
	 */
	this.end = end;

	/**
	 * Длительность анимации в фреймах или милисекундах (зависит от Tween.STEP_TYPE)
	 * @type Number
	 */
	this.duration = ~~duration;

	/**
	 * Функция анимации
	 * @type Function
	 */
	this.callback = callback;

	/**
	 * Флаг воспроизведения анимации
	 * @type Boolean
	 */
	this.playing = false;

	/**
	 * Текущая позиция анимации
	 * @ignore
	 * @type Boolean
	 */
	this._pos = -1;

    /**
     * Нужно ли автоматически повторять анимацию после ее окончания
     * @type {boolean}
     */
	this.autoRewind = false;

    /** @ignore */
    this.newly = true;

	/** @ignore */
	this.eventsListeners = [];
}

Utils.extend(Tween, EventsProxy);

/**
 * @event Event
 * @description Callback функция, вызываемая после очередного шага анимации.
 * @description В качестве параметра передается объект с полями: target - ссылка на Tween, value - текущее значение функции анимации
 */
Tween.prototype.onchange = null;

/**
 * @event Event
 * @description Callback функция, вызываемая после полного завершения анимации.
 * @description В качестве параметра передается объект с полями: target - ссылка на Tween, value - итоговое значение переменной
 */
Tween.prototype.onfinish = null;

/**
 * @event Event
 * @description Callback функция, вызываемая в момент повторения анимации.
 * @description В качестве параметра передается объект с полями: target - ссылка на Tween
 */
Tween.prototype.onrewind = null;

/**
 * Начинает воспроизведение
 */
Tween.prototype.play = function()
{
	this.playing = true;
	this.tick(0);
	return this;
};

/**
 * Приостанавливает воспроизведение
 */
Tween.prototype.pause = function()
{
	this.playing = false;
    return this;
};

/**
 * Отматывает воспроизведение в начало
 */
Tween.prototype.rewind = function()
{
	this._pos = -1;
    return this;
};

/**
 * Перепрыгивает сразу на последню позицию
 */
Tween.prototype.forward = function()
{
	this._pos = this.duration;
    return this;
};

/**
 * Останавливает воспроизведение и перематывает в начало
 */
Tween.prototype.stop = function()
{
	this.pause();
	this.rewind();
    return this;
};

/**
 * Устанавливает изменяемое значение
 * @param {Number} val Новое значение анимируемого параметра
 */
Tween.prototype.updateValue = function(val)
{
	if(this.obj)
	{
		this.obj[this.prop] = val;
	}
	else
	{
		this.prop = val;
	}
    return this;
};

/**
 * Делает очередной шаг анимации
 */
Tween.prototype.tick = function(delta)
{
	if(!this.playing) return false;
	if(!delta) delta = 0;
	
	if(Tween.STEP_TYPE == Tween.STEP_BY_FRAME) this._pos++;
	else this._pos += delta;
	
	// it's possible to use this behavior to create delay before animation
	if(this._pos < 0) return false;

	if(this._pos > this.duration)
    {
        if(this.autoRewind)
        {
            this._pos -= this.duration;
            if(this.hasEventListener("rewind")) this.dispatchEvent("rewind", {target: this, value: this._pos});
        }
        else return this.finish();
    }

	var val = this.start == this.end ? this.start*1 : this.callback(this._pos, this.start, this.end - this.start, this.duration);
	this.updateValue(val);

    if(this.hasEventListener("change")) this.dispatchEvent("change", {target: this, value: val});
	return false;
};

/**
 * Завершает анимацию
 */
Tween.prototype.finish = function()
{
	this.stop();
	this.updateValue(this.end);
	
	return !(this.hasEventListener("finish") && this.dispatchEvent("finish", {target: this, value: this.end}) === false);
};

/** Тайминг твина по кадрам анимации */
Tween.STEP_BY_FRAME = 0;
/** Тайминг твина по милисекундам */
Tween.STEP_BY_TIME = 1;

/** Тип тайминга у твина. По усмолчанию: Tween.STEP_BY_FRAME */
Tween.STEP_TYPE = Tween.STEP_BY_FRAME;

/**
 * @class
 * @description Класс контейнера для визуальных объектов
 * @augments EventsProxy
 */
function DisplayObjectContainer()
{
	Utils.callSuperConstructor(DisplayObjectContainer, this);

    /** @ignore */
    this.objects = [];

    /**
     * Точка привязки к координатам и центр вращения
     * Задается относительно центра
     * @type Vector
     */
    this.anchor = {x: 0, y: 0};
}

Utils.extend(DisplayObjectContainer, EventsProxy);

/** @ignore */
DisplayObjectContainer.prototype.objectsCounter = 0;

/**
 * Масштаб по X
 * @type Number
 */
DisplayObjectContainer.prototype.scaleX = 1;

/**
 * Масштаб по Y
 * @type Number
 */
DisplayObjectContainer.prototype.scaleY = 1;

/**
 * Полупрозрачность
 * @type Number
 */
DisplayObjectContainer.prototype.opacity = 1;

/**
 * x координата центра
 * @type Number
 */
DisplayObjectContainer.prototype.x = 0;

/**
 * y координата центра
 * @type Number
 */
DisplayObjectContainer.prototype.y = 0;

/**
 * Ширина
 * @type Number
 */
DisplayObjectContainer.prototype.width = 0;

/**
 * Высота
 * @type Number
 */
DisplayObjectContainer.prototype.height = 0;

/**
 * Искривление по оси X
 * @type Number
 */
DisplayObjectContainer.prototype.skewX = 0;

/**
 * Искривление по оси Y
 * @type Number
 */
DisplayObjectContainer.prototype.skewY = 0;

/**
 * Угол поворота в радианах
 * @type Number
 */
DisplayObjectContainer.prototype.rotation = 0;

/** @ignore */
DisplayObjectContainer.prototype.parent = null;

/** Нужно ли обрезать дочерние элементы за пределами этого контейнера. Использовать аккуратно - может приводить к деградации производительности */
DisplayObjectContainer.prototype.cropChildren = false;

/**
 * Область, в которой определяются мышиные события. По умолчанию - видимая область объекта.
 * Переназначется объектом: sprite.hitArea = {x: 0, y: 0, width: 10, height: 20, rotation: 0}
 * x, y - координаты центра области относительно точки привязки спрайта. width, height - размеры области
 */
DisplayObjectContainer.prototype.hitArea = null;

/**
 * Цвет заливки фона (CSS)
 * @type String
 */
DisplayObjectContainer.prototype.fillColor = null;

/**
 * Линейный градиент заливки
 * @type Object
 * @example
 * var fill = {
 *      x0: 0,  //x координата первой точки вектора градиента
 *      y0: 0,  //y координата первой точки вектора градиента
 *      x1: 20, //x координата второй точки вектора градиента
 *      y1: 20, //y координата второй точки вектора градиента
 *      //массив точек изменения цвета
 *      points: [
 *          {point: 0, color: "#FF0"},
 *          {point: 0.5, color: "#F0F"}
 *      ]
 *  }
 */
DisplayObjectContainer.prototype.fillLinearGradient = null;

/**
 * Радиальный градиент заливки
 * @type Object
 * @example
 * var fill = {
 *      x0: 0,  //x координата первого круга градиента
 *      y0: 0,  //y координата первого круга градиента
 *      r0: 5,  //радиус первого круга градиента
 *      x1: 0,  //x координата второго круга градиента
 *      y1: 0,  //y координата второго круга градиента
 *      r1: 20  //радиус второго круга градиента
 *      //массив точек изменения цвета
 *      points: [
 *          {point: 0, color: "#FF0"},
 *          {point: 0.5, color: "#F0F"}
 *      ]
 *  }
 */
DisplayObjectContainer.prototype.fillRadialGradient = null;

/**
 * Заливка текстурой
 * @type Object
 * @example
 * var fill = {
        img: bitmaps.brick1, //ссылка на картинку
        repeat: "repeat", //метод размножения картинки: repeat, repeat-x, repeat-y, no-repeat,
        offset: {x: 0, y: 0} //смещение текстуры. Необязательный параметр.
    }
 */
DisplayObjectContainer.prototype.fillPattern = null;

/**
 * Возвращает абсолютный угол наклона относительно родительского элемента самого верхнего уровня
 */
DisplayObjectContainer.prototype.getAbsoluteRotation = function()
{
	return this.rotation + (this.parent ? this.parent.getAbsoluteRotation() : 0);
};

/**
 * Возвращает абсолютное значение полупрозрачности относительно родительского элемента самого верхнего уровня
 */
DisplayObjectContainer.prototype.getAbsoluteOpacity = function()
{
	return this.opacity * (this.parent ? this.parent.getAbsoluteOpacity() : 1);
};

/**
 * Возвращает абсолютное значение масштаба по оси x относительно родительского элемента самого верхнего уровня
 */
DisplayObjectContainer.prototype.getAbsoluteScaleX = function()
{
	return this.scaleX * (this.parent ? this.parent.getAbsoluteScaleX() : 1);
};

/**
 * Возвращает абсолютное значение масштаба по оси y относительно родительского элемента самого верхнего уровня
 */
DisplayObjectContainer.prototype.getAbsoluteScaleY = function()
{
	return this.scaleY * (this.parent ? this.parent.getAbsoluteScaleY() : 1);
};

/**
 * Возвращает абсолютное значение искривления по оси x относительно родительского элемента самого верхнего уровня
 */
DisplayObjectContainer.prototype.getAbsoluteSkewX = function()
{
	return this.skewX + (this.parent ? this.parent.getAbsoluteSkewX() : 0);
};

/**
 * Возвращает абсолютное значение искривления по оси y относительно родительского элемента самого верхнего уровня
 */
DisplayObjectContainer.prototype.getAbsoluteSkewY = function()
{
	return this.skewY + (this.parent ? this.parent.getAbsoluteSkewY() : 0);
};

/** @ignore */
DisplayObjectContainer.prototype.getTransformProps = function()
{
    return {
        x: this.x,
        y: this.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        skewX: this.skewX,
        skewY: this.skewY,
        rotation: this.rotation
    };
};

/** @ignore */
DisplayObjectContainer.prototype.setTransformProps = function(props)
{
    for(var i in props) this[i] = props[i];
};

/** @ignore */
DisplayObjectContainer.prototype.prepareCanvas = function(cns)
{
    var ctx = cns.getContext('2d');

    ctx.save();

    var ox = this.x, oy = this.y;

    if(!this.ignoreViewport && this.parent == this.stage)
    {
        ox -= this.stage.viewport.x;
        oy -= this.stage.viewport.y;
    }

    ox *= Utils.globalScale;
    oy *= Utils.globalScale;

    ctx.transform(1, this.skewX, this.skewY, 1, ox, oy);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.globalAlpha = this.getAbsoluteOpacity();
};

/** @ignore */
DisplayObjectContainer.prototype.moveCanvasAnchor = function(cns, back)
{
    var f = back ? 1 : -1;
    if(this.anchor.x != 0 || this.anchor.y != 0) cns.getContext('2d').translate(this.anchor.x * Utils.globalScale * f, this.anchor.y * Utils.globalScale * f);
};

/** @ignore */
DisplayObjectContainer.prototype.restoreCanvas = function(cns)
{
    cns.getContext('2d').restore();
};

/** @ignore */
DisplayObjectContainer.prototype.prepareCanvasShadow = function(cns, noSave)
{
    if(this.shadowColor)
    {
        var ctx = cns.getContext('2d');

        if(!noSave) ctx.save();

        if(this.rotation != 0)
        {
            var l = Math.sqrt(this.shadowOffsetX*this.shadowOffsetX + this.shadowOffsetY+this.shadowOffsetY) * Utils.globalScale;
            var a = Math.atan2(this.shadowOffsetY, this.shadowOffsetX) + this.rotation;
            ctx.shadowOffsetX = Math.cos(a) * l;
            ctx.shadowOffsetY = Math.sin(a) * l;
        }
        else
        {
            ctx.shadowOffsetX = this.shadowOffsetX * Utils.globalScale;
            ctx.shadowOffsetY = this.shadowOffsetY * Utils.globalScale;
        }

        ctx.shadowColor = this.shadowColor;
        ctx.shadowBlur = this.shadowBlur * Utils.globalScale;
    }
};

/** @ignore */
DisplayObjectContainer.prototype.restoreCanvasShadow = function(cns)
{
    if(this.shadowColor) this.restoreCanvas(cns);
};

/** @ignore */
DisplayObjectContainer.prototype.render = function(cns, drawStatic, delta)
{
	var crop = this.visible && this.objects.length && this.cropChildren && this.stage;

	if(crop)
    {
        var originalCanvas = cns;
        cns = this.stage.transformBuffer;

        var pos = this.getAbsolutePosition();
        var ox = pos.x, oy = pos.y;

        if(!this.ignoreViewport && this.parent == this.stage)
        {
            ox -= this.stage.viewport.x;
            oy -= this.stage.viewport.y;
        }

        ox *= Utils.globalScale;
        oy *= Utils.globalScale;

        var ctx = cns.getContext('2d');

        ctx.save();
        ctx.transform(1, 0, 0, 1, ox, oy);

        ctx.clearRect((-this.width/2-this.anchor.x) * Utils.globalScale - 1, (-this.height/2-this.anchor.y) * Utils.globalScale - 1, this.width * Utils.globalScale + 2, this.height * Utils.globalScale + 2);
    }

	for(var i=0; i<this.objects.length; i++)
	{
		var obj = this.objects[i];

		if(obj.destroy)
        {
            this.removeChild(obj);
            i--;
        }
        else
        {
            if(obj.visible) obj.render(cns, drawStatic, delta);
        }
	}

    if(crop)
    {
        originalCanvas.getContext('2d').drawImage(cns,
                                     (pos.x-this.anchor.x-this.width/2) * Utils.globalScale,
                                     (pos.y-this.anchor.y-this.height/2) * Utils.globalScale,
                                     this.width * Utils.globalScale,
                                     this.height * Utils.globalScale,
                                     (-this.width/2-this.anchor.x) * Utils.globalScale,
                                     (-this.height/2-this.anchor.y) * Utils.globalScale,
                                     this.width * Utils.globalScale,
                                     this.height * Utils.globalScale);
        cns.getContext('2d').restore();
    }
};

/**
 * @description Получение абсолютной X координаты с учетом текущего масштаба
 * @returns {Number}
 */
DisplayObjectContainer.prototype.getX = function()
{
	return Math.round(this.x * Utils.globalScale);
};
/**
 * @description Получение абсолютной Y координаты с учетом текущего масштаба
 * @returns {Number}
 */
DisplayObjectContainer.prototype.getY = function()
{
	return Math.round(this.y * Utils.globalScale);
};
/**
 * @description Получение абсолютной ширины с учетом текущего масштаба
 * @returns {Number}
 */
DisplayObjectContainer.prototype.getWidth = function()
{
	return this.width * Math.abs(this.getAbsoluteScaleX()) * Utils.globalScale;
};
/**
 * @description Получение абсолютной высоты с учетом текущего масштаба
 * @returns {Number}
 */
DisplayObjectContainer.prototype.getHeight = function()
{
	return this.height * Math.abs(this.getAbsoluteScaleY()) * Utils.globalScale;
};

/**
 * @description Получение текущей позиции
 */
DisplayObjectContainer.prototype.getPosition = function()
{
	return {x: this.x, y: this.y};
};

/**
 * Обёртка для позиционирования
 * @param {*} x или Vector
 * @param {Number} [y]
 */
DisplayObjectContainer.prototype.setPosition = function(x, y)
{
	if((typeof y == 'undefined') && (typeof x['x'] != 'undefined') && (typeof x['y'] != 'undefined'))
	{
		return this.setPosition(x.x, x.y);
	}
	this.x = parseFloat(x);
	this.y = parseFloat(y);
};

/**
 * Установка пропорционального масштаба
 * @param {Number} scale Масштаб по осям X и Y
 */
DisplayObjectContainer.prototype.setPropScale = function(scale)
{
	this.scaleX = this.scaleY = scale * 1;
};

/**
 * Возвращает точку привязки относительно центра
 * @return {Vector} Точка привязки
 */
DisplayObjectContainer.prototype.getAnchor = function()
{
	return this.anchor;
};

/**
 * Устанавливает точку привязки относительно центра
 * @param {*} x
 * @param {Number} [y]
 */
DisplayObjectContainer.prototype.setAnchor = function(x, y)
{
	if(( typeof y == 'undefined') && ( typeof x['x'] != 'undefined') && ( typeof x['y'] != 'undefined'))
	{
		return this.setAnchor(x.x, x.y);
	}
	this.anchor.x = parseFloat(x);
	this.anchor.y = parseFloat(y);
};

/**
 * Выравнивает точку привязки горизонтально и вертикально
 * @param {Number} h = DisplayObjectContainer.ANCHOR_ALIGN_LEFT | DisplayObjectContainer.ANCHOR_ALIGN_CENTER | DisplayObjectContainer.ANCHOR_ALIGN_RIGHT
 * @param {Number} v = DisplayObjectContainer.ANCHOR_VALIGN_TOP | DisplayObjectContainer.ANCHOR_VALIGN_MIDDLE | DisplayObjectContainer.ANCHOR_VALIGN_BOTTOM
 * @return {Vector} Точка привязки
 */
DisplayObjectContainer.prototype.alignAnchor = function(h, v)
{
	h = parseInt(h);
	if(isNaN(h)) h = DisplayObjectContainer.ANCHOR_ALIGN_CENTER;
	if(h < 0) h = DisplayObjectContainer.ANCHOR_ALIGN_LEFT;
	if(h > 0) h = DisplayObjectContainer.ANCHOR_ALIGN_RIGHT;

	v = parseInt(v);
	if(isNaN(v)) v = DisplayObjectContainer.ANCHOR_VALIGN_MIDDLE;
	if(v < 0) v = DisplayObjectContainer.ANCHOR_VALIGN_TOP;
	if(v > 0) v = DisplayObjectContainer.ANCHOR_VALIGN_BOTTOM;

	this.anchor.x = this.width * h / 2;
	this.anchor.y = this.height * v / 2;
	return this.getAnchor();
};

/**
 * Возвращает точку привязки в координатах родителя
 * @return {Vector}
 */
DisplayObjectContainer.prototype.getAbsoluteAnchor = function()
{
	return this.getPosition();
};

/**
 * Возвращает смещение центра относительно точки привязки с учётом scaleX, scaleY
 * @return {Vector}
 */
DisplayObjectContainer.prototype.getRelativeCenter = function()
{
	var anchor = this.getAnchor(), r = this.getAbsoluteRotation();
	var a = {x: anchor.x, y: anchor.y};

	if(r != 0 && (a.x != 0 || a.y != 0))
	{
		a = new Vector(-a.x * this.getAbsoluteScaleX(), -a.y * this.getAbsoluteScaleY());
		a.rotate(-r);
	}
	else
	{
		a.x = -(a.x * this.getAbsoluteScaleX());
		a.y = -(a.y * this.getAbsoluteScaleY());
	}

	return a;
};

/**
 * Возвращает координаты точки привязки в глобальной системе координат
 */
DisplayObjectContainer.prototype.getAbsolutePosition = function()
{
	var v = {x: this.x, y: this.y};
	if(this.parent)
	{
		var p = this.parent.getAbsolutePosition();
		var r = this.parent.getAbsoluteRotation();

		if(r != 0)
		{
			var a = new Vector(v.x * this.parent.getAbsoluteScaleX(), v.y * this.parent.getAbsoluteScaleY());
			a.rotate(-r);

			v.x = p.x + a.x;
			v.y = p.y + a.y;
		}
		else
		{
			v.x = p.x + v.x * this.parent.getAbsoluteScaleX();
			v.y = p.y + v.y * this.parent.getAbsoluteScaleY();
		}
	}
	return v;
};

/**
 * Возвращает центр в координатах родителя с учётом scaleX, scaleY
 * @return {Vector}
 */
DisplayObjectContainer.prototype.getAbsoluteCenter = function()
{
	var v = this.getAbsolutePosition();
	var c = this.getRelativeCenter();

	v.x += c.x;
	v.y += c.y;

	return v;
};

/**
 * Синоним DisplayObjectContainer.getAbsoluteCenter()
 * @return {Vector}
 */
DisplayObjectContainer.prototype.getCenter = function()
{
	return this.getAbsoluteCenter();
};

/** @ignore */
DisplayObjectContainer.prototype.getIgnoreViewport = function()
{
    return this.ignoreViewport || (this.parent && this.parent.getIgnoreViewport());
};

/** @ignore */
DisplayObjectContainer.prototype.getHitAreaRectangle = function()
{
	var hitArea = this.getHitArea();
	if(!hitArea) return this.getDrawRectangle();

	if(!hitArea.rotation) hitArea.rotation = 0;

	var rotation = this.getAbsoluteRotation() + hitArea.rotation, scX = this.getAbsoluteScaleX(), scY = this.getAbsoluteScaleY();
	var c = this.getCenter(), r = new Rectangle(0, 0, hitArea.width * Math.abs(scX), hitArea.height * Math.abs(scY), rotation);
	if(rotation != 0)
	{
		var p = new Vector(hitArea.x * scX, hitArea.y * scY);
		p.rotate(-rotation);
		r.move(c.x + p.x, c.y + p.y);
	}
	else
	{
		r.move(c.x + hitArea.x * scX, c.y + hitArea.x * scY);
	}

	return r;
};

/**
 * Возвращает зону отрисовки с учётом масштабирования и вращения
 * @return {Rectangle}
 */
DisplayObjectContainer.prototype.getDrawRectangle = function()
{
	var c = this.getCenter(), r = new Rectangle(0, 0, this.width * Math.abs(this.getAbsoluteScaleX()), this.height * Math.abs(this.getAbsoluteScaleY()), this.getAbsoluteRotation());
	r.move(c.x, c.y);
	return r;
};

/**
 * Возвращает зону AABB с учётом масштабирования и вращения
 * @return {Rectangle}
 */
DisplayObjectContainer.prototype.getAABBRectangle = function()
{
	var r = this.getDrawRectangle(), w = r.AABB[1].x - r.AABB[0].x, h = r.AABB[1].y - r.AABB[0].y;
	return new Rectangle(r.AABB[0].x + (w / 2), r.AABB[0].y + (h / 2), w, h, 0);
};

/**
 * Возвращает зону AABB с учётом масштабирования, вращения и дочерних элементов
 * @return {Rectangle}
 */
DisplayObjectContainer.prototype.getFullAABBRectangle = function()
{
    var list = [this.getAABBRectangle()];

    for(var i=0; i<this.objects.length; i++)
    {
        list.push(this.objects[i].getFullAABBRectangle());
    }

    var AABB = [{x: Number.MAX_VALUE, y: Number.MAX_VALUE}, {x: Number.MIN_VALUE, y: Number.MIN_VALUE}];

    for(i=0; i<list.length; i++)
    {
        var r = list[i];

        AABB[0].x = Math.min(AABB[0].x, r.AABB[0].x);
        AABB[0].y = Math.min(AABB[0].y, r.AABB[0].y);
        AABB[1].x = Math.max(AABB[1].x, r.AABB[1].x);
        AABB[1].y = Math.max(AABB[1].y, r.AABB[1].y);
    }

    var w = AABB[1].x - AABB[0].x;
    var h = AABB[1].y - AABB[0].y;

    return new Rectangle(AABB[0].x + (w / 2), AABB[0].y + (h / 2), w, h, 0);
};

/**
 * Возвращает готовое отрендеренное изображение объекта
 * @returns {Canvas}
 */
DisplayObjectContainer.prototype.cacheAsBitmap = function()
{
    var x = this.x, y = this.y, rotation = this.rotation, parent = this.parent;

    this.rotation = 0;
    this.parent = null;

    var rect = this.getAABBRectangle();
    var rectFull = this.getFullAABBRectangle();

    this.x = rect.AABB[0].x - rectFull.AABB[0].x + (this.width/2 + this.anchor.x) * this.scaleX;
    this.y = rect.AABB[0].y - rectFull.AABB[0].y + (this.height/2 + this.anchor.y) * this.scaleY;

    var cache = document.createElement("canvas");
    cache.width = rectFull.width * Utils.globalScale;
    cache.height = rectFull.height * Utils.globalScale;

    this.render(cache, true, 0);
    this.render(cache, false, 0);

    this.parent = parent;
    this.x = x;
    this.y = y;
    this.rotation = rotation;

    return cache;
};

/**
 * Переводит точку в координатах объекта в координаты сцены.
 * За центр координат объекта берётся точка привязки, оси координат с учётом вращения объекта
 * @param {*} x или Vector
 * @param {Number} [y]
 * @return {Vector}
 */
DisplayObjectContainer.prototype.localToGlobal = function(x, y)
{
	var p = (( typeof x == 'object') && ( typeof x['x'] != 'undefined') && ( typeof x['y'] != 'undefined')) ? new Vector(x.x + 0, x.y + 0) : new Vector(x, y);
	p.rotate(this.getAbsoluteRotation()).add(this.getAbsolutePosition());
	return p;
};

/**
 * Переводит точку в координатах сцены в координаты объекта.
 * За центр координат объекта берётся точка привязки, оси координат с учётом вращения объекта
 * @param {*} x или Vector
 * @param {Number} [y]
 * @return {Vector}
 */
DisplayObjectContainer.prototype.globalToLocal = function(x, y)
{
	var p = (( typeof x == 'object') && ( typeof x['x'] != 'undefined') && ( typeof x['y'] != 'undefined')) ? new Vector(x.x + 0, x.y + 0) : new Vector(x, y);
	p.subtract(this.getAbsolutePosition()).rotate(this.getAbsoluteRotation());
	return p;
};

/**
 * Переводит точку в координатах объекта в систему координат другого объекта
 * @param x x координата
 * @param y y координата
 * @param target объект
 * @returns {Vector}
 */
DisplayObjectContainer.prototype.localToLocal = function(x, y, target)
{
    return target.globalToLocal(this.localToGlobal(x, y));
};

/**
 * Меняет местами по zIndex 2 дочерних объекта
 * @param item1 первый объект
 * @param item2 второй объект
 */
DisplayObjectContainer.prototype.swapChildren = function(item1, item2)
{
    var ix = item1.zIndex;
    item1.setZIndex(item2.zIndex);
    item2.setZIndex(ix);
};

/**
 * Получение максимального zIndex объекта
 * Возвращает объект, содержащий index - индекс объекта в массиве objects и zIndex
 */
DisplayObjectContainer.prototype.findMaxZIndex = function()
{
	var max = -1;
	var ix = false;
	for(var i = 0; i < this.objects.length; i++)
	{
		if(this.objects[i].zIndex > max)
		{
			max = this.objects[i].zIndex;
			ix = i;
		}
	}

	return {index: ix, zIndex: max};
};

/**
 * Получение минимального zIndex объекта
 * Возвращает объект, содержащий index - индекс объекта в массиве objects и zIndex
 */
DisplayObjectContainer.prototype.findMinZIndex = function()
{
	var min = -1;
	var ix = false;
	for(var i = 0; i < this.objects.length; i++)
	{
		if(i == 0)
		{
			min = this.objects[i].zIndex;
			ix = 0;
		}

		if(this.objects[i].zIndex < min)
		{
			min = this.objects[i].zIndex;
			ix = i;
		}
	}

	return {index: ix, zIndex: min};
};

/**
 * Добавление объекта в стек
 * @param {Object} item ссылка на объект
 * @returns {Object} ссылка на объект в массиве objects
 */
DisplayObjectContainer.prototype.addChild = function(item)
{
	var f = this.findMaxZIndex();

	var z = item.zIndex;

	if(f.index !== false) item.zIndex = f.zIndex + 1;
	else item.zIndex = 0;

	this.objectsCounter++;
	item.uid = this.objectsCounter;

	item.parent = this;
	item.setStage(this.stage);

	this.objects.push(item);

	if(z != 0) this.setChildZIndex(item, ~~z);

	if(item.hasEventListener("add")) item.dispatchEvent("add", {target: item});

	return item;
};

/**
 * Добавление объекта в стек в нужную позицию по zIndex
 * @param {Object} item ссылка на объект
 * @param {Number} index zIndex
 * @returns {Object} ссылка на объект в массиве objects
 */
DisplayObjectContainer.prototype.addChildAt = function(item, index)
{
    this.addChild(item);
    this.setChildZIndex(item, ~~index);
    return item;
};

/**
 * Проверка на существование дочернего объекта
 * @param item ссылка на объект
 * @param recursive нужно ли искать во вложенных объектах
 * @returns {boolean}
 */
DisplayObjectContainer.prototype.contains = function(item, recursive)
{
    for(var i=0; i<this.objects.length; i++)
    {
        if(this.objects[i] == item) return true;
        if(recursive && this.objects[i].contains(item, recursive)) return true;
    }

    return false;
};

/** @ignore */
DisplayObjectContainer.prototype.setStage = function(stage)
{
    this.stage = stage;
    for(var i=0; i<this.objects.length; i++) this.objects[i].setStage(stage);
};

/**
 * Удаление объекта со сцены. Не рекомендуется к прямому использованию. Предпочтительнее использовать флаг destroy у объекта.
 * @param {DisplayObjectContainer} item ссылка на объект
 */
DisplayObjectContainer.prototype.removeChild = function(item)
{
	if(item && this.objects.indexOf(item) >= 0)
	{
        if(item.stage) item.stage.clearObjectTweens(item);
        item.clear();
        if(item.hasEventListener("remove")) item.dispatchEvent("remove", {target: item});
		item.removeAllEventListeners();
		item.parent = null;
        item.stage = null;
		this.objects = Utils.removeFromArray(this.objects, item);
	}
};

/**
 * Установка нового zIndex для объекта.
 * Рекомендованный метод изменение zIndex. Прямое изменение этого свойства объекта может привести в некорректному поведению рендеринга.
 * @param {*} item ссылка на объект
 * @param {Number} index новое значение zIndex
 */
DisplayObjectContainer.prototype.setChildZIndex = function(item, index)
{
	item.zIndex = index;

	this.objects = this.objects.sort(function(obj1, obj2)
	{
		if(obj1.zIndex == obj2.zIndex)
		{
			return obj1.uid > obj2.uid ? 1 : -1;
		}
		else
		{
			return obj1.zIndex > obj2.zIndex ? 1 : -1;
		}
	});
};

DisplayObjectContainer.prototype.getHitArea = function()
{
	if(this.hitArea)
	{
		if(!this.hitArea.rotation) this.hitArea.rotation = 0;
		return this.hitArea;
	}
	else
	{
		return {x: 0, y: 0, width: this.width, height: this.height, rotation: 0};
	}
};

/**
 * Определение факта пересечения объектов
 * @param {DisplayObjectContainer} obj1
 * @param {DisplayObjectContainer} [obj2=null] . Если этот параметр не передан, он равен this
 */
DisplayObjectContainer.prototype.hitTest = function(obj1, obj2)
{
    if(!obj2) obj2 = this;

    if(obj1.getAbsoluteRotation() == 0 && obj2.getAbsoluteRotation() == 0)
    {
        var c1 = obj1.getCenter();
        var c2 = obj2.getCenter();
        var cW1 = obj1.width * Math.abs(obj1.getAbsoluteScaleX());
        var cH1 = obj1.height * Math.abs(obj1.getAbsoluteScaleY());
        var cW2 = obj2.width * Math.abs(obj2.getAbsoluteScaleX());
        var cH2 = obj2.height * Math.abs(obj2.getAbsoluteScaleY());
        var cX1 = c1.x - cW1 / 2;
        var cY1 = c1.y - cH1 / 2;
        var cX2 = c2.x - cW2 / 2;
        var cY2 = c2.y - cH2 / 2;

        var top = Math.max(cY1, cY2);
        var left = Math.max(cX1, cX2);
        var right = Math.min(cX1 + cW1, cX2 + cW2);
        var bottom = Math.min(cY1 + cH1, cY2 + cH2);
        var width = right - left;
        var height = bottom - top;

        return (width > 0 && height > 0);
    }
    else
    {
        var r1 = obj1.getDrawRectangle(), r2 = obj2.getDrawRectangle();
        return r1.hitTestRectangle(r2);
    }
};

/**
 * @description Проверка на hit в точке, по умолчанию без учёта прозрачности
 * @param {DisplayObjectContainer} obj
 * @param {int} x
 * @param {int} y
 * @param {boolean} [pixelCheck]
 * @param {boolean} [includeDragged]
 * @return {boolean}
 */
DisplayObjectContainer.prototype.hitTestPointObject = function(obj, x, y, pixelCheck, includeDragged)
{
	var cX, cY, cW, cH, mX, mY, r, present, imageData;

	if (typeof obj.pixelCheck == 'boolean') pixelCheck = obj.pixelCheck;

	var hitArea = obj.getHitArea();

	cW = hitArea.width * Math.abs(obj.getAbsoluteScaleX());
	cH = hitArea.height * Math.abs(obj.getAbsoluteScaleY());

	var c = obj.getAbsoluteCenter();

	cX = c.x + hitArea.x - cW / 2;
	cY = c.y + hitArea.y - cH / 2;

	mX = x;
	mY = y;

	if(!obj.ignoreViewport)
	{
		mX += this.stage.viewport.x;
		mY += this.stage.viewport.y;
	}

	present = false;
	if(obj.getAbsoluteRotation() + hitArea.rotation == 0)
	{
		if(cX <= mX && cY <= mY && cX + cW >= mX && cY + cH >= mY) present = true;
	}
	else
	{
		r = obj.getHitAreaRectangle();
		if(r.hitTestPoint(new Vector(mX, mY))) present = true;
	}

	if(present && pixelCheck)
	{
		this.stage.buffer.width = this.stage.canvas.width;
		this.stage.buffer.height = this.stage.canvas.height;

		this.stage.clearScreen(this.stage.buffer);

        var props = obj.getTransformProps();
        var parent = obj.parent;
		var pos = obj.getAbsolutePosition();

        obj.x = pos.x;
        obj.y = pos.y;
        obj.scaleX = obj.getAbsoluteScaleX();
        obj.scaleY = obj.getAbsoluteScaleY();
        obj.skewX = obj.getAbsoluteSkewX();
        obj.skewY = obj.getAbsoluteSkewY();
        obj.rotation = obj.getAbsoluteRotation();
        obj.parent = null;

        obj.render(this.stage.buffer, obj.static, 0);

		var pX = Math.floor(x * Utils.globalScale);
		var pY = Math.floor(y * Utils.globalScale);
		imageData = this.stage.buffer.getContext('2d').getImageData(pX, pY, 1, 1);
		if(imageData.data[3] == 0) present = false;

		obj.setTransformProps(props);
        obj.parent = parent;
	}

	if(!present && includeDragged && obj.dragged) present = true;

	return present;
};

/** @ignore */
DisplayObjectContainer.prototype.getObjectsStackByCoord = function(x, y, pixelCheck, includeDragged)
{
	var obj;
	var tmp = [];
	for(var i = this.objects.length - 1; i >= 0; i--)
	{
		if(this.objects[i].visible)
		{
			obj = this.objects[i];

			if(obj.objects && obj.objects.length)
			{
				tmp = tmp.concat(obj.getObjectsStackByCoord(x, y, pixelCheck, includeDragged));
			}

			if(this.hitTestPointObject(obj, x, y, pixelCheck, includeDragged))
			{
				tmp.push(obj);
			}
		}
	}

	return tmp;
};

/**
 * Возвращает список дочерних объектов в указанной точке относительно точки привязки
 * @param x x координата
 * @param y y координата
 * @param pixelCheck нужно ли проверять наличие значимых пикселей
 * @returns {Array}
 */
DisplayObjectContainer.prototype.getObjectsUnderPoint = function(x, y, pixelCheck)
{
    var p = this.getAbsolutePosition();
    return this.getObjectsStackByCoord(p.x + x, p.y + y, !!pixelCheck);
};

/**
 * Возвращает верхний видимый объект в указанной точке относительно точки привязки
 * @param x x координата
 * @param y y координата
 * @param pixelCheck нужно ли проверять наличие значимых пикселей
 * @returns {Object}
 */
DisplayObjectContainer.prototype.getObjectUnderPoint = function(x, y, pixelCheck)
{
    var stack = this.getObjectsUnderPoint(x, y, pixelCheck);
    return stack[0];
};

/** @ignore */
DisplayObjectContainer.prototype.doDrag = function(dX, dY)
{
	for(var i = 0; i < this.objects.length; i++) this.objects[i].doDrag(dX, dY);

	if(this.dragged)
	{
		var eX = dX;
		var eY = dY;
		if(!this.ignoreViewport)
		{
			eX += this.stage.viewport.x;
			eY += this.stage.viewport.y;
		}

		eX -= this.dragX;
		eY -= this.dragY;

		var p = this.parent.globalToLocal(eX, eY);

		this.x = p.x;
		this.y = p.y;
	}
};

/** @ignore */
DisplayObjectContainer.prototype.checkMouseOut = function(overStack, mouseCoords)
{
	for(var i = this.objects.length-1; i >= 0; i--)
	{
		if(this.objects[i].checkMouseOut(overStack, mouseCoords) === false) return;
	}

	if(this.mouseOn && overStack.indexOf(this) < 0)
	{
		this.mouseOn = false;

		var f = this.stage.finalizeMouseCoords(this, mouseCoords);
		return this.dispatchEvent("mouseout", {target: this, x: f.x, y: f.y});
	}
};

/** @ignore */
DisplayObjectContainer.prototype.getMaxZIndexInStack = function(stack)
{
	var max = -1;
	var ix = 0;
	for(var i = 0; i < stack.length; i++)
	{
		if(stack[i].zIndex > max)
		{
			max = stack[i].zIndex;
			ix = i;
		}
	}

	return ix;
};

/** @ignore */
DisplayObjectContainer.prototype.sortStack = function(stack, revert)
{
	return stack.sort(function(obj1, obj2)
	{
		if(obj1.zIndex == obj2.zIndex)
		{
			if(revert) return obj1.uid < obj2.uid ? 1 : -1;
			else return obj1.uid > obj2.uid ? 1 : -1;
		}
		else
		{
			if(revert) return obj1.zIndex < obj2.zIndex ? 1 : -1;
			else return obj1.zIndex > obj2.zIndex ? 1 : -1;
		}
	});
};

/**
 * Рекурсивное удаление всех дочерних объектов
 */
DisplayObjectContainer.prototype.clear = function()
{
	while(this.objects.length) this.removeChild(this.objects[0]);
};

/** @ignore */
DisplayObjectContainer.prototype.getFillStyle = function(cns)
{
	var fill = null, gradient;

	if(this.fillLinearGradient)
	{
		gradient = cns.getContext('2d').createLinearGradient(this.fillLinearGradient.x0 * Utils.globalScale,
												    this.fillLinearGradient.y0 * Utils.globalScale,
												    this.fillLinearGradient.x1 * Utils.globalScale,
												    this.fillLinearGradient.y1 * Utils.globalScale);

		for(var i=0; i<this.fillLinearGradient.points.length; i++)
		{
			gradient.addColorStop(this.fillLinearGradient.points[i].point, this.fillLinearGradient.points[i].color);
		}

		fill = gradient;
	}
	else if(this.fillRadialGradient)
	{
		gradient = cns.getContext('2d').createRadialGradient(this.fillRadialGradient.x0 * Utils.globalScale,
													this.fillRadialGradient.y0 * Utils.globalScale,
													this.fillRadialGradient.r0 * Utils.globalScale,
													this.fillRadialGradient.x1 * Utils.globalScale,
													this.fillRadialGradient.y1 * Utils.globalScale,
													this.fillRadialGradient.r1 * Utils.globalScale);

		for(i=0; i<this.fillRadialGradient.points.length; i++)
		{
			gradient.addColorStop(this.fillRadialGradient.points[i].point, this.fillRadialGradient.points[i].color);
		}

		fill = gradient;
	}
	else if(this.fillPattern)
	{
		fill = cns.getContext('2d').createPattern(this.fillPattern.img, this.fillPattern.repeat);
	}
	else
	{
		fill = this.fillColor;
	}

	return fill;
};

/**
 * Хелпер для установки множественных свойств объекта
 * @param props объект, содержащий значения для установки. Например {x: 10, y: 20, scaleX: 2, rotation: Math.PI/2}
 */
DisplayObjectContainer.prototype.set = function(props)
{
    for(var p in props) this[p] = props[p];
};

DisplayObjectContainer.ANCHOR_ALIGN_LEFT = -1;
DisplayObjectContainer.ANCHOR_ALIGN_CENTER = 0;
DisplayObjectContainer.ANCHOR_ALIGN_RIGHT = 1;
DisplayObjectContainer.ANCHOR_VALIGN_TOP = -1;
DisplayObjectContainer.ANCHOR_VALIGN_MIDDLE = 0;
DisplayObjectContainer.ANCHOR_VALIGN_BOTTOM = 1;

//Для поддержки обратной совместимости
/** @deprecated */
var ANCHOR_ALIGN_LEFT = DisplayObjectContainer.ANCHOR_ALIGN_LEFT;
/** @deprecated */
var ANCHOR_ALIGN_CENTER = DisplayObjectContainer.ANCHOR_ALIGN_CENTER;
/** @deprecated */
var ANCHOR_ALIGN_RIGHT = DisplayObjectContainer.ANCHOR_ALIGN_RIGHT;
/** @deprecated */
var ANCHOR_VALIGN_TOP = DisplayObjectContainer.ANCHOR_VALIGN_TOP;
/** @deprecated */
var ANCHOR_VALIGN_MIDDLE = DisplayObjectContainer.ANCHOR_VALIGN_MIDDLE;
/** @deprecated */
var ANCHOR_VALIGN_BOTTOM = DisplayObjectContainer.ANCHOR_VALIGN_BOTTOM;

/**
 * @class
 * @description Класс визуального объекта
 * @augments DisplayObjectContainer 
 */
function DisplayObject()
{
	Utils.callSuperConstructor(DisplayObject, this);
}

Utils.extend(DisplayObject, DisplayObjectContainer);

/**
 * Уникальный ID
 * @type Number
 */
DisplayObject.prototype.uid = 0;

/**
 * Сцена, содержащая объект. NULL, если объект не добавлен на сцену или в родительский объект
 * @type Stage
 */
DisplayObject.prototype.stage = null;

/**
 * Цвет тени
 * @type String
 */
DisplayObject.prototype.shadowColor = null;

/**
 * Смещение тени по x
 * @type Number
 */
DisplayObject.prototype.shadowOffsetX = 0;

/**
 * Смещение тени по y
 * @type Number
 */
DisplayObject.prototype.shadowOffsetY = 0;

/**
 * Размытие тени
 * @type Number
 */
DisplayObject.prototype.shadowBlur = 0;

/**
 * z-index объекта
 * @type Number
 */
DisplayObject.prototype.zIndex = 0;

/**
 * Видимость объекта
 * @type Boolean
 */
DisplayObject.prototype.visible = true;

/**
 * Флаг статичности. В случае установки в true объект будет отрисовываться на фоновом канвасе.
 * Не рекомендуется к прямому изменению. Используйте метод setStatic
 * @type Boolean
 */
DisplayObject.prototype.static = false;

/**
 * Поведение с камерой. В случае установки в true объект будет игнорировать положение камеры.
 * @type Boolean
 */
DisplayObject.prototype.ignoreViewport = false;

/**
 * Флаг, указывающий на то, что сцена обязана уничтожить этот объект на следующей итерации отрисовки
 * @type Boolean
 */
DisplayObject.prototype.destroy = false;

/** @ignore */
DisplayObject.prototype.dragged = false;

/** @ignore */
DisplayObject.prototype.dragX = 0;

/** @ignore */
DisplayObject.prototype.dragY = 0;

/** @ignore */
DisplayObject.prototype.mouseOn = false;

/**
 * Флаг отладочной отрисовки
 */
DisplayObject.prototype.allowDebugDrawing = true;

/**
 * Если это флаг установлен в boolean (true|false), он принуждает сцену обрабатывать hitTest используя указанное значение вместо pixelClickEvent. Не boolean значения игнорируются (например null или 0). 
 * @type Boolean
 */
DisplayObject.prototype.pixelCheck = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при заходе курсора мыши на объект.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.onmouseover = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при выходе курсора мыши из объекта.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.onmouseout = null;

/**
 * @event Event
 * @description Callback функция, нажатии левой кнопки мыши на объекте.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.onmousedown = null;

/**
 * @event Event
 * @description Callback функция, отпускании левой кнопки мыши на объекте.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.onmouseup = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при клике на объекте.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.onclick = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при правом клике на объекте.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.oncontextmenu = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при передвижении курсора мыши на объекте.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект, x, y - координаты курсора мыши в системе координат объекта.
 */
DisplayObject.prototype.onmousemove = null;

/**
 * @event Event
 * @description Callback функция, вызываемая на каждом кадре перед рендерингом.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект
 */
DisplayObject.prototype.onprerender = null;

/**
 * @event Event
 * @description Callback функция, вызываемая на каждом кадре
 * @description В качестве параметра передается объект с полями: target - ссылка на объект
 */
DisplayObject.prototype.onenterframe = null;

/**
 * @event Event
 * @description Callback функция, вызываемая на каждом кадре после рендеринга.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект
 */
DisplayObject.prototype.onrender = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при добавлении объекта на сцену.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект
 */
DisplayObject.prototype.onadd = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при удалении объекта со сцены.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект
 */
DisplayObject.prototype.onremove = null;

/**
 * @event Event
 * @description Callback функция, вызываемая при синхронизации сценой тела Box2D и объекта. Применяется как правило в случае разных размеров объекта и тела.
 * @description В качестве параметра передается объект с полями: target - ссылка на объект
 */
DisplayObject.prototype.onbox2dsync = null;

/**
 * Установка флага статичности
 * При изменении значения форсирует перерисовку background-канваса у сцены
 * @param {Boolean} val значение
 * @param {Boolean} [skipChildren=false] нужно ли пропустить рекурсивную установку свойства у дочерних элементов
 * @returns {Boolean} было ли действительно изменено свойство
 */
DisplayObject.prototype.setStatic = function(val, skipChildren)
{
	val = Boolean(val);
	
	if(!skipChildren)
	{
        for(var i=0; i<this.objects.length; i++)
        {
	       this.objects[i].setStatic(val);
        }
    }
	
	if(this.static != val)
	{
		this.static = val;
		if(this.stage) this.stage.refreshBackground();
		
		return true;
	}
	
	return false;
};

/**
 * @description Начало drag`n`drop
 * @param {Number} x координата клика в системе координат объекта
 * @param {Number} y координата клика в системе координат объекта
 */
DisplayObject.prototype.startDrag = function(x, y)
{
	this.dragged = true;
	this.dragX = x;
	this.dragY = y;
};
/**
 * @description Остановка drag`n`drop
 */
DisplayObject.prototype.stopDrag = function()
{
	this.dragged = false;
	this.dragX = 0;
	this.dragY = 0;
};

/**
 * Очищает всю анимацию для объекта
 */
DisplayObject.prototype.removeTweens = function()
{
	if(!this.stage) return;
	this.stage.clearObjectTweens(this);
};

/**
 * Создаёт анимацию (сокращённый вызов <a href="Stage.html#createTween">stage.createTween</a>)
 * @return {Tween}
 */
DisplayObject.prototype.addTween = function(prop, end, duration, ease, onfinish, onchange)
{
	if(!this.stage)	return null;

	var val = this[prop];
	if(isNaN(val)) return null;

	var t = this.stage.createTween(this, prop, val, end, duration, ease);
	t.onchange = onchange;
	t.onfinish = onfinish;
	return t;
};

/**
 * Перемещение объекта в указанную точку. Можно использовать в цепочке.
 * @param {Number} x координата X
 * @param {Number} y координата Y
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {DisplayObject}
 */
DisplayObject.prototype.moveTo = function(x, y, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	if(duration <= 0)
	{
		this.setPosition(x, y);
		if (onfinish) onfinish({target: new Tween(this, 'y', y, y, duration, ease)});
		return this;
	}

	var t = [], tween;
	if (this.x != x) 
	{
		tween = this.addTween('x', x, duration, ease);
		if (tween) t.push(tween);
	}
	
	if (this.y != y) 
	{
		tween = this.addTween('y', y, duration, ease);
		if (tween) t.push(tween);
	}
	
	var len = t.length;
	if (len > 0)
	{ 
		t[len-1].onchange = onchange;
		t[len-1].onfinish = onfinish;
		for (var i = 0; i < len; i++) t[i].play();
	}
	else
	{
		if (onfinish) onfinish({target: new Tween(this, 'y', y, y, duration, ease)});
	}
	return this;
};

/**
 * Перемещение объекта на указанное расстояние. Можно использовать в цепочке.
 * @param {Number} x координата X
 * @param {Number} y координата Y
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
DisplayObject.prototype.moveBy = function(x, y, duration, ease, onfinish, onchange)
{
	return this.moveTo(this.x + x, this.y + y, duration, ease, onfinish, onchange);
};

/**
 * Изменение прозрачности объекта до указанного значения
 * @param {Number} opacity Прозрачность (0-1)
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {DisplayObject}
 */
DisplayObject.prototype.fadeTo = function(opacity, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	var t = null;
	if(duration <= 0)
	{
		this.opacity = opacity;
	}
	else if (this.opacity != opacity)
	{
		t = this.addTween('opacity', opacity, duration, ease, onfinish, onchange);
		if (t) t.play();
	}
	if (!t && onfinish) onfinish({target: new Tween(this, 'opacity', opacity, opacity, duration, ease)});
	return this;
};

/**
 * Изменение прозрачности объекта на указанное значение
 * @param {Number} opacity Прозрачность (0-1)
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
DisplayObject.prototype.fadeBy = function(opacity, duration, ease, onfinish, onchange)
{
	var val = Math.max(0, Math.min(1, this.opacity + opacity));
	return this.fadeTo(val, duration, ease, onfinish, onchange);
};

/**
 * Поворот объекта до указанного угла
 * @param {Number} rotation Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {DisplayObject}
 */
DisplayObject.prototype.rotateTo = function(rotation, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	var t = null;
	if(duration <= 0)
	{
		this.rotation = rotation;
	}
	else
	{
		t = this.addTween('rotation', rotation, duration, ease, onfinish, onchange);
		if (t) t.play();
	}
	if (!t && onfinish) onfinish({target: new Tween(this, 'rotation', rotation, rotation, duration, ease)});
	return this;
};

/**
 * Поворот объекта на указанный угол
 * @param {Number} rotation Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
DisplayObject.prototype.rotateBy = function(rotation, duration, ease, onfinish, onchange)
{
	return this.rotateTo(this.rotation + rotation, duration, ease, onfinish, onchange);
};

/**
 * Искривление объекта по оси x до указанного угла
 * @param {Number} skew Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {DisplayObject}
 */
DisplayObject.prototype.skewXTo = function(skew, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	var t = null;
	if(duration <= 0)
	{
		this.skewX = skew;
	}
	else
	{
		t = this.addTween('skewX', skew, duration, ease, onfinish, onchange);
		if (t) t.play();
	}
	if (!t && onfinish) onfinish({target: new Tween(this, 'skewX', skew, skew, duration, ease)});
	return this;
};

/**
 * Искривление объекта по оси x на указанный угол
 * @param {Number} skew Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
DisplayObject.prototype.skewXBy = function(skew, duration, ease, onfinish, onchange)
{
	return this.skewXTo(this.skewX + skew, duration, ease, onfinish, onchange);
};

/**
 * Искривление объекта по оси y до указанного угла
 * @param {Number} skew Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {DisplayObject}
 */
DisplayObject.prototype.skewYTo = function(skew, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	var t = null;
	if(duration <= 0)
	{
		this.skewY = skew;
	}
	else
	{
		t = this.addTween('skewY', skew, duration, ease, onfinish, onchange);
		if (t) t.play();
	}
	if (!t && onfinish) onfinish({target: new Tween(this, 'skewY', skew, skew, duration, ease)});
	return this;
};

/**
 * Искривление объекта по оси y на указанный угол
 * @param {Number} skew Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
DisplayObject.prototype.skewYBy = function(skew, duration, ease, onfinish, onchange)
{
	return this.skewYTo(this.skewY + skew, duration, ease, onfinish, onchange);
};

/**
 * Пропорциональное изменение масштаба
 * @param {Number} scale Масштаб
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} [ease] функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} [onfinish] callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} [onchange] callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {DisplayObject}
 */
DisplayObject.prototype.scaleTo = function(scale, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	if(duration <= 0)
	{
		this.scaleX = this.scaleY = scale;
		if (onfinish) onfinish({target: new Tween(this, 'scaleY', scale, scale, duration, ease)});
		return this;
	}

	var t = [], tween;
	if (this.scaleX != scale) 
	{
		tween = this.addTween('scaleX', scale, duration, ease);
		if (tween) t.push(tween);
	}
	if (this.scaleY != scale) 
	{
		tween = this.addTween('scaleY', scale, duration, ease);
		if (tween) t.push(tween);
	}
	
	var len = t.length;
	if (len > 0)
	{
		t[len-1].onchange = onchange;
		t[len-1].onfinish = onfinish;
		for (var i = 0; i < len; i++) t[i].play();
	}
	else if (onfinish) onfinish({target: new Tween(this, 'scaleY', scale, scale, duration, ease)});

	return this;
};

/**
 * Обёртка для Z-позиционирования
 * @param {Number} z zIndex
 */
DisplayObject.prototype.setZIndex = function(z)
{
	this.zIndex = ~~z;
	if(!this.parent) return;
	this.parent.setChildZIndex(this, this.zIndex);
};

/**
 * @description Проверка на hit в точке, по умолчанию без учёта прозрачности
 * @param {int} x
 * @param {int} y
 * @param {boolean} [checkPixel] = false
 * @param {boolean} [checkDragged] = false
 * @return {boolean}
 */
DisplayObject.prototype.hitTestPoint = function(x, y, checkPixel, checkDragged)
{
	if(!this.stage)	return false;
	return this.stage.hitTestPointObject(this, x, y, checkPixel, checkDragged);
};

/**
 * Установка относительных координат объекта
 * @param {Number} [x] x
 * @param {Number} [y] y
 * @param {String} [leftAnchor] привязка слева. Допустимые значения: "left", "center", "right". Значение по умолчанию: "center"
 * @param {String} [topAnchor] привязка сверху. Допустимые значения: "top", "center", "bottom". Значение по умолчанию: "center"
 */
DisplayObject.prototype.setRelativePosition = function(x, y, leftAnchor, topAnchor)
{
	x = x || 0;
	y = y || 0;
	
	switch(leftAnchor)
	{
		case "right":
			x = this.stage.screenWidth - x;
			break;
		case "left":
			break;
		default:
			x = this.stage.screenWidth/2 + x;
			break;
	}
	
	switch(topAnchor)
	{
		case "bottom":
			y = this.stage.screenHeight - y;
			break;
		case "top":
			break;
		default:
			y = this.stage.screenHeight/2 + y;
			break;
	}
	
	this.setPosition(x, y);
};

/**
 * Отладочная отрисовка.
 * Вызывается при рендеринге, но можно вызывать и вручную.
 */
DisplayObject.prototype.debugDraw = function()
{
	if(!this.visible) return;
	if(!this.allowDebugDrawing) return;

	var a = this.getAbsolutePosition(), c = this.getCenter(), r = this.getDrawRectangle(), aabb = this.getAABBRectangle();

	stage.drawCircle(a.x, a.y, 1, 1, 'rgba(255,0,0,0.9)');
	stage.drawCircle(c.x, c.y, 1, 1, 'rgba(0,255,0,0.9)');
	stage.drawLine(a.x, a.y, c.x, c.y, 1, 'rgba(255,255,255,0.5)');

	stage.drawPolygon(r.vertices, 0.5, 'rgba(255,0,255,0.5)', 1);

	stage.drawLine(aabb.vertices[0].x, aabb.vertices[0].y, aabb.vertices[2].x, aabb.vertices[2].y, 1, 'rgba(255,255,255,0.5)');
	stage.drawLine(aabb.vertices[2].x, aabb.vertices[0].y, aabb.vertices[0].x, aabb.vertices[2].y, 1, 'rgba(255,255,255,0.5)');
	stage.drawPolygon(aabb.vertices, 0.5, 'rgba(255,255,255,0.5)');
};

/** @ignore */
DisplayObject.prototype.fixChildrenParent = function()
{
    for(var i=0; i<this.objects.length; i++)
    {
        this.objects[i].parent = this;
        this.objects[i].fixChildrenParent();
    }
};

/**
 * Клонирование объекта
 */
DisplayObject.prototype.clone = function()
{
	var clone = Utils.clone(this);
	clone.fixChildrenParent();
	
	return clone;
};

/**
 * Отложенное удаление объекта. Эквивалентно obj.destroy = true;
 */
DisplayObject.prototype.safeRemove = function()
{
    this.destroy = true;
};

/**
 * @class
 * @description Базовый класс графического объекта
 * @augments DisplayObject
 */

function Graphics()
{
	Utils.callSuperConstructor(Graphics, this);
}

Utils.extend(Graphics, DisplayObject);

/** x координата */
Graphics.prototype.x = 0;
/** y координата */
Graphics.prototype.y = 0;
/** цвет */
Graphics.prototype.color = "#000";
/** толщина линии */
Graphics.prototype.lineWidth = 1;

Graphics.prototype.lineDash = null;

/** @ignore */
Graphics.prototype.render = function(cns, drawStatic, delta)
{
	if(!!this.static == !!drawStatic && this.hasEventListener("render")) this.dispatchEvent("render", {target: this, canvas: cns, delta: delta});
	
	Utils.callSuperMethod(Graphics, this, "render", cns, drawStatic, delta);
};

Graphics.prototype.preparePath = function(cns)
{
    this.moveCanvasAnchor(cns);
    this.prepareCanvasShadow(cns);

    var ctx = cns.getContext('2d');

	ctx.beginPath();
    
    ctx.strokeStyle = this.lineWidth > 0 ? this.color : "transparent";
    ctx.lineWidth = this.lineWidth * Utils.globalScale;
    ctx.globalAlpha = this.getAbsoluteOpacity();
    
    ctx.fillStyle = this.getFillStyle(cns);
	
	if(this.lineDash && ctx.setLineDash)
	{
		var p = [];
		for(var i=0; i<this.lineDash.length; i++) p.push(this.lineDash[i] * Utils.globalScale);
		ctx.setLineDash(p);
	}
};

Graphics.prototype.removeShadow = function(cns)
{
    var ctx = cns.getContext('2d');

    ctx.shadowColor = "";
	ctx.shadowBlur = 0;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
};

/** @ignore */
Graphics.prototype.finalizeCanvas = function(cns)
{
    var ctx = cns.getContext('2d');

    if(this.fillColor ||
	   this.fillLinearGradient ||
	   this.fillRadialGradient ||
	   this.fillPattern) 
	{
		ctx.fill();
        if(this.color && this.lineWidth) this.removeShadow(cns);
	}
	ctx.stroke();

    this.restoreCanvasShadow(cns);
    this.moveCanvasAnchor(cns, true);
};

/** Очистка заливки и цвета примитива */
Graphics.prototype.resetView = function()
{
    this.color = "transparent";
    this.fillColor = null;
    this.fillLinearGradient = null;
    this.fillRadialGradient = null;
    this.fillPattern = null;
};

/**
 * @class
 * @augments Graphics
 * @description Окружность
 * @param {Number} x x координата центра
 * @param {Number} y y координата центра
 * @param {Number} radius радиус
 */
Graphics.circle = function(x, y, radius)
{
	Utils.callSuperConstructor(Graphics.circle, this);
	
	this.x = x;
	this.y = y;
	this.radius = radius;
	
	this.width = radius*2;
	this.height = radius*2;
};
Utils.extend(Graphics.circle, Graphics);

/** @ignore */
Graphics.circle.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

	if(!!this.static == !!drawStatic && this.opacity != 0)
	{
		this.preparePath(cns);
        cns.getContext('2d').arc(0, 0, this.radius * Utils.globalScale, 0, Math.PI * 2);
		this.finalizeCanvas(cns);
	}

	Utils.callSuperMethod(Graphics.circle, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/**
 * @class
 * @augments Graphics
 * @description Линия
 * @param {Number} x1 x координата первой точки
 * @param {Number} y1 y координата первой точки
 * @param {Number} x2 x координата второй точки
 * @param {Number} y2 y координата второй точки
 */
Graphics.line = function(x1, y1, x2, y2)
{
	Utils.callSuperConstructor(Graphics.line, this);
	
	this.x1 = x1;
	this.x2 = x2;
	this.y1 = y1;
	this.y2 = y2;
};
Utils.extend(Graphics.line, Graphics);

/** @ignore */
Graphics.line.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

	if(!!this.static == !!drawStatic && this.opacity != 0)
	{
		this.preparePath(cns);
        var ctx = cns.getContext('2d');
		ctx.moveTo(this.x1 * Utils.globalScale, this.y1 * Utils.globalScale);
		ctx.lineTo(this.x2 * Utils.globalScale, this.y2 * Utils.globalScale);
		this.finalizeCanvas(cns);
	}

	Utils.callSuperMethod(Graphics.line, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/**
 * @class
 * @augments Graphics
 * @description Прямоугольник
 * @param {Number} x x координата центра
 * @param {Number} y y координата центра
 * @param {Number} width ширина
 * @param {Number} height высота
 */
Graphics.rectangle = function(x, y, width, height)
{
	Utils.callSuperConstructor(Graphics.rectangle, this);
	
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
};
Utils.extend(Graphics.rectangle, Graphics);

/** @ignore */
Graphics.rectangle.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

	if(!!this.static == !!drawStatic && this.opacity != 0)
	{
		this.preparePath(cns);
        cns.getContext('2d').rect((-this.width/2) * Utils.globalScale, (-this.height/2) * Utils.globalScale,
					 this.width  * Utils.globalScale, this.height  * Utils.globalScale);
		this.finalizeCanvas(cns);
	}
	
	Utils.callSuperMethod(Graphics.rectangle, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/**
 * @class
 * @augments Graphics
 * @description Дуга
 * @param {Number} x x координата центра
 * @param {Number} y y координата центра
 * @param {Number} radius радиус
 * @param {Number} startAngle начальный угол
 * @param {Number} endAngle конечный угол
 * @param {Boolean} antiClockWise нужно ли рисовать дугу против часовой стрелки
 */
Graphics.arc = function(x, y, radius, startAngle, endAngle, antiClockWise)
{
	Utils.callSuperConstructor(Graphics.arc, this);
	
	this.x = x;
	this.y = y;
	this.radius = radius;
	this.startAngle = startAngle;
	this.endAngle = endAngle;
	this.antiClockWise = antiClockWise;
	
	this.width = radius*2;
	this.height = radius*2;
};
Utils.extend(Graphics.arc, Graphics);

/** @ignore */
Graphics.arc.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

	if(!!this.static == !!drawStatic && this.opacity != 0)
	{
		this.preparePath(cns);
        cns.getContext('2d').arc(0, 0, this.radius * Utils.globalScale, this.startAngle, this.endAngle, this.antiClockWise);
		this.finalizeCanvas(cns);
	}
	
	Utils.callSuperMethod(Graphics.arc, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/**
 * @class
 * @augments Graphics
 * @description Полигон
 * @param {Array} points массив объектов точек: {x: 10, y: 20}
 */
Graphics.polygon = function(points)
{
	if(!points || points.length < 2)
	{
		throw Error("Invalid parameters");
	}
	
	Utils.callSuperConstructor(Graphics.polygon, this);
	
	this.points = points;
	
	var minX = Number.MAX_VALUE;
	var minY = Number.MAX_VALUE;
	var maxX = Number.MIN_VALUE;
	var maxY = Number.MIN_VALUE;
	
	for(var i=0; i<points.length; i++)
	{
		if(points[i].x < minX) minX = points[i].x;
		if(points[i].y < minY) minY = points[i].y;
		if(points[i].x > maxX) maxX = points[i].x;
		if(points[i].y > maxY) maxY = points[i].y;
	}
	
	this.width = maxX - minX;
	this.height = maxY - minY;
};
Utils.extend(Graphics.polygon, Graphics);

/** @ignore */
Graphics.polygon.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

	if(!!this.static == !!drawStatic && this.opacity != 0)
	{
		this.preparePath(cns);

        var ctx = cns.getContext('2d');

		ctx.moveTo(this.points[0].x * Utils.globalScale, this.points[0].y * Utils.globalScale);
		
		for(var i=1; i < this.points.length; i++)
		{
			ctx.lineTo(this.points[i].x * Utils.globalScale, this.points[i].y * Utils.globalScale);
		}
		
		ctx.lineTo(this.points[0].x * Utils.globalScale, this.points[0].y * Utils.globalScale);
		
		this.finalizeCanvas(cns);
	}
	
	Utils.callSuperMethod(Graphics.polygon, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/**
 * @class
 * @augments Graphics
 * @description Текст
 * @param {Number} x x координата
 * @param {Number} y y координата
 * @param {String} text текст
 */
Graphics.text = function(x, y, text)
{
	Utils.callSuperConstructor(Graphics.text, this);
	
	this.x = x;
	this.y = y;
	this.text = text;
	
	/** выравнивание по горизонтали */
	this.align = Graphics.text.ALIGN_LEFT;
	/** выравнивание по вертикали */
	this.valign = Graphics.text.VALIGN_MIDDLE;
	
	/** стиль текста */
	this.style = "normal";
	/** размер шрифта */
	this.size = 10;
	/** шрифт */
	this.font = "sans-serif";

	/** высота линии для мультистрочного текста */
	this.lineHeight = 10;

	/** максимальная ширина текста */
	this.maxWidth = 0;

	/** метод вписывания текста */
	this.maxWidthType = Graphics.text.MAX_WIDTH_WORD_WRAP;

	/** нужно ли пытаться вписывать текст в размер родителя */
	this.fitToParent = false;
};
Utils.extend(Graphics.text, Graphics);

/** константа - выравнивание текста по левому краю */
Graphics.text.ALIGN_LEFT = "left";
/** константа - выравнивание текста по центру */
Graphics.text.ALIGN_CENTER = "center";
/** константа - выравнивание текста по правому краю */
Graphics.text.ALIGN_RIGHT = "right";
/** константа - выравнивание текста по верху */
Graphics.text.VALIGN_TOP = "top";
/** константа - выравнивание текста по середине */
Graphics.text.VALIGN_MIDDLE = "middle";
/** константа - выравнивание текста по низу */
Graphics.text.VALIGN_BOTTOM = "bottom";

Graphics.text.MAX_WIDTH_WORD_WRAP = 0;
Graphics.text.MAX_WIDTH_FIT = 1;

/** разделитель строк текста */
Graphics.text.LINES_DELIMITER = "\n";

/** @ignore */
Graphics.text.prototype.preparePath = function(cns)
{
	Utils.callSuperMethod(Graphics.text, this, "preparePath", cns);

    var ctx = cns.getContext('2d');

    ctx.font = this.style + " " + Math.floor(this.size * Utils.globalScale) + "px " + this.font;
		
	ctx.textAlign = this.align;
	ctx.textBaseline = this.valign;
};

/** @ignore */
Graphics.text.prototype.getRect = function(cns, text, noModCanvas)
{
	if(!noModCanvas)
	{
		this.prepareCanvas(cns);
		this.preparePath(cns);
	}
	
	if(!text) text = this.text;
	var ret = cns.getContext('2d').measureText(text);
	
	if(!noModCanvas)
	{
		this.finalizeCanvas(cns);
		this.restoreCanvas(cns);
	}
	
	return ret;
};

Graphics.text.prototype.getLines = function(cns)
{
    var i, n, words, originalLines, lines, lineWords;

    var text = this.text + "";

    var maxWidth = this.maxWidth;
    if(this.fitToParent && (maxWidth == 0 || this.parent.width < maxWidth)) maxWidth = this.parent.width;

    if(maxWidth > 0 && this.maxWidthType == Graphics.text.MAX_WIDTH_WORD_WRAP)
    {
        originalLines = text.split(Graphics.text.LINES_DELIMITER);

        lines = [];
        lineWords = [];

        for(n=0; n<originalLines.length; n++)
        {
            words = originalLines[n].split(" ");
            lineWords = [words[0]];
            for(i=1; i<words.length; i++)
            {
                if(this.getRect(cns, lineWords.join(" ") + " " + words[i], true).width/Utils.globalScale > maxWidth)
                {
                    lines.push(lineWords.join(" "));
                    lineWords = [words[i]];
                }
                else lineWords.push(words[i]);
            }
            lines.push(lineWords.join(" "));
        }

        text = lines.join(Graphics.text.LINES_DELIMITER);
    }

    lines = text.split(Graphics.text.LINES_DELIMITER);

    return lines;
};

/** @ignore */
Graphics.text.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

	if(!!this.static == !!drawStatic && this.opacity != 0 && this.text)
	{
		this.preparePath(cns);

        var lines = this.getLines(cns);

        var y = 0;
        if(this.valign == Graphics.text.VALIGN_MIDDLE && lines.length > 1) y = -(lines.length * this.lineHeight)/2;
        if(this.valign == Graphics.text.VALIGN_BOTTOM && lines.length > 1) y = -(lines.length * this.lineHeight);
        y *= Utils.globalScale;

        var maxWidth = 0;
        if(this.maxWidthType == Graphics.text.MAX_WIDTH_FIT)
        {
            maxWidth = this.maxWidth;
            if(this.fitToParent && (maxWidth == 0 || this.parent.width < maxWidth)) maxWidth = this.parent.width;
        }
        maxWidth *= Utils.globalScale;

		for(var i=0; i<lines.length; i++)
        {
            var ctx = cns.getContext('2d');

            if(this.fillColor || this.fillLinearGradient || this.fillRadialGradient || this.fillPattern)
            {
                if(maxWidth) ctx.fillText(lines[i], 0, y + i*this.lineHeight*Utils.globalScale, maxWidth);
                else ctx.fillText(lines[i], 0, y + i*this.lineHeight*Utils.globalScale);
            }

		    if(this.color && this.lineWidth > 0)
            {
                this.removeShadow(cns);
                if(maxWidth) ctx.strokeText(lines[i], 0, y + i*this.lineHeight*Utils.globalScale, maxWidth);
		        else ctx.strokeText(lines[i], 0, y + i*this.lineHeight*Utils.globalScale);
                this.prepareCanvasShadow(cns, true);
            }
        }

		this.finalizeCanvas(cns);
	}
	
	Utils.callSuperMethod(Graphics.text, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/**
 * @class
 * @augments Graphics
 * @description Произвольные графические элементы
 */
Graphics.free = function()
{
    this.commands = [];
    
    Utils.callSuperConstructor(Graphics.free, this);
};
Utils.extend(Graphics.free, Graphics);

Graphics.free.prototype.clear = function()
{
    this.commands = [];
    
    Utils.callSuperMethod(Graphics.free, this, "clear");
};

Graphics.free.prototype.beginPath = function()
{
    this.commands.push({command: "beginPath"});
    return this;
};

Graphics.free.prototype.stroke = function()
{
    this.commands.push({command: "stroke"});
    return this;
};

Graphics.free.prototype.setStrokeStyle = function(style)
{
    this.commands.push({command: "setStrokeStyle", style: style});
    return this;
};

Graphics.free.prototype.setFillStyle = function(style)
{
    this.commands.push({command: "setFillStyle", style: style});
    return this;
};

Graphics.free.prototype.fill = function()
{
    this.commands.push({command: "fill"});
    return this;
};

Graphics.free.prototype.moveTo = function(x, y)
{
    this.commands.push({command: "moveTo", x: x, y: y});
    return this;
};

Graphics.free.prototype.lineTo = function(x, y)
{
    this.commands.push({command: "lineTo", x: x, y: y});
    return this;
};

Graphics.free.prototype.arc = function(x, y, radius, startAngle, endAngle, antiClockWise)
{
    this.commands.push({command: "arc", x: x, y: y, radius: radius, startAngle: startAngle, endAngle: endAngle, antiClockWise: antiClockWise});
    return this;
};

Graphics.free.prototype.circle = function(x, y, radius)
{
    this.commands.push({command: "circle", x: x, y: y, radius: radius});
    return this;
};

Graphics.free.prototype.rect = function(x, y, width, height)
{
    this.commands.push({command: "circle", x: x, y: y, width: width, height: height});
    return this;
};

Graphics.free.prototype.polygon = function(points)
{
    this.commands.push({command: "polygon", points: points});
    return this;
};

Graphics.free.prototype.executeCommand = function(cns, c)
{
    var ctx = cns.getContext('2d');

    switch(c.command)
    {
        case "beginPath":
            ctx.beginPath();
            break;
        case "stroke":
            ctx.stroke();
            break;
        case "fill":
            ctx.fill();
            break;
        case "setStrokeStyle":
            ctx.strokeStyle = this.lineWidth > 0 ? c.style : "transparent";
            break;
        case "setFillStyle":
            ctx.fillStyle = c.style;
            break;
        case "moveTo":
            ctx.moveTo(c.x * Utils.globalScale, c.y * Utils.globalScale);
            break;
        case "lineTo":
            ctx.lineTo(c.x * Utils.globalScale, c.y * Utils.globalScale);
            break;
        case "arc":
            ctx.arc(c.x * Utils.globalScale, c.y * Utils.globalScale, c.radius * Utils.globalScale, c.startAngle, c.endAngle, c.antiClockWise);
            break;
        case "circle":
            ctx.arc(c.x * Utils.globalScale, c.y * Utils.globalScale, c.radius * Utils.globalScale, 0, Math.PI * 2);
            break;
        case "rect":
            ctx.rect((c.x - c.width/2) * Utils.globalScale, (c.y - c.height/2) * Utils.globalScale,
                c.width * Utils.globalScale, c.height  * Utils.globalScale);
            break;
        case "polygon":
            ctx.moveTo(c.points[0].x * Utils.globalScale, c.points[0].y * Utils.globalScale);
            for(var n=1; n < c.points.length; n++) ctx.lineTo(c.points[n].x * Utils.globalScale, c.points[n].y * Utils.globalScale);
            ctx.lineTo(c.points[0].x * Utils.globalScale, c.points[0].y * Utils.globalScale);
            break;
    }
};

Graphics.free.prototype.executeCommands = function(cns)
{
    for(var i=0; i<this.commands.length; i++)
    {
        this.executeCommand(cns, this.commands[i]);
    }
};

/** @ignore */
Graphics.free.prototype.render = function(cns, drawStatic, delta)
{
    this.prepareCanvas(cns);

    if(!!this.static == !!drawStatic && this.opacity != 0)
	{
		this.preparePath(cns);
		this.executeCommands(cns);
		this.finalizeCanvas(cns);
	}
    
    Utils.callSuperMethod(Graphics.free, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};




var BitmapsCache = {};

BitmapsCache.bitmaps = {};

BitmapsCache.cache = function(bitmap)
{
    if(!bitmap || !(bitmap instanceof Image)) return bitmap;
    
    if(BitmapsCache.bitmaps[bitmap.src]) return BitmapsCache.bitmaps[bitmap.src];
    
    var cns = document.createElement("canvas");
    cns.width = bitmap.width;
    cns.height = bitmap.height;
    var ctx = cns.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, bitmap.width, bitmap.height);
    
    BitmapsCache.bitmaps[bitmap.src] = cns;
    
    return cns;
};

/**
 * @class
 * @description Набор фильтров изображения
 */
var ImageFilter = {};

/** @ignore */
ImageFilter.cache = {};

/** @ignore */
ImageFilter.getFromCache = function(filter, bitmap, args)
{
    if(!(bitmap instanceof Image)) return null;
    if(!ImageFilter.cache[filter]) return null;

    var cache = ImageFilter.cache[filter];
    for (var i = 0; i < cache.length; i++)
    {
        var obj = cache[i];
        if(obj.src == bitmap.src)
        {
            var ok = true;
            for(var n=0; n<args.length; n++)
            {
                if(args[n] != obj.args[n])
                {
                    ok = false;
                    break;
                }
            }
            if(ok) return obj.cns;
        }
    }

    return null;
};

/** @ignore */
ImageFilter.putToCache = function(filter, bitmap, args, cns)
{
    if(!(bitmap instanceof Image)) return;
    if(typeof filter != "string") return;

    var data = {
        src: bitmap.src,
        args: args,
        cns: cns
    };

    if(!ImageFilter.cache[filter]) ImageFilter.cache[filter] = [];

    ImageFilter.cache[filter].push(data);
};

/**
 * @description Основной метод для применения фильтра к изображению
 * @param bitmap Image|Canvas
 * @param filter String|Function
 * @example
 * var mc = new Sprite(ImageFilter.apply(bitmaps.back, "grayscale"), 480, 320);
 */
ImageFilter.apply = function(bitmap, filter)
{
    if(!(bitmap instanceof Image) && !(bitmap instanceof HTMLImageElement) && !(bitmap instanceof HTMLCanvasElement))
    {
        throw new Error('Incorrect bitmap. Must be Image or Canvas.');
    }

    var filterFunc = filter;
    if(typeof filter == "string") filterFunc = ImageFilter.filter[filter];
    if(typeof filterFunc != "function")
    {
        throw new Error('Incorrect filter ' + filter);
    }

    var args = [];
    for(var i=2; i<arguments.length; i++) args.push(arguments[i]);

    var cache = ImageFilter.getFromCache(filter, bitmap, args);
    if(cache) return cache;

    var cns = document.createElement("canvas");
    cns.width = bitmap.width;
    cns.height = bitmap.height;
    var ctx = cns.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, bitmap.width, bitmap.height);

    var imageData = filterFunc.apply(ImageFilter.filter[filter], [ctx.getImageData(0, 0, cns.width, cns.height)].concat(args));
    ctx.putImageData(imageData, 0, 0);

    ImageFilter.putToCache(filter, bitmap, args, cns);

    return cns;
};

/**
 * @description Очистка кеша
 */
ImageFilter.clearCache = function()
{
	ImageFilter.cache = {};
};

/**
 * @class
 * @description Фильтры
 */
ImageFilter.filter = {};

ImageFilter.filter.grayscale = function(imageData)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        var v = 0.2126*imageData.data[i] + 0.7152*imageData.data[i+1] + 0.0722*imageData.data[i+2];
        imageData.data[i] = v;
        imageData.data[i + 1] = v;
        imageData.data[i + 2] = v;
    }
    return imageData;
};

ImageFilter.filter.discolor = function(imageData)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        var v = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2])/2;
        imageData.data[i] = v;
        imageData.data[i + 1] = v;
        imageData.data[i + 2] = v;
    }
    return imageData;
};

ImageFilter.filter.brightness = function(imageData, val)
{
    val *= 255;
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = Math.min(imageData.data[i] + val, 255);
        imageData.data[i + 1] = Math.min(imageData.data[i + 1] + val, 255);
        imageData.data[i + 2] = Math.min(imageData.data[i + 2] + val, 255);
    }
    return imageData;
};

ImageFilter.filter.tint = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        if(imageData.data[i] + 3)
        {
            imageData.data[i] = r;
            imageData.data[i + 1] = g;
            imageData.data[i + 2] = b;
        }
    }
    return imageData;
};

ImageFilter.filter.invert = function(imageData)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = 255 - imageData.data[i];
        imageData.data[i + 1] = 255 - imageData.data[i + 1];
        imageData.data[i + 2] = 255 - imageData.data[i + 2];
    }
    return imageData;
};

ImageFilter.filter.multiply = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = (imageData.data[i] * r) / 255;
        imageData.data[i + 1] = (imageData.data[i + 1] * g) / 255;
        imageData.data[i + 2] = (imageData.data[i + 2] * b) / 255;
    }
    return imageData;
};

ImageFilter.filter.sepia = function(imageData)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        var v = 0.3  * imageData.data[i] + 0.59 * imageData.data[i + 1] + 0.11 * imageData.data[i + 2];
        imageData.data[i] = v + 100;
        imageData.data[i + 1] = v + 50;
        imageData.data[i + 2] = v + 255;
    }
    return imageData;
};

ImageFilter.filter.sepia2 = function(imageData)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        var r = imageData.data[i];
        var g = imageData.data[i + 1];
        var b = imageData.data[i + 2];

        imageData.data[i] = (r * 0.393 + g * 0.769 + b * 0.189 ) / 1.351;
        imageData.data[i + 1] = (r * 0.349 + g * 0.686 + b * 0.168 ) / 1.203;
        imageData.data[i + 2] = (r * 0.272 + g * 0.534 + b * 0.131 ) / 2.140;
    }
    return imageData;
};

ImageFilter.filter.add = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = Math.min(imageData.data[i] + r, 255);
        imageData.data[i + 1] = Math.min(imageData.data[i + 1] + g, 255);
        imageData.data[i + 2] = Math.min(imageData.data[i + 2] + b, 255);
    }
    return imageData;
};

ImageFilter.filter.screen = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = 1 - (1 - imageData.data[i]) * (1 - r);
        imageData.data[i + 1] = 1 - (1 - imageData.data[i + 1]) * (1 - g);
        imageData.data[i + 2] = 1 - (1 - imageData.data[i + 2]) * (1 - b);
    }
    return imageData;
};

ImageFilter.filter.diff = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = Math.abs(imageData.data[i] - r);
        imageData.data[i + 1] = Math.abs(imageData.data[i + 1] - g);
        imageData.data[i + 2] = Math.abs(imageData.data[i + 2] - b);
    }
    return imageData;
};

ImageFilter.filter.darken = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = Math.min(imageData.data[i], r);
        imageData.data[i + 1] = Math.min(imageData.data[i + 1], g);
        imageData.data[i + 2] = Math.min(imageData.data[i + 2], b);
    }
    return imageData;
};

ImageFilter.filter.lighten = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = Math.max(imageData.data[i], r);
        imageData.data[i + 1] = Math.max(imageData.data[i + 1], g);
        imageData.data[i + 2] = Math.max(imageData.data[i + 2], b);
    }
    return imageData;
};

ImageFilter.filter.subtract = function(imageData, r, g, b)
{
    for(var i=0; i<imageData.data.length; i+=4)
    {
        imageData.data[i] = Math.max(imageData.data[i] - r, 0);
        imageData.data[i + 1] = Math.max(imageData.data[i + 1] - g, 0);
        imageData.data[i + 2] = Math.max(imageData.data[i + 2] - b, 0);
    }
    return imageData;
};

ImageFilter.filter.blur = function(imageData, radius, blurAlpha)
{
    radius = radius || 5;
    if(blurAlpha) imageData = ImageFilter.filter.blur.rgba(imageData, radius);
    else imageData = ImageFilter.filter.blur.rgb(imageData, radius);

    return imageData;
};

/** @ignore */
ImageFilter.filter.blur.mulTable =
[
    512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,
    454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,
    482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,
    437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,
    497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,
    320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,
    446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,
    329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,
    505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,
    399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,
    324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,
    268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,
    451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,
    385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,
    332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,
    289,287,285,282,280,278,275,273,271,269,267,265,263,261,259
];

/** @ignore */
ImageFilter.filter.blur.shgTable =
[
    9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
    17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
    19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
    21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
    21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
    22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
    22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
    23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24
];

/** @ignore */
ImageFilter.filter.blur.getStack = function()
{
    return {r: 0, g: 0, b: 0, a: 0, next: null};
};

/** @ignore */
ImageFilter.filter.blur.rgba = function(imageData, radius)
{
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;

    var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum,
        r_out_sum, g_out_sum, b_out_sum, a_out_sum,
        r_in_sum, g_in_sum, b_in_sum, a_in_sum,
        pr, pg, pb, pa, rbs;

    var div = radius + radius + 1;
    var widthMinus1  = width - 1;
    var heightMinus1 = height - 1;
    var radiusPlus1  = radius + 1;
    var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;

    var stackStart = ImageFilter.filter.blur.getStack();

    var stack = stackStart;
    for (i=1; i<div; i++)
    {
        stack = stack.next = ImageFilter.filter.blur.getStack();
        if(i == radiusPlus1) var stackEnd = stack;
    }
    stack.next = stackStart;
    var stackIn = null;
    var stackOut = null;

    yw = yi = 0;

    var mul_sum = ImageFilter.filter.blur.mulTable[radius];
    var shg_sum = ImageFilter.filter.blur.shgTable[radius];

    for (y=0; y<height; y++)
    {
        r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;

        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi+1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi+2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi+3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for(i=0; i<radiusPlus1; i++)
        {
            stack.r = pr;
            stack.g = pg;
            stack.b = pb;
            stack.a = pa;
            stack = stack.next;
        }

        for(i=1; i<radiusPlus1; i++)
        {
            p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
            r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
            g_sum += (stack.g = (pg = pixels[p+1])) * rbs;
            b_sum += (stack.b = (pb = pixels[p+2])) * rbs;
            a_sum += (stack.a = (pa = pixels[p+3])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;
            a_in_sum += pa;

            stack = stack.next;
        }

        stackIn = stackStart;
        stackOut = stackEnd;
        for(x=0; x<width; x++)
        {
            pixels[yi+3] = pa = (a_sum * mul_sum) >> shg_sum;
            if(pa != 0)
            {
                pa = 255/pa;
                pixels[yi]   = ((r_sum * mul_sum) >> shg_sum) * pa;
                pixels[yi+1] = ((g_sum * mul_sum) >> shg_sum) * pa;
                pixels[yi+2] = ((b_sum * mul_sum) >> shg_sum) * pa;
            }
            else
            {
                pixels[yi] = pixels[yi+1] = pixels[yi+2] = 0;
            }

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;
            a_sum -= a_out_sum;

            r_out_sum -= stackIn.r;
            g_out_sum -= stackIn.g;
            b_out_sum -= stackIn.b;
            a_out_sum -= stackIn.a;

            p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

            r_in_sum += (stackIn.r = pixels[p]);
            g_in_sum += (stackIn.g = pixels[p+1]);
            b_in_sum += (stackIn.b = pixels[p+2]);
            a_in_sum += (stackIn.a = pixels[p+3]);

            r_sum += r_in_sum;
            g_sum += g_in_sum;
            b_sum += b_in_sum;
            a_sum += a_in_sum;

            stackIn = stackIn.next;

            r_out_sum += (pr = stackOut.r);
            g_out_sum += (pg = stackOut.g);
            b_out_sum += (pb = stackOut.b);
            a_out_sum += (pa = stackOut.a);

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;
            a_in_sum -= pa;

            stackOut = stackOut.next;

            yi += 4;
        }
        yw += width;
    }

    for(x=0; x<width; x++)
    {
        g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;

        yi = x << 2;
        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi+1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi+2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi+3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for(i=0; i<radiusPlus1; i++)
        {
            stack.r = pr;
            stack.g = pg;
            stack.b = pb;
            stack.a = pa;
            stack = stack.next;
        }

        yp = width;

        for(i=1; i<=radius; i++)
        {
            yi = (yp + x) << 2;

            r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
            g_sum += (stack.g = (pg = pixels[yi+1])) * rbs;
            b_sum += (stack.b = (pb = pixels[yi+2])) * rbs;
            a_sum += (stack.a = (pa = pixels[yi+3])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;
            a_in_sum += pa;

            stack = stack.next;

            if(i < heightMinus1)
            {
                yp += width;
            }
        }

        yi = x;
        stackIn = stackStart;
        stackOut = stackEnd;
        for(y=0; y<height; y++)
        {
            p = yi << 2;
            pixels[p+3] = pa = (a_sum * mul_sum) >> shg_sum;
            if(pa > 0)
            {
                pa = 255 / pa;
                pixels[p]   = ((r_sum * mul_sum) >> shg_sum) * pa;
                pixels[p+1] = ((g_sum * mul_sum) >> shg_sum) * pa;
                pixels[p+2] = ((b_sum * mul_sum) >> shg_sum) * pa;
            }
            else
            {
                pixels[p] = pixels[p+1] = pixels[p+2] = 0;
            }

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;
            a_sum -= a_out_sum;

            r_out_sum -= stackIn.r;
            g_out_sum -= stackIn.g;
            b_out_sum -= stackIn.b;
            a_out_sum -= stackIn.a;

            p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width )) << 2;

            r_sum += (r_in_sum += (stackIn.r = pixels[p]));
            g_sum += (g_in_sum += (stackIn.g = pixels[p+1]));
            b_sum += (b_in_sum += (stackIn.b = pixels[p+2]));
            a_sum += (a_in_sum += (stackIn.a = pixels[p+3]));

            stackIn = stackIn.next;

            r_out_sum += (pr = stackOut.r);
            g_out_sum += (pg = stackOut.g);
            b_out_sum += (pb = stackOut.b);
            a_out_sum += (pa = stackOut.a);

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;
            a_in_sum -= pa;

            stackOut = stackOut.next;

            yi += width;
        }
    }

    return imageData;
};

/** @ignore */
ImageFilter.filter.blur.rgb = function(imageData, radius )
{
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;

    var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
        r_out_sum, g_out_sum, b_out_sum,
        r_in_sum, g_in_sum, b_in_sum,
        pr, pg, pb, rbs;

    var div = radius + radius + 1;
    var widthMinus1  = width - 1;
    var heightMinus1 = height - 1;
    var radiusPlus1  = radius + 1;
    var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;

    var stackStart = ImageFilter.filter.blur.getStack();
    var stack = stackStart;
    for(i=1; i<div; i++)
    {
        stack = stack.next = ImageFilter.filter.blur.getStack();
        if(i == radiusPlus1) var stackEnd = stack;
    }
    stack.next = stackStart;
    var stackIn = null;
    var stackOut = null;

    yw = yi = 0;

    var mul_sum = ImageFilter.filter.blur.mulTable[radius];
    var shg_sum = ImageFilter.filter.blur.shgTable[radius];

    for(y=0; y<height; y++)
    {
        r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi+1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi+2]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;

        stack = stackStart;

        for(i=0; i<radiusPlus1; i++)
        {
            stack.r = pr;
            stack.g = pg;
            stack.b = pb;
            stack = stack.next;
        }

        for(i=1; i<radiusPlus1; i++)
        {
            p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
            r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
            g_sum += (stack.g = (pg = pixels[p+1])) * rbs;
            b_sum += (stack.b = (pb = pixels[p+2])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;

            stack = stack.next;
        }

        stackIn = stackStart;
        stackOut = stackEnd;
        for(x=0; x<width; x++)
        {
            pixels[yi]   = (r_sum * mul_sum) >> shg_sum;
            pixels[yi+1] = (g_sum * mul_sum) >> shg_sum;
            pixels[yi+2] = (b_sum * mul_sum) >> shg_sum;

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;

            r_out_sum -= stackIn.r;
            g_out_sum -= stackIn.g;
            b_out_sum -= stackIn.b;

            p =  (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1 )) << 2;

            r_in_sum += (stackIn.r = pixels[p]);
            g_in_sum += (stackIn.g = pixels[p+1]);
            b_in_sum += (stackIn.b = pixels[p+2]);

            r_sum += r_in_sum;
            g_sum += g_in_sum;
            b_sum += b_in_sum;

            stackIn = stackIn.next;

            r_out_sum += (pr = stackOut.r);
            g_out_sum += (pg = stackOut.g);
            b_out_sum += (pb = stackOut.b );

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;

            stackOut = stackOut.next;

            yi += 4;
        }
        yw += width;
    }

    for(x=0; x<width; x++)
    {
        g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

        yi = x << 2;
        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi+1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi+2]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;

        stack = stackStart;

        for(i=0; i<radiusPlus1; i++)
        {
            stack.r = pr;
            stack.g = pg;
            stack.b = pb;
            stack = stack.next;
        }

        yp = width;

        for(i=1; i<=radius; i++)
        {
            yi = (yp + x) << 2;

            r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
            g_sum += (stack.g = (pg = pixels[yi+1])) * rbs;
            b_sum += (stack.b = (pb = pixels[yi+2])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;

            stack = stack.next;

            if(i < heightMinus1)
            {
                yp += width;
            }
        }

        yi = x;
        stackIn = stackStart;
        stackOut = stackEnd;
        for (y=0; y<height; y++)
        {
            p = yi << 2;
            pixels[p]   = (r_sum * mul_sum) >> shg_sum;
            pixels[p+1] = (g_sum * mul_sum) >> shg_sum;
            pixels[p+2] = (b_sum * mul_sum) >> shg_sum;

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;

            r_out_sum -= stackIn.r;
            g_out_sum -= stackIn.g;
            b_out_sum -= stackIn.b;

            p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

            r_sum += (r_in_sum += (stackIn.r = pixels[p]));
            g_sum += (g_in_sum += (stackIn.g = pixels[p+1]));
            b_sum += (b_in_sum += (stackIn.b = pixels[p+2]));

            stackIn = stackIn.next;

            r_out_sum += (pr = stackOut.r);
            g_out_sum += (pg = stackOut.g);
            b_out_sum += (pb = stackOut.b);

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;

            stackOut = stackOut.next;

            yi += width;
        }
    }

    return imageData;
};

/**
 * @class
 * @augments DisplayObject
 * @description Класс спрайта
 * @param {Image} [img] ссылка на элемент Image, содержащий картинку для спрайта
 * @param {Number} [w] ширина спрайта
 * @param {Number} [h] высота спрайта
 * @param {Number} [f] количество кадров в спрайте
 * @param {Number} [l] количество слоев в спрайте
 * @example Для использования в качестве спрайта картинка должна быть подготовлена определенным образом.
 * В ней сверху вниз должны содержаться кадры анимации. Например:<br><img src="../../examples/explosion.png" />
 * Также слева направо могут располагаться дополнительные слои анимации
 */
function Sprite(img, w, h, f, l)
{
	Utils.callSuperConstructor(Sprite, this);
    
    /**
     * Смещение изображения спрайта относительно верхнего левого угла (x, y)
     * @type Object
     */
    this.offset = {left: 0, top: 0};
    
    this.width = w;
    this.height = h;

    this.totalFrames = Math.max(1, ~~f);
    if(this.totalFrames <= 1) this.animated = false;

    this.totalLayers = Math.max(1, ~~l);

    this.bitmap = img;

    this.changeFrameDelay = Sprite.CHANGE_FRAME_DELAY;
    
    this.cacheBitmap = Sprite.CACHE_BITMAPS;
}

Utils.extend(Sprite, DisplayObject);

/**
 * Флаг, указывающий на то, анимируется ли спрайт
 * @type Boolean
 */
Sprite.prototype.animated = true;

/**
 * Направление изменения кадров при анимации (1 или -1)
 * @type {Number}
 */
Sprite.prototype.animDirection = 1;

/**
 * Текущий кадр анимации
 * @type Number
 */
Sprite.prototype.currentFrame = 0;

/**
 * Количество кадров анимации (вертикально)
 * @type Number
 */
Sprite.prototype.totalFrames = 1;

/**
 * Текущий слой анимации
 * @type Number
 */
Sprite.prototype.currentLayer = 0;

/**
 * Количество слоёв (горизонтально)
 * @type Number
 */
Sprite.prototype.totalLayers = 1;

/**
 * Ссылка на изображение для спрайта
 * @type Image
 */
Sprite.prototype.bitmap = null;

/**
 * Ссылка на маску изображения спрайта
 * @type Image
 */
Sprite.prototype.mask = null;

/** @ignore */
Sprite.prototype.isMask = false;

/**
 * Нужно ли инвертировать маску (при true отображаться будет та часть спрайта, которая не попадает в маску)
 * @type Boolean
 */
Sprite.prototype.maskInvert = false;

/** @ignore */
Sprite.prototype.animStep = 0;

/**
 * Задержка анимации: при значении 1 кадр будет меняться при каждой следующей итерации, при 2 - каждую 2-ю итерацию и т.д..
 * @type Number
 */
Sprite.prototype.animDelay = 1;

/**
 * Задержка в милисекундах между переключением кадров. Используется только при значении Sprite.CHANGE_FRAME_TYPE = Sprite.CHANGE_FRAME_BY_TIME
 */
Sprite.prototype.changeFrameDelay = 1000/24;

/** @ignore */
Sprite.prototype.changeFrameTime = 0;

/**
 * @event Event
 * @description Callback функция, вызываемая каждый раз, когда спрайт пытается сменить свой кадр. 
 */
Sprite.prototype.onchangeframe = null;

/**
 * @event Event
 * @description Callback функция, вызываемая каждый раз, когда достигнут последний кадр при анимации. 
 */
Sprite.prototype.onanimend = null;

/** @ignore */
Sprite.prototype.cacheBitmap = false;

/** @ignore */
Sprite.prototype.transformFilter = null;

Sprite.create = function(asset, library)
{
	if (typeof asset == 'string')
	{
		library = library || window['library'];
		if (!library) throw new Error("Could not create sprite from asset '%s'. Library not found.", asset);
		asset = library.getAsset(asset);
	}
	return new Sprite(asset.bitmap, asset.width||1, asset.height||1, asset.frames||1, asset.layers||1);
};

/**
 * Запуск анимации
 * @param {Boolean} [rewind] Нужно ли проигрывать анимацию в обратном порядке
 */
Sprite.prototype.play = function(rewind)
{
	this.animated = true;
    if(typeof rewind != "undefined") this.animDirection = rewind ? - 1 : 1;
};
/**
 * Остановка анимации
 */
Sprite.prototype.stop = function()
{
	this.animated = false;
};

/**
 * Переход на указанный кадр и остановка анимации
 * @param {Number} frame номер кадра
 */
Sprite.prototype.gotoAndStop = function(frame)
{
	this.currentFrame = frame;
	this.stop();
};

/**
 * Переход на указанный кадр и запуск анимации
 * @param {Number} frame номер кадра
 * @param {Boolean} [rewind=false] Нужно ли проигрывать анимацию в обратном порядке
 */
Sprite.prototype.gotoAndPlay = function(frame, rewind)
{
	this.currentFrame = frame;
	this.play(rewind);
};

/** @ignore */
Sprite.prototype.nextFrame = function(delta)
{
    if(this.hasEventListener("enterframe")) this.dispatchEvent("enterframe", {target: this, delta: delta});
    
    var changeFramesCount = 1;
    
    if(Sprite.CHANGE_FRAME_TYPE == Sprite.CHANGE_FRAME_BY_TIME)
    {
        this.changeFrameTime += delta;
        
        if(this.changeFrameTime >= this.changeFrameDelay * this.animDelay)
        {
            changeFramesCount = Math.floor(this.changeFrameTime / (this.changeFrameDelay * this.animDelay));
            this.changeFrameTime -= Math.abs(changeFramesCount) * this.changeFrameDelay * this.animDelay;
        }
        else return;
    }
    else this.animStep++;
	
	if(this.animStep >= this.animDelay || Sprite.CHANGE_FRAME_TYPE == Sprite.CHANGE_FRAME_BY_TIME)
	{
	    for(var i=0; i<changeFramesCount; i++)
	    {
	        if(this.animated) this.currentFrame += this.animDirection;
	        
	        if(this.animDirection > 0 && this.currentFrame >= this.totalFrames)
			{
				this.currentFrame = 0;
				if(this.hasEventListener("animend")) this.dispatchEvent("animend", {target: this, delta: delta});
			}
            if(this.animDirection < 0 && this.currentFrame < 0)
			{
				this.currentFrame = this.totalFrames - 1;
				if(this.hasEventListener("animend")) this.dispatchEvent("animend", {target: this, delta: delta});
			}

            if(this.hasEventListener("changeframe")) this.dispatchEvent("changeframe", {target: this, delta: delta});
	    }

		this.animStep = 0;
	}
};

/**
 * Устанавливает маску для спрайта. Для корректной работы метод должен вызываться после добавления спрайта в контейнер.
 * @param {Object} mask ссылка на маску
 */
Sprite.prototype.setMask = function(mask)
{
	this.mask = mask;
	this.mask.isMask = true;
	this.mask.stage = this.stage;
};

/** @ignore */
Sprite.prototype.renderBack = function(cns, fill, w, h)
{
    if(fill)
    {
        var offsetX = 0, offsetY = 0;
        if(this.fillPattern && this.fillPattern.offset)
        {
            offsetX = this.fillPattern.offset.x * Utils.globalScale;
            offsetY = this.fillPattern.offset.y * Utils.globalScale;
        }

        var ctx = cns.getContext('2d');

        ctx.save();
        ctx.translate(-(w / 2) + offsetX, -(h / 2) + offsetY);

        ctx.fillStyle = fill;
        ctx.strokeStyle = fill;
        ctx.fillRect(-offsetX, -offsetY, w, h);

        ctx.restore();
    }
};

/** @ignore */
Sprite.prototype.renderBitmap = function(cns, w, h, getRect)
{
	if(this.bitmap)
	{
		// bitmap size
		var iw = this.bitmap.width, ih = this.bitmap.height;
		// frame top-left corner
		var fx = this.currentLayer * w + this.offset.left * Utils.globalScale, fy = this.currentFrame * h + this.offset.top * Utils.globalScale;
		if (fx < 0) fx = 0;
		if (fy < 0) fy = 0;

		// frame in bitmap bounds?
		if(fx < iw && fy < ih)
		{
			var	fw = w, fh = h;
			
			// check bitmap bounds
			if(fx + fw > iw) fw = iw - fx;
			if(fy + fh > ih) fh = ih - fy;
			
			if(Sprite.FLOOR_VALUES_ON_RENDER)
			{
			    fx = ~~fx; fy = ~~fy; fw = ~~fw; fh = ~~fh;
			    w = ~~w; h = ~~h;
			}
            
            if(fw > 0 && fh > 0 && w > 0 && h > 0)
			{
			    if(this.transformFilter) this.transformFilter.filter(cns, this.cacheBitmap ? BitmapsCache.cache(this.bitmap) : this.bitmap, fx, fy, fw, fh, -w/2, -h/2, w, h);
                else cns.getContext('2d').drawImage(this.cacheBitmap ? BitmapsCache.cache(this.bitmap) : this.bitmap, fx, fy, fw, fh, -w/2, -h/2, w, h);
            }
			
			if(getRect) return {x: fx, y: fy, width: fw, height: fh};
		}
	}

	if(getRect) return {x: 0, y: 0, width: w, height: h};
};

/** @ignore */
Sprite.prototype.render = function(cns, drawStatic, delta, drawMask)
{
    if(this.isMask && !drawMask) return;

    if(!delta) delta = 0;
    var isRender = !!this.static == !!drawStatic;

    if(isRender) this.nextFrame(delta);
    if(!this.stage) return;
    if(this.destroy) return;

    this.prepareCanvas(cns);

    if(isRender)
    {
        if(this.visible && this.opacity != 0)
        {
            if(!this.hasEventListener("prerender") || this.dispatchEvent("prerender", {target: this, canvas: cns, delta: delta}) !== false)
            {
                this.moveCanvasAnchor(cns);

                var	ow = this.width * Utils.globalScale,
                    oh = this.height * Utils.globalScale,
                    fill = this.getFillStyle(cns);

                this.prepareCanvasShadow(cns);

                if(this.stage.ceilSizes)
                {
                    ow = Math.ceil(ow);
                    oh = Math.ceil(oh);
                }

                if(this.mask)
                {
                    this.stage.buffer.width = this.stage.buffer.width;

                    var ctx = this.stage.buffer.getContext('2d');

                    ctx.save();
                    ctx.translate(ow/2, oh/2);

                    this.renderBack(this.stage.buffer, fill, ow, oh);
                    var rect = this.renderBitmap(this.stage.buffer, ow, oh, true);

                    ctx.globalCompositeOperation = this.maskInvert ? "destination-out" : "destination-in";

                    if(this.mask.render) this.mask.render(this.stage.buffer, drawStatic, delta, true);
                    else ctx.drawImage(this.mask, this.mask.x ? this.mask.x : 0, this.mask.y ? this.mask.y : 0);

                    if(Sprite.FLOOR_VALUES_ON_RENDER) cns.getContext('2d').drawImage(this.stage.buffer, 0, 0, rect.width, rect.height, -Math.floor(ow/2), -Math.floor(oh/2), ~~ow, ~~oh);
                    else cns.getContext('2d').drawImage(this.stage.buffer, 0, 0, rect.width, rect.height, -ow/2, -oh/2, ow, oh);

                    ctx.restore();
                }
                else
                {
                    this.renderBack(cns, fill, ow, oh);
                    this.renderBitmap(cns, ow, oh);
                }

                if(this.stage.allowDebugDrawing && this.allowDebugDrawing)
                {
                    if(this.stage.allowStaticDebugDrawing || !this.static)
                    {
                        this.debugDraw();
                    }
                }

                if(this.hasEventListener("render")) this.dispatchEvent("render", {target: this, canvas: cns, delta: delta});

                this.restoreCanvasShadow(cns);
                this.moveCanvasAnchor(cns, true);
            }
        }
    }

    Utils.callSuperMethod(Sprite, this, "render", cns, drawStatic, delta);

    this.restoreCanvas(cns);
};

/** Очистка битмапа, заливки спрайта и всех дочерних объектов */
Sprite.prototype.resetView = function()
{
    this.bitmap = null;
    this.fillColor = null;
    this.fillLinearGradient = null;
    this.fillRadialGradient = null;
    this.fillPattern = null;

    for(var i=0; i<this.objects.length; i++)
    {
        if(this.objects[i].resetView) this.objects[i].resetView();
    }
};

/**
 * @description Установка фильтра трансформации битмапа
 * @param {TransformFilter} filter
 */
Sprite.prototype.setTransformFilter = function(filter)
{
    filter.sprite = this;
    this.transformFilter = filter;
};

/**
 * @description Очистка фильтра трансформации битмапа
 */
Sprite.prototype.removeTransformFilter = function()
{
    this.transformFilter = null;
};

/** Изменение кадра спрайтов каждую итерацию отрисовки */
Sprite.CHANGE_FRAME_BY_FRAME = 0;
/** Изменение кадра спрайтов после истечения таймаута */
Sprite.CHANGE_FRAME_BY_TIME = 1;

/** Дефолтный таймаут на изменение кадра спрайтов */
Sprite.CHANGE_FRAME_DELAY = 1000/24;

/** Способ изменения кадров анимации спрайтов */
Sprite.CHANGE_FRAME_TYPE = Sprite.CHANGE_FRAME_BY_FRAME;

Sprite.FLOOR_VALUES_ON_RENDER = true;
Sprite.CACHE_BITMAPS = false;

/**
 * @class
 * @description Трансформационный фильтр для битмапа спрайта
 * @param filter callback на функцию-обраотчик фильтра
 * @constructor
 */
function TransformFilter(filter)
{
    if(typeof filter != "function")
    {
        throw new Error("Invalid filter");
    }

    this.filter = filter;
    this.sprite = null;
}

/**
 * @description Создание твина для изменения свойства val фильтра до указанного значения
 * @param val
 * @param duration
 * @param [ease=null]
 * @param [onfinish=null]
 * @param [onchange=null]
 */
TransformFilter.prototype.animateTo = function(val, duration, ease, onfinish, onchange)
{
    if(!this.sprite || !this.sprite.stage) return;

    duration = ~~duration;
    var t = null;
    if(duration <= 0)
    {
        this.val = val;
    }
    else if (this.val != val)
    {
        t = this.sprite.stage.createTween(this, 'val', this.val, val, duration, ease);
        if(t)
        {
            t.onfinish = onfinish;
            t.onchange = onchange;
            t.play();
        }
    }
    if (!t && onfinish) onfinish({target: new Tween(this, 'val', val, val, duration, ease)});
    return this;
};

/**
 * @description Создание твина для изменения свойства val фильтра на указанное значение
 * @param val
 * @param duration
 * @param [ease=null]
 * @param [onfinish=null]
 * @param [onchange=null]
 */
TransformFilter.prototype.animateBy = function(val, duration, ease, onfinish, onchange)
{
    if(!this.sprite || !this.sprite.stage) return;

    duration = ~~duration;
    var t = null;
    if(duration <= 0)
    {
        this.val += val;
    }
    else if (val != 0)
    {
        t = this.sprite.stage.createTween(this, 'val', this.val, this.val + val, duration, ease);
        if(t)
        {
            t.onfinish = onfinish;
            t.onchange = onchange;
            t.play();
        }
    }
    if (!t && onfinish) onfinish({target: new Tween(this, 'val', this.val, this.val, duration, ease)});
    return this;
};

////////////////////////////////////////////////////
/**
 * @description Фильтр дрожания изображения по оси X
 * @param [val=1] Смещение
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.noizeX = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.noizeX, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.noizeX, TransformFilter);

/** @ignore */
TransformFilter.noizeX.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var step = 0, scale = (toH / fromH);
    for(var i=0; i<fromH; i+=this.step)
    {
        var dx = this.val * (step%2 == 0 ? 1 : -1) * Utils.globalScale;
        var h = Math.min(this.step, fromH - (fromY + i));

        cns.getContext('2d').drawImage(bitmap,
            fromX,
            fromY + i,
            fromW,
            h,
            toX + dx,
            toY + i * scale,
            toW,
            h * scale);

        step++;
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр дрожания изображения по оси Y
 * @param [val=1] Смещение
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.noizeY = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.noizeY, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.noizeY, TransformFilter);

/** @ignore */
TransformFilter.noizeY.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var step = 0, scale = (toW / fromW);
    for(var i=0; i<fromW; i+=this.step)
    {
        var dy = this.val * (step%2 == 0 ? 1 : -1) * Utils.globalScale;
        var w = Math.min(this.step, fromW - (fromX + i));

        cns.getContext('2d').drawImage(bitmap,
            fromX + i,
            fromY,
            w,
            fromH,
            toX + i * scale,
            toY + dy,
            w * scale,
            toH);

        step++;
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр волны по оси X
 * @param [val=1] Текущее значение
 * @param [strength=1] Амплитуда
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.waveX = function(val, strength, step)
{
    Utils.callSuperConstructor(TransformFilter.waveX, this, this.apply);
    this.val = val || 1;
    this.strength = strength || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.waveX, TransformFilter);

/** @ignore */
TransformFilter.waveX.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var step = 0, scale = (toH / fromH);
    for(var i=0; i<fromH; i+=this.step)
    {
        var dx = Math.sin(this.val + i / this.strength) * Utils.globalScale;
        var h = Math.min(this.step, fromH - (fromY + i));

        cns.getContext('2d').drawImage(bitmap,
            fromX,
            fromY + i,
            fromW,
            h,
            toX + dx,
            toY + i * scale,
            toW,
            h * scale);

        step++;
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр волны по оси Y
 * @param [val=1] Текущее значение
 * @param [strength=1] Амплитуда
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.waveY = function(val, strength, step)
{
    Utils.callSuperConstructor(TransformFilter.waveY, this, this.apply);
    this.val = val || 1;
    this.strength = strength || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.waveY, TransformFilter);

/** @ignore */
TransformFilter.waveY.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var step = 0, scale = (toW / fromW);
    for(var i=0; i<fromW; i+=this.step)
    {
        var dy = Math.sin(this.val + i / this.strength) * Utils.globalScale;
        var w = Math.min(this.step, fromW - (fromX + i));

        cns.getContext('2d').drawImage(bitmap,
            fromX + i,
            fromY,
            w,
            fromH,
            toX + i * scale,
            toY + dy,
            w * scale,
            toH);

        step++;
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр масшабирования верхней грани
 * @param [val=1] Значение масштаба
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.scaleTop = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.scaleTop, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.scaleTop, TransformFilter);

/** @ignore */
TransformFilter.scaleTop.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toH / fromH), stepD = (1 - this.val) / fromH;
    for(var i=0; i<fromH; i+=this.step)
    {
        var h = Math.min(this.step, fromH - (fromY + i));
        var dw = toW * (this.val + stepD * (i + h));

        cns.getContext('2d').drawImage(bitmap,
            fromX,
            fromY + i,
            fromW,
            h,
            toX + (toW - dw)/2,
            toY + i * scale,
            dw,
            h * scale);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр масшабирования нижней грани
 * @param [val=1] Значение масштаба
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.scaleBottom = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.scaleBottom, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.scaleBottom, TransformFilter);

/** @ignore */
TransformFilter.scaleBottom.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toH / fromH), stepD = (this.val - 1) / fromH;
    for(var i=0; i<fromH; i+=this.step)
    {
        var h = Math.min(this.step, fromH - (fromY + i));
        var dw = toW * (1 + stepD * (i + h));

        cns.getContext('2d').drawImage(bitmap,
            fromX,
            fromY + i,
            fromW,
            h,
            toX + (toW - dw)/2,
            toY + i * scale,
            dw,
            h * scale);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр масшабирования левой грани
 * @param [val=1] Значение масштаба
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.scaleLeft = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.scaleLeft, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.scaleLeft, TransformFilter);

/** @ignore */
TransformFilter.scaleLeft.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toW / fromW), stepD = (1 - this.val) / fromW;
    for(var i=0; i<fromW; i+=this.step)
    {
        var w = Math.min(this.step, fromW - (fromX + i));
        var dh = toH * (this.val + stepD * (i + w));

        cns.getContext('2d').drawImage(bitmap,
            fromX + i,
            fromY,
            w,
            fromH,
            toX + i * scale,
            toY + (toH - dh)/2,
            w * scale,
            dh);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр масшабирования правой грани
 * @param [val=1] Значение масштаба
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.scaleRight = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.scaleRight, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.scaleRight, TransformFilter);

/** @ignore */
TransformFilter.scaleRight.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toW / fromW), stepD = (this.val - 1) / fromW;
    for(var i=0; i<fromW; i+=this.step)
    {
        var w = Math.min(this.step, fromW - (fromX + i));
        var dh = toH * (1 + stepD * (i + w));

        cns.getContext('2d').drawImage(bitmap,
            fromX + i,
            fromY,
            w,
            fromH,
            toX + i * scale,
            toY + (toH - dh)/2,
            w * scale,
            dh);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр полупрозрачного следа
 * @param [val=0] Угол
 * @param [count=3] Количество копий
 * @param [distance=20] Расстояние
 * @param [startOpacity=0.5] Стартовое значение полупрозрачности
 * @param [endOpacity=0.1] Конечное значение полупрозрачности
 * @param [startScale=1] Стартовое значение масштаба
 * @param [endScale=1] Конечное значение масштаба
  */
TransformFilter.trail = function(val, count, distance, startOpacity, endOpacity, startScale, endScale)
{
    Utils.callSuperConstructor(TransformFilter.trail, this, this.apply);
    this.val = val || 0;
    this.count = count || 3;
    this.distance = distance || 20;
    this.startOpacity = (typeof startOpacity == "undefined") ? 0.5 : startOpacity;
    this.endOpacity = (typeof endOpacity == "undefined") ? 0.1 : endOpacity;
    this.startScale = (typeof startScale == "undefined") ? 1 : startScale;
    this.endScale = (typeof endScale == "undefined") ? 1 : endScale;
};
Utils.extend(TransformFilter.trail, TransformFilter);

/** @ignore */
TransformFilter.trail.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var ctx = cns.getContext('2d');

    ctx.save();

    var step = (this.distance / this.count) * Utils.globalScale;
    var currentOpacity = ctx.globalAlpha;
    var startOpacity = this.startOpacity * currentOpacity;
    var endOpacity = this.endOpacity * currentOpacity;
    var opacityStep = (startOpacity - endOpacity) / this.count;
    var scaleStep = 1 + (this.startScale - this.endScale) / this.count;
    ctx.scale(this.endScale, this.endScale);
    for(var i=this.count; i>0; i--)
    {
        var x = toX + toW/2 + Math.cos(this.val) * (i * step);
        var y = toY + toH/2 + Math.sin(this.val) * (i * step);
        var scale = this.startScale + scaleStep * i;
        ctx.globalAlpha = endOpacity + (startOpacity - i * opacityStep);
        ctx.scale(scaleStep, scaleStep);

        ctx.drawImage(bitmap,
            fromX,
            fromY,
            fromW,
            fromH,
            x - toW/2,
            y - toH/2,
            toW,
            toH);
    }

    ctx.restore();
    ctx.drawImage(bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH);
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр, применяющий при рендеринге globalCompositeOperation. См. http://www.w3schools.com/tags/canvas_globalcompositeoperation.asp
 * @param [val="source-over"] композит
 */
TransformFilter.composite = function(val)
{
    Utils.callSuperConstructor(TransformFilter.composite, this, this.apply);
    this.val = val || "source-over";
};
Utils.extend(TransformFilter.composite, TransformFilter);

/** @ignore */
TransformFilter.composite.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var ctx = cns.getContext('2d');
    var current = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = this.val;
    ctx.drawImage(bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH);
    ctx.globalCompositeOperation = current;
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр, добавляющий эффект линзы
 * @param [val=2] сила линзы
 * @param [x=0] x
 * @param [y=0] y
 * @param [radius=30] радиус
 * @param [opacity=1] полупрозрачность
 */
TransformFilter.lens = function(val, x, y, radius, opacity)
{
    Utils.callSuperConstructor(TransformFilter.lens, this, this.apply);
    this.val = val || 2;
    this.x = x || 0;
    this.y = y || 0;
    this.radius = radius || 30;
    this.opacity = opacity || 1;
};
Utils.extend(TransformFilter.lens, TransformFilter);

/** @ignore */
TransformFilter.lens.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var ctx = cns.getContext('2d');

    ctx.drawImage(bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH);

    ctx.save();

    ctx.beginPath();
    ctx.arc(this.x * Utils.globalScale, this.y * Utils.globalScale, this.radius * Utils.globalScale, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();

    ctx.globalAlpha = this.opacity;
    ctx.drawImage(bitmap, fromX, fromY, fromW, fromH,
                      toX - (this.x * this.val - this.x) * Utils.globalScale - (toW * this.val - toW)/2,
                      toY - (this.y * this.val - this.y) * Utils.globalScale - (toH * this.val - toH)/2,
                      toW * this.val,
                      toH * this.val);

    ctx.restore();
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр сдвига верхней грани
 * @param [val=10] Значение сдвига
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.moveTop = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.moveTop, this, this.apply);
    this.val = val || 10;
    this.step = step || 1;
};
Utils.extend(TransformFilter.moveTop, TransformFilter);

/** @ignore */
TransformFilter.moveTop.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toH / fromH), stepD = (this.val * Utils.globalScale) / (fromH / this.step);
    for(var i=0; i<fromH; i+=this.step)
    {
        var h = Math.min(this.step, fromH - (fromY + i));
        var dx = (fromH - i) * stepD;

        cns.getContext('2d').drawImage(bitmap,
            fromX,
            fromY + i,
            fromW,
            h,
            toX + dx,
            toY + i * scale,
            toW,
            h * scale);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр сдвига нижней грани
 * @param [val=10] Значение сдвига
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.moveBottom = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.moveBottom, this, this.apply);
    this.val = val || 10;
    this.step = step || 1;
};
Utils.extend(TransformFilter.moveBottom, TransformFilter);

/** @ignore */
TransformFilter.moveBottom.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toH / fromH), stepD = (this.val * Utils.globalScale) / (fromH / this.step);
    for(var i=0; i<fromH; i+=this.step)
    {
        var h = Math.min(this.step, fromH - (fromY + i));
        var dx = i * stepD;

        cns.getContext('2d').drawImage(bitmap,
            fromX,
            fromY + i,
            fromW,
            h,
            toX + dx,
            toY + i * scale,
            toW,
            h * scale);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр сдвига левой грани
 * @param [val=10] Значение сдвига
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.moveLeft = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.moveLeft, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.moveLeft, TransformFilter);

/** @ignore */
TransformFilter.moveLeft.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toW / fromW), stepD = (this.val * Utils.globalScale) / (fromW / this.step);
    for(var i=0; i<fromW; i+=this.step)
    {
        var w = Math.min(this.step, fromW - (fromX + i));
        var dy = (fromW - i) * stepD;

        cns.getContext('2d').drawImage(bitmap,
            fromX + i,
            fromY,
            w,
            fromH,
            toX + i * scale,
            toY + dy,
            w * scale,
            toH);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр сдвига правой грани
 * @param [val=10] Значение сдвига
 * @param [step=1] Шаг при рендеринге
 */
TransformFilter.moveRight = function(val, step)
{
    Utils.callSuperConstructor(TransformFilter.moveRight, this, this.apply);
    this.val = val || 1;
    this.step = step || 1;
};
Utils.extend(TransformFilter.moveRight, TransformFilter);

/** @ignore */
TransformFilter.moveRight.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    var scale = (toW / fromW), stepD = (this.val * Utils.globalScale) / (fromW / this.step);
    for(var i=0; i<fromW; i+=this.step)
    {
        var w = Math.min(this.step, fromW - (fromX + i));
        var dy = i * stepD;

        cns.getContext('2d').drawImage(bitmap,
            fromX + i,
            fromY,
            w,
            fromH,
            toX + i * scale,
            toY + dy,
            w * scale,
            toH);
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр "растворения" по y с пропуском строк
 * @param [val=1] Сколько пикселей пропускать
 * @param [step=2] Шаг
 * @param [revert=false] Сначала рисуем. потом пропускаем?
 */
TransformFilter.dissolutionY = function(val, step, revert)
{
    Utils.callSuperConstructor(TransformFilter.dissolutionY, this, this.apply);
    this.val = (typeof val == "undefined") ? 1 : val;
    this.step = (typeof step == "undefined") ? 2 : step;
    this.revert = revert || false;
};
Utils.extend(TransformFilter.dissolutionY, TransformFilter);

/** @ignore */
TransformFilter.dissolutionY.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    if(this.val >= this.step) return;
    if(this.val <= 0)
    {
        cns.getContext('2d').drawImage(bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH);
        return;
    }

    var scale = (toW / fromW), chain = -1;

    for(var i=0; i<fromH; i++)
    {
        chain++;
        if(chain > this.step * Utils.globalScale) chain = 0;

        if(this.revert == (chain > (this.step - this.val) * Utils.globalScale))
        {
            cns.getContext('2d').drawImage(bitmap,
                fromX,
                fromY + i,
                fromW,
                1,
                toX,
                toY + i * scale,
                toW,
                1 * scale);
        }
    }
};
////////////////////////////////////////////////////

////////////////////////////////////////////////////
/**
 * @description Фильтр "растворения" по x с пропуском строк
 * @param [val=1] Сколько пикселей пропускать
 * @param [step=2] Шаг
 * @param [revert=false] Сначала рисуем. потом пропускаем?
 */
TransformFilter.dissolutionX = function(val, step, revert)
{
    Utils.callSuperConstructor(TransformFilter.dissolutionX, this, this.apply);
    this.val = (typeof val == "undefined") ? 1 : val;
    this.step = (typeof step == "undefined") ? 2 : step;
    this.revert = revert || false;
};
Utils.extend(TransformFilter.dissolutionX, TransformFilter);

/** @ignore */
TransformFilter.dissolutionX.prototype.apply = function(cns, bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH)
{
    if(this.val >= this.step) return;
    if(this.val <= 0)
    {
        cns.getContext('2d').drawImage(bitmap, fromX, fromY, fromW, fromH, toX, toY, toW, toH);
        return;
    }

    var scale = (toH / fromH), chain = -1;

    for(var i=0; i<fromW; i++)
    {
        chain++;
        if(chain > this.step * Utils.globalScale) chain = 0;

        if(this.revert == (chain > (this.step - this.val) * Utils.globalScale))
        {
            cns.getContext('2d').drawImage(bitmap,
                fromX + i,
                fromY,
                1,
                fromH,
                toX + i * scale,
                toY,
                1 * scale,
                toH);
        }
    }
};
////////////////////////////////////////////////////

/** @ignore */
TransformFilter.filters = [
    "noizeX",
    "noizeY",
    "waveX",
    "waveY",
    "scaleTop",
    "scaleBottom",
    "scaleLeft",
    "scaleRight",
    "trail",
    "composite",
    "lens",
    "moveTop",
    "moveBottom",
    "moveLeft",
    "moveRight",
    "dissolutionX",
    "dissolutionY"
];

/**
 * @class
 * @augments EventsProxy
 * @description Класс таймера сцены
 * @param {Function} onend функция, которая будет вызвана по окончанию таймера
 * @param {Number} timeout таймаут в кадрах или милисекундах
 * @param {Boolean} repeat нужно ли повторять таймер по его завершению
 */
function StageTimer(onend, timeout, repeat)
{
	Utils.callSuperConstructor(StageTimer, this);
	
	this.repeat = repeat;
	this.initialTimeout = timeout;

	this.timeout = timeout;
	
	this.onend = onend;

	this.destroy = false;
	
	/** @ignore */
	this.newly = true;

	/**
	 * Флаг паузы таймера
	 * @type Boolean
	 */
	this.paused = false;
}

Utils.extend(StageTimer, EventsProxy);

/**
 * @event Event
 * @description Callback вызываемый при завершении таймера
 */
StageTimer.prototype.onend = null;

/**
 * @event Event
 * @description Callback вызываемый при тике таймера
 */
StageTimer.prototype.ontick = null;

/** @ignore */
StageTimer.prototype.update = function(delta)
{
	if(this.destroy) return true;
	if(this.paused) return false;

	if(StageTimer.TIMEOUT_TYPE == StageTimer.TIMEOUT_BY_FRAME) this.timeout--;
	else this.timeout -= delta;
	
	if(this.timeout <= 0)
	{
		if(typeof this.onend == "string") eval(this.onend);
		else
        {
            if(this.hasEventListener("end")) this.dispatchEvent("end", {target: this});
        }

		if(this.repeat)	this.rewind();
		else return true;
	}

    if(this.hasEventListener("tick")) this.dispatchEvent("tick", {target: this, delta: delta});

	return false;
};

/**
 * Откат таймера в начальное состояние
 */
StageTimer.prototype.rewind = function()
{
	this.timeout = this.initialTimeout;
};

/**
 * Возобновление таймера
 */
StageTimer.prototype.resume = function()
{
	this.paused = false;
};

/**
 * Пауза таймера
 */
StageTimer.prototype.pause = function()
{
	this.paused = true;
};

/** Таймаут в кадрах */
StageTimer.TIMEOUT_BY_FRAME = 0;
/** Таймаут в милисекундах */
StageTimer.TIMEOUT_BY_TIME = 1;

/** Тип таймаута таймеров */
StageTimer.TIMEOUT_TYPE = StageTimer.TIMEOUT_BY_FRAME;

/**
 * @class
 * @augments DisplayObjectContainer
 * @description Класс сцены
 * @param {String} canvas ID canvas-элемента или ссылка на DOM-элемент
 * @param {Number} w ширина сцены
 * @param {Number} h высота сцены
 */
function Stage(canvas, w, h)
{
	Utils.callSuperConstructor(Stage, this);
	
	/**
	 * ссылка на основной canvas
	 * @type Canvas
	 */
	this.canvas = null;
	if(canvas)
	{
		this.canvas = (typeof canvas == "string") ? document.getElementById(canvas) : canvas;
	}
	
	/**
	 * ссылка на фоновый canvas
	 * @type Canvas
	 */
	this.backgroundCanvas = null;
	
	/**
	 * флаг, вынуждающий сцену перерисовать фон
	 * @type Boolean
	 */
	this.needToRebuildBack = false;
	
	/**
	 * ширина сцены
	 * @type Number
	 */
	this.screenWidth = w;

	/**
	 * высота сцены
	 * @type Number
	 */
	this.screenHeight = h;

	/**
	 * позиция (x, y) камеры
	 * @type Object
	 */
	this.viewport = {x: 0, y: 0};

	/**
	 * буфер для отрисовки в фоне
	 * @type Canvas
	 */
	this.buffer = null;
	this.buffer = document.createElement('canvas');
	this.buffer.width = w * Utils.globalScale;
	this.buffer.height = h * Utils.globalScale;

	/** @ignore */
	this.transformBuffer = null;
	this.transformBuffer = document.createElement('canvas');
	this.transformBuffer.width = w * Utils.globalScale;
	this.transformBuffer.height = h * Utils.globalScale;

	/**
	 * задержка в милисекундах между итерациями отрисовки
	 * @type Number
	 */
	this.delay = 40;
	
	/**
	 * флаг, указывающий запущен ли процесс рендеринга сцены
	 * @type Boolean
	 */
	this.started = false;

	/**
	 * количество отрисованных кадров за секунду
	 * @type Number
	 */
	this.fps = 0;
	
	/** @ignore */
	this.lastFPS = 0;

	/**
	 * Флаг, указывающий на необходимость отображать в левом верхнем углу FPS
	 * @type Boolean
	 */
	this.showFPS = false;

	/**
	 * Флаг, указывающий на необходимость проверять событие Click не только по региону спрайта, по и по наличию в точке непрозрачного пикселя
	 * @type Boolean
	 */
	this.pixelClickEvent = false;
	
	/**
	 * Флаг, указывающий на необходимость проверять событие MouseUp не только по региону спрайта, по и по наличию в точке непрозрачного пикселя
	 * @type Boolean
	 */
	this.pixelMouseUpEvent = false;
	
	/**
	 * Флаг, указывающий на необходимость проверять событие MouseDown не только по региону спрайта, по и по наличию в точке непрозрачного пикселя
	 * @type Boolean
	 */
	this.pixelMouseDownEvent = false;
	
	/**
	 * Флаг, указывающий на необходимость проверять событие MouseMove не только по региону спрайта, по и по наличию в точке непрозрачного пикселя
	 * @type Boolean
	 */
	this.pixelMouseMoveEvent = false;
	
	/**
	 * Флаг, указывающий на необходимость округлять размеры спрайтов при рендеринге
	 * @type Boolean
	 */
	this.ceilSizes = false;
	
	/** @ignore */
	this.tmMain = null;
	
	/** @ignore */
	this.tmFPS = null;

	/**
	 * Флаг, указывающий на то, что сцена не будет очищаться перед отрисовкой каждого кадра
	 * @type Boolean
	 */
	this.clearLock = false;
	
	/**
	 * @description Если установлен - все спрайты с таким флагом будут рисовать отладочную информацию
	 * @type Boolean
	 */
	this.allowDebugDrawing = false;
	
	/**
	 * @description Если не установлен - все static спрайты не будут рисовать отладочную информацию
	 * @type Boolean
	 */
	this.allowStaticDebugDrawing = false;
	
	/** @ignore */
    this.drawBackAlways = Utils.mobileCheckBrokenAndroid() || (!Utils.detectMobileBrowser() && Utils.isChrome());
	
	/** Массив твинов сцены */
	this.tweens = [];
	
	/** Массив таймеров сцены */
	this.timers = [];
	
	/** @ignore */
	this.eventsListeners = [];
	
	/** @ignore */
	this.lastTick = 0;
	
	/** @ignore */
	this.inputController = null;
	
	/** @ignore */
	this.inputListeners = null;
	
	/**
	 * @event Event
	 * @description Callback функция, вызываемая каждый раз перед началом итерации отрисовки
	 */
	this.onpretick = null;
	
	/**
	 * @event Event
	 * @description Callback функция, вызываемая каждый раз перед отрисовкой, после тика таймеров и твинов
	 */
	this.onprerender = null;
	
	/**
	 * @event Event
	 * @description Callback функция, вызываемая каждый раз в конце итерации отрисовки
	 */
	this.onposttick = null;
	
	/**
	 * @event Event
	 * @description Callback функция, нажатии левой кнопки мыши на сцене.
	 * @description В качестве параметра передается объект с полями: target - ссылка на сцену, x, y - координаты курсора мыши.
	 */
	this.onmousedown = null;

	/**
	 * @event Event
	 * @description Callback функция, отпускании левой кнопки мыши на сцене.
	 * @description В качестве параметра передается объект с полями: target - ссылка на сцену, x, y - координаты курсора мыши.
	 */
	this.onmouseup = null;

	/**
	 * @event Event
	 * @description Callback функция, вызываемая при клике на сцене.
	 * @description В качестве параметра передается объект с полями: target - ссылка на сцену, x, y - координаты курсора мыши.
	 */
	this.onclick = null;

	/**
	 * @event Event
	 * @description Callback функция, вызываемая при правом клике на сцене.
	 * @description В качестве параметра передается объект с полями: target - ссылка на сцену, x, y - координаты курсора мыши.
	 */
	this.oncontextmenu = null;

	/**
	 * @event Event
	 * @description Callback функция, вызываемая при передвижении курсора мыши на сцене.
	 * @description В качестве параметра передается объект с полями: target - ссылка на сцену, x, y - координаты курсора мыши.
	 */
	this.onmousemove = null;
	
	if(this.canvas) this.addInputListeners(this.canvas);
	
	this.tick = Utils.proxy(this.tick, this);
	this.clearFPS = Utils.proxy(this.clearFPS, this);
	
	this.stage = this;
	
	/** @deprecated */
	this.drawScene = this.render;
}

Utils.extend(Stage, DisplayObjectContainer);

/**
 * Принудительная перерисовка фона
 */
Stage.prototype.refreshBackground = function()
{
	this.needToRebuildBack = true;
};

/**
 * Установка фонового канваса для сцены
 * @param {String} canvas id канваса или ссылка на DOM-элемент
 */
Stage.prototype.setBackgroundCanvas = function(canvas)
{
	if(canvas)
	{
		this.backgroundCanvas = (typeof canvas == "string") ? document.getElementById(canvas) : canvas;
	}
};

/**
 * Полная очистка сцены
 */
Stage.prototype.destroy = function()
{
	clearTimeout(this.tmMain);
	clearTimeout(this.tmFPS);
	this.stop();
	this.clear();
	this.clearScreen(this.canvas);
	if(this.backgroundCanvas) this.clearScreen(this.backgroundCanvas);
	this.removeInputListeners(this.stage);
};

/**
 * Очистка указанного канваса
 * @param {Canvas} canvas
 */
Stage.prototype.clearScreen = function(cns)
{
	if(!this.clearLock)
	{
		cns.getContext('2d').clearRect(0, 0, Math.floor(cns.width), Math.floor(cns.height));
	}
};

Stage.prototype.addChild = function(item)
{
	item.stage = this;
	return Utils.callSuperMethod(Stage, this, "addChild", item);
};

Stage.prototype.setZIndex = function(item, index)
{
	this.setChildZIndex(item, index);
};

/** @ignore */
Stage.prototype.finalizeMouseCoords = function(obj, m)
{
	if(!obj) return m;

	var eX = this.prepareMouseCoord(m.x);
	var eY = this.prepareMouseCoord(m.y);

	if(!obj.getIgnoreViewport())
	{
		eX += this.viewport.x;
		eY += this.viewport.y;
	}
	
	var p = obj.getAbsolutePosition();

	eX = eX - p.x;
	eY = eY - p.y;

	return {x: eX, y: eY};
};

/** @ignore */ 
Stage.prototype.prepareMouseCoord = function(val)
{
	return val / Utils.globalScale / Utils.globalPixelScale;
};

Stage.prototype.processMouseEvent = function(event, type, pixelCheck)
{
	var m = Utils.getMouseCoord(event, this.inputController);

	var stack = this.getObjectsStackByCoord(this.prepareMouseCoord(m.x), this.prepareMouseCoord(m.y), pixelCheck, false);
	
	var ret, f;

	for(var i = 0; i < stack.length; i++)
	{
		f = this.finalizeMouseCoords(stack[i], m);
		if(stack[i].hasEventListener(type)) ret = stack[i].dispatchEvent(type, {target: stack[i], x: f.x, y: f.y});
		if(ret === false) return;
	}
	
	if(this.hasEventListener(type)) this.dispatchEvent(type, {target: this, x: Math.floor(this.prepareMouseCoord(m.x)), y: Math.floor(this.prepareMouseCoord(m.y))});
};

/** @ignore */
Stage.prototype.checkClick = function(event)
{
	this.processMouseEvent(event, "click", this.pixelClickEvent);
};

/** @ignore */
Stage.prototype.checkContextMenu = function(event)
{
	this.processMouseEvent(event, "contextmenu", this.pixelClickEvent);
};

/** @ignore */
Stage.prototype.checkMouseMove = function(event)
{
	var m = Utils.getMouseCoord(event, this.inputController);
	
	this.doDrag(this.prepareMouseCoord(m.x), this.prepareMouseCoord(m.y));

	var stack = this.getObjectsStackByCoord(this.prepareMouseCoord(m.x), this.prepareMouseCoord(m.y), this.pixelMouseMoveEvent);
	
	var i, ret, f, overStack = [];

	if(stack.length > 0)
	{
		for(i = 0; i < stack.length; i++)
		{
			overStack.push(stack[i]);
			f = this.finalizeMouseCoords(stack[i], m);
			if(stack[i].hasEventListener("mousemove")) ret = stack[i].dispatchEvent("mousemove", {target: stack[i], x: f.x, y: f.y});
			if(ret === false) break;
		}
		
		if(ret !== false && this.hasEventListener("mousemove")) this.dispatchEvent("mousemove", {target: this, x: Math.floor(this.prepareMouseCoord(m.x)), y: Math.floor(this.prepareMouseCoord(m.y))});
		
		ret = true;
		
		for(i = 0; i < overStack.length; i++)
		{
			f = this.finalizeMouseCoords(overStack[i], m);
			if(!overStack[i].mouseOn && overStack[i].hasEventListener("mouseover")) ret = overStack[i].dispatchEvent("mouseover", {target: overStack[i], x: f.x, y: f.y});

			overStack[i].mouseOn = true;

			if(ret === false)
			{
				overStack = overStack.slice(0, i+1);
				break;
			}
		}
	}
	else
	{
		if(this.hasEventListener("mousemove")) this.dispatchEvent("mousemove", {target: this, x: Math.floor(this.prepareMouseCoord(m.x)), y: Math.floor(this.prepareMouseCoord(m.y))});
	}

	this.checkMouseOut(overStack, m);
};

/** @ignore */
Stage.prototype.checkMouseDown = function(event)
{
	this.processMouseEvent(event, "mousedown", this.pixelMouseDownEvent);
};

/** @ignore */
Stage.prototype.checkMouseUp = function(event)
{
	this.processMouseEvent(event, "mouseup", this.pixelMouseUpEvent);
};

/**
 * Очистка спрайтов, твинов, таймеров и т.д.
 */
Stage.prototype.clear = function()
{
	this.tweens = [];
	this.timers = [];
	this.eventsListeners = [];
	this.objectsCounter = 0;
	
	Utils.callSuperMethod(Stage, this, "clear");
};

/**
 * Определение центра сцены
 * @returns {Object} Объект {x: x, y: y}
 */
Stage.prototype.getCenter = function()
{
	return {x: this.screenWidth/2, y: this.screenHeight/2};
};

/** @ignore */
Stage.prototype.prepareCanvasToGraph = function(cns)
{
    var ctx = cns.getContext('2d');

	ctx.save();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
};

/**
 * Отрисовка прямоугольника на сцене
 * @param {Number} x x координата центра
 * @param {Number} y y координата центра
 * @param {Number} width ширина
 * @param {Number} height высота
 * @param {String} [color=#000] цвет
 * @param {Boolean} [fill=false] нужно ли заливать прямоугольник
 * @param {Number} [opacity=1] прозрачность
 * @param {Boolean} [ignoreViewport=false] игнорирование состояния камеры
 */
Stage.prototype.drawRectangle = function(x, y, width, height, color, fill, opacity, ignoreViewport)
{
	var cns = this.canvas;

	this.prepareCanvasToGraph(cns);

	var ctx = cns.getContext('2d');

	if( typeof opacity != 'undefined') ctx.globalAlpha = opacity;
	else ctx.globalAlpha = 1;
	
	if(!color) color = "#000";

	ctx.fillStyle = color;
	ctx.strokeStyle = color;

	if(!ignoreViewport)
	{
		x -= this.viewport.x;
		y -= this.viewport.y;
	}

	x = x * Utils.globalScale;
	y = y * Utils.globalScale;
	width = width * Utils.globalScale;
	height = height * Utils.globalScale;

	if(fill) ctx.fillRect(x - width / 2, y - height / 2, width, height);
	else ctx.strokeRect(x - width / 2, y - height / 2, width, height);

	ctx.restore();
};

/**
 * Отрисовка круга на сцене
 * @param {Number} x x координата центра
 * @param {Number} y y координата центра
 * @param {Number} radius радиус круга
 * @param {Number} [width=1] толщина линии
 * @param {String} [color=#000] цвет
 * @param {Number} [opacity=1] прозрачность
 * @param {Boolean} [ignoreViewport=false] игнорирование состояния камеры
 */
Stage.prototype.drawCircle = function(x, y, radius, width, color, opacity, ignoreViewport)
{
	this.drawArc(x, y, radius, 0, Math.PI * 2, false, width, color, opacity, ignoreViewport);
};

/**
 * Отрисовка дуги на сцене
 * @param {Number} x x координата
 * @param {Number} y y координата
 * @param {Number} radius радиус
 * @param {Number} startAngle начальный угол
 * @param {Number} endAngle конечный угол
 * @param {Boolean} [anticlockwise=false] флаг отрисовки против часовой стрелки
 * @param {Number} [width=1] толщина линии
 * @param {String} [color=#000] цвет
 * @param {Number} [opacity=1] прозрачность
 * @param {Boolean} [ignoreViewport=false] игнорирование состояния камеры
 */
Stage.prototype.drawArc = function(x, y, radius, startAngle, endAngle, anticlockwise, width, color, opacity, ignoreViewport)
{
	var cns = this.canvas;

    this.prepareCanvasToGraph(cns);

	var ctx = cns.getContext('2d');

	if( typeof color == "undefined") color = "#000";
	ctx.strokeStyle = color;

	if( typeof width == "undefined") width = 1;
	ctx.lineWidth = width * Utils.globalScale;

	if( typeof opacity == "undefined") opacity = 1;
	ctx.globalAlpha = opacity;

	if(!ignoreViewport)
	{
		x -= this.viewport.x;
		y -= this.viewport.y;
	}

	x = x * Utils.globalScale;
	y = y * Utils.globalScale;
	radius = radius * Utils.globalScale;

	ctx.beginPath();
	ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
	ctx.stroke();

    ctx.restore();
};

/**
 * Отрисовка полигона на сцене
 * @param {Array} points массив точек полигона. Должен содержать объекты вида {x: value, y: value}.
 * @param {Number} [width=1] толщина линии
 * @param {String} [color=#000] цвет
 * @param {Number} [opacity=1] прозрачность
 * @param {Boolean} [ignoreViewport=false] игнорирование состояния камеры
 */
Stage.prototype.drawPolygon = function(points, width, color, opacity, ignoreViewport)
{
	if(( typeof points != "object") || !( points instanceof Array) || points.length < 2) return;

	for(var i = 0; i < points.length - 1; i++)
	{
		this.drawLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, width, color, opacity, ignoreViewport);
	}
	
	this.drawLine(points[i].x, points[i].y, points[0].x, points[0].y, width, color, opacity, ignoreViewport);

};

/**
 * Отрисовка линии на сцене
 * @param {Number} x1 x координата начала
 * @param {Number} y1 y координата начала
 * @param {Number} x2 x координата конца
 * @param {Number} y2 y координата конца
 * @param {Number} [width=1] толщина
 * @param {String} [color=#000] цвет
 * @param {Number} [opacity=1] прозрачность
 * @param {Boolean} [ignoreViewport=false] игнорирование состояния камеры
 */
Stage.prototype.drawLine = function(x1, y1, x2, y2, width, color, opacity, ignoreViewport)
{
	var cns = this.canvas;

    this.prepareCanvasToGraph(cns);

	var ctx = cns.getContext('2d');

	if(color) ctx.strokeStyle = color;
	else ctx.strokeStyle = '#000';

	if(width) ctx.lineWidth = width * Utils.globalScale;
	else ctx.lineWidth = Utils.globalScale;

	if(opacity) ctx.globalAlpha = opacity;
	else ctx.globalAlpha = 1;

	if(!ignoreViewport)
	{
		x1 -= this.viewport.x;
		y1 -= this.viewport.y;
		x2 -= this.viewport.x;
		y2 -= this.viewport.y;
	}

	x1 = x1 * Utils.globalScale;
	y1 = y1 * Utils.globalScale;
	x2 = x2 * Utils.globalScale;
	y2 = y2 * Utils.globalScale;

	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();

    ctx.restore();
};

/**
 * Старт отрисовки
 */
Stage.prototype.start = function()
{
	if(this.started) return;

	this.started = true;
	this.clearFPS();
	this.tick();
};

/**
 * Принудительная отрисовка
 */
Stage.prototype.forceRender = function()
{
	if(this.started) this.tick();
};

/**
 * Остановка отрисовки
 */
Stage.prototype.stop = function()
{
	this.started = false;
};

/** @ignore */
Stage.prototype.clearFPS = function()
{
	this.lastFPS = this.fps;
	this.fps = 0;
	if(this.started) this.tmFPS = setTimeout(this.clearFPS, 1000);
};

/**
 * Установка стиля текста
 * @param {String} font шрифт
 * @param {Number} size размер
 * @param {String} style стиль
 * @param {String} color цвет
 * @param {String} borderColor цвет окантовки
 * @param {Canvas} canvas канвас, для которого будет применен стиль
 */
Stage.prototype.setTextStyle = function(font, size, style, color, borderColor, canvas)
{
	var cns = ( canvas ? canvas : this.canvas);
    var ctx = cns.getContext('2d');

	ctx.fillStyle = color;
	ctx.strokeStyle = borderColor;

	var s = "";
	if(style) s += style + " ";
	if(size) s += Math.floor(size * Utils.globalScale) + "px ";
	if(font) s += font;

	ctx.font = s;
};

/**
 * Отрисовка текста
 * @param {String} text текст
 * @param {Number} x x координата
 * @param {Number} y y координата
 * @param {Number} opacity прозрачность
 * @param {Boolean} ignoreViewport игнорирование состояния камеры
 * @param {Boolean} alignCenter выравнивание по центру
 * @param {Canvas} canvas канвас, на котором будет произведена отрисовка
 */
Stage.prototype.drawText = function(text, x, y, opacity, ignoreViewport, alignCenter, canvas)
{
	var cns = ( canvas ? canvas : this.canvas);
    var ctx = cns.getContext('2d');

	if( typeof opacity == "undefined") ctx.globalAlpha = 1;
	else ctx.globalAlpha = opacity;

	if(!ignoreViewport)
	{
		x -= this.viewport.x;
		y -= this.viewport.y;
	}

	x = x * Utils.globalScale;
	y = y * Utils.globalScale;

	if(alignCenter)	x = x - this.getTextWidth(text) / 2;

	ctx.fillText(text, x, y);
};

/**
 * Отрисовка контуров текста
 * @param {String} text текст
 * @param {Number} x x координата
 * @param {Number} y y координата
 * @param {Number} opacity прозрачность
 * @param {Boolean} ignoreViewport игнорирование состояния камеры
 * @param {Boolean} alignCenter выравнивание по центру
 * @param {Canvas} canvas канвас, на котором будет произведена отрисовка
 */
Stage.prototype.strokeText = function(text, x, y, opacity, ignoreViewport, alignCenter, canvas)
{
	var cns = ( canvas ? canvas : this.canvas);
    var ctx = cns.getContext('2d');

	if( typeof opacity == "undefined") ctx.globalAlpha = 1;
	else ctx.globalAlpha = opacity;

	if(!ignoreViewport)
	{
		x -= this.viewport.x;
		y -= this.viewport.y;
	}

	x = x * Utils.globalScale;
	y = y * Utils.globalScale;

	if(alignCenter) x = x - this.getTextWidth(text) / 2;

	ctx.strokeText(text, x, y);
};

/**
 * Определение ширины текста
 * @param {String} str текст
 * @param {Canvas} [canvas] какой канвас использовать
 */
Stage.prototype.getTextWidth = function(str, canvas)
{
	var cns = ( canvas ? canvas : this.canvas);
	return cns.getContext('2d').measureText(str).width;
};

/**
 * Отрисовка сцены. Применяется каждый кадр рендеринга. Кроме этого может вызываться напрямую. Например, для формирования изображения на подложке экрана.
 * @param {Canvas} cns ссылка на канвас
 * @param {Boolean} [drawStatic] флаг, указывающий на то, какой тип объектов нужно отрисовывать. false - динамичные, true - статичные.
 * @param {Boolean} [noClear] флаг, указывающий на то, что не нужно производить очистку
 * @param {Number} [delta] дельта времени
 */
Stage.prototype.render = function(cns, drawStatic, noClear, delta)
{
	if(!cns) return;
	if(!delta) delta = 0;

    var ctx = cns.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
	
	if(!noClear)
	{
		var fill = this.getFillStyle(cns);
		if(!fill)
		{
			if(!this.clearLock) this.clearScreen(cns);
		}
		else
		{
			ctx.fillStyle = fill;
			ctx.fillRect(0, 0, cns.width, cns.height);
		}
	}

    this.prepareCanvas(cns);
    this.moveCanvasAnchor(cns);
    this.prepareCanvasShadow(cns);

	Utils.callSuperMethod(Stage, this, "render", cns, drawStatic, delta);

    this.restoreCanvasShadow(cns);
    this.moveCanvasAnchor(cns, true);
    this.restoreCanvas(cns);
};

/**
 * Создаёт анимацию заданного свойства с указанными диапазоном и скоростью
 * @param {Object} obj Объект, содержащий анимируемое свойство
 * @param {String} prop Объект, содержащий анимируемое свойство
 * @param {Number} start Начальное значение
 * @param {Number} end Конечное значение
 * @param {Number} duration Длительность в фреймах
 * @param {Number} [ease] Функция анимации. См. <a href="Easing.html">Easing.type.func</a>
 */
Stage.prototype.createTween = function(obj, prop, start, end, duration, ease)
{
	var t = new Tween(obj, prop, start, end, duration, ease);
	this.tweens.push(t);
	return t;
};

/**
 * Удаляет анимацию из стека, остановив её где есть.
 * @param {*} t Объект класса Tween, или ID анимации в стеке
 */
Stage.prototype.removeTween = function(t)
{
	var id = null;
	if(isNaN(t))
	{
		for(var i = 0; i < this.tweens.length; i++)
		{
			if(this.tweens[i] === t)
			{
				id = i;
				break;
			}
		}
	}
	else id = t;
	
	if (!isNaN(id))
	{
		if (this.tweens[id])
		{
			this.tweens[id].pause();
		}
		this.tweens.splice(id, 1);
	}

	return id;
};

/**
 * Удаляет всю анимацию из стека, которая относится к указанному объекту.
 * @param {Object} obj Объект, содержащий анимируемые свойства
 */
Stage.prototype.clearObjectTweens = function(obj)
{
	for(var i = 0; i < this.tweens.length; i++)
	{
		if(this.tweens[i].obj === obj)
		{
			this.tweens[i].destroy = true;
		}
	}
};

/**
 * Очередной шаг анимации
 * @ignore
 */
Stage.prototype.updateTweens = function(delta)
{
	var t;
	
	for(var i = 0; i < this.tweens.length; i++)
	{
		t = this.tweens[i];
		if(t.destroy)
		{
			i = this.removeTween(i);
			i--;
		}
	}
			
	for(i = 0; i < this.tweens.length; i++)
	{
		t = this.tweens[i];
		if(!t.newly && t.tick(delta)) t.destroy = true;
		t.newly = false;
	}
};

/**
 * Установка таймаута
 * @param {Function} callback функция, которая будет вызвана по окончанию таймера
 * @param {Number} timeout таймаут
 * @returns {StageTimer} таймер
 */
Stage.prototype.setTimeout = function(callback, timeout)
{
	var t = new StageTimer(callback, timeout);
	this.timers.push(t);
	return t;
};

/**
 * Очистка таймера
 * @param {StageTimer} t таймер
 */
Stage.prototype.clearTimeout = function(t)
{
	if(t) t.destroy = true;
};

/**
 * Установка интервала
 * @param {Function} callback функция, которая будет вызваться каждый раз по окончанию таймера
 * @param {Number} timeout таймаут
 * @returns {StageTimer} таймер
 */
Stage.prototype.setInterval = function(callback, timeout)
{
	var t = new StageTimer(callback, timeout, true);
	this.timers.push(t);
	return t;
};

/**
 * Очистка интервала
 * @param {StageTimer} t интервал
 */
Stage.prototype.clearInterval = function(t)
{
	this.clearTimeout(t);
};

/** @ignore */
Stage.prototype.removeTimer = function(t)
{
    this.timers = Utils.removeFromArray(this.timers, t);
};

/** @ignore */
Stage.prototype.updateTimers = function(delta)
{
	var t;
	
	for(var i = 0; i < this.timers.length; i++)
    {
        t = this.timers[i];
        if(t.destroy)
        {
            this.removeTimer(t);
            i--;
        }
    }
	
	for(i = 0; i < this.timers.length; i++)
	{
		t = this.timers[i];
		if(!t.newly && t.update(delta)) t.destroy = true;
		t.newly = false;
	}
};

/** @ignore */
Stage.prototype.tick = function()
{
    if(Stage.TIMER_MODE == Stage.TIMER_MODE_FRAME) clearTimeout(this.tmMain);
    
    var d;
    
    if(Utils.isWindowHidden)
    {
        this.lastTick = 0;
        d = this.delay;
    }
    else
    {
    	var tmStart = new Date().getTime();
    	var delta = Math.min(Stage.MIN_DELTA, tmStart - this.lastTick);
    	
    	this.lastTick = tmStart;
    
    	if(this.hasEventListener("pretick")) this.dispatchEvent("pretick", {target: this, delta: delta});
    	if(!this.started)
    	{
    	    this.lastTick = 0;
    	    return;
        }
    	
    	this.updateTweens(delta);
        if(!this.started)
        {
            this.lastTick = 0;
            return;
        }
        
        this.updateTimers(delta);
        if(!this.started)
        {
            this.lastTick = 0;
            return;
        }

        if(this.hasEventListener("prerender")) this.dispatchEvent("prerender", {target: this, delta: delta});

		if(this.needToRebuildBack)
		{
			this.needToRebuildBack = false;
			if(this.backgroundCanvas) this.render(this.backgroundCanvas, true);
		}
    	
    	var noClear = false;
    	if(this.drawBackAlways)
    	{
    		this.render(this.canvas, true, false, delta);
    		noClear = true;
    	}

    	this.render(this.canvas, false, noClear, delta);
    
    	if(this.showFPS)
    	{
            var ctx = this.canvas.getContext('2d');
            ctx.save();
    		this.setTextStyle("sans-serif", 10, "bold", "#fff");
            ctx.shadowColor = "#000";
            ctx.shadowBlur = 4 * Utils.globalScale;
    		this.drawText("FPS: " + this.lastFPS, 2, 10, 1, true);
    		ctx.restore();
    	}

        if(this.hasEventListener("posttick")) this.dispatchEvent("posttick", {target: this, delta: delta});
    	
    	d = new Date().getTime() - tmStart;
    	d = this.delay - d;
    	if(d < 1) d = 1;
    	this.fps++;
	}
	
	if(this.started)
    {
        if(Stage.TIMER_MODE == Stage.TIMER_MODE_FRAME) this.tmMain = setTimeout(this.tick, d);
        else requestAnimationFrame(this.tick);
    }
	else this.lastTick = 0;
};

/**
 * Синхронизация спрайтов с объектами box2d.
 * Внимание! Для синхронизации спрайты должны быть включены в объекты box2d в виде свойства sprite.
 * @deprecated используется только в старых играх с использованием 1-й версии box2d
 */
Stage.prototype.box2dSync = function(world)
{
	var p;
	for(var b = world.m_bodyList; b; b = b.m_next)
	{
		if(b.sprite)
		{
			b.sprite.rotation = b.GetRotation();
			p = b.GetPosition();
			b.sprite.x = p.x;
			b.sprite.y = p.y;

            if(b.sprite.hasEventListener("box2dsync")) b.sprite.dispatchEvent("box2dsync", {target: b.sprite});
		}
	}
};

/** @ignore */
Stage.prototype.processTouchEvent = function(touches, controller)
{
	var len = touches.length;
    if(!Stage.MULTITOUCH_ENABLED && len > 1) len = 1;

	for(var i = 0; i < len; i++)
	{
		var e = {clientX: touches[i].clientX, clientY: touches[i].clientY};
		this[controller](e);
	}
};

/** @ignore */
Stage.prototype.prepareEventTouches = function(event, type)
{
    if(!event[type])
    {
        event[type] = [{clientX: event.clientX, clientY: event.clientY}];
    }
    
    return event[type];
};

/** @ignore */
Stage.prototype.restoreFocus = function()
{
	if(!this.inputController) return;
	if(window.focus) window.focus();
	if(document.body.focus) document.body.focus();
	if(this.inputController.focus) this.inputController.focus();
};

/** @ignore */
Stage.prototype.inputListeners = null;
Stage.prototype.addInputListeners = function(obj)
{
	obj = obj || this.inputController || this.canvas;

	this.removeInputListeners();

	this.inputController = obj;
	if (!this.inputController) return false;
	
	this.inputListeners = {};

	this.inputListeners[Utils.getTouchStartEvent()] = Utils.proxy(function(event)
	{
		if(!Utils.touchScreen) return;
		this.restoreFocus();
		this.processTouchEvent(this.prepareEventTouches(event, "changedTouches"), "checkMouseDown");
		this.processTouchEvent(this.prepareEventTouches(event, "changedTouches"), "checkClick");
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners[Utils.getTouchMoveEvent()] = Utils.proxy(function(event)
	{
        if(!Utils.touchScreen) return;
        this.processTouchEvent(this.prepareEventTouches(event, "changedTouches"), "checkMouseMove");
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners[Utils.getTouchEndEvent()] = Utils.proxy(function(event)
	{
        if(!Utils.touchScreen) return;
        this.processTouchEvent(this.prepareEventTouches(event, "changedTouches"), "checkMouseUp");
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners["click"] = Utils.proxy(function(event)
	{
        if(Utils.touchScreen) return;
        this.restoreFocus();
		this.checkClick(event);
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners["mousemove"] = Utils.proxy(function(event)
	{
        if(Utils.touchScreen) return;
        this.checkMouseMove(event);
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners["mousedown"] = Utils.proxy(function(event)
	{
        if(Utils.touchScreen) return;
        this.restoreFocus();
		if(event.button == 0) this.checkMouseDown(event);
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners["mouseup"] = Utils.proxy(function(event)
	{
        if(Utils.touchScreen) return;
        if(event.button == 0) this.checkMouseUp(event);
		return Utils.preventEvent(event);
	}, this);

	this.inputListeners["contextmenu"] = Utils.proxy(function(event)
	{
        if(Utils.touchScreen) return;
        this.restoreFocus();
		this.checkContextMenu(event);
		return Utils.preventEvent(event);
	}, this);

	for (var prop in this.inputListeners)
	{
		Utils.bindEvent(this.inputController, prop, this.inputListeners[prop]);
	}
};

Stage.prototype.removeInputListeners = function()
{
	if (this.inputController && this.inputListeners)
	{
		for (var prop in this.inputListeners)
		{
			Utils.unbindEvent(this.inputController, prop, this.inputListeners[prop]);
		}
	}
	
	this.inputListeners = null;
};

Stage.MIN_DELTA = 1000/2;

Stage.TIMER_MODE_FRAME = 0;
Stage.TIMER_MODE_TIME = 1;

Stage.TIMER_MODE = Stage.TIMER_MODE_FRAME;

Stage.MULTITOUCH_ENABLED = true;

(function()
{
    var timeFunction = function(callback) { setTimeout(callback, 1000/60); };

    var requestAnimationFrame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        timeFunction;

    if(Utils.detectMobileBrowser())
    {
		var ok = false;
        if(Utils.isAndroid() && !Utils.isChrome() && !Utils.isFirefox()) ok = true;
        if(ok) requestAnimationFrame = timeFunction;
    }

    window.requestAnimationFrame = requestAnimationFrame;

})();

