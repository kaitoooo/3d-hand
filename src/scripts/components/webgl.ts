import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import throttle from 'lodash.throttle';
import { gsap } from 'gsap';

export default class WebGL {
    winSize: {
        [s: string]: number;
    };
    elms: {
        [s: string]: HTMLElement;
    };
    dpr: number;
    three: {
        scene: THREE.Scene;
        renderer: THREE.WebGLRenderer | null;
        clock: THREE.Clock;
        redraw: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> | null;
        camera: THREE.PerspectiveCamera | null;
        cameraFov: number;
        cameraAspect: number;
        mixer: THREE.AnimationMixer;
        animations: THREE.AnimationClip[];
        deg: number;
        particle: THREE.Mesh;
        particles: THREE.Mesh| Array<T>;
        particlesSlice: THREE.Group | Array<T>;
        framesCount: number;
        localGroup: THREE.Group;
    };
    sp: boolean;
    ua: string;
    mq: MediaQueryList;
    srcObj: string;
    flg: {
        [s: string]: boolean;
    };
    constructor() {
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
        };
        this.elms = {
            canvas: document.querySelector('[data-canvas]'),
            mvTitle: document.querySelector('[data-mv="title"]'),
            mvHomeLink: document.querySelector('[data-mv="homeLink"]'),
            mvNoteLink: document.querySelector('[data-mv="noteLink"]'),
        };
        // デバイスピクセル比(最大値=2)
        this.dpr = Math.min(window.devicePixelRatio, 2);
        this.three = {
            scene: null,
            renderer: null,
            clock: null,
            redraw: null,
            camera: null,
            cameraFov: 50,
            cameraAspect: window.innerWidth / window.innerHeight,
            mixer: null,
            animations: null,
            deg: null,
            particle: null,
            particles: [],
            particlesSlice: [],
            framesCount: 0,
            localGroup: null,
        };
        this.sp = null;
        this.ua = window.navigator.userAgent.toLowerCase();
        this.mq = window.matchMedia('(max-width: 768px)');
        this.srcObj = './obj/hand.glb';
        this.flg = {
            loaded: false,
        };
        this.init();
    }
    init(): void {
        this.getLayout();
        this.initScene();
        this.initCamera();
        this.initClock();
        this.initDegree();
        this.initRenderer();
        this.setLoading();
        this.setLight();
        this.handleEvents();
        if (this.ua.indexOf('msie') !== -1 || this.ua.indexOf('trident') !== -1) {
            return;
        } else {
            this.mq.addEventListener('change', this.getLayout.bind(this));
        }
    }
    getLayout(): void {
        this.sp = this.mq.matches ? true : false;
    }
    initScene(): void {
        // シーンを作成
        this.three.scene = new THREE.Scene();
    }
    initCamera(): void {
        // カメラを作成(視野角, スペクト比, near, far)
        this.three.camera = new THREE.PerspectiveCamera(this.three.cameraFov, this.winSize.wd / this.winSize.wh, this.three.cameraAspect, 1000);
        this.three.camera.position.set(0, 0, 9);
    }
    initClock(): void {
        this.three.clock = new THREE.Clock();
    }
    initDegree(): void {
        this.three.deg = Math.PI / 180; // one degree
    }
    initRenderer(): void {
        // レンダラーを作成
        this.three.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true, //背景色を設定しないとき、背景を透明にする
        });
        // this.three.renderer.setClearColor(0xffffff); //背景色
        this.three.renderer.setPixelRatio(this.dpr); // retina対応
        this.three.renderer.setSize(this.winSize.wd, this.winSize.wh); // 画面サイズをセット
        this.three.renderer.physicallyCorrectLights = true;
        this.three.renderer.shadowMap.enabled = true; // シャドウを有効にする
        this.three.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // PCFShadowMapの結果から更に隣り合う影との間を線形補間して描画する
        this.elms.canvas.appendChild(this.three.renderer.domElement); // HTMLにcanvasを追加
        this.three.renderer.outputEncoding = THREE.GammaEncoding; // 出力エンコーディングを定義
    }
    setLight() {
        // 環境光源(色, 光の強さ)
        const ambientLight = new THREE.AmbientLight(0x666666);
        this.three.scene.add(ambientLight);

        const positionArr = [
            [0, 5, 0, 2],
            [-5, 3, 2, 2],
            [5, 3, 2, 2],
            [0, 3, 5, 1],
            [0, 3, -5, 2],
        ];

        for (let i = 0; i < positionArr.length; i++) {
            // 平行光源(色, 光の強さ)
            const directionalLight = new THREE.DirectionalLight(0xffffff, positionArr[i][3]);
            directionalLight.position.set(positionArr[i][0], positionArr[i][1], positionArr[i][2]);

            if (i == 0 || i == 2 || i == 3) {
                directionalLight.castShadow = true;
                directionalLight.shadow.camera.top = 50;
                directionalLight.shadow.camera.bottom = -50;
                directionalLight.shadow.camera.right = 50;
                directionalLight.shadow.camera.left = -50;
                directionalLight.shadow.mapSize.set(4096, 4096);
            }
            this.three.scene.add(directionalLight);
        }
    }
    sceneParticles(size: number, length: number) {
        const geometry = new THREE.SphereBufferGeometry(size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 'hsl(21, 100%, 64%)' });

        let i = 0,
            ix,
            iy;

        // Two Dimensions (x & y)
        for (let ix = 0; ix < length; ++ix) {
            // Third Dimension (z)
            for (let iy = 0; iy < length; ++iy) {
                this.three.particle = this.three.particles[i++] = new THREE.Mesh(geometry, material);

                this.three.particle.position.x = Math.sin(iy * (2 / length) * Math.PI);
                this.three.particle.position.y = Math.cos(iy * (2 / length) * Math.PI);

                this.three.scene.add(this.three.particle);
            }
        }
    }
    groupSlices(length: number) {
        let i = 0,
            ix,
            iy;

        // Two Dimensions (x & y)
        for (let ix = 0; ix < length; ++ix) {
            this.three.particlesSlice[ix] = new THREE.Group();

            // Third Dimension (z)
            for (let iy = 0; iy < length; ++iy) {
                i++;
                this.three.particlesSlice[ix].add(this.three.particles[i - 1]);
            }

            this.three.scene.add(this.three.particlesSlice[ix]);

            // Initial positioning
            this.three.particlesSlice[ix].rotation.x = this.three.deg * ((ix / length) * 180);
            this.three.particlesSlice[ix].rotation.y = this.three.deg * ((ix / length) * 180) * 3;
            this.three.particlesSlice[ix].rotation.z = this.three.deg * ((ix / length) * 180) * 6;
        }
    }
    sceneGroup(group: THREE.Group, objs: THREE.Mesh) {
        group = this.three.localGroup = new THREE.Group();

        objs.forEach((obj: THREE.Mesh) => {
            group.add(obj);
        });

        this.three.scene.add(group);
    }
    setLoading() {
        this.sceneParticles(0.005, 64);
        this.groupSlices(64);
        this.sceneGroup(this.three.localGroup, this.three.particlesSlice);

        // glTF形式の3Dモデルを読み込む
        const loader = new GLTFLoader();
        loader.load(this.srcObj, (obj) => {
            const gltf = obj;
            const data = gltf.scene;
            // 3Dモデルのサイズを指定
            data.scale.set(this.sp ? 0.5 : 1, this.sp ? 0.5 : 1, this.sp ? 0.5 : 1);
            this.three.animations = gltf.animations;

            if (this.three.animations && this.three.animations.length) {
                //Animation Mixerインスタンスを生成
                this.three.mixer = new THREE.AnimationMixer(data);

                //全てのAnimation Clipに対して
                for (let i = 0; i < this.three.animations.length; i++) {
                    const animation = this.three.animations[i];
                    //Animation Actionを生成
                    const action = this.three.mixer.clipAction(animation);

                    //ループ設定（無限）
                    action.setLoop(THREE.Loop);

                    //アニメーションの最後のフレームでアニメーションが終了
                    action.clampWhenFinished = true;
                    //アニメーションを再生
                    action.play();
                }
            }
            // 3Dモデルに影をつける
            data.traverse((n) => {
                //シーン上のすべてに対して
                n.castShadow = true;
                n.receiveShadow = true;
            });
            this.three.redraw = data;
            this.three.scene.add(data); // シーンに3Dモデルを追加
            this.three.redraw.rotation.set(0.3, 0.6, 0);
            this.three.redraw.scale.set(this.sp ? 0.8 : 2, this.sp ? 0.8 : 2, this.sp ? 0.8 : 2);
            this.three.redraw.position.set(0, -1.2, 0);
            this.flg.loaded = true;
            this.rendering(); // レンダリングを開始する
            this.animate();
        });
    }
    rendering(): void {
        this.three.framesCount++;

        // Slice Animation
        for (let i = 0; i < this.three.particlesSlice.length; ++i) {
            this.three.particlesSlice[i].rotation.x += 0.001 + 0.0002 * i;
            this.three.particlesSlice[i].rotation.y += 0.0015 + 0.0001 * i;
            this.three.particlesSlice[i].rotation.z += 0.002 + 0.0002 * i;
        }

        for (let i = 0; i < this.three.particles.length; ++i) {
            this.three.particles[i].scale.set(Math.sin(this.three.framesCount * 0.01 * i), Math.sin(this.three.framesCount * 0.01 * i), Math.sin(this.three.framesCount * 0.01 * i));
            this.three.particles[i].material.color.setHSL(Math.sin(this.three.framesCount * 0.0075 + i * 0.001) * 0.5 + 0.5, 0.75, 0.75);
        }

        this.three.localGroup.rotation.y = Math.cos(this.three.framesCount * 0.01);
        this.three.localGroup.rotation.z = Math.sin(this.three.framesCount * 0.02);

        if (this.three.mixer) {
            this.three.mixer.update(this.three.clock.getDelta());
        }
        // レンダリングを実行
        requestAnimationFrame(this.rendering.bind(this));
        this.three.renderer.render(this.three.scene, this.three.camera);
    }
    animate():void {
        gsap.config({
            force3D: true,
        });
        const tl = gsap.timeline({
            paused: true,
            defaults: {
                duration: 0.6,
                ease: 'power2.inOut',
            },
        });
        tl.to(
            this.elms.mvTitle,
            {
                duration: 0.8,
                ease: 'power2.easeOut',
                y: 0,
            },
            1
        );
        tl.to(
            this.elms.mvHomeLink,
            {
                duration: 0.5,
                ease: 'power2.easeOut',
                opacity: 1,
            },
            1.8
        );
        tl.to(
            this.elms.mvNoteLink,
            {
                duration: 0.5,
                ease: 'power2.easeOut',
                opacity: 1,
            },
            1.8
        );
        tl.play();
    }
    handleEvents(): void {
        // リサイズイベント登録
        window.addEventListener(
            'resize',
            throttle(() => {
                this.handleResize();
            }, 100),
            false
        );
    }
    handleResize(): void {
        // リサイズ処理
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
        };
        this.dpr = Math.min(window.devicePixelRatio, 2);
        if (this.three.camera) {
            // カメラの位置更新
            this.three.camera.aspect = this.winSize.wd / this.winSize.wh;
            this.three.camera.updateProjectionMatrix();
        }
        if (this.three.renderer) {
            // レンダラーの大きさ更新
            this.three.renderer.setSize(this.winSize.wd, this.winSize.wh);
            this.three.renderer.setPixelRatio(this.dpr);
        }
    }
}
