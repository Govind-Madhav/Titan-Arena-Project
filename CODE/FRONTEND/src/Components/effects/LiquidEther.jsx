/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './LiquidEther.css';

export default function LiquidEther({
    mouseForce = 20,
    cursorSize = 100,
    isViscous = false,
    viscous = 30,
    iterationsViscous = 32,
    iterationsPoisson = 32,
    dt = 0.014,
    BFECC = true,
    resolution = 0.5,
    isBounce = false,
    colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
    style = {},
    className = '',
    autoDemo = true,
    autoSpeed = 0.5,
    autoIntensity = 2.2,
    takeoverDuration = 0.25,
    autoResumeDelay = 1000,
    autoRampDuration = 0.6
}) {
    const mountRef = useRef(null);
    const webglRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const rafRef = useRef(null);
    const intersectionObserverRef = useRef(null);
    const isVisibleRef = useRef(true);
    const resizeRafRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        function makePaletteTexture(stops) {
            let arr;
            if (Array.isArray(stops) && stops.length > 0) {
                arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
            } else {
                arr = ['#ffffff', '#ffffff'];
            }
            const w = arr.length;
            const data = new Uint8Array(w * 4);
            for (let i = 0; i < w; i++) {
                const c = new THREE.Color(arr[i]);
                data[i * 4 + 0] = Math.round(c.r * 255);
                data[i * 4 + 1] = Math.round(c.g * 255);
                data[i * 4 + 2] = Math.round(c.b * 255);
                data[i * 4 + 3] = 255;
            }
            const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
            tex.magFilter = THREE.LinearFilter;
            tex.minFilter = THREE.LinearFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;
            return tex;
        }

        const paletteTex = makePaletteTexture(colors);
        const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

        // Shaders
        const face_vert = `attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
        const mouse_vert = `precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
        const advection_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 newVel=texture2D(velocity,uv2).xy;gl_FragColor=vec4(newVel,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;vec2 newVel2=texture2D(velocity,spot_old2).xy;gl_FragColor=vec4(newVel2,0.0,0.0);}}`;
        const color_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
        const divergence_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float divergence=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(divergence/dt);}`;
        const externalForce_frag = `precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
        const poisson_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float newP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(newP);}`;
        const pressure_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float step=1.0;float p0=texture2D(pressure,uv+vec2(px.x*step,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*step,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*step)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*step)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;v=v-gradP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;

        class CommonClass {
            constructor() { this.width = 0; this.height = 0; this.renderer = null; this.clock = null; }
            init(container) {
                this.container = container;
                this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                this.resize();
                this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                this.renderer.autoClear = false;
                this.renderer.setClearColor(new THREE.Color(0x000000), 0);
                this.renderer.setPixelRatio(this.pixelRatio);
                this.renderer.setSize(this.width, this.height);
                this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
                this.clock = new THREE.Clock(); this.clock.start();
            }
            resize() {
                if (!this.container) return;
                const rect = this.container.getBoundingClientRect();
                this.width = Math.max(1, Math.floor(rect.width));
                this.height = Math.max(1, Math.floor(rect.height));
                if (this.renderer) this.renderer.setSize(this.width, this.height, false);
            }
            update() { this.delta = this.clock.getDelta(); this.time = (this.time || 0) + this.delta; }
        }
        const Common = new CommonClass();

        class MouseClass {
            constructor() { this.coords = new THREE.Vector2(); this.coords_old = new THREE.Vector2(); this.diff = new THREE.Vector2(); this.isHoverInside = false; this.isAutoActive = false; this.autoIntensity = 2.0; }
            init(container) {
                this.container = container;
                const move = e => { if (!this.isPointInside(e.clientX, e.clientY)) return; this.setCoords(e.clientX, e.clientY); };
                window.addEventListener('mousemove', move);
                this._cleanup = () => window.removeEventListener('mousemove', move);
            }
            dispose() { this._cleanup && this._cleanup(); }
            isPointInside(x, y) { if (!this.container) return false; const r = this.container.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
            setCoords(x, y) { const r = this.container.getBoundingClientRect(); this.coords.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height * 2 - 1)); this.isHoverInside = true; }
            update() { this.diff.subVectors(this.coords, this.coords_old); this.coords_old.copy(this.coords); if (this.isAutoActive) this.diff.multiplyScalar(this.autoIntensity); }
        }
        const Mouse = new MouseClass();

        // Auto demo driver
        class AutoDriver {
            constructor(mouse, opts) {
                this.mouse = mouse; this.enabled = opts.enabled; this.speed = opts.speed;
                this.resumeDelay = opts.resumeDelay || 3000; this.active = false;
                this.current = new THREE.Vector2(); this.target = new THREE.Vector2();
                this.lastTime = performance.now(); this.lastInteraction = performance.now();
                this.pickNewTarget();
            }
            pickNewTarget() { this.target.set((Math.random() * 2 - 1) * 0.8, (Math.random() * 2 - 1) * 0.8); }
            forceStop() { this.active = false; this.mouse.isAutoActive = false; }
            update() {
                if (!this.enabled) return;
                const now = performance.now();
                if (this.mouse.isHoverInside) { this.forceStop(); this.lastInteraction = now; return; }
                if (now - this.lastInteraction < this.resumeDelay) { this.forceStop(); return; }
                if (!this.active) { this.active = true; this.current.copy(this.mouse.coords); this.lastTime = now; }
                this.mouse.isAutoActive = true;
                let dt = (now - this.lastTime) / 1000; this.lastTime = now; if (dt > 0.2) dt = 0.016;
                const dir = this.target.clone().sub(this.current);
                if (dir.length() < 0.01) { this.pickNewTarget(); return; }
                dir.normalize();
                this.current.addScaledVector(dir, this.speed * dt);
                this.mouse.coords.copy(this.current);
            }
        }

        // Simplified Simulation
        class Simulation {
            constructor() {
                this.options = { iterations_poisson: iterationsPoisson, iterations_viscous: iterationsViscous, mouse_force: mouseForce, resolution, cursor_size: cursorSize, viscous, isBounce, dt, isViscous, BFECC };
                this.fboSize = new THREE.Vector2(); this.cellScale = new THREE.Vector2();
                this.calcSize(); this.createFBOs(); this.createPasses();
            }
            getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType; }
            calcSize() {
                const w = Math.max(1, Math.round(this.options.resolution * Common.width));
                const h = Math.max(1, Math.round(this.options.resolution * Common.height));
                this.cellScale.set(1 / w, 1 / h); this.fboSize.set(w, h);
            }
            createFBOs() {
                const opts = { type: this.getFloatType(), depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
                this.fbos = {};
                ['vel_0', 'vel_1', 'div', 'pressure_0', 'pressure_1'].forEach(k => { this.fbos[k] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts); });
            }
            createPasses() {
                const scene = new THREE.Scene(); const cam = new THREE.Camera();
                const geo = new THREE.PlaneGeometry(2, 2);
                // Advection
                this.advMat = new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: advection_frag, uniforms: { boundarySpace: { value: this.cellScale }, px: { value: this.cellScale }, fboSize: { value: this.fboSize }, velocity: { value: this.fbos.vel_0.texture }, dt: { value: dt }, isBFECC: { value: true } } });
                this.advMesh = new THREE.Mesh(geo, this.advMat);
                // Force
                this.forceMat = new THREE.RawShaderMaterial({ vertexShader: mouse_vert, fragmentShader: externalForce_frag, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { px: { value: this.cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(cursorSize, cursorSize) } } });
                this.forceMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.forceMat);
                // Divergence
                this.divMat = new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: divergence_frag, uniforms: { boundarySpace: { value: this.cellScale }, velocity: { value: this.fbos.vel_1.texture }, px: { value: this.cellScale }, dt: { value: dt } } });
                this.divMesh = new THREE.Mesh(geo, this.divMat);
                // Poisson
                this.poissonMat = new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: poisson_frag, uniforms: { boundarySpace: { value: this.cellScale }, pressure: { value: this.fbos.pressure_0.texture }, divergence: { value: this.fbos.div.texture }, px: { value: this.cellScale } } });
                this.poissonMesh = new THREE.Mesh(geo, this.poissonMat);
                // Pressure
                this.pressMat = new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: pressure_frag, uniforms: { boundarySpace: { value: this.cellScale }, pressure: { value: this.fbos.pressure_0.texture }, velocity: { value: this.fbos.vel_1.texture }, px: { value: this.cellScale }, dt: { value: dt } } });
                this.pressMesh = new THREE.Mesh(geo, this.pressMat);
                this.scene = scene; this.camera = cam;
            }
            resize() { this.calcSize(); Object.values(this.fbos).forEach(f => f.setSize(this.fboSize.x, this.fboSize.y)); }
            render(mesh, target) { this.scene.children = [mesh]; Common.renderer.setRenderTarget(target); Common.renderer.render(this.scene, this.camera); Common.renderer.setRenderTarget(null); }
            update() {
                // Advection
                this.advMat.uniforms.velocity.value = this.fbos.vel_0.texture;
                this.render(this.advMesh, this.fbos.vel_1);
                // External force
                const fx = (Mouse.diff.x / 2) * this.options.mouse_force;
                const fy = (Mouse.diff.y / 2) * this.options.mouse_force;
                this.forceMat.uniforms.force.value.set(fx, fy);
                this.forceMat.uniforms.center.value.copy(Mouse.coords);
                this.forceMat.uniforms.scale.value.set(this.options.cursor_size, this.options.cursor_size);
                this.render(this.forceMesh, this.fbos.vel_1);
                // Divergence
                this.divMat.uniforms.velocity.value = this.fbos.vel_1.texture;
                this.render(this.divMesh, this.fbos.div);
                // Poisson iterations
                for (let i = 0; i < this.options.iterations_poisson; i++) {
                    const [pIn, pOut] = i % 2 === 0 ? [this.fbos.pressure_0, this.fbos.pressure_1] : [this.fbos.pressure_1, this.fbos.pressure_0];
                    this.poissonMat.uniforms.pressure.value = pIn.texture;
                    this.render(this.poissonMesh, pOut);
                }
                // Pressure gradient
                this.pressMat.uniforms.velocity.value = this.fbos.vel_1.texture;
                this.pressMat.uniforms.pressure.value = this.fbos.pressure_0.texture;
                this.render(this.pressMesh, this.fbos.vel_0);
            }
        }

        // Output
        class Output {
            constructor(sim) {
                this.simulation = sim;
                this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
                this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({
                    vertexShader: face_vert, fragmentShader: color_frag, transparent: true, depthWrite: false,
                    uniforms: { velocity: { value: sim.fbos.vel_0.texture }, boundarySpace: { value: new THREE.Vector2() }, palette: { value: paletteTex }, bgColor: { value: bgVec4 } }
                }));
                this.scene.add(this.mesh);
            }
            resize() { this.simulation.resize(); }
            update() { this.simulation.update(); Common.renderer.setRenderTarget(null); Common.renderer.render(this.scene, this.camera); }
        }

        // Manager
        const container = mountRef.current;
        container.style.position = container.style.position || 'relative';
        container.style.overflow = 'hidden';

        Common.init(container);
        Mouse.init(container);
        Mouse.autoIntensity = autoIntensity;
        container.prepend(Common.renderer.domElement);

        const sim = new Simulation();
        const output = new Output(sim);
        const autoDriver = new AutoDriver(Mouse, { enabled: autoDemo, speed: autoSpeed, resumeDelay: autoResumeDelay });

        let running = true;
        const loop = () => {
            if (!running) return;
            autoDriver.update(); Mouse.update(); Common.update(); output.update();
            rafRef.current = requestAnimationFrame(loop);
        };
        loop();

        const ro = new ResizeObserver(() => { Common.resize(); output.resize(); });
        ro.observe(container);
        resizeObserverRef.current = ro;

        return () => {
            running = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            ro.disconnect();
            Mouse.dispose();
            if (Common.renderer) { Common.renderer.domElement.remove(); Common.renderer.dispose(); }
        };
    }, [colors, mouseForce, cursorSize, isViscous, viscous, iterationsViscous, iterationsPoisson, dt, BFECC, resolution, isBounce, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration]);

    return <div ref={mountRef} className={`liquid-ether-container ${className || ''}`} style={style} />;
}
