/* Frames3D v1.0.0 — dependency-free frame viewer */
(function (global) {
  'use strict';

  function wrap(value, length) {
    return ((Math.round(value) % length) + length) % length;
  }

  class Frames3D {
    constructor(target, options) {
      this.root = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(this.root instanceof HTMLElement)) throw new Error('Frames3D: container not found.');

      const settings = options || {};
      this.frames = settings.frames || [];
      if (!Array.isArray(this.frames) || this.frames.length < 2) {
        throw new Error('Frames3D: pass an array with at least 2 frame URLs.');
      }

      this.alt = settings.alt || '360° product view';
      this.inertia = settings.inertia !== false;
      this.invertScroll = settings.invertScroll === true;
      this.framesPerDrag = settings.framesPerDrag || 22;
      this.frame = wrap(settings.initialFrame || 0, this.frames.length);
      this.position = this.frame;
      this.velocity = 0;
      this.dragging = false;
      this.inertiaId = null;
      this.lastAnimationTime = null;
      this.abort = new AbortController();

      this.rootHadClass = this.root.classList.contains('frames3d');
      this.previousTabIndex = this.root.getAttribute('tabindex');
      this.previousUserSelect = this.root.style.userSelect;
      this.previousTouchAction = this.root.style.touchAction;

      this.root.classList.add('frames3d');
      this.root.tabIndex = this.root.tabIndex >= 0 ? this.root.tabIndex : 0;
      this.root.style.userSelect = 'none';
      this.root.style.touchAction = 'pan-y';
      this.image = document.createElement('img');
      this.image.className = 'frames3d__image';
      this.image.draggable = false;
      this.image.style.display = 'block';
      this.image.style.width = '100%';
      this.image.style.webkitUserDrag = 'none';
      this.root.append(this.image);

      this.bind();
      this.render(this.position);
      if (settings.preload !== false) this.preload();
    }

    bind() {
      const signal = this.abort.signal;
      this.root.addEventListener('pointerdown', (event) => this.startDrag(event), { signal });
      this.root.addEventListener('pointermove', (event) => this.moveDrag(event), { signal });
      this.root.addEventListener('pointerup', (event) => this.endDrag(event), { signal });
      this.root.addEventListener('pointercancel', (event) => this.endDrag(event), { signal });
      this.root.addEventListener('lostpointercapture', (event) => this.endDrag(event), { signal });
      this.image.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
      this.root.addEventListener('wheel', (event) => {
        const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
        if (!horizontalDelta) return;
        event.preventDefault();
        const direction = Math.sign(horizontalDelta);
        this.step(this.invertScroll ? -direction : direction);
      }, { passive: false, signal });
      this.root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); this.step(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); this.step(1); }
      }, { signal });
    }

    render(value) {
      this.position = value;
      const nextFrame = wrap(value, this.frames.length);
      if (nextFrame === this.frame && this.image.getAttribute('src') === this.frames[nextFrame]) {
        this.image.alt = `${this.alt}, view ${this.frame + 1} of ${this.frames.length}`;
        return;
      }
      this.frame = nextFrame;
      this.image.src = this.frames[this.frame];
      this.image.alt = `${this.alt}, view ${this.frame + 1} of ${this.frames.length}`;
    }

    startDrag(event) {
      if (!event.isPrimary || event.button !== 0) return;
      this.stopInertia();
      this.dragging = true;
      this.activePointerId = event.pointerId;
      this.lastX = event.clientX;
      this.lastTime = event.timeStamp;
      this.velocity = 0;
      this.root.setPointerCapture(event.pointerId);
    }

    moveDrag(event) {
      if (!this.dragging || event.pointerId !== this.activePointerId) return;
      const width = this.root.clientWidth;
      if (width <= 0) {
        this.lastX = event.clientX;
        this.lastTime = event.timeStamp;
        return;
      }
      const elapsed = Math.max(event.timeStamp - this.lastTime, 1);
      const distance = (event.clientX - this.lastX) / width * this.framesPerDrag;
      const moved = this.invertScroll ? -distance : distance;
      this.velocity = moved / elapsed;
      this.render(this.position + moved);
      this.lastX = event.clientX;
      this.lastTime = event.timeStamp;
    }

    endDrag(event) {
      if (!this.dragging || event.pointerId !== this.activePointerId) return;
      this.dragging = false;
      this.activePointerId = null;
      if (this.root.hasPointerCapture(event.pointerId)) this.root.releasePointerCapture(event.pointerId);
      if (event.type === 'pointerup' && this.inertia && Math.abs(this.velocity) > 0.012) {
        this.lastAnimationTime = null;
        this.inertiaId = requestAnimationFrame((time) => this.spin(time));
      }
    }

    spin(time) {
      const previousTime = this.lastAnimationTime ?? time - (1000 / 60);
      const elapsed = Math.min(Math.max(time - previousTime, 0), 64);
      this.lastAnimationTime = time;
      this.velocity *= Math.pow(0.94, elapsed / (1000 / 60));
      if (Math.abs(this.velocity) < 0.003) return this.stopInertia();
      this.render(this.position + this.velocity * elapsed);
      this.inertiaId = requestAnimationFrame((nextTime) => this.spin(nextTime));
    }

    stopInertia() {
      if (this.inertiaId !== null) cancelAnimationFrame(this.inertiaId);
      this.inertiaId = null;
      this.lastAnimationTime = null;
    }

    step(amount) {
      this.stopInertia();
      this.render(this.position + amount);
    }

    setFrame(index) { this.stopInertia(); this.render(index); return this; }
    next() { this.step(1); return this; }
    previous() { this.step(-1); return this; }
    reset() { return this.setFrame(0); }

    preload() {
      this.preloadedFrames = this.frames.map((url) => {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
        return image;
      });
    }

    destroy() {
      this.stopInertia();
      this.abort.abort();
      this.preloadedFrames = null;
      this.image.remove();
      if (!this.rootHadClass) this.root.classList.remove('frames3d');
      if (this.previousTabIndex === null) this.root.removeAttribute('tabindex');
      else this.root.setAttribute('tabindex', this.previousTabIndex);
      this.root.style.userSelect = this.previousUserSelect;
      this.root.style.touchAction = this.previousTouchAction;
    }
  }

  global.Frames3D = Frames3D;
}(window));
