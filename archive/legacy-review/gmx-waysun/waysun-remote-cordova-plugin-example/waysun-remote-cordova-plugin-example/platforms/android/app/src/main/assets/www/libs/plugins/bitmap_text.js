/**
 * @class
 * @description Класс для рендеринга текста с использованием bitmap fonts.
 * <a href="http://71squared.com/en/product/2295/bitmap-font-and-pixel-font">http://71squared.com/en/product/2295/bitmap-font-and-pixel-font</a>
 * 
 * @param {Object} font изображение (или массив изображений) со шрифтом
 * @param {Object} charMap объект с описанием шрифта
 * 
 * @example
 * Для подготовки шрифта рекомендуется использовать утилиту utils/fonts
 * С помощью флеш-части нужно подготовить и скачать zip со шрифтом
 * Затем распаковать в папку utils/fonts и используя кнопку Generate получить итоговый js-файл c charMap
 */
function BitmapText(font, charMap)
{
	this.font = Utils.isArray(font) ? font : [font];
	this.charMap = charMap;

	/** @ignore */
	this.sprites = [];

	/** @ignore */
	this.lines = [];
	
	/** сцена, на которой будет производится рендеринг */
	this.stage = window.stage;
	
	/** родительский объект, в который будут добавлены спрайты */
	this.parent = window.stage;
};

/** константа - выравнивание текста по левому краю */
BitmapText.ALIGN_LEFT = 0;
/** константа - выравнивание текста по правому краю */
BitmapText.ALIGN_RIGHT = 1;
/** константа - выравнивание текста по центру */
BitmapText.ALIGN_CENTER = 2;

/** константа - выравнивание по вертикали текста по нижнему краю */
BitmapText.VALIGN_TOP = 0;
/** константа - выравнивание по вертикали текста по центру */
BitmapText.VALIGN_MIDDLE = 1;
/** константа - выравнивание  по вертикали текста по низу */
BitmapText.VALIGN_BOTTOM = 2;

/** класс спрайт для рендеринга. По умолчанию Sprite */
BitmapText.spriteClass = Sprite;

/** символ-разделитель строк */
BitmapText.LINES_DELIMITER = "\n";

/** x-координата точки привязки */
BitmapText.prototype.x = 0;

/** y-координата точки привязки */
BitmapText.prototype.y = 0;

/** выравнивание относительно точки привязки */
BitmapText.prototype.align = BitmapText.ALIGN_LEFT;

/** вертикальное выравнивание */
BitmapText.prototype.valign = BitmapText.VALIGN_TOP;

/** угол поворота */
BitmapText.prototype.rotation = 0;

/** расстояние между символами */
BitmapText.prototype.charSpacing = 0;

/** расстояние между строками */
BitmapText.prototype.lineSpacing = 0;

/** статичная высота строки */
BitmapText.prototype.lineHeight = null;

/** максимальная ширина текста. Текст будет переноситься по словам при превышении этого значения. */
BitmapText.prototype.maxWidth = 0;

/** масштаб */
BitmapText.prototype.scale = 1;

/** полупрозрачность */
BitmapText.prototype.opacity = 1;

/** признак статичности */
BitmapText.prototype.static = false;

/** @ignore */
BitmapText.prototype.text = "";

/** ignoreViewport */
this.ignoreViewport = false;

/** zIndex */
this.zIndex = undefined;

/** @ignore */
BitmapText.prototype.manageSprites = function(text)
{
	if(!this.parent) return;
	
	var i, chr;
	var len = text.length;
	var sp_len = this.sprites.length;
	if(sp_len < len)
	{
		for(i=0; i<len-sp_len; i++)
		{
			chr = new BitmapText.spriteClass(null, 0, 0);
			this.sprites.push(chr);
			this.parent.addChild(chr);
		}
	}

	if(sp_len > len)
	{
		for(i=0; i<sp_len-len; i++) this.parent.removeChild(this.sprites[i]);
		this.sprites.splice(0, sp_len-len);
	}
};

/** @ignore */
BitmapText.prototype.getChar = function(chr)
{
    var id = chr.charCodeAt(0);
	
	for(var i=0; i<this.charMap.length; i++)
    {
        if(this.charMap[i].id == id) return this.charMap[i];
    }
    
    console.log("Char not found", chr, id, this.text);
	return {id: 0, x: 0, y: 0, width: 0, height: 0, xoffset: 0, yoffset: 0, page: 0, xadvance: 0};
};

/** возвращает ширину текста */
BitmapText.prototype.getWidth = function()
{
	var width = 0;
	for (var i = 0; i < this.lines.length; i++) {
		var w = 0, chr;
		for(var j=0; j<this.lines[i].length; j++)
		{
			chr = this.getChar(this.lines[i].substr(j, 1));
			w += chr.xadvance + this.charSpacing;
		}
		if (w > width) width = w;
	};

	return width;
};

/** возвращает ширину текста с учетом скейла */
BitmapText.prototype.getRealWidth = function()
{
	return this.getWidth() * this.scale;
};

/** @ignore */
BitmapText.prototype.getWidthOfLine = function(line)
{
	var w = 0, chr;
	for(var i=0; i<this.lines[line].length; i++)
	{
		chr = this.getChar(this.lines[line].substr(i, 1));
		w += chr.xadvance + this.charSpacing;
	}

	return w;
};

/** возвращает высоту текста */
BitmapText.prototype.getHeight = function()
{
	var h = 0;

	for (var i = 0; i < this.lines.length; i++) {
		h += this.getHeightOfLine(i) + this.lineSpacing;
	};
	return h;
};

/** возвращает высоту текста с учетом скейла */
BitmapText.prototype.getRealHeight = function()
{
	return this.getHeight() * this.scale;
};

/** @ignore */
BitmapText.prototype.getHeightOfLine = function(line)
{
	if(this.lineHeight) return this.lineHeight;
	
	var h = 0, chr;
	for(var i=0; i<this.lines[line].length; i++)
	{
		chr = this.getChar(this.lines[line].substr(i, 1));
		if(chr.height + chr.yoffset > h) h = chr.height + chr.yoffset;
	}

	return h;
};

/** устанавливает скейл с учетом заданой ширины контейнера и  */
BitmapText.prototype.setScaleToFitContainer = function(width, minScale, maxScale)
{
	var newScale = width / this.getWidth();

	if (minScale && newScale < minScale)
	{
		newScale = minScale;
	}
	else if (maxScale && newScale > maxScale)
	{
		newScale = maxScale;
	}

	this.scale = newScale;
};

/**
 * рендеринг текста
 * @param {String} text текст
 */
BitmapText.prototype.write = function(text)
{
	var chr, sprt, curX, curY, startY, p, p2, totalHeight, height;

	text = text + "";
	
	if(this.maxWidth > 0)
	{
	    var originalLines = text.split(BitmapText.LINES_DELIMITER);
	    
	    var lines = [], words, lineWords = [];
	    for(var n=0; n<originalLines.length; n++)
	    {
    	    words = originalLines[n].split(" ");
            lineWords = [words[0]];
            for(var i=1; i<words.length; i++)
            {
                this.lines = [lineWords.join(" ") + " " + words[i]];
                if(this.getWidthOfLine(0) > this.maxWidth)
                {
                    lines.push(lineWords.join(" "));
                    lineWords = [words[i]];
                }
                else lineWords.push(words[i]);
            }
            lines.push(lineWords.join(" "));
        }
        
        text = lines.join(BitmapText.LINES_DELIMITER);
	}
	
	this.text = text;
	this.lines = text.split(BitmapText.LINES_DELIMITER);
	
	this.manageSprites(text);

	curX = this.x;
	curY = this.y;
	startY = this.y;
	
	totalHeight = this.getHeight();
	
	if(this.valign == BitmapText.VALIGN_MIDDLE) startY = this.y - (totalHeight/2) * this.scale;
    if(this.valign == BitmapText.VALIGN_BOTTOM) startY = this.y - totalHeight * this.scale;
	
	var numOfSprite = 0, renderedHeight = 0;
	for (var i = 0; i < this.lines.length; i++)
	{
 	  	height = this.getHeightOfLine(i);
 	  	
 	  	if(this.align == BitmapText.ALIGN_CENTER) curX = this.x - (this.getWidthOfLine(i)/2) * this.scale;
		if(this.align == BitmapText.ALIGN_RIGHT) curX = this.x - this.getWidthOfLine(i) * this.scale;
		
		p = new Vector(curX - this.x, startY - this.y + renderedHeight);
		p.rotate(-this.rotation);
		
		curX = p.x + this.x;
		curY = p.y + this.y;
		
		renderedHeight += (height + this.lineSpacing) * this.scale;
		
		p = new Vector(0, 0);
		
		for(var j=0; j<this.lines[i].length; j++)
		{
			sprt = this.sprites[numOfSprite];
			numOfSprite++;
			
			sprt.visible = true;
			
			chr = this.getChar(this.lines[i].substr(j, 1));
			
			if(!chr) sprt.visible = false;
			else
			{
				sprt.bitmap = this.font[chr.page ? chr.page : 0];
				sprt.width = chr.width;
				sprt.height = chr.height;
				sprt.offset.left = chr.x;
				sprt.offset.top = chr.y;
				
				sprt.anchor.x = -chr.width/2;
				sprt.anchor.y = -chr.height/2;

				p2 = p.clone();
				p2.x += chr.xoffset * this.scale;
				p2.y += (chr.yoffset - height/2) * this.scale;
				p2.rotate(-this.rotation);
				
				sprt.x = p2.x + curX;
				sprt.y = p2.y + curY;
				
				sprt.scaleX = sprt.scaleY = this.scale;
				
				sprt.rotation = this.rotation;
				sprt.setStatic(this.static);

				sprt.ignoreViewport = this.ignoreViewport;
				
				sprt.opacity = this.opacity;
				
				sprt.gx = sprt.x;
				sprt.gy = sprt.y;
				sprt.gscaleX = sprt.scaleX;
				sprt.gscaleY = sprt.scaleY;
				sprt.grotation = sprt.rotation;
				sprt.gopacity = sprt.opacity;
				p.x += (chr.xadvance + this.charSpacing) * this.scale;

				if(typeof this.zIndex == "number" && sprt.zIndex != this.zIndex) sprt.setZIndex(this.zIndex);
			}
		}
	};
};

BitmapText.prototype.setStatic = function(val)
{
    val = !!val;
    if(this.static != val)
    {
        this.static = val;
        this.refresh();
    }
};

BitmapText.prototype.setZIndex = function(ix)
{
	this.zIndex = ix;
	
	for(var i=0; i<this.sprites.length; i++)
	{
		this.sprites[i].setZIndex(ix);
	}
};

/** @ignore */
BitmapText.prototype.addToGroup = function(group)
{
	for(var i=0; i<this.sprites.length; i++)
	{
		this.sprites[i].gx = this.sprites[i].x/2;
		this.sprites[i].gy = this.sprites[i].y;
		group.addChild(this.sprites[i], false);
	}
};

/**
 * добавление текста в группу. Можно использовать после успешного write
 * @param {SpritesGroup} group группа спрайтов
 */
BitmapText.prototype.putToGroup = function(group)
{
	for(var i=0; i<this.sprites.length; i++)
	{
		this.sprites[i].gx = this.sprites[i].x;
		this.sprites[i].gy = this.sprites[i].y;
		group.addChild(this.sprites[i], false);
	}
};

/**
 * рендеринг с предыдущим значением текста
 * ВНИМАНИЕ! при изменении любых свойств текста (кроме встроенных твинов), необходимо вызывать этот метод
 */
BitmapText.prototype.refresh = function()
{
	this.write(this.text);
};

/**
 * рендеринг с предыдущим значением текста в процессе выполнения твина
 */
BitmapText.prototype.refreshOnTween = function(e)
{
	e.target.obj.refresh();
};

/**
 * установка позиции точки привязки
 * @param {Number} x x-координата
 * @param {Number} y y-координата
 */
BitmapText.prototype.setPosition = function(x, y)
{
	this.x = x;
	this.y = y;
	this.refresh();
};

/** очистка твинов текста */
BitmapText.prototype.removeTweens = function()
{
	var stage = this.parent && this.parent.stage ? this.parent.stage : this.stage;
	if(!stage) return;

	stage.clearObjectTweens(this);
};

/**
 * Создаёт анимацию (сокращённый вызов <a href="Stage.html#createTween">stage.createTween</a>)
 * @return {Tween}
 */
BitmapText.prototype.addTween = function(prop, end, duration, ease, onfinish, onchange)
{
    var stage = this.parent && this.parent.stage ? this.parent.stage : this.stage;
	if(!stage)	return;

	var val = this[prop];
	if(isNaN(val)) return;

	var t = stage.createTween(this, prop, val, end, duration, ease);
	t.onchange = onchange;
	t.onfinish = onfinish;
	return t;
};

/**
 * Перемещение текста в указанную точку
 * @param {Number} x координата X
 * @param {Number} y координата Y
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.moveTo = function(x, y, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	if(duration <= 0)
	{
		this.setPosition(x, y);
	}
	else
	{
		var t1 = this.addTween('x', x, duration, ease, onfinish, onchange);
		if(t1)
		{
			t1.addEventListener("change", this.refreshOnTween);
			t1.addEventListener("finish", this.refreshOnTween);
			t1.play();
		}

		var t2 = this.addTween('y', y, duration, ease, ( t1 ? null : onfinish), ( t1 ? null : onchange));
		if(t2)
		{
			t2.addEventListener("change", this.refreshOnTween);
			t2.addEventListener("finish", this.refreshOnTween);
			t2.play();
		}
		
	}
	return this;
};

/**
 * Перемещение текста на указанное расстояние. Можно использовать в цепочке.
 * @param {Number} x координата X
 * @param {Number} y координата Y
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.moveBy = function(x, y, duration, ease, onfinish, onchange)
{
	return this.moveTo(this.x + x, this.y + y, duration, ease, onfinish, onchange);
};

/**
 * Изменение прозрачности текста до указанного значения
 * @param {Number} opacity Прозрачность (0-1)
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.fadeTo = function(opacity, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	if(duration <= 0)
	{
		this.opacity = opacity;
	}
	else
	{
		var t = this.addTween('opacity', opacity, duration, ease, onfinish, onchange);
		if(t)
		{
			t.play();
			t.addEventListener("change", this.refreshOnTween);
			t.addEventListener("finish", this.refreshOnTween);
		}
	}
	return this;
};

/**
 * Изменение прозрачности текста на указанное значение
 * @param {Number} opacity Прозрачность (0-1)
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.fadeBy = function(opacity, duration, ease, onfinish, onchange)
{
	var val = Math.max(0, Math.min(1, this.opacity + opacity));
	return this.fadeTo(val, duration, ease, onfinish, onchange);
};

/**
 * Поворот текста до указанного угла
 * @param {Number} rotation Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.rotateTo = function(rotation, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	if(duration <= 0)
	{
		this.rotation = rotation;
	}
	else
	{
		var t = this.addTween('rotation', rotation, duration, ease, onfinish, onchange);
		if(t)
		{
			t.play();
			t.addEventListener("change", this.refreshOnTween);
			t.addEventListener("finish", this.refreshOnTween);
		}
	}
	return this;
};

/**
 * Поворот текста на указанный угол
 * @param {Number} rotation Угол в радианах
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.rotateBy = function(rotation, duration, ease, onfinish, onchange)
{
	return this.rotateTo(this.rotation + rotation, duration, ease, onfinish, onchange);
};

/**
 * Пропорциональное изменение масштаба
 * @param {Number} scale Масштаб
 * @param {Number} duration Необязательная длительность в фреймах
 * @param {Function} ease функция анимации (см. <a href="Easing.html">Easing</a>)
 * @param {Function} onfinish callback завершения (см. <a href="Tween.html#onfinish">Tween</a>)
 * @param {Function} onchange callback шага анимации (см. <a href="Tween.html#onchange">Tween</a>)
 * @return {Sprite}
 */
BitmapText.prototype.scaleTo = function(scale, duration, ease, onfinish, onchange)
{
	duration = ~~duration;
	if(duration <= 0)
	{
		this.scale = scale;
	}
	else
	{
		var t = this.addTween('scale', scale, duration, ease, onfinish, onchange);
		if(t)
		{
			t.play();
			t.addEventListener("change", this.refreshOnTween);
			t.addEventListener("finish", this.refreshOnTween);
		}
	}
	return this;
};