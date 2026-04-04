/**
 * @class
 * @description Класс локализации
 */
var I18 =
{
	/** текущая локаль */
    currentLocale: "en",
    /** массив поддерживаемых локалей */
	supportedLanguage: ["en"],
    /** хеш ключ-значение */
    strings: {},

    /** папка с файлами локализаций */
    iniFolder: "language",
    /** префикс файлов локализаций */
    iniPrefix: "",
    /** расширение файлов локализаций */
    iniExt: "txt",
    /** разделитель ключ-значение в файле локализации */
    iniSeparator: ";",

    /** кастомный парсер файла локализации, если формат отличен от дефолтного ключ[разделитель]значение */
    parser: null,

    /**
     * @description Инициализация
     * @param {String} [locale=null] локаль. Если null, локаль будет пытаться определиться автоматически
     * @param {Function} [callback=null] callback при окончании инициализации
     */
    init: function(locale, callback)
	{
	    var lang = window.navigator.userLanguage || window.navigator.language || "";
		if (!locale) locale = (window.ExternalAPI && window.ExternalAPI.exec('getLanguage')) || lang.substr(0, 2);
	    if(I18.supportedLanguage.indexOf(locale) < 0) locale = I18.supportedLanguage[0];
	    
	    I18.currentLocale = locale;
	    
	    Utils.get(I18.iniFolder + "/" + I18.iniPrefix + locale + "." + I18.iniExt + "?v=" + (new Date().getTime()), null, null, function(data)
	    {
			I18.setup(I18.parse(data));
	        if(callback) callback();
        });
	},
	
	parse: function(data)
	{
		var strings = {};

		if(I18.parser)
		{
			strings = I18.parser(data);
		}
		else
		{
			var parts = data.split("\n"), keyval;

			for(var i=0; i<parts.length; i++)
			{
				keyval = parts[i].split(I18.iniSeparator);
				strings[I18.trim(keyval[0])] = I18.trim(keyval[1]);
			}
		}
		
		return strings;
	},
	
	/** @ignore */
    setup: function(data)
	{
		I18.strings = data;
	},

    /** @ignore */
    trim: function(s)
	{
	    if(!s) return "";
	    return s.replace(/^\s+|\s+$/gm,'');
	},

    /** @ignore */
    arrayAntidot: function(values)
    {
        if (!values) return;
        if (values.length > 0 && Utils.isArray(values[0])) return values[0];
        return values;
    },

    /** @ignore */
    getString: function(key, values)
	{
		if (typeof values == "undefined")
		{
			values = null;
		}

		var str = I18.getStringOrNull(key, values);
		if (str == null) return "{" + key + "}";
		
		return str;
	},

    /** @ignore */
    getStringOrNull: function(key, args)
	{
		if (typeof args == "undefined") args = null;

		var value = I18.strings[key];
		if (typeof value == "undefined") value = null;
		
		if(args == null || value == null) return value;
		else
		{
		    args = [value].concat(I18.arrayAntidot(args));
		    return I18.sprintf.apply(I18, args);
		}
	},

    /**
     * @description Получение значения по ключу и параметрам
     * @param {String} key ключ
     * @param ... произвольные параметры
     * @returns {String}
     */
    f: function(key)
	{
		var values = I18.arrayAntidot(Array.prototype.slice.call(arguments, 1));
		
		if (!Utils.isArray(values))
		{
			values = [values];
		}
		return I18.getString(key, values);
	},

    /**
     * @description Получение значения по префиксу и ключу
     * @param {String} prefix префикс
     * @param {String} key ключ
     * @param {Array} [values=null] массив значений
     * @returns {String}
     */
    s: function(prefix, key, values)
	{
		if (!Utils.isArray(values))
		{
			values = [values];
		}
		return I18.getString(prefix + "_" + key, I18.arrayAntidot(values));
	},

    /**
     * @description Получение значения по суфиксу и ключу
     * @param {String} key ключ
     * @param {String} suffix суфикс
     * @param {Array} [values=null] массив значений
     * @returns {String}
     */
    sf: function(key, suffix, values)
	{
		return I18.getString(key + "_" + suffix, I18.arrayAntidot(values));
	},

    /**
     * @description Получение значения по префиксу, суфиксу и ключу
     * @param {String} prefix префикс
     * @param {String} key ключ
     * @param {String} suffix суфикс
     * @param {Array} [values=null] массив значений
     * @returns {String}
     */
    psf: function(prefix, key, suffix, values)
	{
		return I18.getString(prefix + "_" + key + "_" + suffix, I18.arrayAntidot(values));
	},

    /** @ignore */
    sprintf: function()
    {
        var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
        var a = arguments;
        var i = 0;
        var format = a[i++];
    
        var pad = function(str, len, chr, leftJustify)
        {
            if (!chr) chr = ' ';
            var padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0).join(chr);
            return leftJustify ? str + padding : padding + str;
        };
    
        var justify = function(value, prefix, leftJustify, minWidth, zeroPad, customPadChar)
        {
            var diff = minWidth - value.length;
            if (diff > 0)
            {
                if (leftJustify || !zeroPad) value = pad(value, minWidth, customPadChar, leftJustify);
                else value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
            }
            return value;
        };
    
        var formatBaseX = function(value, base, prefix, leftJustify, minWidth, precision, zeroPad)
        {
            var number = value >>> 0;
            prefix = prefix && number && {'2': '0b', '8': '0', '16': '0x'}[base] || '';
            value = prefix + pad(number.toString(base), precision || 0, '0', false);
            return justify(value, prefix, leftJustify, minWidth, zeroPad);
        };
    
        var formatString = function(value, leftJustify, minWidth, precision, zeroPad, customPadChar)
        {
            if (precision != null) value = value.slice(0, precision);
            return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
        };
    
        var doFormat = function(substring, valueIndex, flags, minWidth, _, precision, type)
        {
            var number, prefix, method, textTransform, value;
    
            if (substring === '%%') return '%';
            
            var leftJustify = false;
            var positivePrefix = '';
            var zeroPad = false;
            var prefixBaseX = false;
            var customPadChar = ' ';
            var flagsl = flags.length;
            for (var j = 0; flags && j < flagsl; j++)
            {
                switch (flags.charAt(j))
                {
                    case ' ':
                        positivePrefix = ' ';
                        break;
                    case '+':
                        positivePrefix = '+';
                        break;
                    case '-':
                        leftJustify = true;
                        break;
                    case "'":
                        customPadChar = flags.charAt(j + 1);
                        break;
                    case '0':
                        zeroPad = true;
                        customPadChar = '0';
                        break;
                    case '#':
                        prefixBaseX = true;
                        break;
                }
            }
    
            if (!minWidth) minWidth = 0;
            else if (minWidth === '*') minWidth = +a[i++];
            else if (minWidth.charAt(0) == '*') minWidth = +a[minWidth.slice(1, -1)];
            else minWidth = +minWidth;
    
            if (minWidth < 0)
            {
                minWidth = -minWidth;
                leftJustify = true;
            }
    
            if (!isFinite(minWidth))
            {
                throw new Error('sprintf: (minimum-)width must be finite');
            }
    
            if (!precision) precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type === 'd') ? 0 : undefined;
            else if (precision === '*') precision = +a[i++];
            else if (precision.charAt(0) == '*') precision = +a[precision.slice(1, -1)];
            else  precision = +precision;
    
            value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];
    
            switch (type)
            {
                case 's':
                    return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
                case 'c':
                    return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
                case 'b':
                    return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'o':
                    return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'x':
                    return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'X':
                    return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
                case 'u':
                    return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'i':
                case 'd':
                    number = +value || 0;
                    number = Math.round(number - number % 1);
                    prefix = number < 0 ? '-' : positivePrefix;
                    value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                    return justify(value, prefix, leftJustify, minWidth, zeroPad);
                case 'e':
                case 'E':
                case 'f':
                case 'F':
                case 'g':
                case 'G':
                    number = +value;
                    prefix = number < 0 ? '-' : positivePrefix;
                    method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                    textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                    value = prefix + Math.abs(number)[method](precision);
                    return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
                default:
                    return substring;
            }
        };
    
        return format.replace(regex, doFormat);
    }
};

try {module.exports = I18}
catch(e) {}