function AsciiAnimation() {
    this._frameQueue = [];
};

AsciiAnimation.prototype.add = function(frame) {
    this._frameQueue.push(frame);
};

AsciiAnimation.prototype.run = function() {
    var oldTiles = [];
    this._frameQueue.forEach(function(frame) {
	setTimeout(frame.drawFrame(), frame.waitingTime);
    });
    Game._drawWholeMap()
};

function AsciiFrame(waitingTime, animationArea, replacesOldChar) {
    this.waitingTime = waitingTime;
    this.animationArea = animationArea;
    this.replacesOldChar = replacesOldChar;
};

AsciiFrame.prototype.drawFrame = function() {
    this.animationArea.forEach(function(area) {
	area.forEach(function(coord) {
	    Game.drawPartOfTheMap(coord[0],coord[1],undefined,"#f00",undefined);
	});
    });
};

var MessageWindow = {_messageLimit:9, _x:0, _y:ROT.DEFAULT_HEIGHT+1};

MessageWindow._messages = [];
MessageWindow.addMessage = function(newMessage) {
    //console.log("MessageLimit " + this._messageLimit);
    if(this._messages.length >= this._messageLimit) {
        this._messages.shift();
    }
    this._messages.push(newMessage);
    this.drawMessageWindow();
};

MessageWindow.drawMessageWindow = function() {
    //console.log(this._messages.length);
    for(var i = 0; i < this._messages.length; i++) {
        Game.display.drawText(this._x,this._y+1+i,Array(11).join(" "));
        Game.display.drawText(this._x,this._y+1+i,this._messages[this._messages.length-1-i]);
    }
};

function Menu(drawAreaX,drawAreaY, drawWidth,drawLenght) {
    this._x = drawAreaX;
    this._y = drawAreaY;
    this._width = drawWidth;
    this._length = drawLenght;
};

Menu.prototype.drawBorders = function() {
    Game.display.drawText(this._x,this._y,Array(this._width+3).join("_"));
    for(var i = 0; i < this._length; i++) {
        Game.display.drawText(this._x,this._y+i+1,"|" + Array(this._width+1).join(" ") + "|");
    }
    //Game.display.drawText(this._x,this._y+this._length+1, Array(this._width+2).join("-"));
};

function InventoryMenu(drawAreaX,drawAreaY, drawWidth,drawLenght) { Menu.call(this,drawAreaX,drawAreaY, drawWidth,drawLenght); };

InventoryMenu.prototype = Object.create(Menu.prototype);

InventoryMenu.prototype.handleEvent = function(e) {
//    Game.engine.lock();
    var code = e.keyCode;
    
    if(code == ROT.VK_SPACE) {
        window.removeEventListener("keydown", this);
	window.addEventListener("keydown",Game.player);
        Game._drawWholeMap();
        //Game.engine.unlock();
    }
};

InventoryMenu.prototype.drawMenu = function() {
    this.drawBorders();
    Game.display.drawText(this._x+1,this._y+1, "Inventory", this._width);
};

function GameOverScreen() {
    Menu.call(this,0,0,Game.screenWidth,Game.screenHeight);
};

GameOverScreen.prototype = Object.create(Menu.prototype);

GameOverScreen.prototype.handleEvent = function(e) {
//    Game.engine.lock();
    var code = e.keyCode;
    
    if(code == ROT.VK_SPACE) {
        window.removeEventListener("keydown", this);
	Game.engine.unlock();
        Game.init();
    }
};

GameOverScreen.prototype.drawMenu = function() {
    this.drawBorders();
    Game.display.drawText(this._x+1,this._y+1, "You died",this.width);
};

function MapFeatures(x,y,icon,name,bg,ig) {
    this.name = name;
    this._x = x;
    this._y = y;
    this._icon = icon;
    this._backgroundColor = bg;
    this._iconColor = ig;
};

MapFeatures.prototype.stepOnEvent = function() {
   MessageWindow.addMessage("You stepped on " + this.name); 
};

function Stair(x,y,icon,currentLevel,nextLevel,stairPair) { 
    MapFeatures.call(this,x,y,icon,"stair");
    this._currentLevel = currentLevel;
    this._nextLevel = nextLevel;
    this._stairPair = stairPair;
};

Stair.prototype = Object.create(MapFeatures.prototype);

Stair.prototype.stepOnEvent = function() {
    if(this._nextLevel != "none") {
        Game.goToLevel(this._nextLevel);
        if(this._nextLevel === undefined) {
            this._nextLevel = Game.currentLevel;
        }
    }
};

function Moss(x,y,icon,iconColor,backgroudColor) {
    Creature.call(this,x,y,icon,"moss",2,2,iconColor,backgroudColor);
};

Moss.prototype = Object.create(Creature.prototype);

Moss.prototype.act = function() {
    if(Math.abs(Game.player._x - this._x) <= 1 && Math.abs(Game.player._y - this._y) <= 1) {
	Game.player.onHit(function(player) { player._currentHealth -= 1; }); 
    }
};

function Goblin_minion(x,y,icon,iconColor,backgroudColor) {
    Creature.call(this,x,y,icon,"goblin minion",2,2,iconColor,backgroudColor);
};

Goblin_minion.prototype = Object.create(Creature.prototype);

Goblin_minion.prototype.act = function() {
    if(Math.abs(Game.player._x - this._x) <= 1 && Math.abs(Game.player._y - this._y) <= 1) {
	Game.player.onHit(function(player) { player._currentHealth -= 1; }); 
    } else if(Math.abs(Game.player._x - this._x) <= 10 && Math.abs(Game.player._y - this._y) <= 10) {
        /* input callback informs about map structure */
        var myX = this._x;
        var myY = this._y;
        var passableCallback = function(x, y) {
            if(x == myX && y == myY)
                return true;
            else
                return ((Game.getMapElement(x+','+y)!='#') && !Game.getCreature(x+','+y));
        };
        /* prepare path to given coords */
        var astar = new ROT.Path.AStar(Game.player._x, Game.player._y, passableCallback);

        /* compute from given coords #1 */
        var path = [];
        astar.compute(this._x, this._y, function(x, y) {
            path.push([x, y]);
        });
        if(path.length > 1) {
            path.shift();
            this._x = path[0][0];
            this._y = path[0][1];
        }
    }
};

function Level(width,height,previousLevel) {
    this.mapWidth = width;
    this.mapHeight = height;
    this.map = {};
    this.items = {};
    this.features = {};
    this.hasSeenMap = [];
    this.freeCells = [];
    this.creatures = [];
    var digger = new ROT.Map.Digger(this.mapWidth, this.mapHeight);
 
    var digCallback = function(x, y, value) {
        var key = x+","+y;
        this.hasSeenMap[key] = 0;
        if (value) {
            this.map[key] = "#";
            return;
        }
        this.freeCells.push(key);
        this.map[key] = ".";
    };
    digger.create(digCallback.bind(this));
    var parts = this.getFreeElement().split(",");
    var x = parseInt(parts[0]);
    var y = parseInt(parts[1]);
    this.features[x+','+y] = new Stair(x,y,">",Game.currentLevel, undefined, undefined);

    var parts = this.getFreeElement().split(",");
    var x = parseInt(parts[0]);
    var y = parseInt(parts[1]);
    this.inputStair = new Stair(x,y,"<",Game.currentLevel, previousLevel, "none");
    this.features[x+','+y] = this.inputStair;

    parts = this.getFreeElement().split(",");
    x = parseInt(parts[0]);
    y = parseInt(parts[1]);
    this.creatures.push(new Moss(x,y,"w"));
    Game.scheduler.add(this.creatures[this.creatures.length-1],true);
    for(var i = 0; i < 20; i++) {
        parts = this.getFreeElement().split(",");
        x = parseInt(parts[0]);
        y = parseInt(parts[1]);
        this.creatures.push(new Goblin_minion(x,y,"G"));
        Game.scheduler.add(this.creatures[this.creatures.length-1],true);
    }
};

Level.prototype.getMapElement = function(key) {
    return this.map[key];
};

Level.prototype.getFreeElement = function() {
    var index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
    return this.freeCells.splice(index, 1)[0];
};

Level.prototype.setHasSeenMap = function(key) {
    this.hasSeenMap[key] = 1;
};

Level.prototype.removeExtraCreatures = function() {
    var newArray = [];
    for(var i=0; i < this.creatures.length; i++) {
        if(this.creatures[i]._currentHealth > 0) {
            newArray.push(this.creatures[i]);
            //console.log("WHUT");
        }
    }
    //console.log("What");
    this.creatures = newArray;
};

var Colorpicker = function(chr,visibility) {
    if(visibility) {
        if(chr === "#")
            return "#7A716A";
        else if(chr === ".")
            return "#945019";
    }
    return undefined;
};

var Game =  {
    //something that is done only the first time game is initialized
    setup: function() {
	this.display = null; 
	this.gameFontSize = 25;
        this.displayWidth = ROT.DEFAULT_WIDTH+20;
         this.displayHeight = ROT.DEFAULT_HEIGHT+10;
         this.screenWidth = ROT.DEFAULT_WIDTH;
         this.screenHeight = ROT.DEFAULT_HEIGHT;
         this.mapWidth = ROT.DEFAULT_WIDTH*2;
         this.mapHeight = ROT.DEFAULT_HEIGHT;
	this.display = new ROT.Display({width:this.displayWidth, height:this.displayHeight,fontSize:this.gameFontSize});
        document.body.appendChild(this.display.getContainer());
	this.init();
    },

     init: function() {
         this.drawAreaX = 20;
         this.drawAreaY = 0;
         this.drawAreaY = 0;
         this.engine= null;
         this.levels= {};
         this.currentLevel = 0;
         this.previousLevel = "none";
         this.scheduler = null;
         this.player = null;
         
         MessageWindow._messages = [];
        //MessageWindow(0, ROT.DEFAULT_HEIGHT+1, 9);
        
        this.scheduler = new ROT.Scheduler.Simple();
        this._generateMap();
        this._createPlayer();
        this._drawWholeMap();
        //var testCreature = new Creature(4,4,"T");
        //testCreature._draw();
        this.player.calculateFOV();
        
        this.scheduler.add(this.player, true);
        this.engine = new ROT.Engine(this.scheduler);
        this.engine.start();
    },

    gameDraw: function(x,y,cr,bc,fc) {
        this.display.draw(x+this.drawAreaX,y+this.drawAreaY,cr,bc,fc);
    },
    
    //Makes a new map level
    _generateMap: function() {
        this.levels[this.currentLevel] = new Level(this.mapWidth, this.mapHeight, this.previousLevel);
    },

    drawTextInterface: function() {
	var tempString = "Health";
	tempString += Array(this.player._maxHealth-tempString.length+2).join(" ");
	//console.log("String length "+tempString.length);
        this.display.drawText(0,  2, "Toni Testi");
	this.display.drawText(0,  3, "[Dungeon level " + this.currentLevel +"]");
        this.display.drawText(0,  4, "%b{#b22222}"+tempString.slice(0,this.player._currentHealth)+"%b{}"+tempString.slice(this.player._currentHealth,this.player._maxHealth+1));
        this.display.drawText(0,  5, "Power");
        
        this.display.drawText(1,  6, "%b{"+this.player.directionGems["up"]+"}\u2191");
        var leftArrowColor = this.player.directionGems["left"];
        var rightArrowColor = this.player.directionGems["right"];
        this.display.drawText(0,  7, "%b{"+leftArrowColor+"}\u2190%b{} "+"%b{"+rightArrowColor+"}\u2192", "#FFFFFF");
        this.display.drawText(1,  8, "%b{"+this.player.directionGems["down"]+"}\u2193", "#FFFFFF");
        if(this.player.comboReady)
            this.display.drawText(0, 9, "%c{red}Combo ready:" + this.player.nextCombo["name"]);
        else
            this.display.drawText(0, 9, "Current combo");
        var komboString = "";
        for(var i = 0; i < this.player.currentSpell.length; i++) {
            komboString = komboString + "%b{"+this.player.currentSpell[i]+"}.";
        }
        this.display.drawText(0, 10, komboString);
    },

    _drawWholeMap: function() {
        var chr = undefined;
        this.display.clear();
        this.drawTextInterface();
        MessageWindow.drawMessageWindow();
        var currentlySeen = this.player.calculateFOV();
        var x_start = this.player._x - this.screenWidth/2.0;
        var y_start = this.player._y - this.screenHeight/2.0;
        if(x_start < 0) x_start = 0;
        else if(x_start > this.mapWidth-this.screenWidth) x_start = this.mapWidth-this.screenWidth;
        if(y_start < 0) y_start = 0;
        else if(y_start > this.mapHeight-this.screenHeight) y_start = this.mapHeight-this.screenHeight;
        for (var key in this.levels[this.currentLevel].map) {
            if(this.levels[this.currentLevel].hasSeenMap[key]) {
                if(key in this.levels[this.currentLevel].features)
                    chr = this.levels[this.currentLevel].features[key]._icon;
		if(this.getCreature(key))
		    chr = this.getCreature(key)._icon;
                else
                    chr = this.levels[this.currentLevel].map[key];
                var parts = key.split(",");
                var x = parseInt(parts[0]);
                var y = parseInt(parts[1]);
                if(x >= x_start && x < x_start + this.screenWidth && y >= y_start && y < y_start + this.screenHeight)
                    this.gameDraw(x-x_start, y-y_start, chr,"#fff", Colorpicker(chr,currentlySeen[key]));
            }
        }
        this.gameDraw(this.player._x-x_start, this.player._y-y_start, this.player._icon ,"#fff", Colorpicker(chr,currentlySeen[this.player._x+","+this.player._y]));
    },

    drawPartOfTheMap: function(x,y,new_chr,new_background,new_foreground) {
        var chr = undefined;
        var currentlySeen = this.player.calculateFOV();
        var x_start = this.player._x - this.screenWidth/2.0;
        var y_start = this.player._y - this.screenHeight/2.0;
        if(x_start < 0) x_start = 0;
        else if(x_start > this.mapWidth-this.screenWidth) x_start = this.mapWidth-this.screenWidth;
        if(y_start < 0) y_start = 0;
        else if(y_start > this.mapHeight-this.screenHeight) y_start = this.mapHeight-this.screenHeight;
	var key = x+"'"+y;
	this.gameDraw(x-x_start, y-y_start, " ","#fff","#000");
	if(new_foreground == undefined)
	    new_foreground = "#fff";
        if(new_background == undefined)
	    new_background = Colorpicker(chr,currentlySeen[key]);

        if(this.levels[this.currentLevel].hasSeenMap[key]) {
	    if(new_chr == undefined) {
		if(key in this.levels[this.currentLevel].features)
		    new_chr = this.levels[this.currentLevel].features[key]._icon;
		if(this.getCreature(key))
		    new_chr = this.getCreature(key)._icon;
		else
		    new_chr = this.levels[this.currentLevel].map[key];
	    }
	     if(x >= x_start && x < x_start + this.screenWidth && y >= y_start && y < y_start + this.screenHeight)
		 this.gameDraw(x-x_start, y-y_start, chr,new_foreground, new_background);
	}
        
        //this.gameDraw(this.player._x-x_start, this.player._y-y_start, this.player._icon ,"#fff", Colorpicker(chr,currentlySeen[this.player._x+","+this.player._y]));
	
    },

    _createPlayer: function() {
        var x = this.levels[this.currentLevel].inputStair._x;
        var y = this.levels[this.currentLevel].inputStair._y;
        this.player = new Player(x, y, "T");
        //this.player._draw();
    },

    setHasSeenMap: function(key) {
        this.levels[this.currentLevel].setHasSeenMap(key);
    },

    getMapElement: function(key) {
        return this.levels[this.currentLevel].getMapElement(key);
    },

    getItemList: function() {
        return this.levels[this.currentLevel].items;
    },
    getFeatureList: function() {
        return this.levels[this.currentLevel].features;
    },

    getCreature: function(newKey) {
        var currentCreatures = this.levels[this.currentLevel].creatures;
        var parts = newKey.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        for(var i = 0; i < currentCreatures.length; i++) {
            if(currentCreatures[i]._x == x && currentCreatures[i]._y == y)
                return currentCreatures[i];
        }
        return undefined;
    },

    goToLevel: function(level) {
        var new_x,new_y;
        if(!(level in this.levels)) {
            this.currentLevel = this.currentLevel + 1;
            this._generateMap();
            //var new_parts = this.levels[this.currentLevel].getFreeElement().split(",");
            new_x = this.levels[this.currentLevel].inputStair._x;
            new_y = this.levels[this.currentLevel].inputStair._y;
            this.player.movePlayer(new_x,new_y,this.currentLevel);
            //console.log("Current level " + this.currentLevel);
            //console.log("Parts " + new_parts + " element " + this.levels[this.currentLevel].map[new_parts]);
            //this._drawWholeMap();
        } else {
            this.currentLevel = level;
            new_x = this.levels[this.currentLevel].inputStair._x;
            new_y = this.levels[this.currentLevel].inputStair._y;
            this.player.movePlayer(new_x,new_y,this.currentLevel);
        }
        this.player.calculateFOV();
    },

    removeExtraCreatures: function() {
        this.levels[this.currentLevel].removeExtraCreatures();
    }
    
};

//Game.init();
