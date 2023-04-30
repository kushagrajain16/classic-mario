var TYPE = 'file',
DESIRED_USERNAME = "ScratchCat",

COMPAT = true,

TURBO = false,

PROJECT_ID = "381280770",

WIDTH = 480,
HEIGHT = 360,

EXTENSION_URL = null,

GENERATED = 1599995042221;


!function(e){"use strict";function n(){this.name="NotSupportedError",this.message="getUserMedia is not implemented in this browser"}function i(){this.then=function(){return this};var i=new n;this.catch=function(e){setTimeout(function(){e(i)})}}n.prototype=Error.prototype;var r="undefined"!=typeof Promise,t="undefined"!=typeof navigator,a=t&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia,o=t&&(navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia);function s(t){return r?a?navigator.mediaDevices.getUserMedia(t):new Promise(function(e,i){if(!o)return i(new n);o.call(navigator,t,e,i)}):new i}s.NotSupportedError=n,s.isSupported=!(!r||!a&&!o),"function"==typeof define&&define.amd?define([],function(){return s}):"object"==typeof module&&module.exports?module.exports=s:(e.navigator||(e.navigator={}),e.navigator.mediaDevices||(e.navigator.mediaDevices={}),e.navigator.mediaDevices.getUserMedia||(e.navigator.mediaDevices.getUserMedia=s))}(this);

const requestStack = [];
const requestVideoStream = videoDesc => {
    let streamPromise;
    if (requestStack.length === 0) {
        streamPromise = navigator.mediaDevices.getUserMedia({
            audio: false,
            video: videoDesc
        });
        requestStack.push(streamPromise);
    } else if (requestStack.length > 0) {
        streamPromise = requestStack[0];
        requestStack.push(true);
    }
    return streamPromise;
};

const requestDisableVideo = () => {
    requestStack.pop();
    if (requestStack.length > 0) return false;
    return true;
};

class VideoProvider {
    constructor () {
        this.mirror = true;

        this._frameCacheTimeout = 16;

        this._video = null;

        this._track = null;

        this._workspace = [];
    }

    static get FORMAT_IMAGE_DATA () {
        return 'image-data';
    }

    static get FORMAT_CANVAS () {
        return 'canvas';
    }

    static get DIMENSIONS () {
        return [WIDTH, HEIGHT];
    }

    static get ORDER () {
        return 1;
    }

    get video () {
        return this._video;
    }

    enableVideo () {
        this.enabled = true;
        return this._setupVideo();
    }

    disableVideo () {
        this.enabled = false;
        if (this._singleSetup) {
            this._singleSetup
                .then(this._teardown.bind(this))
                .catch(err => this.onError(err));
        }
    }

    _teardown () {
        if (this.enabled === false) {
            const disableTrack = requestDisableVideo();
            this._singleSetup = null;
            this._video = null;
            if (this._track && disableTrack) {
                this._track.stop();
            }
            this._track = null;
        }
    }

    getFrame ({
        dimensions = VideoProvider.DIMENSIONS,
        mirror = this.mirror,
        format = VideoProvider.FORMAT_IMAGE_DATA,
        cacheTimeout = this._frameCacheTimeout
    }) {
        if (!this.videoReady) {
            return null;
        }
        const [width, height] = dimensions;
        const workspace = this._getWorkspace({dimensions, mirror: Boolean(mirror)});
        const {videoWidth, videoHeight} = this._video;
        const {canvas, context, lastUpdate, cacheData} = workspace;
        const now = Date.now();

        if (lastUpdate + cacheTimeout < now) {

            if (mirror) {
                context.scale(-1, 1);
                context.translate(width * -1, 0);
            }

            context.drawImage(this._video,
                0, 0, videoWidth, videoHeight,
                0, 0, width, height
            );

            context.setTransform(1, 0, 0, 1, 0, 0);
            workspace.lastUpdate = now;
        }

        if (!cacheData[format]) {
            cacheData[format] = {lastUpdate: 0};
        }
        const formatCache = cacheData[format];

        if (formatCache.lastUpdate + cacheTimeout < now) {
            if (format === VideoProvider.FORMAT_IMAGE_DATA) {
                formatCache.lastData = context.getImageData(0, 0, width, height);
            } else if (format === VideoProvider.FORMAT_CANVAS) {
                formatCache.lastUpdate = Infinity;
                formatCache.lastData = canvas;
            } else {
                console.error(`video io error - unimplemented format ${format}`);
                formatCache.lastUpdate = Infinity;
                formatCache.lastData = null;
            }

            formatCache.lastUpdate = Math.max(workspace.lastUpdate, formatCache.lastUpdate);
        }

        return formatCache.lastData;
    }

    onError (error) {
        console.error('Unhandled video io device error', error);
    }

    _setupVideo () {
        if (this._singleSetup) {
            return this._singleSetup;
        }

        this._singleSetup = requestVideoStream({
            width: {min: WIDTH, ideal: 480 * WIDTH / HEIGHT},
            height: {min: HEIGHT, ideal: 480}
        })
            .then(stream => {
                this._video = document.createElement('video');

                try {
                    this._video.srcObject = stream;
                } catch (error) {
                    this._video.src = window.URL.createObjectURL(stream);
                }
                this._video.play();
                this._track = stream.getTracks()[0];
                return this;
            })
            .catch(error => {
                this._singleSetup = null;
                this.onError(error);
            });

        return this._singleSetup;
    }

    get videoReady () {
        if (!this.enabled) {
            return false;
        }
        if (!this._video) {
            return false;
        }
        if (!this._track) {
            return false;
        }
        const {videoWidth, videoHeight} = this._video;
        if (typeof videoWidth !== 'number' || typeof videoHeight !== 'number') {
            return false;
        }
        if (videoWidth === 0 || videoHeight === 0) {
            return false;
        }
        return true;
    }

    _getWorkspace ({dimensions, mirror}) {
        let workspace = this._workspace.find(space => (
            space.dimensions.join('-') === dimensions.join('-') &&
            space.mirror === mirror
        ));
        if (!workspace) {
            workspace = {
                dimensions,
                mirror,
                canvas: document.createElement('canvas'),
                lastUpdate: 0,
                cacheData: {}
            };
            workspace.canvas.width = dimensions[0];
            workspace.canvas.height = dimensions[1];
            workspace.context = workspace.canvas.getContext('2d');
            this._workspace.push(workspace);
        }
        return workspace;
    }
}

const Scratch = window.Scratch = window.Scratch || {};

const CLOUD_PREFIX = '\u2601 ';

const runBenchmark = function () {
  const vm = new window.NotVirtualMachine( WIDTH, HEIGHT );
  Scratch.vm = vm;

  const storage = new ScratchStorage();
  Scratch.storage = storage;
  
  const AssetType = storage.AssetType;
  storage.addWebStore([AssetType.Project], () => TYPE === 'zip' ? './project.json' : PROJECT_JSON);
  storage.addWebStore(
    [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
    ({ assetId, dataFormat }) => TYPE === 'zip'
      ? `./${assetId}.${dataFormat}`
      : ASSETS[`${assetId}.${dataFormat}`]
  );
  
  vm.attachStorage(storage);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
    
    
    monitorWrapper.style.transform = `scale(${rect.height / HEIGHT})`;
    
  }
  const monitorWrapper = document.getElementById('monitors');
  const canvas = document.getElementById('stage');
  const renderer = new window.ScratchRender(canvas  , -WIDTH / 2, WIDTH / 2, -HEIGHT / 2, HEIGHT / 2 );
  resize();
  Scratch.renderer = renderer;
  vm.attachRenderer(renderer);

  const audioEngine = new window.AudioEngine();
  Scratch.audioEngine = audioEngine;
  vm.attachAudioEngine(audioEngine);

  const svgRenderer = new ScratchSVGRenderer.SVGRenderer();
  Scratch.svgRenderer = svgRenderer;
  vm.attachV2SVGAdapter(svgRenderer);

  const bitmapAdapter = new ScratchSVGRenderer.BitmapAdapter(null, null,  WIDTH, HEIGHT );
  Scratch.bitmapAdapter = bitmapAdapter;
  vm.attachV2BitmapAdapter(bitmapAdapter);

  const videoProvider = new VideoProvider();
  Scratch.videoProvider = videoProvider;
  vm.setVideoProvider(videoProvider);

  const noop = () => null;
  let ws;
  function openConnection() {
    try {
      ws = new WebSocket({CLOUD_HOST});
    } catch (err) {
      console.warn(err);
      return;
    }
    ws.onmessage = onMessage;
    ws.onopen = onOpen;
    ws.onclose = onClose;
  }
  function onMessage(e) {
    e.data.split('\n').forEach(message => {
      if (message) {
        const { name, value } = JSON.parse(message)
        vm.postIOData('cloud', {
          varUpdate: {name, value}
        });
      }
    });
  }
  function sendData(data) {
    data.user = DESIRED_USERNAME;
    data.project_id = PROJECT_ID;
    ws.send(JSON.stringify(data) + '\n');
  }
  function onOpen() {
    sendData({method: 'handshake'});
  }
  function onClose() {
    setTimeout(openConnection, 500);
  }
  const cloudProvider = {
    updateVariable(name, value) {
      
        
        try {
          localStorage.setItem('[s3] ' + name, value);
        } catch (e) {
          console.error('Cannot use localStorage?', e);
        }
        
        
        
        
    },
    createVariable: noop,
    renameVariable: noop,
    deleteVariable: noop,
    
    
    requestCloseConnection: noop
    
  };

  vm.setCompatibilityMode(COMPAT);
  vm.setTurboMode(TURBO);
  

  vm.start();

  
  const progress = document.getElementById('loading-progress');
  const _load = storage.webHelper.load;
  let total = 0, complete = 0;
  storage.webHelper.load = function (...args) {
    const result = _load.call(this, ...args);
    total += 1;
    progress.textContent = complete + '/' + total;
    result.then(() => {
      complete += 1;
      progress.textContent = complete + '/' + total;
    });
    return result;
  };
  
  

  // MOUSE
  /* https://github.com/LLK/scratch-gui/blob/develop/src/containers/stage.jsx#L176-L300 */
  const getEventXY = e => {
    if (e.touches && e.touches[0]) {
      return {x: e.touches[0].clientX, y: e.touches[0].clientY};
    } else if (e.changedTouches && e.changedTouches[0]) {
      return {x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY};
    }
    return {x: e.clientX, y: e.clientY};
  };
  let mouseDown = false,
  mouseDownPosition = null,
  mouseDownTimeoutId = null,
  isDragging = false,
  dragId = null,
  dragOffset = null;
  function cancelMouseDownTimeout() {
    if (mouseDownTimeoutId !== null) {
      clearTimeout(mouseDownTimeoutId);
    }
    mouseDownTimeoutId = null;
  }
  // https://github.com/LLK/scratch-gui/blob/develop/src/containers/stage.jsx#L337-L366
  function onStartDrag() {
    if (dragId) return;
    const drawableId = renderer.pick(...mouseDownPosition);
    if (drawableId === null) return;
    const targetId = vm.getTargetIdForDrawableId(drawableId);
    if (targetId === null) return;
    const target = vm.runtime.getTargetById(targetId);
    if (!target.draggable) return;
    target.goToFront();
    const drawableData = renderer.extractDrawable(drawableId, ...mouseDownPosition);
    vm.startDrag(targetId);
    isDragging = true;
    dragId = targetId;
    dragOffset = drawableData.scratchOffset;
  }
  function getScratchCoords(x, y, rect) {
    const nativeSize = renderer.getNativeSize();
    return [
      (nativeSize[0] / rect.width) * (x - (rect.width / 2)),
      (nativeSize[1] / rect.height) * (y - (rect.height / 2))
    ];
  }
  
  function mousemove(e) {
    
    const {x, y} = getEventXY(e);
    const rect = canvas.getBoundingClientRect();
    const mousePosition = [x - rect.left, y - rect.top];
    if (mouseDown && !isDragging) {
      const distanceFromMouseDown = Math.sqrt(
        Math.pow(mousePosition[0] - mouseDownPosition[0], 2) +
        Math.pow(mousePosition[1] - mouseDownPosition[1], 2)
      );
      if (distanceFromMouseDown > 3) {
        cancelMouseDownTimeout();
        onStartDrag();
      }
    }
    if (mouseDown && isDragging) {
      const spritePosition = getScratchCoords(mousePosition[0], mousePosition[1], rect);
      vm.postSpriteInfo({
        x: spritePosition[0] + dragOffset[0],
        y: -(spritePosition[1] + dragOffset[1]),
        force: true
      });
    }
    vm.postIOData('mouse', {
      x: mousePosition[0],
      y: mousePosition[1],
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
  }
  function mousedown(e) {
    mouseDown = true;
    
    const {x, y} = getEventXY(e);
    const rect = canvas.getBoundingClientRect();
    const mousePosition = [x - rect.left, y - rect.top];
    mouseDownPosition = mousePosition;
    mouseDownTimeoutId = setTimeout(onStartDrag, 400);
    vm.postIOData('mouse', {
      isDown: true,
      x: mousePosition[0],
      y: mousePosition[1],
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
    e.preventDefault();
    if (!document.body.classList.contains('asking')) {
      window.focus();
    }
  }
  function mouseup(e) {
    cancelMouseDownTimeout();
    mouseDown = false;
    mouseDownPosition = null;
    if (isDragging) {
      vm.stopDrag(dragId);
      isDragging = false;
      dragOffset = null;
      dragId = null;
    }
    
    const {x, y} = getEventXY(e);
    const rect = canvas.getBoundingClientRect();
    vm.postIOData('mouse', {
      isDown: false,
      x: x - rect.left,
      y: y - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
  }
  document.addEventListener('mousemove', mousemove);
  canvas.addEventListener('mousedown', mousedown);
  document.addEventListener('mouseup', mouseup);
  document.addEventListener('touchmove', mousemove);
  canvas.addEventListener('touchstart', mousedown, {passive: false});
  document.addEventListener('touchend', mouseup, {passive: false});
  canvas.addEventListener('wheel', e => {
    vm.postIOData('mouseWheel', {
      deltaX: e.deltaX,
      deltaY: e.deltaY
    });
    e.preventDefault();
  });
  window.addEventListener('resize', resize);
  

  // KEY PRESSED?
  /* https://github.com/LLK/scratch-gui/blob/develop/src/lib/vm-listener-hoc.jsx#L86-L115 */
  document.addEventListener('keydown', e => {
    if (e.target !== document && e.target !== document.body) return;
    const key = !e.key || e.key === 'Dead' ? e.keyCode : e.key;
    vm.postIOData('keyboard', {
      key: key,
      isDown: true
    });
    if (e.keyCode === 32 || e.keyCode >= 37 && e.keyCode <= 40) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => {
    const key = !e.key || e.key === 'Dead' ? e.keyCode : e.key;
    vm.postIOData('keyboard', {
      key: key,
      isDown: false
    });
    if (e.target !== document && e.target !== document.body) {
      e.preventDefault();
    }
  });

  // ASK AND WAIT
  const question = document.getElementById('question');
  const askBox = document.getElementById('answer');
  vm.runtime.addListener('QUESTION', questionData => {
    /* null means the asking was interrupted by stop script block */
    if (questionData === null) {
      document.body.classList.remove('asking');
    } else {
      document.body.classList.add('asking');
      question.textContent = questionData;
      askBox.value = '';
      askBox.focus();
    }
  });
  askBox.addEventListener('keydown', e => {
    if (e.keyCode === 13) {
      document.body.classList.remove('asking');
      /* submit answer after because it starts the next question synchronously */
      vm.runtime.emit('ANSWER', askBox.value);
    }
  });

  // MONITORS
  const getVariable = (targetId, variableId) => {
      const target = targetId ?
          vm.runtime.getTargetById(targetId) :
          vm.runtime.getTargetForStage();
      return target.variables[variableId];
  };
  const monitorStates = {};
  let once = false;
  vm.runtime.addListener('MONITORS_UPDATE', monitors => {
    monitors.forEach((record, id) => {
      if (!monitorStates[id]) {
        const monitor = document.createElement('div');
        monitor.className = 'monitor ' + record.mode;
        monitor.style.left = record.x + 'px';
        monitor.style.top = record.y + 'px';
        if (record.mode === 'list') {
          // If the list has never been resized, the width/height will be 0. Weird
          monitor.style.width = (record.width || 100) + 'px';
          monitor.style.height = (record.height || 200) + 'px';
        }
        const label = document.createElement('span');
        label.className = 'monitor-label';
        let name = record.params.VARIABLE || record.params.LIST || record.opcode;
        if (record.spriteName) name = `${record.spriteName}: ${name}`;
        label.textContent = name;
        monitor.appendChild(label);
        const value = document.createElement('span');
        value.className = 'monitor-value';
        monitor.appendChild(value);
        monitorStates[id] = {monitor, value};
        if (record.mode === 'slider') {
          const slider = document.createElement('input');
          slider.type = 'range';
          slider.min = record.sliderMin;
          slider.max = record.sliderMax;
          slider.step = record.isDiscrete ? 1 : 0.01;
          slider.addEventListener('input', e => {
            getVariable(record.targetId, id).value = slider.value;
          });
          slider.addEventListener('change', e => {
            getVariable(record.targetId, id).value = slider.value;
          });
          monitorStates[id].slider = slider;
          monitor.appendChild(slider);
        }
        monitorWrapper.appendChild(monitor);
      }
      monitorStates[id].monitor.style.display = record.visible ? null : 'none';
      if (record.visible) {
        let value = record.value;
        if (typeof value === 'number') {
          value = Number(value.toFixed(6));
        }
        if (typeof value === 'boolean') {
          value = value.toString();
        }
        if (Array.isArray(value)) {
          if (monitorStates[id].lastValue === JSON.stringify(value)) return;
          monitorStates[id].value.innerHTML = '';
          value.forEach(val => {
            const row = document.createElement('div');
            row.className = 'row';
            row.textContent = val;
            monitorStates[id].value.appendChild(row);
          });
        } else {
          monitorStates[id].value.textContent = value;
          if (monitorStates[id].slider) monitorStates[id].slider.value = value;
        }
      }
    });
  });

  vm.postIOData('userData', {username: DESIRED_USERNAME});

  return Promise.resolve()

    

    .then(
      () => TYPE === 'file'
        ? fetch(FILE).then(r => r.arrayBuffer())
        : storage.load(storage.AssetType.Project).then(asset => asset.data)
    )
    .then(data => vm.loadProject(data))

    .then(() => {

  vm.setCloudProvider(cloudProvider);
  
  const stageVariables = vm.runtime.getTargetForStage().variables;
  for (const { name, isCloud } of Object.values(stageVariables)) {
    if (isCloud) {
      
      const value = localStorage.getItem('[s3] ' + name);
      if (value === null) continue;
      vm.postIOData('cloud', { varUpdate: { name, value } });
    }
  }
  window.addEventListener('storage', e => {
    if (e.storageArea === localStorage && e.key.slice(0, 5) === '[s3] ') {
      const name = e.key.slice(5);
      
      vm.postIOData('cloud', {
        varUpdate: {
          name,
          value: e.newValue
        }
      });
    }
  });
  
  

  
  if (progress.parentNode) {
  progress.parentNode.removeChild(progress);
  }
  
  

  vm.greenFlag();

    });
};

window.onload = function () {
  runBenchmark();
  window.focus();
};


function isFullscreen() {
  return document.fullscreenElement || document.mozFullScreenElement
    || document.webkitFullscreenElement || document.msFullscreenElement;
}
const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', e => {
  fullscreenBtn.blur();
  if (isFullscreen()) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } else {
    if (document.body.requestFullscreen) document.body.requestFullscreen();
    else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
    else if (document.body.mozRequestFullScreen) document.body.mozRequestFullScreen();
    else if (document.body.webkitRequestFullscreen) document.body.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  }
});
function onFullscreenChange() {
  if (isFullscreen()) {
    document.body.classList.add('fullscreen');
  } else {
    document.body.classList.remove('fullscreen');
  }
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('mozfullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
document.addEventListener('msfullscreenchange', onFullscreenChange);
