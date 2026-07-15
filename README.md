# Frames3D

Dependency-free 360° frame viewer.

```html
<div id="viewer"></div>
<script src="frames3d.js"></script>
<script>
  const frames = Array.from({ length: 39 }, (_, index) =>
    `/images/frame-${String(index).padStart(2, '0')}.webp`
  );

  const viewer = new Frames3D('#viewer', { frames });
</script>
```

The container needs a width. Frames3D appends its own image and removes only that image on `destroy()`.

```css
#viewer {
  width: 600px;
}

#viewer .frames3d__image {
  aspect-ratio: 3 / 2;
  object-fit: contain;
}
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `frames` | — | Required array of frame URLs. |
| `alt` | `360° product view` | Image alt text. |
| `initialFrame` | `0` | Initial frame index. |
| `inertia` | `true` | Enable drag inertia. |
| `invertScroll` | `false` | Reverse drag and horizontal scroll direction. |
| `framesPerDrag` | `22` | Drag sensitivity. |
| `preload` | `true` | Preload all frames. |

## API

```js
viewer.next();
viewer.previous();
viewer.setFrame(12);
viewer.reset();
viewer.destroy();
```

Vertical wheel and trackpad scrolling remain available to the page. Use horizontal scrolling or `Shift` + wheel to change frames.
