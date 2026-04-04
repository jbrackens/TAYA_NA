function getConstructor()
{
	return window.frames["constructor"];
}

//Старт редактора
function editorStart()
{
	landscapeMode();
}

//Добавочные картинки для загрузки
function editorPreloadImages(data, path)
{
}

//Формирование дополнительной панели
function editorCreatePanel()
{
	var s = '';
	
	getConstructor().document.getElementById("add_panel").innerHTML = s;
}

//Обработка дополнительных свойств уровня при его конструировании
function preConstructLevel()
{
}

//Обработка дополнительных свойств объекта при его создании
function editorCreateLevelObject(obj, mc)
{
}

//Установка дополнительных свойств для выделенного объекта
function editorSetObjectProps(obj)
{
}

//Добавление в скрипт уровня дополнительных свойств
function preCreateScript()
{
	s = '';
	
	return s;
}

//Добавление в скрипт объекта дополнительных свойств
function editorCreateObjectScript(obj)
{
	//return {prop: val};
}

//Дополнительная отрисовка на каждом шаге рендера
function editorRender(stage)
{
}

//Обработка выделения объекта
function editorSelectObject(obj)
{
}

//Обработка удаления объекта
function editorDeleteObject(obj)
{
}