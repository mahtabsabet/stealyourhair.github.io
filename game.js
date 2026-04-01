// ==================== GAME CONSTANTS ====================
const GAME_STATES = {
    TITLE: 'TITLE',
    FIGHT: 'FIGHT',
    SHOP: 'SHOP',
    MAP: 'MAP',
    SHIP_AREA: 'SHIP_AREA',
    STREAM_AREA: 'STREAM_AREA',
    GUARD_AREA: 'GUARD_AREA',
    BIG_TIME_WORLD: 'BIG_TIME_WORLD',
    SCHOOL_AREA: 'SCHOOL_AREA',
    WIN: 'WIN',
    LOSE: 'LOSE',
    MARS_WORLD: 'MARS_WORLD'
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
    porcupinesDefeated: false,
    iceBlockHP: 5,
    iceBlockBroken: false,
    computerAnswered: false
};

// ==================== MARS WORLD STATE ====================
let marsPhase = 'explore'; // 'explore' | 'button_pressed'
let marsButtonPressed = false;
let showingMarsTransition = false;

// ==================== SCHOOL LEVEL STATE ====================
let schoolPhase = 'inside'; // 'inside' | 'outside'
let schoolEntryTime = 0;
let schoolBellRung = false;
let showingWarTransition = false;

// Boss projectiles (used by Spider Spit Bus)
let bossProjectiles = [];
let playerInShelter = false;

// Mars house shelter position in the fight arena (center-based coords)
const MARS_FIGHT_HOUSE = { x: 140, y: 325, width: 120, height: 100 };

// Shelter bus positions in the fight arena (center-based coords)
const SHELTER_BUSES = [
    { x: 100, y: 300, width: 110, height: 55 },   // left side
    { x: 700, y: 300, width: 110, height: 55 },   // right side
    { x: 400, y: 490, width: 110, height: 55 }    // bottom
];

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
            gameState === GAME_STATES.GUARD_AREA ||
            gameState === GAME_STATES.SCHOOL_AREA) {
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

        // Check ice block collision
        if (gameState === GAME_STATES.BIG_TIME_WORLD && !questState.iceBlockBroken) {
            const iceBlockObj = { x: 325, y: 200, width: 150, height: 130 };
            if (checkCollision(this, iceBlockObj)) {
                questState.iceBlockHP = Math.max(0, questState.iceBlockHP - 1);
                if (questState.iceBlockHP <= 0) {
                    questState.iceBlockBroken = true;
                    showFloatingText('Ice Shattered!', 400, 230);
                } else {
                    showFloatingText('CRACK!', 400, 230);
                }
                this.active = false;
            }
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

        // Check ice block collision
        if (gameState === GAME_STATES.BIG_TIME_WORLD && !questState.iceBlockBroken) {
            const iceBlockObj = { x: 325, y: 200, width: 150, height: 130 };
            if (checkCollision(this, iceBlockObj)) {
                questState.iceBlockHP = Math.max(0, questState.iceBlockHP - this.damage);
                if (questState.iceBlockHP <= 0) {
                    questState.iceBlockBroken = true;
                    showFloatingText('Ice Shattered!', 400, 230);
                } else {
                    showFloatingText('CRACK!', 400, 230);
                }
                this.active = false;
            }
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

// ==================== SPRITES ====================
const flamethrowerSprite = new Image();
flamethrowerSprite.src = 'sprites/flamethrower.png';

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
    facingRight: true,

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

        // Track facing direction
        if (dx > 0) this.facingRight = true;
        else if (dx < 0) this.facingRight = false;

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
        if (playerInShelter) return; // Can't attack from inside a shelter bus
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
            // Check ice block
            if (gameState === GAME_STATES.BIG_TIME_WORLD && !questState.iceBlockBroken) {
                const iceBlockObj = { x: 325, y: 200, width: 150, height: 130 };
                if (checkCollision(attackBox, iceBlockObj)) {
                    questState.iceBlockHP = Math.max(0, questState.iceBlockHP - 2);
                    if (questState.iceBlockHP <= 0) {
                        questState.iceBlockBroken = true;
                        showFloatingText('Ice Shattered!', 400, 230);
                    } else {
                        showFloatingText('CRACK!', 400, 230);
                    }
                }
            }

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
            // Check ice block
            if (gameState === GAME_STATES.BIG_TIME_WORLD && !questState.iceBlockBroken) {
                const iceBlockObj = { x: 325, y: 200, width: 150, height: 130 };
                if (checkCollision(attackBox, iceBlockObj)) {
                    questState.iceBlockHP = Math.max(0, questState.iceBlockHP - 1);
                    if (questState.iceBlockHP <= 0) {
                        questState.iceBlockBroken = true;
                        showFloatingText('Ice Shattered!', 400, 230);
                    } else {
                        showFloatingText('CRACK!', 400, 230);
                    }
                }
            }

            // Visual feedback
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffd93d';
            ctx.fillRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
            ctx.restore();
        }
    },

    shootArrow() {
        if (playerInShelter) return; // Can't attack from inside a shelter bus
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

        // Draw equipped flamethrower sprite
        if (equippedWeapon === 'flamethrower' && flamethrowerSprite.complete) {
            const w = 56;
            const h = 33;
            const offsetY = 5; // align to player mid-lower area (arm height)
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            if (this.facingRight) {
                // Image fires left; flip it so barrel points right
                ctx.scale(-1, 1);
                ctx.drawImage(flamethrowerSprite, -(this.x + this.width / 2 + w), this.y - h / 2 + offsetY, w, h);
            } else {
                ctx.drawImage(flamethrowerSprite, this.x - this.width / 2 - w, this.y - h / 2 + offsetY, w, h);
            }
            ctx.restore();
        }

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
        saveGame();

        setTimeout(() => {
            currentBoss++;
            if (currentBoss >= 6) {
                hasBeatenGame = true; // Unlock cosmetics!
                saveGame();
                gameState = GAME_STATES.WIN;
                showScreen('win-screen');
                document.getElementById('final-hair-points').textContent =
                    `Total Hair Points: ${hairPoints}`;
            } else if (currentBoss === 5) {
                // After Boss 4 (Spider Spit Bus) defeated, head to Mars!
                marsPhase = 'explore';
                marsButtonPressed = false;
                showingMarsTransition = false;
                playerInShelter = false;
                player.x = 150;
                player.y = 380;
                gameState = GAME_STATES.MARS_WORLD;
                hideAllScreens();
                document.getElementById('boss-health-bar-container').style.display = 'none';
            } else if (currentBoss === 1) {
                // After Boss 1, go to MAP (world exploration)
                gameState = GAME_STATES.MAP;
                hideAllScreens();
                document.getElementById('boss-health-bar-container').style.display = 'none';
            } else if (currentBoss === 3) {
                // After Boss 3 (Swords), enter The Big Time World
                player.x = 400;
                player.y = 450;
                gameState = GAME_STATES.BIG_TIME_WORLD;
                hideAllScreens();
                document.getElementById('boss-health-bar-container').style.display = 'none';
            } else if (currentBoss === 4) {
                // After Boss 4 (Mutant Hair), enter the School
                schoolPhase = 'inside';
                schoolEntryTime = Date.now();
                schoolBellRung = false;
                showingWarTransition = false;
                player.x = 400;
                player.y = 400;
                gameState = GAME_STATES.SCHOOL_AREA;
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

// ==================== BOSS 4: MUTANT HAIR ====================
class MutantHair extends Boss {
    constructor() {
        super('Mutant Hair', 12, 16);
        this.width = 120;
        this.height = 120;
        this.chargeTimer = 0;
        this.isCharging = false;
        this.chargeSpeed = 0;
        this.chargeDir = { x: 0, y: 0 };
        this.whipTimer = 0;
        this.isWhipping = false;
        this.whipAngle = 0;
        this.whipProgress = 0;
        this.hairAngle = 0;
    }

    update(deltaTime) {
        // NaN recovery: if position got corrupted, reset to arena center
        if (!isFinite(this.x) || !isFinite(this.y)) {
            this.x = ARENA.x + ARENA.width / 2;
            this.y = ARENA.y + ARENA.height / 2;
            this.isCharging = false;
            this.chargeSpeed = 0;
        }

        this.hairAngle += 0.05;
        this.chargeTimer += deltaTime;
        this.whipTimer += deltaTime;

        if (!this.isCharging) {
            // Slowly track player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.x += (dx / dist) * 1.5;
                this.y += (dy / dist) * 1.5;
            }
        }

        // Bounce off arena walls
        if (this.x - this.width/2 < ARENA.x) this.x = ARENA.x + this.width/2;
        if (this.x + this.width/2 > ARENA.x + ARENA.width) this.x = ARENA.x + ARENA.width - this.width/2;
        if (this.y - this.height/2 < ARENA.y) this.y = ARENA.y + this.height/2;
        if (this.y + this.height/2 > ARENA.y + ARENA.height) this.y = ARENA.y + ARENA.height - this.height/2;

        // Charge attack every 3 seconds
        if (this.chargeTimer > 3000 && !this.isCharging) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                this.chargeDir = { x: dx / dist, y: dy / dist };
            } else {
                // Player is on top of boss — charge in a random direction
                const angle = Math.random() * Math.PI * 2;
                this.chargeDir = { x: Math.cos(angle), y: Math.sin(angle) };
            }
            this.isCharging = true;
            this.chargeSpeed = 8;
            this.chargeTimer = 0;
        }

        if (this.isCharging) {
            this.x += this.chargeDir.x * this.chargeSpeed;
            this.y += this.chargeDir.y * this.chargeSpeed;
            this.chargeSpeed -= 0.2;

            if (this.x - this.width/2 < ARENA.x || this.x + this.width/2 > ARENA.x + ARENA.width) {
                this.chargeDir.x *= -1;
                this.x = Math.max(ARENA.x + this.width/2, Math.min(ARENA.x + ARENA.width - this.width/2, this.x));
            }
            if (this.y - this.height/2 < ARENA.y || this.y + this.height/2 > ARENA.y + ARENA.height) {
                this.chargeDir.y *= -1;
                this.y = Math.max(ARENA.y + this.height/2, Math.min(ARENA.y + ARENA.height - this.height/2, this.y));
            }

            if (this.chargeSpeed <= 0) {
                this.isCharging = false;
                this.chargeSpeed = 0;
            }
        }

        // Hair whip attack every 2.5 seconds
        if (this.whipTimer > 2500 && !this.isWhipping) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.whipAngle = Math.atan2(dy, dx);
            this.isWhipping = true;
            this.whipProgress = 0;
            this.whipTimer = 0;
        }

        if (this.isWhipping) {
            this.whipProgress += deltaTime / 500;
            if (this.whipProgress >= 1) {
                this.isWhipping = false;
            } else if (this.whipProgress > 0.2 && this.whipProgress < 0.8) {
                // Whip extends 130px - check hit
                const whipX = this.x + Math.cos(this.whipAngle) * 130;
                const whipY = this.y + Math.sin(this.whipAngle) * 130;
                const dist = Math.sqrt((whipX - player.x) ** 2 + (whipY - player.y) ** 2);
                if (dist < 55) {
                    player.takeDamage(1);
                }
            }
        }

        this.checkPlayerCollision();
    }

    draw() {
        super.draw();

        ctx.save();
        ctx.translate(this.x, this.y);

        // Animated hair tentacles (8 thick ones, very long)
        const hairColors = ['#8B0000', '#c0392b', '#922b21', '#e74c3c', '#7b241c', '#cb4335', '#a93226', '#e55039'];
        for (let i = 0; i < 8; i++) {
            const angle = this.hairAngle + (i * Math.PI / 4);
            const len = 75 + Math.sin(this.hairAngle * 2 + i) * 20;
            const midX = Math.cos(angle + 0.5) * len * 0.5;
            const midY = Math.sin(angle + 0.5) * len * 0.5;
            const endX = Math.cos(angle) * len;
            const endY = Math.sin(angle) * len;
            ctx.strokeStyle = hairColors[i % hairColors.length];
            ctx.lineWidth = 9;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
            // Hair tip bulb
            ctx.fillStyle = hairColors[i % hairColors.length];
            ctx.beginPath();
            ctx.arc(endX, endY, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Body
        const bodyGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
        bodyGrad.addColorStop(0, '#7d3c98');
        bodyGrad.addColorStop(1, '#4a235a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Glowing red eyes
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-20, -14, 16, 0, Math.PI * 2);
        ctx.arc(20, -14, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-20, -14, 7, 0, Math.PI * 2);
        ctx.arc(20, -14, 7, 0, Math.PI * 2);
        ctx.fill();

        // Angry mouth
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 18, 26, 0.2, Math.PI - 0.2, true);
        ctx.stroke();

        // Hair whip attack visual
        if (this.isWhipping && this.whipProgress > 0.2 && this.whipProgress < 0.8) {
            ctx.globalAlpha = 1 - Math.abs(this.whipProgress - 0.5) * 2;
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(this.whipAngle) * 130, Math.sin(this.whipAngle) * 130);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Name and HP bar
        const barWidth = 140;
        const barHeight = 12;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth/2, this.y - 85, barWidth, barHeight);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - barWidth/2, this.y - 85, barWidth * (this.hp / this.maxHP), barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - 92);
    }
}

// ==================== BOSS 5: SPIDER SPIT BUS ====================
class SpiderSpitBus extends Boss {
    constructor() {
        super('Spider Spit Bus', 15, 22);
        this.width = 160;
        this.height = 70;
        this.x = 400;
        this.y = 150;
        this.moveSpeed = 1.2;
        this.direction = { x: 0.8, y: 0.6 };
        this.spitTimer = 0;
        this.spitCooldown = 2500;
        this.legAngle = 0;
    }

    update(deltaTime) {
        this.legAngle += deltaTime * 0.005;

        // Gradually steer toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            this.direction.x += (dx / dist) * 0.015;
            this.direction.y += (dy / dist) * 0.015;
            const len = Math.sqrt(this.direction.x ** 2 + this.direction.y ** 2);
            this.direction.x /= len;
            this.direction.y /= len;
        }

        this.x += this.direction.x * this.moveSpeed;
        this.y += this.direction.y * this.moveSpeed;

        // Bounce off arena walls
        if (this.x - this.width / 2 < ARENA.x) {
            this.direction.x = Math.abs(this.direction.x);
            this.x = ARENA.x + this.width / 2;
        }
        if (this.x + this.width / 2 > ARENA.x + ARENA.width) {
            this.direction.x = -Math.abs(this.direction.x);
            this.x = ARENA.x + ARENA.width - this.width / 2;
        }
        if (this.y - this.height / 2 < ARENA.y) {
            this.direction.y = Math.abs(this.direction.y);
            this.y = ARENA.y + this.height / 2;
        }
        if (this.y + this.height / 2 > ARENA.y + ARENA.height) {
            this.direction.y = -Math.abs(this.direction.y);
            this.y = ARENA.y + ARENA.height - this.height / 2;
        }

        // Spit attack - only when player is not sheltered
        this.spitTimer += deltaTime;
        if (this.spitTimer >= this.spitCooldown) {
            this.spitTimer = 0;
            if (!playerInShelter) {
                // Spit 3 globs in a fan
                bossProjectiles.push(new SpitGlob(this.x, this.y, player.x, player.y));
                bossProjectiles.push(new SpitGlob(this.x, this.y, player.x + 50, player.y + 30));
                bossProjectiles.push(new SpitGlob(this.x, this.y, player.x - 50, player.y - 30));
            }
        }

        this.checkPlayerCollision();
    }

    draw() {
        super.draw();
        const isHit = Date.now() < this.hitFlashUntil;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Spider legs (4 pairs, along the bottom of the bus)
        const legXPositions = [-55, -18, 18, 55];
        ctx.strokeStyle = isHit ? '#fff' : '#1a0a00';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const ox = legXPositions[i];
            const wave = Math.sin(this.legAngle + i * 0.8) * 10;

            // Left leg
            ctx.beginPath();
            ctx.moveTo(ox, 28);
            ctx.lineTo(ox - 30, 50 + wave);
            ctx.lineTo(ox - 55, 68 + wave);
            ctx.stroke();

            // Right leg
            ctx.beginPath();
            ctx.moveTo(ox, 28);
            ctx.lineTo(ox + 30, 50 - wave);
            ctx.lineTo(ox + 55, 68 - wave);
            ctx.stroke();
        }

        // Bus body
        ctx.shadowColor = isHit ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 18;
        const busGrad = ctx.createLinearGradient(0, -35, 0, 35);
        if (isHit) {
            busGrad.addColorStop(0, '#ffffff');
            busGrad.addColorStop(1, '#f0f0f0');
        } else {
            busGrad.addColorStop(0, '#ffe033');
            busGrad.addColorStop(1, '#c9a800');
        }
        ctx.fillStyle = busGrad;
        ctx.fillRect(-80, -35, 160, 63);
        ctx.strokeStyle = isHit ? '#fff' : '#8a6a00';
        ctx.lineWidth = 3;
        ctx.strokeRect(-80, -35, 160, 63);

        // 8 creepy eyes across the top of the bus
        const eyeXs = [-65, -47, -29, -11, 8, 26, 44, 62];
        eyeXs.forEach((ex, i) => {
            // Eye white
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.fillStyle = isHit ? '#ddd' : '#fff';
            ctx.beginPath();
            ctx.ellipse(ex, -18, 9, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupil tracking player
            const pdx = player.x - this.x;
            const pdy = player.y - this.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            const px = ex + (pdx / pdist) * 4;
            const py = -18 + (pdy / pdist) * 3;
            ctx.fillStyle = i % 2 === 0 ? '#ff0000' : '#cc0044';
            ctx.beginPath();
            ctx.ellipse(px, py, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Front of bus (menacing grille / mouth)
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHit ? '#ccc' : '#222';
        ctx.fillRect(66, -28, 14, 56);
        // Grille teeth
        ctx.fillStyle = isHit ? '#eee' : '#ffd700';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(68, -22 + i * 11, 10, 6);
        }

        // "SCHOOL BUS" text on side
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHit ? '#777' : '#000';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SCHOOL BUS', 0, 8);

        ctx.restore();

        // HP bar
        const barWidth = 160;
        const barHeight = 12;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - 65, barWidth, barHeight);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - barWidth / 2, this.y - 65, barWidth * (this.hp / this.maxHP), barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - 72);
    }
}

// ==================== SPIT GLOB (boss projectile) ====================
class SpitGlob {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.dx = dx / dist;
        this.dy = dy / dist;
        this.speed = 4.5;
        this.width = 18;
        this.height = 18;
        this.active = true;
        this.wobble = Math.random() * Math.PI * 2; // random wobble phase
    }

    update() {
        this.wobble += 0.15;
        this.x += this.dx * this.speed + Math.sin(this.wobble) * 0.5;
        this.y += this.dy * this.speed;

        // Deactivate if out of arena
        if (this.x < ARENA.x - 30 || this.x > ARENA.x + ARENA.width + 30 ||
            this.y < ARENA.y - 30 || this.y > ARENA.y + ARENA.height + 30) {
            this.active = false;
        }

        // Hit player only if not sheltered
        if (!playerInShelter && checkCollision(this, player)) {
            player.takeDamage(1);
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowColor = '#7cfc00';
        ctx.shadowBlur = 10;

        // Main glob
        const g = ctx.createRadialGradient(this.x - 3, this.y - 3, 2, this.x, this.y, 9);
        g.addColorStop(0, '#ccff44');
        g.addColorStop(1, '#3a7000');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 9, 0, Math.PI * 2);
        ctx.fill();

        // Drip blob
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'rgba(100, 200, 0, 0.75)';
        ctx.beginPath();
        ctx.arc(this.x + this.dx * 6, this.y + this.dy * 6, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ==================== LAVA GLOB PROJECTILE ====================
class LavaGlob {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.dx = dx / dist;
        this.dy = dy / dist;
        this.speed = 3.8;
        this.width = 16;
        this.height = 16;
        this.active = true;
        this.angle = Math.random() * Math.PI * 2;
    }

    update() {
        this.angle += 0.12;
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;

        if (this.x < ARENA.x - 30 || this.x > ARENA.x + ARENA.width + 30 ||
            this.y < ARENA.y - 30 || this.y > ARENA.y + ARENA.height + 30) {
            this.active = false;
        }

        if (!playerInShelter && checkCollision(this, player)) {
            player.takeDamage(1);
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 14;
        // Outer glow
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
        g.addColorStop(0, '#ffcc00');
        g.addColorStop(0.5, '#ff4400');
        g.addColorStop(1, '#881100');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        // Hot core
        ctx.fillStyle = '#ffee88';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== MARS VOLCANO BOSS ====================
class MarsVolcanoBoss extends Boss {
    constructor() {
        super('Volcano Beast', 20, 30);
        this.width = 75;
        this.height = 75;
        this.x = 500;
        this.y = 300;
        this.moveSpeed = 1.4;
        this.direction = { x: -0.8, y: 0.4 };
        this.shootTimer = 0;
        this.shootCooldown = 2200;
        this.rockAngle = 0;
    }

    update(deltaTime) {
        this.rockAngle += deltaTime * 0.002;

        // Gradually steer toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            this.direction.x += (dx / dist) * 0.018;
            this.direction.y += (dy / dist) * 0.018;
            const len = Math.sqrt(this.direction.x ** 2 + this.direction.y ** 2);
            this.direction.x /= len;
            this.direction.y /= len;
        }

        this.x += this.direction.x * this.moveSpeed;
        this.y += this.direction.y * this.moveSpeed;

        // Bounce off arena walls
        if (this.x - this.width / 2 < ARENA.x) { this.direction.x = Math.abs(this.direction.x); this.x = ARENA.x + this.width / 2; }
        if (this.x + this.width / 2 > ARENA.x + ARENA.width) { this.direction.x = -Math.abs(this.direction.x); this.x = ARENA.x + ARENA.width - this.width / 2; }
        if (this.y - this.height / 2 < ARENA.y) { this.direction.y = Math.abs(this.direction.y); this.y = ARENA.y + this.height / 2; }
        if (this.y + this.height / 2 > ARENA.y + ARENA.height) { this.direction.y = -Math.abs(this.direction.y); this.y = ARENA.y + ARENA.height - this.height / 2; }

        // Shoot lava globs - only when player not sheltered
        this.shootTimer += deltaTime;
        if (this.shootTimer >= this.shootCooldown) {
            this.shootTimer = 0;
            if (!playerInShelter) {
                bossProjectiles.push(new LavaGlob(this.x, this.y, player.x, player.y));
                bossProjectiles.push(new LavaGlob(this.x, this.y, player.x + 55, player.y + 25));
                bossProjectiles.push(new LavaGlob(this.x, this.y, player.x - 55, player.y - 25));
            }
        }

        this.checkPlayerCollision();
    }

    draw() {
        super.draw();
        const isHit = Date.now() < this.hitFlashUntil;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Outer lava glow
        ctx.shadowColor = isHit ? '#fff' : '#ff5500';
        ctx.shadowBlur = 22;

        // Rocky body gradient
        const bodyGrad = ctx.createRadialGradient(-8, -8, 5, 0, 0, this.width / 2);
        bodyGrad.addColorStop(0, isHit ? '#fff' : '#ff7700');
        bodyGrad.addColorStop(0.45, isHit ? '#ffcccc' : '#cc2200');
        bodyGrad.addColorStop(1, isHit ? '#ffbbbb' : '#441100');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Lava crack lines
        ctx.strokeStyle = isHit ? '#fff' : '#ffaa00';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI / 2) + this.rockAngle;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * this.width / 2 * 0.75, Math.sin(a) * this.height / 2 * 0.75);
            ctx.stroke();
        }

        // Rocky outer edge bumps
        ctx.fillStyle = isHit ? '#ffaaaa' : '#331100';
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI / 3) + this.rockAngle * 0.5;
            const bx = Math.cos(a) * this.width / 2;
            const by = Math.sin(a) * this.height / 2;
            ctx.beginPath();
            ctx.arc(bx, by, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Eyes - glowing red
        ctx.fillStyle = isHit ? '#fff' : '#ff2200';
        ctx.shadowColor = isHit ? '#fff' : '#ff6600';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(-13, -10, 9, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(13, -10, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(-13, -10, 4, 0, Math.PI * 2);
        ctx.arc(13, -10, 4, 0, Math.PI * 2);
        ctx.fill();

        // Angry mouth (snarl)
        ctx.strokeStyle = isHit ? '#fff' : '#220000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 12, 16, 0.3, Math.PI - 0.3, true);
        ctx.stroke();
        // Teeth
        ctx.fillStyle = isHit ? '#fff' : '#ddd';
        for (let t = -1; t <= 1; t++) {
            ctx.fillRect(t * 9 - 4, 10, 8, 7);
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

    // Hide shop button only on non-gameplay screens
    if (gameState === GAME_STATES.TITLE ||
        gameState === GAME_STATES.SHOP ||
        gameState === GAME_STATES.WIN ||
        gameState === GAME_STATES.LOSE) {
        shopButton.style.display = 'none';
    } else {
        shopButton.style.display = 'block';
    }
}

function showFloatingText(text, x, y) {
    const container = document.getElementById('floating-texts');
    const textEl = document.createElement('div');
    textEl.className = 'floating-text';
    textEl.textContent = text;

    // Convert canvas-space coordinates to screen coordinates (handles CSS scaling)
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    textEl.style.left = (rect.left + window.scrollX + x * scaleX) + 'px';
    textEl.style.top = (rect.top + window.scrollY + y * scaleY) + 'px';

    container.appendChild(textEl);

    setTimeout(() => {
        textEl.remove();
    }, 1500);
}

function updateLoseScreen() {
    const loseScreen = document.getElementById('lose-screen');

    if (previousGameState === GAME_STATES.FIGHT && currentBoss === 5) {
        loseScreen.querySelector('p').textContent =
            'Burned by the Volcano Beast! Try hiding in the house next time?';
    } else if (previousGameState === GAME_STATES.FIGHT && currentBoss === 4) {
        loseScreen.querySelector('p').textContent =
            'Spit on by the Spider Spit Bus! Use the shelter buses next time?';
    } else if (previousGameState === GAME_STATES.FIGHT && currentBoss === 3) {
        loseScreen.querySelector('p').textContent =
            'Defeated by Mutant Hair! Return to the computer for more hair points?';
    } else if (previousGameState === GAME_STATES.FIGHT) {
        const bossNames = ['Ninja Street', 'Shaded Hair', 'Swords', 'Mutant Hair', 'Spider Spit Bus', 'Volcano Beast'];
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

// ==================== BIG TIME WORLD ====================
function drawBigTimeWorldArea() {
    // Dark icy background
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 480, canvas.width, canvas.height - 480);

    // Wall panel lines
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 480);
        ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#aed6f1';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('The Big Time World', canvas.width / 2, 32);

    const iceX = 325, iceY = 180, iceW = 150, iceH = 130;

    if (!questState.iceBlockBroken) {
        // Draw computer silhouette visible inside ice
        ctx.fillStyle = 'rgba(40, 40, 60, 0.6)';
        ctx.fillRect(iceX + 30, iceY + 15, 90, 65);
        ctx.fillRect(iceX + 60, iceY + 80, 30, 15);
        ctx.fillRect(iceX + 45, iceY + 95, 60, 10);

        // Ice block body
        ctx.fillStyle = 'rgba(130, 220, 255, 0.78)';
        ctx.fillRect(iceX, iceY, iceW, iceH);
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.95)';
        ctx.lineWidth = 3;
        ctx.strokeRect(iceX, iceY, iceW, iceH);

        // Ice shine
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(iceX + 18, iceY + 6);
        ctx.lineTo(iceX + 6, iceY + 38);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(iceX + 48, iceY + 6);
        ctx.lineTo(iceX + 30, iceY + 58);
        ctx.stroke();

        // Cracks based on damage taken
        const hpFraction = questState.iceBlockHP / 5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        if (hpFraction < 0.8) {
            ctx.beginPath();
            ctx.moveTo(iceX + 70, iceY + 10);
            ctx.lineTo(iceX + 85, iceY + 35);
            ctx.lineTo(iceX + 75, iceY + 50);
            ctx.stroke();
        }
        if (hpFraction < 0.6) {
            ctx.beginPath();
            ctx.moveTo(iceX + 40, iceY + 60);
            ctx.lineTo(iceX + 60, iceY + 82);
            ctx.lineTo(iceX + 50, iceY + 110);
            ctx.stroke();
        }
        if (hpFraction < 0.4) {
            ctx.beginPath();
            ctx.moveTo(iceX + 110, iceY + 28);
            ctx.lineTo(iceX + 92, iceY + 58);
            ctx.lineTo(iceX + 122, iceY + 70);
            ctx.stroke();
        }
        if (hpFraction < 0.2) {
            ctx.beginPath();
            ctx.moveTo(iceX + 22, iceY + 80);
            ctx.lineTo(iceX + 42, iceY + 100);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(iceX + 95, iceY + 88);
            ctx.lineTo(iceX + 115, iceY + 118);
            ctx.stroke();
        }

        // HP label
        ctx.fillStyle = '#7ec8e3';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Ice HP: ${questState.iceBlockHP} / 5`, iceX + iceW / 2, iceY - 12);

        // Instruction
        ctx.fillStyle = '#ffd93d';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Hit the ice block to break it! (SPACE to attack)', canvas.width / 2, canvas.height - 18);

    } else if (!questState.computerAnswered) {
        // Ice broken — draw computer
        const compX = iceX + 20;
        const compY = iceY + 8;

        // Monitor
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(compX + 10, compY, 100, 75);
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(compX + 15, compY + 5, 90, 65);

        // Screen text
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('>> QUESTION <<', compX + 60, compY + 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('Which number', compX + 60, compY + 38);
        ctx.fillText('is even?', compX + 60, compY + 52);

        // Stand + base
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(compX + 50, compY + 75, 20, 14);
        ctx.fillRect(compX + 35, compY + 89, 50, 8);

        // Keyboard
        ctx.fillStyle = '#34495e';
        ctx.fillRect(compX + 25, compY + 99, 70, 18);

        // Check proximity
        const nearComputer = Math.abs(player.x - (compX + 60)) < 90 && Math.abs(player.y - (compY + 60)) < 90;

        if (nearComputer) {
            // Question overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
            ctx.fillRect(145, 345, 510, 118);
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.strokeRect(145, 345, 510, 118);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 19px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Which number is even?', canvas.width / 2, 372);

            // Option 4 (correct)
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(180, 388, 185, 55);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('4', 272, 422);
            ctx.fillStyle = '#ccc';
            ctx.font = '13px Arial';
            ctx.fillText('Press [4]', 272, 438);

            // Option 5 (wrong)
            ctx.fillStyle = '#922b21';
            ctx.fillRect(435, 388, 185, 55);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('5', 527, 422);
            ctx.fillStyle = '#ccc';
            ctx.font = '13px Arial';
            ctx.fillText('Press [5]', 527, 438);

            // Handle input
            if (keys['4'] && !questState.computerAnswered) {
                questState.computerAnswered = true;
                hairPoints += 10;
                updateUI();
                saveGame();
                showFloatingText('+10 Hair! Correct!', canvas.width / 2, 310);
                setTimeout(() => { startBossFight(); }, 2200);
            } else if (keys['5'] && !questState.computerAnswered) {
                questState.computerAnswered = true;
                hairPoints -= 10;
                updateUI();
                saveGame();
                showFloatingText('-10 Hair! Wrong!', canvas.width / 2, 310);
                setTimeout(() => { startBossFight(); }, 2200);
            }
        } else {
            ctx.fillStyle = '#ffd93d';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Walk to the computer to use it!', canvas.width / 2, canvas.height - 18);
        }

    } else {
        // Answered — boss incoming
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('THE GROUND IS SHAKING...', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('MUTANT HAIR IS COMING!', canvas.width / 2, canvas.height / 2 + 20);
    }
}

// ==================== SCHOOL AREA DRAW ====================
function drawSchoolBus(x, y, isWar) {
    // Tires
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x - 40, y + 33, 12, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 33, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(x - 40, y + 33, 6, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 33, 6, 0, Math.PI * 2);
    ctx.fill();

    // Bus body
    ctx.fillStyle = isWar ? '#ffaa00' : '#FFD700';
    ctx.fillRect(x - 70, y - 30, 140, 62);
    ctx.strokeStyle = isWar ? '#bb7700' : '#a87a00';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 70, y - 30, 140, 62);

    // Windows
    ctx.fillStyle = isWar ? 'rgba(80,0,0,0.7)' : '#a8d4f5';
    for (let w = 0; w < 4; w++) {
        ctx.fillRect(x - 58 + w * 30, y - 22, 22, 18);
    }

    // Bus front
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 60, y - 25, 10, 48);

    // Label on side
    ctx.fillStyle = isWar ? '#ff2200' : '#000';
    ctx.font = isWar ? 'bold 11px Arial' : '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(isWar ? 'BUS #4' : 'SCHOOL BUS', x - 5, y + 8);
}

function drawShelterBuses() {
    SHELTER_BUSES.forEach(sb => {
        const inside = checkCollision(player, sb);

        // Glow when player is inside
        if (inside) {
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 20;
        }

        // Bus body
        ctx.fillStyle = inside ? '#ffe566' : '#FFD700';
        ctx.fillRect(sb.x - sb.width / 2, sb.y - sb.height / 2, sb.width, sb.height);
        ctx.strokeStyle = inside ? '#00ff88' : '#a87a00';
        ctx.lineWidth = inside ? 3 : 2;
        ctx.strokeRect(sb.x - sb.width / 2, sb.y - sb.height / 2, sb.width, sb.height);
        ctx.shadowBlur = 0;

        // Windows
        ctx.fillStyle = '#a8d4f5';
        for (let w = 0; w < 3; w++) {
            ctx.fillRect(sb.x - sb.width / 2 + 10 + w * 32, sb.y - sb.height / 2 + 8, 22, 15);
        }

        // Label
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SHELTER', sb.x, sb.y + 6);

        // Prompt when nearby
        const dx = player.x - sb.x;
        const dy = player.y - sb.y;
        if (Math.sqrt(dx * dx + dy * dy) < 90 && !inside) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '11px Arial';
            ctx.fillText('Walk in for safety', sb.x, sb.y - sb.height / 2 - 6);
        }
    });
}

function drawSchoolArea() {
    if (showingWarTransition) {
        // Full-screen "THE WAR" reveal
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 90px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('THE WAR', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('The bus is transforming...', canvas.width / 2, canvas.height / 2 + 55);
        return;
    }

    if (schoolPhase === 'inside') {
        drawSchoolInterior();
    } else {
        drawSchoolExterior();
    }
}

function drawSchoolInterior() {
    // Classroom wall
    ctx.fillStyle = '#e8d5b7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor
    ctx.fillStyle = '#c8a87a';
    ctx.fillRect(0, 440, canvas.width, 160);

    // Blackboard
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(150, 40, 500, 140);
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 8;
    ctx.strokeRect(146, 36, 508, 148);
    // Chalk text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MATH CLASS', canvas.width / 2, 90);
    ctx.font = '18px Arial';
    ctx.fillText('2 + 2 = 4     3 × 3 = 9', canvas.width / 2, 125);
    ctx.fillText('No talking during class!', canvas.width / 2, 155);

    // Desks (3 rows × 4 cols)
    ctx.fillStyle = '#8B6914';
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            ctx.fillRect(100 + col * 165, 240 + row * 65, 65, 38);
            // Desk leg
            ctx.fillStyle = '#5a4010';
            ctx.fillRect(115 + col * 165, 276, 8, 12);
            ctx.fillRect(148 + col * 165, 276, 8, 12);
            ctx.fillStyle = '#8B6914';
        }
    }

    // Teacher
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(355, 200, 35, 50); // Body
    ctx.fillStyle = '#fdbcb4';
    ctx.beginPath();
    ctx.arc(372, 192, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(367, 188, 3, 0, Math.PI * 2);
    ctx.arc(378, 188, 3, 0, Math.PI * 2);
    ctx.fill();

    // Door at bottom center
    ctx.fillStyle = '#7a4a20';
    ctx.fillRect(360, 455, 80, 105);
    ctx.strokeStyle = '#5a3010';
    ctx.lineWidth = 3;
    ctx.strokeRect(360, 455, 80, 105);
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.arc(430, 510, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 400, 448);

    // Recess countdown / bell state
    const elapsed = Date.now() - schoolEntryTime;
    if (!schoolBellRung) {
        const timeLeft = Math.max(0, Math.ceil((4000 - elapsed) / 1000));
        if (elapsed >= 4000) {
            schoolBellRung = true;
        }
        ctx.fillStyle = '#444';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Recess in ${timeLeft} second${timeLeft !== 1 ? 's' : ''}...`, canvas.width / 2, 420);
    } else {
        // Bell rang!
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DING DING!  RECESS TIME!', canvas.width / 2, 415);
        ctx.fillStyle = '#222';
        ctx.font = '17px Arial';
        ctx.fillText('Press SPACE to go outside', canvas.width / 2, 445);

        if (keys.space) {
            schoolPhase = 'outside';
            player.x = 400;
            player.y = 310;
        }
    }
}

function drawSchoolExterior() {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, 280);

    // School building facade
    ctx.fillStyle = '#b8b8cc';
    ctx.fillRect(80, 10, 640, 260);
    ctx.strokeStyle = '#8888aa';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 10, 640, 260);

    // School sign
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ELEMENTARY SCHOOL', canvas.width / 2, 55);

    // Building windows
    ctx.fillStyle = '#a8d4f5';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(120 + i * 118, 80, 65, 50);
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 2;
        ctx.strokeRect(120 + i * 118, 80, 65, 50);
        // Cross panes
        ctx.beginPath();
        ctx.moveTo(152 + i * 118, 80);
        ctx.lineTo(152 + i * 118, 130);
        ctx.moveTo(120 + i * 118, 105);
        ctx.lineTo(185 + i * 118, 105);
        ctx.stroke();
    }

    // Front door of school
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(360, 170, 80, 100);
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.arc(430, 224, 5, 0, Math.PI * 2);
    ctx.fill();

    // Parking lot / ground
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 270, canvas.width, 330);

    // Parking lane lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 10]);
    for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 160, 270);
        ctx.lineTo(i * 160, 600);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // "RECESS!" banner
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RECESS!', canvas.width / 2, 30);

    // Draw 4 buses
    const busDefs = [
        { x: 140, y: 380, isWar: false },
        { x: 400, y: 380, isWar: false },
        { x: 660, y: 380, isWar: false },
        { x: 400, y: 510, isWar: true }
    ];

    busDefs.forEach(bd => {
        drawSchoolBus(bd.x, bd.y, bd.isWar);

        // Proximity prompt
        const dx = player.x - bd.x;
        const dy = player.y - bd.y;
        const nearBus = Math.sqrt(dx * dx + dy * dy) < 65;
        if (nearBus) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE to board', bd.x, bd.y - 55);

            if (keys.space && !showingWarTransition) {
                if (bd.isWar) {
                    // Trigger "The War" → boss fight
                    showingWarTransition = true;
                    setTimeout(() => {
                        showingWarTransition = false;
                        startBossFight();
                    }, 3000);
                } else {
                    showFloatingText('Hiding inside...', bd.x, bd.y - 70);
                }
            }
        }
    });

    // Player draw is handled by game loop; just show instructions
    ctx.fillStyle = '#111';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to return to map', canvas.width / 2, canvas.height - 10);
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
            saveGame();
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

// ==================== MARS WORLD ====================
function drawMarsHouseShelter() {
    const h = MARS_FIGHT_HOUSE;
    const inside = checkCollision(player, h);
    const lx = h.x - h.width / 2;
    const ty = h.y - h.height / 2;

    ctx.save();

    // Glow when player inside
    if (inside) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 24;
    }

    // House walls
    ctx.fillStyle = inside ? '#c4845a' : '#a0522d';
    ctx.fillRect(lx, ty + 25, h.width, h.height - 25);
    ctx.strokeStyle = inside ? '#00ff88' : '#5a3010';
    ctx.lineWidth = inside ? 3 : 2;
    ctx.strokeRect(lx, ty + 25, h.width, h.height - 25);

    // Roof triangle
    ctx.shadowBlur = inside ? 16 : 0;
    ctx.fillStyle = inside ? '#8b4513' : '#5a2d0c';
    ctx.beginPath();
    ctx.moveTo(lx - 8, ty + 28);
    ctx.lineTo(h.x, ty);
    ctx.lineTo(lx + h.width + 8, ty + 28);
    ctx.closePath();
    ctx.fill();
    if (inside) { ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke(); }

    ctx.shadowBlur = 0;

    // Door (open)
    ctx.fillStyle = '#2a1000';
    ctx.fillRect(h.x - 16, ty + 55, 32, h.height - 55);

    // Windows
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(lx + 10, ty + 35, 22, 18);
    ctx.fillRect(lx + h.width - 32, ty + 35, 22, 18);

    // SHELTER label
    ctx.fillStyle = inside ? '#00ff88' : '#00cc44';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SHELTER', h.x, ty - 6);

    // Proximity prompt
    const dx = player.x - h.x;
    const dy = player.y - h.y;
    if (Math.sqrt(dx * dx + dy * dy) < 90 && !inside) {
        ctx.fillStyle = '#00ff88';
        ctx.font = '11px Arial';
        ctx.fillText('Walk inside for safety', h.x, ty - 18);
    }

    ctx.restore();
}

function drawMarsWorld() {
    if (showingMarsTransition) {
        // Full-screen eruption reveal
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VOLCANO ERUPTS!', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('The beast is FREE!  Grab your parachute!', canvas.width / 2, canvas.height / 2 + 50);
        return;
    }

    // Sky gradient (Mars atmosphere)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#8b2500');
    skyGrad.addColorStop(0.5, '#c84a1c');
    skyGrad.addColorStop(1, '#9a3a10');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Mars ground
    ctx.fillStyle = '#7a2e08';
    ctx.fillRect(0, 370, canvas.width, 230);

    // Ground texture craters
    ctx.fillStyle = '#5a2004';
    ctx.beginPath(); ctx.ellipse(220, 385, 45, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(660, 405, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(490, 395, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(350, 420, 15, 5, 0, 0, Math.PI * 2); ctx.fill();

    // ---- Volcano (center-right visual) ----
    // Main mountain body
    ctx.fillStyle = '#5c1f00';
    ctx.beginPath();
    ctx.moveTo(280, 375);
    ctx.lineTo(570, 55);
    ctx.lineTo(800, 375);
    ctx.closePath();
    ctx.fill();

    // Left slope shading (darker)
    ctx.fillStyle = '#3d1400';
    ctx.beginPath();
    ctx.moveTo(280, 375);
    ctx.lineTo(570, 55);
    ctx.lineTo(470, 375);
    ctx.closePath();
    ctx.fill();

    // Rock ledges on slope path (visual guide up the volcano)
    ctx.fillStyle = '#7a3510';
    for (let i = 0; i < 4; i++) {
        const t = (i + 1) / 5;
        const px = 280 + t * (570 - 280);
        const py = 375 + t * (55 - 375);
        ctx.fillRect(px - 18, py - 4, 36, 8);
    }

    // Crater glow at top
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.ellipse(570, 65, 45, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.ellipse(570, 65, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.ellipse(570, 65, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lava drips
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(545, 68, 7, 55);
    ctx.fillRect(568, 62, 5, 45);
    ctx.fillRect(583, 70, 6, 38);

    // Button at volcano top (when not pressed)
    if (!marsButtonPressed) {
        const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;

        // Button platform
        ctx.fillStyle = '#555';
        ctx.fillRect(552, 90, 36, 12);

        // Button glow
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 18 * pulse;
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.ellipse(570, 90, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.ellipse(570, 90, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RELEASE!', 570, 78);
    }

    // ---- House (left side, shelter) ----
    // Check proximity first for prompt
    const houseCenter = { x: 115, y: 305, width: 120, height: 110 };
    const playerInHouseNow = checkCollision(player, houseCenter);

    // Update global shelter flag for MARS_WORLD
    playerInShelter = playerInHouseNow;

    if (playerInHouseNow) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
    }

    // House walls
    ctx.fillStyle = playerInHouseNow ? '#c4845a' : '#a0522d';
    ctx.fillRect(55, 260, 120, 115);
    ctx.strokeStyle = playerInHouseNow ? '#00ff88' : '#5a3010';
    ctx.lineWidth = playerInHouseNow ? 3 : 2;
    ctx.strokeRect(55, 260, 120, 115);

    // Roof
    ctx.shadowBlur = playerInHouseNow ? 14 : 0;
    ctx.fillStyle = playerInHouseNow ? '#8b4513' : '#5a2d0c';
    ctx.beginPath();
    ctx.moveTo(47, 262);
    ctx.lineTo(115, 215);
    ctx.lineTo(183, 262);
    ctx.closePath();
    ctx.fill();
    if (playerInHouseNow) { ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke(); }

    ctx.shadowBlur = 0;

    // Door
    ctx.fillStyle = '#2a1000';
    ctx.fillRect(95, 320, 40, 55);

    // Windows
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(63, 272, 25, 18);
    ctx.fillRect(143, 272, 25, 18);

    // SHELTER sign
    ctx.fillStyle = playerInHouseNow ? '#00ff88' : '#00cc44';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SHELTER', 115, 208);

    // Shelter prompt / overlay
    if (playerInHouseNow) {
        ctx.fillStyle = 'rgba(0, 220, 100, 0.10)';
        ctx.fillRect(47, 215, 140, 165);
        ctx.fillStyle = '#00dd66';
        ctx.font = 'bold 16px Arial';
        ctx.fillText("SHELTERED — Can't attack from here!", canvas.width / 2, 45);
    } else {
        const dx = player.x - 115;
        const dy = player.y - 305;
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px Arial';
            ctx.fillText('Walk inside for safety', 115, 202);
        }
    }

    // Check if player is in the volcano top zone (to press button)
    const nearButton = !marsButtonPressed &&
        player.x > 480 && player.x < 660 && player.y > 55 && player.y < 200;

    if (nearButton) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to release the Volcano Beast!', canvas.width / 2, canvas.height - 40);

        if (keys.space && !marsButtonPressed && !showingMarsTransition) {
            marsButtonPressed = true;
            showingMarsTransition = true;
            showFloatingText('Parachute grabbed!', player.x, player.y - 40);
            setTimeout(() => {
                showingMarsTransition = false;
                bossProjectiles = [];
                playerInShelter = false;
                player.x = 400;
                player.y = 325;
                startBossFight();
            }, 3000);
        }
    }

    // World label
    ctx.fillStyle = '#ffaa66';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MARS', canvas.width / 2, 25);
}

// ==================== BOSS MANAGEMENT ====================
let boss = null;

function createBoss(index) {
    switch(index) {
        case 0: return new NinjaStreet();
        case 1: return new ShadedHair();
        case 2: return new Swords();
        case 3: return new MutantHair();
        case 4: return new SpiderSpitBus();
        case 5: return new MarsVolcanoBoss();
        default: return null;
    }
}

function startBossFight() {
    boss = createBoss(currentBoss);
    player.reset();
    bossProjectiles = [];
    playerInShelter = false;
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
    } else if (gameState === GAME_STATES.BIG_TIME_WORLD) {
        drawBigTimeWorldArea();
        player.update(deltaTime);
        player.draw();
    } else if (gameState === GAME_STATES.SCHOOL_AREA) {
        drawSchoolArea();
        if (!showingWarTransition) {
            player.update(deltaTime);
            player.draw();
        }
    } else if (gameState === GAME_STATES.MARS_WORLD) {
        drawMarsWorld();
        if (!showingMarsTransition) {
            player.update(deltaTime);
            player.draw();
        }
    } else if (gameState === GAME_STATES.FIGHT) {
        // Mars boss fight: custom Mars arena background
        if (currentBoss === 5) {
            // Mars sky
            const marsArenaGrad = ctx.createLinearGradient(ARENA.x, ARENA.y, ARENA.x, ARENA.y + ARENA.height);
            marsArenaGrad.addColorStop(0, '#8b2500');
            marsArenaGrad.addColorStop(0.55, '#b84a1c');
            marsArenaGrad.addColorStop(1, '#7a2e08');
            ctx.fillStyle = marsArenaGrad;
            ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

            // Mars ground band at bottom of arena
            ctx.fillStyle = '#5a2004';
            ctx.fillRect(ARENA.x, ARENA.y + ARENA.height - 80, ARENA.width, 80);

            // Mini volcano on right side
            ctx.fillStyle = '#3d1400';
            ctx.beginPath();
            ctx.moveTo(ARENA.x + ARENA.width - 180, ARENA.y + ARENA.height - 80);
            ctx.lineTo(ARENA.x + ARENA.width - 60, ARENA.y + 80);
            ctx.lineTo(ARENA.x + ARENA.width, ARENA.y + ARENA.height - 80);
            ctx.closePath();
            ctx.fill();

            // Crater glow
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#ff5500';
            ctx.beginPath();
            ctx.ellipse(ARENA.x + ARENA.width - 60, ARENA.y + 82, 22, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Arena border
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 3;
            ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

            // Draw the house shelter on left side
            drawMarsHouseShelter();
        } else {
            // Standard arena background
            ctx.strokeStyle = '#ecf0f1';
            ctx.lineWidth = 3;
            ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
            ctx.fillStyle = '#34495e';
            ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

            // Draw shelter buses for the Spider Spit Bus fight
            if (currentBoss === 4) {
                drawShelterBuses();
            }
        }

        if (boss && !boss.defeated) {
            // Check if player is sheltered (before update so attack guard is current)
            if (currentBoss === 4) {
                playerInShelter = SHELTER_BUSES.some(sb => checkCollision(player, sb));
            } else if (currentBoss === 5) {
                playerInShelter = checkCollision(player, MARS_FIGHT_HOUSE);
            } else {
                playerInShelter = false;
            }

            boss.update(deltaTime);
            boss.draw();

            // Update and draw boss projectiles
            bossProjectiles = bossProjectiles.filter(p => p.active);
            bossProjectiles.forEach(p => { p.update(); p.draw(); });

            player.update(deltaTime);
            player.draw();

            // Shelter status overlay
            if (playerInShelter) {
                ctx.fillStyle = 'rgba(0,220,100,0.12)';
                ctx.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
                ctx.fillStyle = '#00dd66';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('SHELTERED — Can\'t attack from here!', canvas.width / 2, ARENA.y + 28);
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==================== EVENT LISTENERS ====================
document.getElementById('start-button').addEventListener('click', () => {
    if (currentBoss >= 6) {
        // Already beaten the game - show win screen
        gameState = GAME_STATES.WIN;
        showScreen('win-screen');
        document.getElementById('final-hair-points').textContent = `Total Hair Points: ${hairPoints}`;
    } else if (currentBoss === 5) {
        // Was in or fighting Volcano Beast - send to Mars World
        marsPhase = 'explore';
        marsButtonPressed = false;
        showingMarsTransition = false;
        playerInShelter = false;
        player.x = 150;
        player.y = 380;
        gameState = GAME_STATES.MARS_WORLD;
        hideAllScreens();
    } else if (currentBoss === 4) {
        // Was in or fighting Spider Spit Bus - send to school area
        schoolPhase = 'inside';
        schoolEntryTime = Date.now();
        schoolBellRung = false;
        showingWarTransition = false;
        player.x = 400;
        player.y = 400;
        gameState = GAME_STATES.SCHOOL_AREA;
        hideAllScreens();
    } else if (currentBoss === 3) {
        // Was in The Big Time World or fighting Mutant Hair - send to the computer
        questState.computerAnswered = false;
        player.x = 400;
        player.y = 450;
        gameState = GAME_STATES.BIG_TIME_WORLD;
        hideAllScreens();
    } else {
        startBossFight();
    }
});

document.getElementById('continue-button').addEventListener('click', () => {
    stateBeforeShop = null; // Clear shop context
    startBossFight();
});

document.getElementById('back-button').addEventListener('click', () => {
    // Return to previous state
    if (stateBeforeShop) {
        gameState = stateBeforeShop;
        // Restore boss health bar if returning to a fight
        if (gameState === GAME_STATES.FIGHT) {
            updateBossHealthBar();
        }
        stateBeforeShop = null;
        hideAllScreens();
    }
});

document.getElementById('shop-access-button').addEventListener('click', () => {
    // Save current state and open shop
    stateBeforeShop = gameState;
    gameState = GAME_STATES.SHOP;
    // Hide boss health bar if pausing mid-fight
    if (stateBeforeShop === GAME_STATES.FIGHT) {
        document.getElementById('boss-health-bar-container').style.display = 'none';
    }
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

    if (previousGameState === GAME_STATES.FIGHT && currentBoss === 5) {
        // Died against Volcano Beast - retry the fight
        startBossFight();
    } else if (previousGameState === GAME_STATES.FIGHT && currentBoss === 4) {
        // Died against Spider Spit Bus - send back to school outside
        schoolPhase = 'outside';
        schoolEntryTime = Date.now();
        schoolBellRung = true;
        showingWarTransition = false;
        player.x = 400;
        player.y = 310;
        gameState = GAME_STATES.SCHOOL_AREA;
    } else if (previousGameState === GAME_STATES.FIGHT && currentBoss === 3) {
        // Died against Mutant Hair - send back to computer for another chance at hair points
        questState.computerAnswered = false;
        player.x = 400;
        player.y = 450;
        gameState = GAME_STATES.BIG_TIME_WORLD;
    } else if (previousGameState === GAME_STATES.FIGHT) {
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
            saveGame();
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
            saveGame();
        } else if (hairPoints >= cost) {
            // Purchase and equip
            hairPoints -= cost;
            ownedCosmetics[cosmeticType].push(cosmeticValue);
            cosmetics[cosmeticType] = cosmeticValue;
            updateUI();
            updateShopUI();
            saveGame();
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
            saveGame();
        } else if (hairPoints >= cost) {
            // Purchase and equip
            hairPoints -= cost;
            ownedWeapons.push(weapon);
            equippedWeapon = weapon;
            updateUI();
            updateShopUI();
            saveGame();
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
        porcupinesDefeated: false,
        iceBlockHP: 5,
        iceBlockBroken: false,
        computerAnswered: false
    };

    // Reset school state
    schoolPhase = 'inside';
    schoolEntryTime = 0;
    schoolBellRung = false;
    showingWarTransition = false;
    bossProjectiles = [];
    playerInShelter = false;

    // Reset Mars world state
    marsPhase = 'explore';
    marsButtonPressed = false;
    showingMarsTransition = false;

    if (!keepUpgrades) {
        // Full reset - lose everything
        hairPoints = 0;
        purchasedUpgrades = { maxhp: false, speed: false, attack: false };
        player.maxHP = 3;
        player.hp = 3;
        player.speed = 2.5;
        player.attackCooldown = 300;
        clearSave();
    } else {
        // Keep upgrades AND hair points - just reset HP to current max
        player.hp = player.maxHP;
        // hairPoints stays the same
        saveGame();
    }

    boss = null;
    porcupines = [];
    guard = null;
    shipAtGuard = false;
    showScreen('title-screen');
    updateUI();
    document.getElementById('boss-health-bar-container').style.display = 'none';
}

// ==================== SAVE / LOAD ====================
const SAVE_KEY = 'stealYourHair_save';

function saveGame() {
    const saveData = {
        hairPoints,
        purchasedUpgrades,
        playerMaxHP: player.maxHP,
        playerSpeed: player.speed,
        playerAttackCooldown: player.attackCooldown,
        hasBeatenGame,
        cosmetics,
        ownedCosmetics,
        equippedWeapon,
        ownedWeapons,
        highestBossDefeated,
        currentBoss
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
        const d = JSON.parse(raw);
        hairPoints = d.hairPoints ?? 0;
        purchasedUpgrades = d.purchasedUpgrades ?? { maxhp: false, speed: false, attack: false };
        player.maxHP = d.playerMaxHP ?? 3;
        player.hp = player.maxHP;
        player.speed = d.playerSpeed ?? 2.5;
        player.attackCooldown = d.playerAttackCooldown ?? 300;
        hasBeatenGame = d.hasBeatenGame ?? false;
        cosmetics = d.cosmetics ?? { hair: 'default', vehicle: 'none' };
        ownedCosmetics = d.ownedCosmetics ?? { hair: ['default'], vehicle: ['none'] };
        equippedWeapon = d.equippedWeapon ?? 'none';
        ownedWeapons = d.ownedWeapons ?? ['none'];
        highestBossDefeated = d.highestBossDefeated ?? 0;
        currentBoss = d.currentBoss ?? 0;
    } catch (e) {
        console.warn('Failed to load save data:', e);
    }
}

function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}

// ==================== MOBILE CONTROLS ====================
(function setupMobileControls() {
    // Map D-pad button IDs to the keys object entries they should set
    const dpadBindings = {
        'dpad-up':    'w',
        'dpad-down':  's',
        'dpad-left':  'a',
        'dpad-right': 'd'
    };
 
    Object.entries(dpadBindings).forEach(([id, key]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart',  (e) => { e.preventDefault(); keys[key] = true;  }, { passive: false });
        btn.addEventListener('touchend',    (e) => { e.preventDefault(); keys[key] = false; }, { passive: false });
        btn.addEventListener('touchcancel', ()  => { keys[key] = false; });
    });
 
    const meleeBtn = document.getElementById('btn-melee');
    if (meleeBtn) {
        meleeBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); keys.space = true;  }, { passive: false });
        meleeBtn.addEventListener('touchend',    (e) => { e.preventDefault(); keys.space = false; }, { passive: false });
        meleeBtn.addEventListener('touchcancel', ()  => { keys.space = false; });
    }
 
    const shootBtn = document.getElementById('btn-shoot');
    if (shootBtn) {
        shootBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); keys.shift = true;  }, { passive: false });
        shootBtn.addEventListener('touchend',    (e) => { e.preventDefault(); keys.shift = false; }, { passive: false });
        shootBtn.addEventListener('touchcancel', ()  => { keys.shift = false; });
    }
})();

// ==================== INIT ====================
loadGame();
updateUI();
gameLoop();
