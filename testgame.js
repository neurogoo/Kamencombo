var Game = {
    display: null,
 
    init: function() {
        this.display = new ROT.Display();
        document.body.appendChild(this.display.getContainer());
        this._generateMap();
            var scheduler = new ROT.Scheduler.Simple();
//    scheduler.add(this.player, true);
 
    scheduler.add(this.player, true);
    scheduler.add(this.pedro, true);
    this.engine = new ROT.Engine(scheduler);
    this.engine.start();
    }
};

Game.map = {};

var Pedro = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
};
 
Pedro.prototype._draw = function() {
    Game.display.draw(this._x, this._y, "P", "red");
};
 
Game._createBeing = function(what, freeCells) {
    var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    var key = freeCells.splice(index, 1)[0];
    var parts = key.split(",");
    var x = parseInt(parts[0]);
    var y = parseInt(parts[1]);
    return new what(x, y);
};

var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
};
 
Player.prototype._draw = function() {
    Game.display.draw(this._x, this._y, "@", "#ff0");
};
 
Player.prototype.act = function() {
    Game.engine.lock();
    /* wait for user input; do stuff when user hits a key */
    window.addEventListener("keydown", this);
};
 
Player.prototype.handleEvent = function(e) {
    var keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;

    var code = e.keyCode;
    /* one of numpad directions? */
    if (code == 13 || code == 32) {
        this._checkBox();
        return;
    }
    if (!(code in keyMap)) { return; }

    /* is there a free space? */
    var dir = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var newKey = newX + "," + newY;
    if (!(newKey in Game.map)) { return; }

    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = newX;
    this._y = newY;
    this._draw();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
};

Player.prototype._checkBox = function() {
    var key = this._x + "," + this._y;
    if (Game.map[key] != "*") {
        alert("There is no box here!");
    } else if (key == Game.ananas) {
        alert("Hooray! You found an ananas and won this game.");
        Game.engine.lock();
        window.removeEventListener("keydown", this);
    } else {
        alert("This box is empty :-(");
    }
};

Player.prototype.getX = function() { return this._x; };
 
Player.prototype.getY = function() { return this._y; };
 
Pedro.prototype.act = function() {
    var x = Game.player.getX();
    var y = Game.player.getY();
    var passableCallback = function(x, y) {
        return (x+","+y in Game.map);
    };
    var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});
 
    var path = [];
    var pathCallback = function(x, y) {
        path.push([x, y]);
    };
    astar.compute(this._x, this._y, pathCallback);

    path.shift(); /* remove Pedro's position */
    if (path.length == 1) {
        Game.engine.lock();
        alert("Game over - you were captured by Pedro!");
    } else {
        x = path[0][0];
        y = path[0][1];
        Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
        this._x = x;
        this._y = y;
        this._draw();
    }
 
};

Game.player = null;

Game._generateMap = function() {
    var digger = new ROT.Map.Digger();
    var freeCells = [];
 
    var digCallback = function(x, y, value) {
        if (value) { return; } /* do not store walls */
 
        var key = x+","+y;
        freeCells.push(key);
        this.map[key] = "·";
    };
    digger.create(digCallback.bind(this));
 
    this._generateBoxes(freeCells);
 
    this._drawWholeMap();

//    this._createPlayer(freeCells);
     
    this.player = this._createBeing(Player, freeCells);
    this.pedro = this._createBeing(Pedro, freeCells);
};

Game._createPlayer = function(freeCells) {
    var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    var key = freeCells.splice(index, 1)[0];
    var parts = key.split(",");
    var x = parseInt(parts[0]);
    var y = parseInt(parts[1]);
    this.player = new Player(x, y);
};

Game.ananas = null;

Game._generateBoxes = function(freeCells) {
    for (var i=0;i<10;i++) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        this.map[key] = "*";
        if (!i) { this.ananas = key; } 
    }
};

Game._drawWholeMap = function() {
    for (var key in this.map) {
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        this.display.draw(x, y, this.map[key]);
    }
};

Game.engine = null;

Game.init();
