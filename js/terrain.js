'use strict';

/**
 *
 * @constructor
 */
function BotwHeightMap() {
    // Make sure Three.js exists and is loaded
    if (typeof THREE !== 'undefined') {
        this.backgroundColor = new THREE.Color().setHSL(0.556, 1, 0.85);
        this.heightMap = 'assets/5200000000.composite.png';
        this.heightMapScale = 4;
        this.heightMapTexture = 'assets/map-texture.png';

        // Make sure the browser and gpu support WebGL
        if (this.isWebGLSupported()) {
            this.init();
        } else {
            // Make warning message visible
            document.querySelector('#webgl').className = 'no-webgl';
        }
    }
}

/**
 * Verifies if WebGL is supported by the browser / graphics card
 * @returns {boolean}
 */
BotwHeightMap.prototype.isWebGLSupported = function () {
    try {
        var canvas = document.createElement('canvas');
        // Checks if a WebGL canvas context can be made
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl')
            || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
};

/**
 * init
 * Sets up required data for Three.js including scene, camera and renderer
 */
BotwHeightMap.prototype.init = function () {
    var that = this;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);
    this.camera.position.z = 100;
    this.camera.position.y = 50;

    this.renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.querySelector('#container').appendChild(this.renderer.domElement);

    // Listen for window resize
    window.addEventListener('resize', function () {
        that.onWindowResize();
    }, false);

    // Declared to make sure it exists
    this.terrain = '';

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.zoom0 = 0.50;
    this.controls.rotateSpeed = 0.5;
    this.controls.maxPolarAngle = Math.PI / 2;

    this.controls.addEventListener('change', function () {
        that.render();
    });

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    window.addEventListener('keydown', function (event) {
        that.onKeyDown(event);
    }, false);

    window.addEventListener('keyup', function (event) {
        that.onKeyUp(event);
    }, false);

    var img = new Image();
    img.onload = function () {
        var data = that.getHeightData(img, that.heightMapScale);
        that.generateHeightmapMesh(data);
    };
    img.src = this.heightMap;

    this.setScene();
};

/**
 * Adds background, fog and lights to the scene
 */
BotwHeightMap.prototype.setScene = function () {
    // Add Background
    this.scene.background = this.backgroundColor;
    this.scene.fog = new THREE.Fog(this.scene.background, 50, 400);

    // Add hemisphere light to scene
    var hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemisphereLight.color.setHSL(0.6, 1, 0.6);
    hemisphereLight.groundColor.setHSL(0.095, 1, 0.75);
    hemisphereLight.position.set(0, 255, 0);
    this.scene.add(hemisphereLight);

    // Add directional light to scene
    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.color.setHSL(0.1, 1, 0.95);
    directionalLight.position.set(-1, 1.75, 1);
    directionalLight.position.multiplyScalar(90);
    this.scene.add(directionalLight);
};

/**
 *
 */
BotwHeightMap.prototype.animate = function () {
    var that = this;
    requestAnimationFrame(function () {
        that.animate();
    });
    this.update();
    this.render();
};

/**
 * Gets height map data from an image
 * @param img   String  URI to height map image
 * @param scale Number  Value to scale height by
 * @returns     {Float32Array}
 */
BotwHeightMap.prototype.getHeightData = function (img, scale) {
    scale = (!scale) ? 1 : scale;

    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');

    var size = img.width * img.height;
    var data = new Float32Array(size);

    ctx.drawImage(img, 0, 0);

    var i, j;
    for (i = 0; i < size; i++) {
        data[i] = 0;
    }

    var imgd = ctx.getImageData(0, 0, img.width, img.height);
    var pix = imgd.data;

    for (i = 0, j = 0; i < pix.length; i += 4) {
        var all = pix[i] + pix[i + 1] + pix[i + 2];
        data[j++] = all / (12 * scale);
    }

    return data;
};

BotwHeightMap.prototype.generateHeightmapMesh = function (data) {
    var geometry = new THREE.PlaneGeometry(256, 256, 1023, 1023);

    var that = this;
    var texture = THREE.ImageUtils.loadTexture(this.heightMapTexture, {}, function () {
        that.renderer.render(that.scene);
        that.animate();
    });
    var material = new THREE.MeshLambertMaterial({color: 0xffffff, map: texture});
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.translateZ(0);

    for (var i = 0; i < this.terrain.geometry.vertices.length; i++) {
        this.terrain.geometry.vertices[i].z = data[i];
    }

    this.scene.add(this.terrain);
};

BotwHeightMap.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
};

BotwHeightMap.prototype.update = function () {
    // terrain.rotation.x += 0.01;
    // this.terrain.rotation.z += 0.001;
    this.controls.update();
    this.walker();
};

BotwHeightMap.prototype.onWindowResize = function () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls.handleResize();

    this.render();
};

BotwHeightMap.prototype.onKeyDown = function (event) {
    switch (event.keyCode) {
        case 87: /*W*/
            this.moveForward = true;
            break;
        case 65: /*A*/
            this.moveLeft = true;
            break;
        case 83: /*S*/
            this.moveBackward = true;
            break;
        case 68: /*D*/
            this.moveRight = true;
            break;
        case 82: /*R*/
            this.moveUp = true;
            break;
        case 70: /*F*/
            this.moveDown = true;
            break;
    }
};

BotwHeightMap.prototype.onKeyUp = function (event) {
    switch (event.keyCode) {
        case 87: /*W*/
            this.moveForward = false;
            break;
        case 65: /*A*/
            this.moveLeft = false;
            break;
        case 83: /*S*/
            this.moveBackward = false;
            break;
        case 68: /*D*/
            this.moveRight = false;
            break;
        case 82: /*R*/
            this.moveUp = false;
            break;
        case 70: /*F*/
            this.moveDown = false;
            break;

    }
};

BotwHeightMap.prototype.walker = function () {
    if (this.moveForward || (this.autoForward && !this.moveBackward)) {
        this.camera.translateZ(-0.5);
    }
    if (this.moveBackward) this.camera.translateZ(0.5);

    if (this.moveLeft) this.camera.translateX(-0.5);
    if (this.moveRight) this.camera.translateX(0.5);

    if (this.moveUp) this.camera.translateY(0.5);
    if (this.moveDown) this.camera.translateY(-0.5);
};

document.addEventListener('DOMContentLoaded', function () {
    var botwHeightMap = new BotwHeightMap();
});