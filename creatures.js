function Creature(x,y,icon,name,currentHealth,maxHealth,iconColor,backgroudColor) {
    this._x = x;
    this._y = y;
    this._icon = icon;
    this._iconColor = iconColor;
    this._backgroundColor = backgroudColor;
    this._name = name;
    this._currentHealth = currentHealth;
    this._maxHealth = maxHealth;
};

Creature.prototype._draw = function() {
    Game.gameDraw(this._x, this._y, this._icon);
};

Creature.prototype.onHit = function(onHitFunc) {
    //MessageWindow.addMessage("Player was hit");
    onHitFunc(this);
    if(this._currentHealth <= 0) {
        Game.scheduler.remove(this);
        console.log("Miksi ei toimi!!!");
    }
};
