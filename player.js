function Player(x,y,icon,iconColor,backgroudColor) {
    Creature.call(this,x,y,icon,"Player",10,10,iconColor,backgroudColor);
    this.armorReduction = 0;
    this.spellList = [];
    this.spellList.push({name:"Firecross",components:["red","blue","red"], area:[[0,1],[-1,2],[0,2],[+1,2],[0,3]], damage:3});
    var justicePikeAnimation = new AsciiAnimation();
    justicePikeAnimation.add(new AsciiFrame(500, [[0,1]], 0));
    justicePikeAnimation.add(new AsciiFrame(500, [[0,2]], 0));
    justicePikeAnimation.add(new AsciiFrame(500, [[0,3]], 0));
    this.spellList.push({name:"Justice pike",components:["red","red"], area:[[0,1],[0,2],[0,3]], damage:3,
			 animation: justicePikeAnimation
});
    this.currentSpell = [];
    this.directionGems = {"up":"red",left:"blue","right":"","down":""};
    this.comboReady = false;
};

Player.prototype = Object.create(Creature.prototype);

Player.prototype.act = function() {
    Game._drawWholeMap();
    Game.engine.lock();
    if(this._currentHealth <= 0) {
        var gameOverScreen = new GameOverScreen();
        window.addEventListener("keydown",gameOverScreen);
        window.removeEventListener("keydown",this);
        gameOverScreen.drawMenu();
	return;
    }
    /* wait for user input; do stuff when user hits a key */
    window.addEventListener("keydown", this);
};

Player.prototype.calculateFOV = function() {
     /* input callback */
     var lightPasses = function(x, y) {
         return Game.getMapElement(x+","+y) === "."; 
     };

      var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
    //var playerIcon = this._icon;
    var currentlySeen = {};
      /* output callback */
    fov.compute(this._x, this._y, 10, function(x, y, r, visibility) {
        Game.setHasSeenMap(x+","+y);
        currentlySeen[x+","+y] = true; 
    });
    this.currentlySeenPlaces = currentlySeen;
    return currentlySeen;
};

Player.prototype._inventory = {};
 
Player.prototype.handleEvent = function(e) {
     //console.log("handlecurrent x " + this._x);
    //console.log("handlecurrent y " + this._y);
    var dirKeyMap = {};
    dirKeyMap[38] = 0;
    dirKeyMap[33] = 1;
    dirKeyMap[39] = 2;
    dirKeyMap[34] = 3;
    dirKeyMap[40] = 4;
    dirKeyMap[35] = 5;
    dirKeyMap[37] = 6;
    dirKeyMap[36] = 7;
    var directions = {37:"left",38:"up",39:"right",40:"down"};

    var code = e.keyCode;
    /* one of numpad directions? */
    if (code == ROT.VK_SPACE) {
        var invMenu = new InventoryMenu(30,5,10,15);
        window.addEventListener("keydown",invMenu);
        window.removeEventListener("keydown",this);
        invMenu.drawMenu();
	return;
    } else if (code === 12) {
        Game.removeExtraCreatures();
        Game._drawWholeMap();
        
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
        return;
    }
    if (!(code in dirKeyMap)) { return; }

    /* is there a free space? */
    var dir = ROT.DIRS[8][dirKeyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var newKey = newX + "," + newY;
    if (Game.getMapElement(newKey) == "#") {
        MessageWindow.addMessage("You can't go through the wall yet");
        return; 
    } else if(Game.getCreature(newKey)) {
        if(this.comboReady) {
            if(directions[code]) {
                this.comboReady = false;
                this.currentSpell  = [];
                var new_x,new_y;
                var current_x = this._x, current_y = this._y;
                var spellSees = this.currentlySeenPlaces;
                var usedCombo = this.nextCombo;
                //All spell area coordinates are given as if the player is looking down
                //for other directions the coordinates have to be first transformed
                if(directions[code] === "left") {
                    this.nextCombo["area"].filter(function(coordinates) {
                        new_x = current_x-coordinates[1];
                        new_y = current_y+coordinates[0];
                        return spellSees[new_x+","+new_y] && Game.getCreature(new_x+","+new_y);
                    }).forEach(function(coordinates) {
                        new_x = current_x-coordinates[1];
                        new_y = current_y+coordinates[0];
                        Game.getCreature(new_x+","+new_y).onHit(function(creature) {
                            MessageWindow.addMessage(usedCombo["name"]+" hit "+creature._name+" for 3 damage");
                            creature._currentHealth -= 3;
                        });                       
                    });
                } else if(directions[code] === "right") {
                    this.nextCombo["area"].filter(function(coordinates) {
                        new_x = current_x+coordinates[1];
                        new_y = current_y-coordinates[0];
                        return spellSees[new_x+","+new_y] && Game.getCreature(new_x+","+new_y);
                    }).forEach(function(coordinates) {
                        new_x = current_x+coordinates[1];
                        new_y = current_y-coordinates[0];
                        Game.getCreature(new_x+","+new_y).onHit(function(creature) {
                            MessageWindow.addMessage(usedCombo["name"]+" hit "+creature._name+" for 3 damage");
                            creature._currentHealth -= 3;
                        });                       
                    });
                } else if(directions[code] === "up") {
                    this.nextCombo["area"].filter(function(coordinates) {
                        new_x = current_x-coordinates[0];
                        new_y = current_y-coordinates[1];
                        return spellSees[new_x+","+new_y] && Game.getCreature(new_x+","+new_y);
                    }).forEach(function(coordinates) {
                        new_x = current_x-coordinates[0];
                        new_y = current_y-coordinates[1];
                        Game.getCreature(new_x+","+new_y).onHit(function(creature) {
                            MessageWindow.addMessage(usedCombo["name"]+" hit "+creature._name+" for 3 damage");
                            creature._currentHealth -= 3;
                        });                       
                    });
                } else {
                    this.nextCombo["area"].filter(function(coordinates) {
                        new_x = current_x+coordinates[0];
                        new_y = current_y+coordinates[1];
                        return spellSees[new_x+","+new_y] && Game.getCreature(new_x+","+new_y);
                    }).forEach(function(coordinates) {
                        new_x = current_x+coordinates[0];
                        new_y = current_y+coordinates[1];
                        Game.getCreature(new_x+","+new_y).onHit(function(creature) {
                            MessageWindow.addMessage(usedCombo["name"]+" hit "+creature._name+" for 3 damage");
                            creature._currentHealth -= 3;
                        });                       
                    });
                }
            } else {
                Game.getCreature(newKey).onHit(function(creature) {
                    MessageWindow.addMessage("Player hit "+creature._name+" for 1 damage");
                    creature._currentHealth -= 1;
                });
            }
        } else if(this.directionGems[directions[code]]) {
            var possibleNextSpell = this.currentSpell.concat(this.directionGems[directions[code]]);
            var possibleSpellList = this.spellList.filter(function(spell) {
                console.log(this.currentSpell);
                for(var i = 0; i < possibleNextSpell.length; i++) {
                    if(possibleNextSpell[i] != spell["components"][i])
                        return false;
                }
                return true;
            });
            if(possibleSpellList.length === 0) {
                this.currentSpell = [];
            } else if(possibleSpellList.length === 1) {
                this.currentSpell = possibleNextSpell;
                if(possibleNextSpell.length == possibleSpellList[0]["components"].length) {
                    this.comboReady = true;
                    this.nextCombo = possibleSpellList[0];
                }
            } else if(possibleSpellList.length > 1) {
                this.currentSpell = possibleNextSpell;
            }
            console.log("Size of spell list is " + possibleSpellList.length);
            Game.getCreature(newKey).onHit(function(creature) {
                MessageWindow.addMessage("Player hit "+creature._name+" for 1 damage");
                creature._currentHealth -= 1;
            });
        } else {
            Game.getCreature(newKey).onHit(function(creature) {
                MessageWindow.addMessage("Player hit "+creature._name+" for 1 damage");
                creature._currentHealth -= 1;
            });
        }
    } else {
        this._x = newX;
        this._y = newY;
        if (newKey in Game.getFeatureList()) {
            Game.getFeatureList()[newKey].stepOnEvent();
        } 
    }

    //Game.gameDraw(this._x, this._y, Game.map[this._x+","+this._y]);
    Game.removeExtraCreatures();
    Game._drawWholeMap();
    
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
};

Player.prototype.movePlayer = function(x,y,newLevel) {
    this._x = x;
    this._y = y;
    console.log("current x " + this._x);
    console.log("current y " + this._y);
};

Player.prototype.onHit = function(onHitFunc) {
    MessageWindow.addMessage("Player was hit");
    onHitFunc(this);
};
