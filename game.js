// ==================== GAME CONSTANTS ====================
const GAME_STATES = {
    TITLE: 'TITLE',
    FIGHT: 'FIGHT',
    SHOP: 'SHOP',
    MAP: 'MAP',
    SHIP_AREA: 'SHIP_AREA',
    STREAM_AREA: 'STREAM_AREA',
    GUARD_AREA: 'GUARD_AREA',
    WIN: 'WIN',
    LOSE: 'LOSE'
};

const ARENA = {
    x: 50,
    y: 50,
    width: 700,
    height: 500
};

// ==================== GAME STATE ====================
let gameState = GAME_STATES.TITLE;
let previousGameState = GAME_STATES.TITLE; // Track where player died
let stateBeforeShop = null; // Track where player was before opening shop
let currentBoss = 0;
let hairPoints = 0;
let purchasedUpgrades = {
    maxhp: false,
    speed: false,
    attack: false
};
let hasBeatenGame = false; // Unlock cosmetics after first victory
let cosmetics = {
    hair: 'default', // default, spiky, mohawk, rainbow, fire
    vehicle: 'none'  // none, skateboard, hoverboard, car
};
let ownedCosmetics = {
    hair: ['default'],
    vehicle: ['none']
};
let equippedWeapon = 'none'; // none, sword, blaster, lightning, flamethrower
let ownedWeapons = ['none'];
let highestBossDefeated = 0; // Track progression for weapon unlocks

// ==================== QUEST STATE ====================
let questState = {
    hasShipComponent: false,
    shipRepaired: false,
    guardDefeated: false,
    porcupinesDefeated: false
};

// ==================== CANVAS SETUP ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==================== INPUT HANDLING ====================
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        keys.space = true;
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        keys.escape = true;
        // Return to map from areas
        if (gameState === GAME_STATES.SHIP_AREA ||
            gameState === GAME_STATES.STREAM_AREA ||
            gameState === GAME_STATES.GUARD_AREA) {
            gameState = GAME_STATES.MAP;
            player.x = 400;
            player.y = 300;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === ' ') {
        keys.space = false;
    }
    if (e.key === 'Escape') {
        keys.escape = false;
    }
});

// ==================== ARROW CLASS ====================
class Arrow {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.dx = dx / dist;
        this.dy = dy / dist;
        this.speed = 8;
        this.width = 8;
        this.height = 8;
        this.active = true;
        this.angle = Math.atan2(dy, dx);
    }

    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;

        // Check if out of arena
        if (this.x < ARENA.x || this.x > ARENA.x + ARENA.width ||
            this.y < ARENA.y || this.y > ARENA.y + ARENA.height) {
            this.active = false;
        }

        // Check boss collision
        if (boss && checkCollision(this, boss)) {
            boss.takeDamage(1);
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Arrow shaft with gradient
        const shaftGradient = ctx.createLinearGradient(-8, -2, -8, 2);
        shaftGradient.addColorStop(0, '#a0522d');
        shaftGradient.addColorStop(0.5, '#8B4513');
        shaftGradient.addColorStop(1, '#654321');
        ctx.fillStyle = shaftGradient;
        ctx.fillRect(-8, -2, 16, 4);

        // Shaft highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(-8, -2, 16, 1);

        // Arrow head with metallic gradient
        const headGradient = ctx.createLinearGradient(8, -4, 14, 0);
        headGradient.addColorStop(0, '#E8E8E8');
        headGradient.addColorStop(0.5, '#C0C0C0');
        headGradient.addColorStop(1, '#A0A0A0');
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(16, -5);
        ctx.lineTo(16, 5);
        ctx.closePath();
        ctx.fill();

        // Arrow head outline
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Arrow head shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(14, -3);
        ctx.lineTo(14, 3);
        ctx.closePath();
        ctx.fill();

        // Fletching with gradient
        const fletchingGradient = ctx.createLinearGradient(-12, -3, -12, 3);
        fletchingGradient.addColorStop(0, '#ffed4e');
        fletchingGradient.addColorStop(1, '#ffc107');
        ctx.fillStyle = fletchingGradient;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-14, -4);
        ctx.lineTo(-11, 0);
        ctx.lineTo(-14, 4);
        ctx.closePath();
        ctx.fill();

        // Fletching outline
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

// ==================== PROJECTILE CLASS (for weapons) ====================
class Projectile {
    constructor(x, y, targetX, targetY, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'blaster', 'lightning', 'flamethrower'

        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.dx = dx / dist;
        this.dy = dy / dist;

        // Different weapons have different properties
        if (type === 'blaster') {
            this.speed = 12;
            this.width = 10;
            this.height = 10;
            this.damage = 2;
            this.color = '#00ffff';
        } else if (type === 'lightning') {
            this.speed = 15;
            this.width = 8;
            this.height = 8;
            this.damage = 3;
            this.color = '#ffff00';
        } else if (type === 'flamethrower') {
            this.speed = 7;
            this.width = 12;
            this.height = 12;
            this.damage = 1;
            this.color = '#ff4500';
        }

        this.active = true;
        this.angle = Math.atan2(dy, dx);
    }

    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;

        // Check if out of arena
        if (this.x < ARENA.x || this.x > ARENA.x + ARENA.width ||
            this.y < ARENA.y || this.y > ARENA.y + ARENA.height) {
            this.active = false;
        }

        // Check boss collision
        if (boss && checkCollision(this, boss)) {
            boss.takeDamage(this.damage);
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'blaster') {
            // Energy blast
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'lightning') {
            // Lightning bolt
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(10, 0);
            ctx.stroke();

            // Bright core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.type === 'flamethrower') {
            // Fireball
            const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.5, '#ff4500');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

let playerArrows = [];

// ==================== COSMETIC DRAWING FUNCTIONS ====================
function drawPlayerHair(x, y, width, height) {
    const hairStyle = cosmetics.hair;

    if (hairStyle === 'default') {
        // Original yellow gradient hair
        const hairGradient = ctx.createLinearGradient(x, y - height/2 - 10, x, y - height/2);
        hairGradient.addColorStop(0, '#ffed4e');
        hairGradient.addColorStop(1, '#ffc107');
        ctx.fillStyle = hairGradient;

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 10 + i * 10, y - height/2);
            ctx.lineTo(x - 5 + i * 10, y - height/2 - 12);
            ctx.lineTo(x + i * 10, y - height/2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    } else if (hairStyle === 'fire') {
        // Fire hair - red and orange flames
        for (let i = 0; i < 3; i++) {
            const fireGradient = ctx.createLinearGradient(x, y - height/2 - 15, x, y - height/2);
            fireGradient.addColorStop(0, '#ff6b35');
            fireGradient.addColorStop(0.5, '#ff4500');
            fireGradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = fireGradient;

            ctx.beginPath();
            ctx.moveTo(x - 10 + i * 10, y - height/2);
            ctx.lineTo(x - 5 + i * 10, y - height/2 - 15);
            ctx.lineTo(x + i * 10, y - height/2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    } else if (hairStyle === 'rainbow') {
        // Rainbow hair - each spike a different color
        const colors = [
            ['#ff0080', '#ff00ff'],
            ['#00ff00', '#00cc00'],
            ['#00ffff', '#0099ff']
        ];
        for (let i = 0; i < 3; i++) {
            const rainbowGradient = ctx.createLinearGradient(x, y - height/2 - 12, x, y - height/2);
            rainbowGradient.addColorStop(0, colors[i][0]);
            rainbowGradient.addColorStop(1, colors[i][1]);
            ctx.fillStyle = rainbowGradient;

            ctx.beginPath();
            ctx.moveTo(x - 10 + i * 10, y - height/2);
            ctx.lineTo(x - 5 + i * 10, y - height/2 - 12);
            ctx.lineTo(x + i * 10, y - height/2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = colors[i][1];
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    } else if (hairStyle === 'mohawk') {
        // Single large center spike
        const mohawkGradient = ctx.createLinearGradient(x, y - height/2 - 18, x, y - height/2);
        mohawkGradient.addColorStop(0, '#9c27b0');
        mohawkGradient.addColorStop(1, '#6a1b9a');
        ctx.fillStyle = mohawkGradient;

        ctx.beginPath();
        ctx.moveTo(x - 12, y - height/2);
        ctx.lineTo(x, y - height/2 - 18);
        ctx.lineTo(x + 12, y - height/2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4a148c';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawPlayerVehicle(x, y) {
    const vehicle = cosmetics.vehicle;

    if (vehicle === 'none') {
        return;
    }

    ctx.save();

    if (vehicle === 'skateboard') {
        // Skateboard under player
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(x - 20, y + 18, 40, 6);
        // Wheels
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x - 12, y + 26, 4, 0, Math.PI * 2);
        ctx.arc(x + 12, y + 26, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (vehicle === 'hoverboard') {
        // Hoverboard with glow
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#0099ff';
        ctx.fillRect(x - 22, y + 18, 44, 7);
        // Glow lines
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(x - 20, y + 20, 40, 2);
    } else if (vehicle === 'car') {
        // Simple car
        // Car body
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x - 25, y + 10, 50, 15);
        // Car top
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(x - 18, y + 5, 36, 8);
        // Wheels
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x - 15, y + 25, 5, 0, Math.PI * 2);
        ctx.arc(x + 15, y + 25, 5, 0, Math.PI * 2);
        ctx.fill();
        // Windshield
        ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
        ctx.fillRect(x - 15, y + 6, 30, 6);
    }

    ctx.restore();
}

// ==================== PLAYER ====================
const player = {
    x: 400,
    y: 325,
    width: 30,
    height: 30,
    maxHP: 3,
    hp: 3,
    speed: 2.5,
    attackCooldown: 300,
    lastAttackTime: 0,
    arrowCooldown: 500,
    lastArrowTime: 0,
    invulnerable: false,
    invulnerableUntil: 0,

    reset() {
        this.x = 400;
        this.y = 325;
        this.hp = this.maxHP;
        this.invulnerable = false;
        this.invulnerableUntil = 0;
        playerArrows = [];
    },

    update(deltaTime) {
        // Movement
        let dx = 0;
        let dy = 0;

        if (keys.w || keys.arrowup) dy -= 1;
        if (keys.s || keys.arrowdown) dy += 1;
        if (keys.a || keys.arrowleft) dx -= 1;
        if (keys.d || keys.arrowright) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Apply movement
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Keep in arena
        this.x = Math.max(ARENA.x + this.width/2, Math.min(ARENA.x + ARENA.width - this.width/2, this.x));
        this.y = Math.max(ARENA.y + this.height/2, Math.min(ARENA.y + ARENA.height - this.height/2, this.y));

        // Check invulnerability
        if (this.invulnerable && Date.now() > this.invulnerableUntil) {
            this.invulnerable = false;
        }

        // Melee Attack (Space)
        if (keys.space && Date.now() - this.lastAttackTime > this.attackCooldown) {
            this.attack();
            this.lastAttackTime = Date.now();
        }

        // Shoot Arrow (Shift or E)
        const canShoot = boss || porcupines.some(p => !p.defeated);
        if ((keys.shift || keys.e) && Date.now() - this.lastArrowTime > this.arrowCooldown && canShoot) {
            this.shootArrow();
            this.lastArrowTime = Date.now();
        }

        // Update arrows
        playerArrows = playerArrows.filter(arrow => arrow.active);
        playerArrows.forEach(arrow => arrow.update());
    },

    attack() {
        // Weapon-specific attacks
        if (equippedWeapon === 'sword') {
            // Sword has longer reach
            const attackBox = {
                x: this.x - 25,
                y: this.y - 50,
                width: 50,
                height: 70
            };

            // Check hits
            if (boss && checkCollision(attackBox, boss)) {
                boss.takeDamage(2); // Sword does more damage
            }
            porcupines.forEach(p => {
                if (!p.defeated && checkCollision(attackBox, p)) {
                    p.takeDamage(2);
                }
            });

            // Visual feedback - draw sword
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(this.x - 5, this.y - 50, 10, 60);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x - 8, this.y + 8, 16, 12);
            ctx.restore();
        } else {
            // Default melee attack
            const attackBox = {
                x: this.x - 20,
                y: this.y - 40,
                width: 40,
                height: 50
            };

            if (boss && checkCollision(attackBox, boss)) {
                boss.takeDamage(1);
            }
            porcupines.forEach(p => {
                if (!p.defeated && checkCollision(attackBox, p)) {
                    p.takeDamage(1);
                }
            });

            // Visual feedback
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffd93d';
            ctx.fillRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
            ctx.restore();
        }
    },

    shootArrow() {
        let targetX, targetY;

        if (boss) {
            targetX = boss.x;
            targetY = boss.y;
        } else if (porcupines.length > 0) {
            // Target nearest porcupine
            const alivePorcupines = porcupines.filter(p => !p.defeated);
            if (alivePorcupines.length > 0) {
                const nearest = alivePorcupines[0];
                targetX = nearest.x;
                targetY = nearest.y;
            } else {
                return;
            }
        } else {
            return;
        }

        // Create projectile based on equipped weapon
        let projectile;
        if (equippedWeapon === 'blaster') {
            projectile = new Projectile(this.x, this.y, targetX, targetY, 'blaster');
        } else if (equippedWeapon === 'lightning') {
            projectile = new Projectile(this.x, this.y, targetX, targetY, 'lightning');
        } else if (equippedWeapon === 'flamethrower') {
            projectile = new Projectile(this.x, this.y, targetX, targetY, 'flamethrower');
        } else {
            // Default arrow
            projectile = new Arrow(this.x, this.y, targetX, targetY);
        }

        playerArrows.push(projectile);
    },

    takeDamage(amount) {
        if (this.invulnerable) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            previousGameState = gameState; // Remember where we died
            gameState = GAME_STATES.LOSE;
            showScreen('lose-screen');
            updateLoseScreen();
        } else {
            this.invulnerable = true;
            this.invulnerableUntil = Date.now() + 700;
        }
        updateUI();
    },

    draw() {
        // Draw arrows
        playerArrows.forEach(arrow => arrow.draw());

        ctx.save();

        // Blink when invulnerable
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        // Draw vehicle first (under player)
        drawPlayerVehicle(this.x, this.y);

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Draw player body with gradient
        const bodyGradient = ctx.createLinearGradient(
            this.x - this.width/2, this.y - this.height/2,
            this.x + this.width/2, this.y + this.height/2
        );
        bodyGradient.addColorStop(0, '#6ee7d7');
        bodyGradient.addColorStop(1, '#3ab5a8');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);

        // Body outline
        ctx.strokeStyle = '#2a9d8f';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);

        // Reset shadow for hair
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw hair based on cosmetic
        drawPlayerHair(this.x, this.y, this.width, this.height);

        // Draw face details
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 6, this.y - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(this.x + 6, this.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 4, 1, 0, Math.PI * 2);
        ctx.arc(this.x + 7, this.y - 4, 1, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 3, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();
        ctx.globalAlpha = 1;

        // Draw aim line when holding shift/E
        if ((keys.shift || keys.e) && Date.now() - this.lastArrowTime > this.arrowCooldown) {
            let targetX, targetY;

            if (boss) {
                targetX = boss.x;
                targetY = boss.y;
            } else if (porcupines.length > 0) {
                const alivePorcupines = porcupines.filter(p => !p.defeated);
                if (alivePorcupines.length > 0) {
                    targetX = alivePorcupines[0].x;
                    targetY = alivePorcupines[0].y;
                }
            }

            if (targetX !== undefined) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 217, 61, 0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(targetX, targetY);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
};

// ==================== BOSS BASE CLASS ====================
class Boss {
    constructor(name, hp, reward) {
        this.name = name;
        this.maxHP = hp;
        this.hp = hp;
        this.reward = reward;
        this.x = 400;
        this.y = 200;
        this.width = 50;
        this.height = 50;
        this.hitFlashUntil = 0;
        this.defeated = false;
    }

    takeDamage(amount) {
        if (this.defeated) return;

        this.hp -= amount;
        this.hitFlashUntil = Date.now() + 100;

        if (this.hp <= 0) {
            this.hp = 0;
            this.defeated = true;
            this.onDefeat();
        }

        updateBossHealthBar();
    }

    onDefeat() {
        hairPoints += this.reward;
        showFloatingText(`+${this.reward} Hair!`, this.x, this.y);
        updateUI();

        // Track highest boss defeated for weapon unlocks
        if (currentBoss > highestBossDefeated) {
            highestBossDefeated = currentBoss;
        }

        setTimeout(() => {
            currentBoss++;
            if (currentBoss >= 3) {
                hasBeatenGame = true; // Unlock cosmetics!
                gameState = GAME_STATES.WIN;
                showScreen('win-screen');
                document.getElementById('final-hair-points').textContent =
                    `Total Hair Points: ${hairPoints}`;
            } else if (currentBoss === 1) {
                // After Boss 1, go to MAP (world exploration)
                gameState = GAME_STATES.MAP;
                hideAllScreens();
                document.getElementById('boss-health-bar-container').style.display = 'none';
            } else {
                // After Boss 2, go to SHOP (normal progression)
                stateBeforeShop = null; // Clear context - this is normal shop progression
                gameState = GAME_STATES.SHOP;
                showScreen('shop-screen');
                updateShopUI();
            }
        }, 1000);
    }

    update(deltaTime) {
        // Override in subclasses
    }

    draw() {
        // Flash when hit
        if (Date.now() < this.hitFlashUntil) {
            ctx.fillStyle = 'white';
        }
    }

    checkPlayerCollision() {
        if (checkCollision(this, player)) {
            this.onPlayerHit();
        }
    }

    onPlayerHit() {
        player.takeDamage(1);
    }
}

// ==================== BOSS 1: NINJA STREET ====================
class NinjaStreet extends Boss {
    constructor() {
        super('Ninja Street', 3, 1);
        this.rotation = 0;
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.chargeDirection = { x: 0, y: 0 };
        this.chargeSpeed = 5;
    }

    update(deltaTime) {
        this.rotation += 0.05;
        this.stateTimer += deltaTime;

        if (this.state === 'IDLE' && this.stateTimer > 2000) {
            // Start charge
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.chargeDirection = { x: dx / dist, y: dy / dist };
            this.state = 'CHARGE';
            this.stateTimer = 0;
        } else if (this.state === 'CHARGE' && this.stateTimer > 800) {
            // End charge
            this.state = 'REST';
            this.stateTimer = 0;
        } else if (this.state === 'REST' && this.stateTimer > 600) {
            // Back to idle
            this.state = 'IDLE';
            this.stateTimer = 0;
        }

        // Movement during charge
        if (this.state === 'CHARGE') {
            this.x += this.chargeDirection.x * this.chargeSpeed;
            this.y += this.chargeDirection.y * this.chargeSpeed;

            // Bounce off walls
            if (this.x - this.width/2 < ARENA.x || this.x + this.width/2 > ARENA.x + ARENA.width) {
                this.chargeDirection.x *= -1;
                this.x = Math.max(ARENA.x + this.width/2, Math.min(ARENA.x + ARENA.width - this.width/2, this.x));
            }
            if (this.y - this.height/2 < ARENA.y || this.y + this.height/2 > ARENA.y + ARENA.height) {
                this.chargeDirection.y *= -1;
                this.y = Math.max(ARENA.y + this.height/2, Math.min(ARENA.y + ARENA.height - this.height/2, this.y));
            }
        }

        this.checkPlayerCollision();
    }

    draw() {
        super.draw();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const isHit = Date.now() < this.hitFlashUntil;

        // Shadow and glow
        if (!isHit) {
            ctx.shadowColor = 'rgba(44, 62, 80, 0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
        } else {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 20;
        }

        // Draw 4-point ninja star with gradient
        const starGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 35);
        if (isHit) {
            starGradient.addColorStop(0, '#ffffff');
            starGradient.addColorStop(1, '#f0f0f0');
            ctx.fillStyle = 'white';
        } else {
            starGradient.addColorStop(0, '#34495e');
            starGradient.addColorStop(0.5, '#2c3e50');
            starGradient.addColorStop(1, '#1a252f');
            ctx.fillStyle = starGradient;
        }

        ctx.strokeStyle = isHit ? 'white' : '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2);
            const outerX = Math.cos(angle) * 35;
            const outerY = Math.sin(angle) * 35;

            const innerAngle = angle + Math.PI / 4;
            const innerX = Math.cos(innerAngle) * 10;
            const innerY = Math.sin(innerAngle) * 10;

            if (i === 0) {
                ctx.moveTo(innerX, innerY);
            } else {
                ctx.lineTo(innerX, innerY);
            }

            // Create curved blade edge
            const cpX1 = Math.cos(angle - 0.2) * 20;
            const cpY1 = Math.sin(angle - 0.2) * 20;
            ctx.quadraticCurveTo(cpX1, cpY1, outerX, outerY);

            const nextInnerAngle = angle + Math.PI / 4;
            const nextInnerX = Math.cos(nextInnerAngle) * 10;
            const nextInnerY = Math.sin(nextInnerAngle) * 10;

            const cpX3 = Math.cos(angle + 0.2) * 20;
            const cpY3 = Math.sin(angle + 0.2) * 20;
            ctx.quadraticCurveTo(cpX3, cpY3, nextInnerX, nextInnerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add metallic shine to blades
        if (!isHit) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2);
                ctx.beginPath();
                const shineX = Math.cos(angle) * 25;
                const shineY = Math.sin(angle) * 25;
                ctx.arc(shineX, shineY, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw center hole with depth
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        const centerGradient = ctx.createRadialGradient(0, 0, 3, 0, 0, 8);
        centerGradient.addColorStop(0, '#1a252f');
        centerGradient.addColorStop(1, '#34495e');
        ctx.fillStyle = isHit ? '#e0e0e0' : centerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isHit ? 'white' : '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

// ==================== BOSS 2: SHADED HAIR ====================
class ShadedHair extends Boss {
    constructor() {
        super('Shaded Hair', 6, 4);
        this.state = 'WANDER';
        this.stateTimer = 0;
        this.wanderDirection = { x: 1, y: 0 };
        this.playerFrozen = false;
        this.freezeUntil = 0;
        this.stareAngle = 0;
    }

    update(deltaTime) {
        this.stateTimer += deltaTime;

        if (this.state === 'WANDER' && this.stateTimer > 2000) {
            this.state = 'STARE';
            this.stateTimer = 0;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.stareAngle = Math.atan2(dy, dx);
        } else if (this.state === 'STARE' && this.stateTimer > 1500) {
            // Check if player in stare cone
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angleToPlayer = Math.atan2(dy, dx);
            const angleDiff = Math.abs(angleToPlayer - this.stareAngle);

            if (dist < 200 && angleDiff < Math.PI / 4) {
                // Freeze player
                player.speed = 0;
                this.freezeUntil = Date.now() + 1000;
                this.playerFrozen = true;
            }

            this.state = 'LUNGE';
            this.stateTimer = 0;
        } else if (this.state === 'LUNGE' && this.stateTimer > 700) {
            this.state = 'WANDER';
            this.stateTimer = 0;
            this.wanderDirection = {
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1
            };
        }

        // Unfreeze player
        if (this.playerFrozen && Date.now() > this.freezeUntil) {
            player.speed = 2.5 + (purchasedUpgrades.speed ? 0.8 : 0);
            this.playerFrozen = false;
        }

        // Movement
        if (this.state === 'WANDER') {
            this.x += this.wanderDirection.x * 1.5;
            this.y += this.wanderDirection.y * 1.5;

            this.x = Math.max(ARENA.x + this.width/2, Math.min(ARENA.x + ARENA.width - this.width/2, this.x));
            this.y = Math.max(ARENA.y + this.height/2, Math.min(ARENA.y + ARENA.height - this.height/2, this.y));
        } else if (this.state === 'LUNGE') {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.x += (dx / dist) * 6;
                this.y += (dy / dist) * 6;
            }
        }

        this.checkPlayerCollision();
    }

    onPlayerHit() {
        if (this.state === 'LUNGE') {
            player.takeDamage(2);
        } else {
            player.takeDamage(1);
        }
    }

    draw() {
        super.draw();

        ctx.save();

        // Draw stare cone during stare with enhanced effect
        if (this.state === 'STARE') {
            ctx.save();
            const stareGradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, 200
            );
            stareGradient.addColorStop(0, 'rgba(255, 107, 107, 0.5)');
            stareGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
            ctx.fillStyle = stareGradient;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.arc(this.x, this.y, 200, this.stareAngle - Math.PI/4, this.stareAngle + Math.PI/4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        const isHit = Date.now() < this.hitFlashUntil;

        // Shadow
        ctx.shadowColor = isHit ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = isHit ? 20 : 12;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        // Draw body (circle) with gradient
        const bodyGradient = ctx.createRadialGradient(this.x - 8, this.y - 8, 5, this.x, this.y, 25);
        if (isHit) {
            bodyGradient.addColorStop(0, '#ffffff');
            bodyGradient.addColorStop(1, '#f0f0f0');
        } else {
            bodyGradient.addColorStop(0, '#ff6b6b');
            bodyGradient.addColorStop(1, '#c0392b');
        }
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Body outline
        ctx.strokeStyle = isHit ? '#fff' : '#962e22';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Reset shadow for details
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw cool sunglasses with gradient
        const glassGradient = ctx.createLinearGradient(this.x - 20, this.y - 5, this.x - 20, this.y + 3);
        glassGradient.addColorStop(0, '#1a1a1a');
        glassGradient.addColorStop(1, '#000000');

        // Left lens
        ctx.fillStyle = glassGradient;
        ctx.fillRect(this.x - 20, this.y - 5, 15, 8);
        // Lens reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x - 19, this.y - 4, 6, 3);

        // Right lens
        ctx.fillStyle = glassGradient;
        ctx.fillRect(this.x + 5, this.y - 5, 15, 8);
        // Lens reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 6, this.y - 4, 6, 3);

        // Sunglasses bridge and frame
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y - 1);
        ctx.lineTo(this.x + 5, this.y - 1);
        ctx.stroke();

        // Sunglasses arms
        ctx.beginPath();
        ctx.moveTo(this.x - 20, this.y - 1);
        ctx.lineTo(this.x - 28, this.y + 2);
        ctx.moveTo(this.x + 20, this.y - 1);
        ctx.lineTo(this.x + 28, this.y + 2);
        ctx.stroke();

        // Draw hair on top with gradient
        const hairGradient = ctx.createLinearGradient(this.x, this.y - 35, this.x, this.y - 25);
        hairGradient.addColorStop(0, '#ffed4e');
        hairGradient.addColorStop(1, '#ffc107');
        ctx.fillStyle = hairGradient;

        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x - 20 + i * 10, this.y - 25);
            ctx.lineTo(this.x - 15 + i * 10, this.y - 35);
            ctx.lineTo(this.x - 10 + i * 10, this.y - 25);
            ctx.closePath();
            ctx.fill();
            // Hair outline
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ==================== BOSS 3: SWORDS ====================
class Swords extends Boss {
    constructor() {
        super('Swords', 10, 10);
        this.slashTimer = 0;
        this.spinTimer = 0;
        this.isSlashing = false;
        this.slashAngle = 0;
        this.slashProgress = 0;
        this.swordRotation = 0;
        this.swordPositions = [
            { angle: 0, length: 45 },
            { angle: Math.PI / 2, length: 45 },
            { angle: Math.PI, length: 45 },
            { angle: Math.PI * 1.5, length: 45 }
        ];
        this.moveDirection = { x: 1, y: 0.5 };
    }

    update(deltaTime) {
        this.slashTimer += deltaTime;
        this.spinTimer += deltaTime;
        this.swordRotation += 0.03;

        // Slow movement
        this.x += this.moveDirection.x * 1;
        this.y += this.moveDirection.y * 1;

        // Bounce off walls
        if (this.x - this.width/2 < ARENA.x || this.x + this.width/2 > ARENA.x + ARENA.width) {
            this.moveDirection.x *= -1;
            this.x = Math.max(ARENA.x + this.width/2, Math.min(ARENA.x + ARENA.width - this.width/2, this.x));
        }
        if (this.y - this.height/2 < ARENA.y || this.y + this.height/2 > ARENA.y + ARENA.height) {
            this.moveDirection.y *= -1;
            this.y = Math.max(ARENA.y + this.height/2, Math.min(ARENA.y + ARENA.height - this.height/2, this.y));
        }

        // Slash attack
        if (this.slashTimer > 2000 && !this.isSlashing) {
            // Aim at player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.slashAngle = Math.atan2(dy, dx);
            this.isSlashing = true;
            this.slashProgress = 0;
            this.slashTimer = 0;
        }

        // Update slash
        if (this.isSlashing) {
            this.slashProgress += deltaTime / 400; // 400ms slash duration
            if (this.slashProgress >= 1) {
                this.isSlashing = false;
            } else if (this.slashProgress > 0.3 && this.slashProgress < 0.7) {
                // Check if swords hit player during slash
                this.checkSlashHit();
            }
        }

        // Spin attack
        if (this.spinTimer > 3500) {
            this.checkSpinHit();
            this.spinTimer = 0;
        }

        this.checkPlayerCollision();
    }

    checkSlashHit() {
        // Check if any sword is near player during slash
        // Use slashAngle directly (matching the visual orientation during slash)
        for (let i = 0; i < 4; i++) {
            const swordAngle = this.slashAngle + (i * Math.PI / 2);
            const swordX = this.x + Math.cos(swordAngle) * 45;
            const swordY = this.y + Math.sin(swordAngle) * 45;

            const dist = Math.sqrt((swordX - player.x) ** 2 + (swordY - player.y) ** 2);
            if (dist < 35) {
                player.takeDamage(2);
                return;
            }
        }
    }

    checkSpinHit() {
        // Check if player is within spin range (swords extend ~62px from center)
        const dist = Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2);
        if (dist < 80) {
            player.takeDamage(1);
        }
    }

    draw() {
        super.draw();

        ctx.save();
        ctx.translate(this.x, this.y);

        const isHit = Date.now() < this.hitFlashUntil;

        // Draw swords rotating around body (draw first so they appear behind)
        const baseRotation = this.isSlashing ? this.slashAngle : this.swordRotation;

        for (let i = 0; i < 4; i++) {
            const angle = baseRotation + (i * Math.PI / 2);
            ctx.save();
            ctx.rotate(angle);

            // Sword shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            // Sword blade with metallic gradient
            const bladeGradient = ctx.createLinearGradient(20, -4, 20, 4);
            bladeGradient.addColorStop(0, '#f8f9fa');
            bladeGradient.addColorStop(0.5, '#e9ecef');
            bladeGradient.addColorStop(1, '#dee2e6');
            ctx.fillStyle = bladeGradient;
            ctx.fillRect(20, -4, 35, 8);

            // Blade outline
            ctx.strokeStyle = '#95a5a6';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(20, -4, 35, 8);

            // Metallic shine on blade
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(25, -2, 25, 2);

            // Sword tip (pointed)
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#dee2e6';
            ctx.beginPath();
            ctx.moveTo(55, -4);
            ctx.lineTo(62, 0);
            ctx.lineTo(55, 4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#95a5a6';
            ctx.stroke();

            // Sword handle with gradient
            ctx.shadowBlur = 4;
            const handleGradient = ctx.createLinearGradient(15, -6, 15, 6);
            handleGradient.addColorStop(0, '#5a6268');
            handleGradient.addColorStop(0.5, '#495057');
            handleGradient.addColorStop(1, '#343a40');
            ctx.fillStyle = handleGradient;
            ctx.fillRect(15, -6, 10, 12);

            // Handle guard (crossguard)
            ctx.fillStyle = '#6c757d';
            ctx.fillRect(23, -8, 3, 16);

            // Handle grip details
            ctx.strokeStyle = '#212529';
            ctx.lineWidth = 1;
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.moveTo(17 + j * 2, -6);
                ctx.lineTo(17 + j * 2, 6);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Draw body (round with X shape) with depth
        ctx.shadowColor = isHit ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = isHit ? 20 : 15;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        const bodyGradient = ctx.createRadialGradient(-6, -6, 2, 0, 0, 22);
        if (isHit) {
            bodyGradient.addColorStop(0, '#ffffff');
            bodyGradient.addColorStop(1, '#f0f0f0');
        } else {
            bodyGradient.addColorStop(0, '#a569bd');
            bodyGradient.addColorStop(0.6, '#8e44ad');
            bodyGradient.addColorStop(1, '#6c3483');
        }
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // Body outline
        ctx.strokeStyle = isHit ? '#fff' : '#512e5f';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw X on body with glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = isHit ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = isHit ? '#000' : '#2c3e50';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, 12);
        ctx.moveTo(12, -12);
        ctx.lineTo(-12, 12);
        ctx.stroke();

        // Visual indicator during slash
        if (this.isSlashing && this.slashProgress < 0.8) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
            ctx.strokeStyle = 'rgba(255, 107, 107, 0.7)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 55, this.slashAngle - Math.PI/6, this.slashAngle + Math.PI/6);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ==================== COLLISION DETECTION ====================
function checkCollision(obj1, obj2) {
    return obj1.x - obj1.width/2 < obj2.x + obj2.width/2 &&
           obj1.x + obj1.width/2 > obj2.x - obj2.width/2 &&
           obj1.y - obj1.height/2 < obj2.y + obj2.height/2 &&
           obj1.y + obj1.height/2 > obj2.y - obj2.height/2;
}

// ==================== UI FUNCTIONS ====================
function updateUI() {
    // Update HP
    const hpDisplay = document.getElementById('hp-display');
    hpDisplay.innerHTML = '';
    for (let i = 0; i < player.maxHP; i++) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.textContent = i < player.hp ? '❤️' : '🖤';
        hpDisplay.appendChild(heart);
    }

    // Update Hair Points
    document.getElementById('hair-points-display').textContent = `Hair Points: ${hairPoints}`;
}

function updateBossHealthBar() {
    if (!boss) return;

    const container = document.getElementById('boss-health-bar-container');
    const nameEl = document.getElementById('boss-name');
    const fillEl = document.getElementById('boss-health-fill');

    container.style.display = 'block';
    nameEl.textContent = boss.name;

    const percentage = (boss.hp / boss.maxHP) * 100;
    fillEl.style.width = percentage + '%';
}

function updateShopUI() {
    document.getElementById('shop-hair-points').textContent = `Hair Points: ${hairPoints}`;

    // Update upgrade buttons
    const buttons = document.querySelectorAll('.upgrade-button');
    buttons.forEach(btn => {
        const upgrade = btn.dataset.upgrade;
        const cost = parseInt(btn.dataset.cost);

        // Allow repeat purchases - only disable if not enough hair points
        if (hairPoints < cost) {
            btn.disabled = true;
            btn.classList.remove('sold');
        } else {
            btn.disabled = false;
            btn.classList.remove('sold');
        }
    });

    // Show/hide cosmetics tab
    const cosmeticsTab = document.getElementById('cosmetics-tab');
    if (hasBeatenGame) {
        cosmeticsTab.style.display = 'block';
        updateCosmeticButtons();
    } else {
        cosmeticsTab.style.display = 'none';
    }

    // Update weapon buttons
    updateWeaponButtons();

    // Show/hide continue and back buttons based on context
    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');

    if (stateBeforeShop !== null) {
        // Opened shop from gameplay - show back button
        continueButton.style.display = 'none';
        backButton.style.display = 'block';
    } else {
        // Normal shop progression - show continue button
        continueButton.style.display = 'block';
        backButton.style.display = 'none';
    }
}

function updateWeaponButtons() {
    const weaponButtons = document.querySelectorAll('.weapon-button');
    weaponButtons.forEach(btn => {
        const weapon = btn.dataset.weapon;
        const cost = parseInt(btn.dataset.cost);

        // Check unlock status
        // highestBossDefeated is 0-indexed: 0 = Boss 1, 1 = Boss 2, 2 = Boss 3
        let unlocked = false;
        if (weapon === 'sword' && highestBossDefeated >= 0) unlocked = true; // After Boss 1
        if (weapon === 'blaster' && highestBossDefeated >= 1) unlocked = true; // After Boss 2
        if ((weapon === 'lightning' || weapon === 'flamethrower') && highestBossDefeated >= 2) unlocked = true; // After Boss 3

        // Check if owned
        const isOwned = ownedWeapons.includes(weapon);
        const isEquipped = equippedWeapon === weapon;

        btn.classList.remove('owned', 'equipped');

        if (!unlocked) {
            btn.textContent = 'LOCKED';
            btn.disabled = true;
        } else if (isEquipped) {
            btn.textContent = 'EQUIPPED';
            btn.classList.add('equipped');
            btn.disabled = true;
        } else if (isOwned) {
            btn.textContent = 'EQUIP';
            btn.classList.add('owned');
            btn.disabled = false;
        } else if (hairPoints < cost) {
            btn.textContent = `Buy (${cost} Hair Points)`;
            btn.disabled = true;
        } else {
            btn.textContent = `Buy (${cost} Hair Points)`;
            btn.disabled = false;
        }
    });
}

function updateCosmeticButtons() {
    const cosmeticButtons = document.querySelectorAll('.cosmetic-button');
    cosmeticButtons.forEach(btn => {
        const cosmeticType = btn.dataset.cosmetic;
        const cosmeticValue = btn.dataset.value;
        const cost = parseInt(btn.dataset.cost);

        // Check if already owned
        const isOwned = (cosmeticType === 'hair' && ownedCosmetics.hair.includes(cosmeticValue)) ||
                        (cosmeticType === 'vehicle' && ownedCosmetics.vehicle.includes(cosmeticValue));

        // Check if currently equipped
        const isEquipped = cosmetics[cosmeticType] === cosmeticValue;

        btn.classList.remove('owned', 'equipped');

        if (isEquipped) {
            btn.textContent = 'EQUIPPED';
            btn.classList.add('equipped');
            btn.disabled = true;
        } else if (isOwned) {
            btn.textContent = 'EQUIP';
            btn.classList.add('owned');
            btn.disabled = false;
        } else if (hairPoints < cost) {
            btn.textContent = `Buy (${cost} Hair Points)`;
            btn.disabled = true;
        } else {
            btn.textContent = `Buy (${cost} Hair Points)`;
            btn.disabled = false;
        }
    });
}

function updateShopButton() {
    const shopButton = document.getElementById('shop-access-button');

    // Show shop button during gameplay states, hide during boss fights and screens
    if (gameState === GAME_STATES.MAP ||
        gameState === GAME_STATES.SHIP_AREA ||
        gameState === GAME_STATES.STREAM_AREA ||
        gameState === GAME_STATES.GUARD_AREA) {
        shopButton.style.display = 'block';
    } else {
        shopButton.style.display = 'none';
    }
}

function showFloatingText(text, x, y) {
    const container = document.getElementById('floating-texts');
    const textEl = document.createElement('div');
    textEl.className = 'floating-text';
    textEl.textContent = text;
    textEl.style.left = x + 'px';
    textEl.style.top = y + 'px';
    container.appendChild(textEl);

    setTimeout(() => {
        textEl.remove();
    }, 1500);
}

function updateLoseScreen() {
    const loseScreen = document.getElementById('lose-screen');

    if (previousGameState === GAME_STATES.FIGHT) {
        const bossNames = ['Ninja Street', 'Shaded Hair', 'Swords'];
        loseScreen.querySelector('p').textContent =
            `Defeated by ${bossNames[currentBoss]}! Try again?`;
    } else if (previousGameState === GAME_STATES.STREAM_AREA) {
        loseScreen.querySelector('p').textContent =
            'Defeated by porcupines! Return to map?';
    } else {
        loseScreen.querySelector('p').textContent =
            'You were defeated! Try again?';
    }
}

// ==================== SCREEN MANAGEMENT ====================
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
}

function showScreen(screenId) {
    hideAllScreens();
    document.getElementById(screenId).style.display = 'block';
}

// ==================== MAP SYSTEM ====================
const MAP_LOCATIONS = {
    ship: { x: 150, y: 450, width: 100, height: 80, label: 'Busted Ship' },
    stream: { x: 600, y: 450, width: 100, height: 80, label: 'Spiky Stream' },
    boss2: { x: 600, y: 100, width: 100, height: 80, label: 'Boss 2' }
};

function drawMap() {
    // Draw background
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw path lines
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(MAP_LOCATIONS.ship.x + 50, MAP_LOCATIONS.ship.y);
    ctx.lineTo(MAP_LOCATIONS.stream.x + 50, MAP_LOCATIONS.stream.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(MAP_LOCATIONS.stream.x + 50, MAP_LOCATIONS.stream.y);
    ctx.lineTo(MAP_LOCATIONS.boss2.x + 50, MAP_LOCATIONS.boss2.y + 80);
    ctx.stroke();

    // Draw locations
    for (const key in MAP_LOCATIONS) {
        const loc = MAP_LOCATIONS[key];

        // Location box
        ctx.fillStyle = '#fff3e0';
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3;
        ctx.fillRect(loc.x, loc.y, loc.width, loc.height);
        ctx.strokeRect(loc.x, loc.y, loc.width, loc.height);

        // Label
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(loc.label, loc.x + loc.width/2, loc.y + loc.height/2 + 5);

        // Special indicators
        if (key === 'ship' && !questState.shipRepaired) {
            ctx.fillStyle = '#ff5252';
            ctx.font = '10px Arial';
            ctx.fillText('BROKEN', loc.x + loc.width/2, loc.y - 10);
        }
        if (key === 'boss2' && !questState.guardDefeated) {
            ctx.fillStyle = '#ff5252';
            ctx.font = '10px Arial';
            ctx.fillText('LOCKED', loc.x + loc.width/2, loc.y - 10);
        }
    }

    // Draw player on map as actual character (scaled down)
    ctx.save();
    const mw = 20, mh = 20; // map character size
    // Body
    const mapBodyGrad = ctx.createLinearGradient(
        player.x - mw/2, player.y - mh/2,
        player.x + mw/2, player.y + mh/2
    );
    mapBodyGrad.addColorStop(0, '#6ee7d7');
    mapBodyGrad.addColorStop(1, '#3ab5a8');
    ctx.fillStyle = mapBodyGrad;
    ctx.fillRect(player.x - mw/2, player.y - mh/2, mw, mh);
    ctx.strokeStyle = '#2a9d8f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(player.x - mw/2, player.y - mh/2, mw, mh);
    // Hair (simplified version matching current cosmetic)
    drawPlayerHair(player.x, player.y, mw, mh);
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(player.x + 4, player.y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y + 3, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();

    // Instructions
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Walk to a location to explore!', canvas.width/2, 30);

    // Check if player is at a location
    for (const key in MAP_LOCATIONS) {
        const loc = MAP_LOCATIONS[key];
        if (checkCollision(
            {x: player.x, y: player.y, width: 30, height: 30},
            {x: loc.x + loc.width/2, y: loc.y + loc.height/2, width: loc.width, height: loc.height}
        )) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
            ctx.fillStyle = '#ffd93d';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(`Press SPACE to enter ${loc.label}`, canvas.width/2, canvas.height - 30);

            // Handle entry
            if (keys.space) {
                enterLocation(key);
            }
        }
    }
}

function enterLocation(locationKey) {
    if (locationKey === 'ship') {
        gameState = GAME_STATES.SHIP_AREA;
        player.x = 400;
        player.y = 400;
    } else if (locationKey === 'stream') {
        gameState = GAME_STATES.STREAM_AREA;
        player.x = 100;
        player.y = 400;
        if (!questState.porcupinesDefeated) {
            spawnPorcupines();
        }
    } else if (locationKey === 'boss2') {
        gameState = GAME_STATES.GUARD_AREA;
        player.x = 400;
        player.y = 500;
        if (!questState.guardDefeated) {
            spawnGuard();
        }
    }
}

// ==================== PORCUPINE ENEMY ====================
class Porcupine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.hp = 3;
        this.maxHP = 3;
        this.speed = 1.5;
        this.hitFlashUntil = 0;
        this.defeated = false;
    }

    update() {
        if (this.defeated) return;

        // Move toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist > 50) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // Check collision with player
        if (checkCollision(this, player)) {
            player.takeDamage(1);
        }

        // Check arrow/projectile collisions
        playerArrows.forEach(arrow => {
            if (arrow.active && checkCollision(arrow, this)) {
                const damage = arrow.damage || 1; // Use projectile damage if available
                this.takeDamage(damage);
                arrow.active = false;
            }
        });
    }

    takeDamage(amount) {
        if (this.defeated) return;

        this.hp -= amount;
        this.hitFlashUntil = Date.now() + 100;

        if (this.hp <= 0) {
            this.defeated = true;
            hairPoints += 2;
            showFloatingText('+2 Hair!', this.x, this.y);
            updateUI();
        }
    }

    draw() {
        if (this.defeated) return;

        ctx.save();

        const isHit = Date.now() < this.hitFlashUntil;

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Body with gradient
        const bodyGradient = ctx.createRadialGradient(
            this.x - 6, this.y - 6, 3,
            this.x, this.y, 20
        );
        if (isHit) {
            bodyGradient.addColorStop(0, '#ffffff');
            bodyGradient.addColorStop(1, '#f0f0f0');
        } else {
            bodyGradient.addColorStop(0, '#a1887f');
            bodyGradient.addColorStop(1, '#6d4c41');
        }
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Body outline
        ctx.strokeStyle = isHit ? '#fff' : '#4e342e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spikes with gradient
        ctx.shadowBlur = 4;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const spikeGradient = ctx.createLinearGradient(
                this.x + Math.cos(angle) * 15,
                this.y + Math.sin(angle) * 15,
                this.x + Math.cos(angle) * 28,
                this.y + Math.sin(angle) * 28
            );
            spikeGradient.addColorStop(0, isHit ? '#fff' : '#5d4037');
            spikeGradient.addColorStop(1, isHit ? '#f0f0f0' : '#3e2723');

            ctx.strokeStyle = spikeGradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(angle) * 15, this.y + Math.sin(angle) * 15);
            ctx.lineTo(this.x + Math.cos(angle) * 28, this.y + Math.sin(angle) * 28);
            ctx.stroke();
        }

        // Eyes
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 6, this.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 6, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // HP bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - 20, this.y - 35, 40, 5);

        const hpGradient = ctx.createLinearGradient(this.x - 20, this.y - 35, this.x + 20, this.y - 35);
        hpGradient.addColorStop(0, '#4caf50');
        hpGradient.addColorStop(1, '#8bc34a');
        ctx.fillStyle = hpGradient;
        ctx.fillRect(this.x - 20, this.y - 35, 40 * (this.hp / this.maxHP), 5);

        // HP bar border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - 20, this.y - 35, 40, 5);
    }
}

let porcupines = [];

function spawnPorcupines() {
    porcupines = [
        new Porcupine(300, 200),
        new Porcupine(500, 200)
    ];
}

function checkPorcupinesDefeated() {
    if (porcupines.every(p => p.defeated) && !questState.hasShipComponent) {
        questState.hasShipComponent = true;
        questState.porcupinesDefeated = true;
        showFloatingText('Got Ship Component!', 400, 200);
    }
}

// ==================== GUARD ENEMY ====================
class Guard {
    constructor() {
        this.x = 400;
        this.y = 200;
        this.width = 60;
        this.height = 80;
        this.invincible = !questState.guardDefeated;
    }

    draw() {
        // Draw guard body
        ctx.fillStyle = '#455a64';
        ctx.fillRect(this.x - 30, this.y - 40, 60, 80);

        // Helmet
        ctx.fillStyle = '#37474f';
        ctx.fillRect(this.x - 25, this.y - 60, 50, 25);

        // Shield
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 35, 0, Math.PI * 2);
        ctx.fill();

        // Invincible indicator
        if (this.invincible) {
            ctx.fillStyle = '#ffd93d';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('INVINCIBLE', this.x, this.y - 80);
        }
    }
}

let guard = null;

function spawnGuard() {
    guard = new Guard();
}

// ==================== SHIP SYSTEM ====================
let ship = {
    x: 200,
    y: 300,
    width: 120,
    height: 80,
    steering: false
};

function drawShipArea() {
    // Background
    ctx.fillStyle = '#81d4fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Water
    ctx.fillStyle = '#0288d1';
    ctx.fillRect(0, 400, canvas.width, 200);

    // Ship
    ctx.fillStyle = questState.shipRepaired ? '#8d6e63' : '#5d4037';
    ctx.fillRect(ship.x, ship.y, ship.width, ship.height);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(ship.x + 40, ship.y - 30, 20, 40);

    // Ship status text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';

    if (!questState.shipRepaired) {
        if (questState.hasShipComponent) {
            ctx.fillText('Press SPACE to repair ship', canvas.width/2, 50);
            if (keys.space) {
                questState.shipRepaired = true;
                showFloatingText('Ship Repaired!', ship.x + 60, ship.y);
            }
        } else {
            ctx.fillText('Ship is broken! Need a component...', canvas.width/2, 50);
        }
    } else {
        ctx.fillText('Press E to steer ship / ESC to exit', canvas.width/2, 50);
        if (keys.e && !ship.steering) {
            ship.steering = true;
        }
    }

    // Steering mode
    if (ship.steering) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sailing to Boss 2 area...', canvas.width/2, canvas.height/2);

        setTimeout(() => {
            ship.steering = false;
            gameState = GAME_STATES.GUARD_AREA;
            player.x = 100;
            player.y = 400;
            shipAtGuard = true;
        }, 2000);
    }

    // Exit prompt
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText('Press ESC to return to map', canvas.width/2, canvas.height - 20);
}

let shipAtGuard = false;

function drawGuardArea() {
    // Background
    ctx.fillStyle = '#bcaaa4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Door to Boss 2
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(350, 50, 100, 120);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(360, 60, 80, 100);

    // Guard
    if (guard && !questState.guardDefeated) {
        guard.draw();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('The guard blocks the door!', canvas.width/2, 350);
    }

    // Ship (if sailed here)
    if (shipAtGuard && !questState.guardDefeated) {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(50, 450, 100, 70);

        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Press SPACE to fire cannon!', 150, 400);

        if (keys.space && !questState.guardDefeated) {
            questState.guardDefeated = true;
            guard = null;
            showFloatingText('Guard Defeated!', 400, 200);
        }
    } else if (!questState.guardDefeated) {
        ctx.fillStyle = '#ff5252';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Need the ship to defeat the guard!', canvas.width/2, 500);
    }

    // If guard defeated, allow entry
    if (questState.guardDefeated) {
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to enter Boss 2!', canvas.width/2, 400);

        if (keys.space) {
            startBossFight();
            return;
        }
    }

    // Exit prompt
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText('Press ESC to return to map', canvas.width/2, canvas.height - 20);
}

function drawStreamArea() {
    // Background
    ctx.fillStyle = '#aed581';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stream
    ctx.fillStyle = '#4fc3f7';
    for (let i = 0; i < 10; i++) {
        ctx.fillRect(200 + i * 5, 100 + i * 40, 40, 30);
    }

    // Porcupines
    porcupines.forEach(p => {
        p.update();
        p.draw();
    });

    checkPorcupinesDefeated();

    if (questState.porcupinesDefeated) {
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Porcupines defeated! Got ship component!', canvas.width/2, 50);
    }

    // Exit prompt
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText('Press ESC to return to map', canvas.width/2, canvas.height - 20);
}

// ==================== BOSS MANAGEMENT ====================
let boss = null;

function createBoss(index) {
    switch(index) {
        case 0: return new NinjaStreet();
        case 1: return new ShadedHair();
        case 2: return new Swords();
        default: return null;
    }
}

function startBossFight() {
    boss = createBoss(currentBoss);
    player.reset();
    gameState = GAME_STATES.FIGHT;
    hideAllScreens();
    updateBossHealthBar();
}

// ==================== GAME LOOP ====================
let lastTime = Date.now();

function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;

    // Clear canvas
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update shop button visibility
    updateShopButton();

    if (gameState === GAME_STATES.MAP) {
        drawMap();
        player.update(deltaTime);
    } else if (gameState === GAME_STATES.SHIP_AREA) {
        drawShipArea();
        player.draw();
    } else if (gameState === GAME_STATES.STREAM_AREA) {
        drawStreamArea();
        player.update(deltaTime);
        player.draw();
    } else if (gameState === GAME_STATES.GUARD_AREA) {
        drawGuardArea();
        player.draw();
    } else if (gameState === GAME_STATES.FIGHT) {
        // Draw arena
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 3;
        ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
        ctx.fillStyle = '#34495e';
        ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

        if (boss && !boss.defeated) {
            boss.update(deltaTime);
            boss.draw();
            player.update(deltaTime);
            player.draw();
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==================== EVENT LISTENERS ====================
document.getElementById('start-button').addEventListener('click', () => {
    startBossFight();
});

document.getElementById('continue-button').addEventListener('click', () => {
    stateBeforeShop = null; // Clear shop context
    startBossFight();
});

document.getElementById('back-button').addEventListener('click', () => {
    // Return to previous state
    if (stateBeforeShop) {
        gameState = stateBeforeShop;
        stateBeforeShop = null;
        hideAllScreens();
    }
});

document.getElementById('shop-access-button').addEventListener('click', () => {
    // Save current state and open shop
    stateBeforeShop = gameState;
    gameState = GAME_STATES.SHOP;
    showScreen('shop-screen');
    updateShopUI();
});

document.getElementById('play-again-button').addEventListener('click', () => {
    resetGame(true); // Keep upgrades when playing again after victory
});

document.getElementById('restart-button').addEventListener('click', () => {
    // Respawn based on where player died
    player.reset();
    hideAllScreens();

    if (previousGameState === GAME_STATES.FIGHT) {
        // Died in boss fight - retry the boss
        startBossFight();
    } else if (previousGameState === GAME_STATES.STREAM_AREA) {
        // Died in stream area - return to map
        gameState = GAME_STATES.MAP;
        player.x = 400;
        player.y = 300;
    } else {
        // Any other death - return to map
        gameState = GAME_STATES.MAP;
        player.x = 400;
        player.y = 300;
    }
});

document.querySelectorAll('.upgrade-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const upgrade = btn.dataset.upgrade;
        const cost = parseInt(btn.dataset.cost);

        // Allow repeat purchases - only check hair points
        if (hairPoints >= cost) {
            hairPoints -= cost;
            purchasedUpgrades[upgrade] = true; // Track that it was purchased at least once

            // Apply upgrade (stackable!)
            if (upgrade === 'maxhp') {
                player.maxHP += 1;
                player.hp = player.maxHP;
            } else if (upgrade === 'speed') {
                player.speed += 0.8;
            } else if (upgrade === 'attack') {
                player.attackCooldown = Math.max(150, player.attackCooldown - 100);
            }

            updateUI();
            updateShopUI();
        }
    });
});

document.querySelectorAll('.cosmetic-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const cosmeticType = btn.dataset.cosmetic;
        const cosmeticValue = btn.dataset.value;
        const cost = parseInt(btn.dataset.cost);

        // Check if already owned
        const isOwned = (cosmeticType === 'hair' && ownedCosmetics.hair.includes(cosmeticValue)) ||
                        (cosmeticType === 'vehicle' && ownedCosmetics.vehicle.includes(cosmeticValue));

        if (isOwned) {
            // Just equip it
            cosmetics[cosmeticType] = cosmeticValue;
            updateShopUI();
        } else if (hairPoints >= cost) {
            // Purchase and equip
            hairPoints -= cost;
            ownedCosmetics[cosmeticType].push(cosmeticValue);
            cosmetics[cosmeticType] = cosmeticValue;
            updateUI();
            updateShopUI();
        }
    });
});

document.querySelectorAll('.weapon-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const weapon = btn.dataset.weapon;
        const cost = parseInt(btn.dataset.cost);

        // Check if owned
        const isOwned = ownedWeapons.includes(weapon);

        if (isOwned) {
            // Just equip it
            equippedWeapon = weapon;
            updateShopUI();
        } else if (hairPoints >= cost) {
            // Purchase and equip
            hairPoints -= cost;
            ownedWeapons.push(weapon);
            equippedWeapon = weapon;
            updateUI();
            updateShopUI();
        }
    });
});

// Shop tab switching
document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Remove active class from all tabs and content
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    });
});

function resetGame(keepUpgrades = false) {
    gameState = GAME_STATES.TITLE;
    currentBoss = 0;

    // Reset quest state
    questState = {
        hasShipComponent: false,
        shipRepaired: false,
        guardDefeated: false,
        porcupinesDefeated: false
    };

    if (!keepUpgrades) {
        // Full reset - lose everything
        hairPoints = 0;
        purchasedUpgrades = { maxhp: false, speed: false, attack: false };
        player.maxHP = 3;
        player.hp = 3;
        player.speed = 2.5;
        player.attackCooldown = 300;
    } else {
        // Keep upgrades AND hair points - just reset HP to current max
        player.hp = player.maxHP;
        // hairPoints stays the same
    }

    boss = null;
    porcupines = [];
    guard = null;
    shipAtGuard = false;
    showScreen('title-screen');
    updateUI();
    document.getElementById('boss-health-bar-container').style.display = 'none';
}

// ==================== INIT ====================
updateUI();
gameLoop();
