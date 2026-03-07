import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  OnDestroy, HostListener, ChangeDetectorRef,
} from '@angular/core';

export interface MockupConfig {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  perspective: number;
  skewX: number;
  skewY: number;
}

@Component({
  selector: 'ngx-mockup-editor',
  templateUrl: './mockup-editor.component.html',
  styleUrls: ['./mockup-editor.component.scss'],
})
export class MockupEditorComponent implements OnDestroy {
  @ViewChild('editorCanvas', { static: false }) canvasRef: ElementRef<HTMLCanvasElement>;

  @Input() templateUrl: string = '';

  @Input()
  set config(value: MockupConfig) {
    if (!value) return;
    const changed =
      !this._config ||
      this._config.x !== value.x ||
      this._config.y !== value.y ||
      this._config.width !== value.width ||
      this._config.height !== value.height ||
      this._config.rotation !== value.rotation;

    this._config = { ...value };

    // Only redraw from external change when NOT actively dragging
    if (changed && !this.interacting && this.showEditor && this.templateLoaded) {
      this.configToPixels();
      this.draw();
    }
  }
  get config(): MockupConfig {
    return this._config;
  }

  private _config: MockupConfig = {
    type: 'frame', x: 12, y: 15, width: 76, height: 70,
    rotation: 0, perspective: 0, skewX: 0, skewY: 0,
  };

  @Output() configChange = new EventEmitter<MockupConfig>();

  private ctx: CanvasRenderingContext2D;
  private templateImg: HTMLImageElement;
  templateLoaded = false;

  canvasWidth = 600;
  canvasHeight = 400;

  // Interaction flags
  private interacting = false;
  private dragging = false;
  private resizing = false;
  private rotating = false;
  private resizeHandle = '';
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartRectX = 0;
  private dragStartRectY = 0;
  private dragStartRectW = 0;
  private dragStartRectH = 0;
  private dragStartRotation = 0;
  private dragStartAngle = 0;

  // Rect in pixel coords
  private rectX = 0;
  private rectY = 0;
  private rectW = 0;
  private rectH = 0;
  private rectRotation = 0;

  showEditor = false;
  cursorStyle = 'default';
  private loadedTemplateUrl = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {}

  toggleEditor(): void {
    this.showEditor = !this.showEditor;
    if (this.showEditor) {
      setTimeout(() => this.initCanvas(), 100);
    }
  }

  private initCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    const parent = canvas.parentElement;
    if (parent) {
      this.canvasWidth = Math.max(300, Math.min(parent.clientWidth - 16, 800));
    }

    this.loadTemplate();
  }

  private loadTemplate(): void {
    if (!this.ctx || !this.templateUrl) {
      this.templateLoaded = false;
      this.drawPlaceholder();
      return;
    }

    if (this.loadedTemplateUrl === this.templateUrl && this.templateLoaded) {
      this.configToPixels();
      this.draw();
      return;
    }

    this.templateImg = new Image();
    this.templateImg.crossOrigin = 'anonymous';
    this.templateImg.onload = () => {
      this.templateLoaded = true;
      this.loadedTemplateUrl = this.templateUrl;

      const ratio = this.templateImg.naturalHeight / this.templateImg.naturalWidth;
      this.canvasHeight = Math.round(this.canvasWidth * ratio);

      const canvas = this.canvasRef.nativeElement;
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;

      this.configToPixels();
      this.draw();
      this.cdr.detectChanges();
    };
    this.templateImg.onerror = () => {
      this.templateLoaded = false;
      this.drawPlaceholder();
    };
    this.templateImg.src = this.templateUrl;
  }

  private configToPixels(): void {
    this.rectX = (this._config.x / 100) * this.canvasWidth;
    this.rectY = (this._config.y / 100) * this.canvasHeight;
    this.rectW = (this._config.width / 100) * this.canvasWidth;
    this.rectH = (this._config.height / 100) * this.canvasHeight;
    this.rectRotation = this._config.rotation || 0;
  }

  private pixelsToConfig(): void {
    const x = parseFloat(((this.rectX / this.canvasWidth) * 100).toFixed(1));
    const y = parseFloat(((this.rectY / this.canvasHeight) * 100).toFixed(1));
    const w = parseFloat(((this.rectW / this.canvasWidth) * 100).toFixed(1));
    const h = parseFloat(((this.rectH / this.canvasHeight) * 100).toFixed(1));
    const rot = parseFloat(this.rectRotation.toFixed(1));

    this._config = {
      ...this._config,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      width: Math.max(1, Math.min(100, w)),
      height: Math.max(1, Math.min(100, h)),
      rotation: rot,
    };
    this.configChange.emit({ ...this._config });
  }

  // ==================== DRAWING ====================

  private draw(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cw = this.canvasWidth;
    const ch = this.canvasHeight;

    ctx.clearRect(0, 0, cw, ch);

    if (this.templateLoaded && this.templateImg) {
      ctx.drawImage(this.templateImg, 0, 0, cw, ch);
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, cw, ch);
    }

    const cx = this.rectX + this.rectW / 2;
    const cy = this.rectY + this.rectH / 2;
    const radians = (this.rectRotation * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(radians);

    // Orange gradient fill
    const gradient = ctx.createLinearGradient(-this.rectW / 2, -this.rectH / 2, this.rectW / 2, this.rectH / 2);
    gradient.addColorStop(0, 'rgba(255, 165, 0, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-this.rectW / 2, -this.rectH / 2, this.rectW, this.rectH);

    // Border
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(-this.rectW / 2, -this.rectH / 2, this.rectW, this.rectH);

    // Cross-hair
    ctx.strokeStyle = 'rgba(255, 102, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -this.rectH / 2);
    ctx.lineTo(0, this.rectH / 2);
    ctx.moveTo(-this.rectW / 2, 0);
    ctx.lineTo(this.rectW / 2, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Görsel Alanı', 0, 0);

    ctx.restore();

    this.drawHandles(ctx);
    this.drawRotationHandle(ctx);
    this.drawInfo(ctx);
  }

  private drawHandles(ctx: CanvasRenderingContext2D): void {
    const handles = this.getHandlePositions();
    const size = 10;
    handles.forEach(h => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(h.x - size / 2, h.y - size / 2, size, size);
      ctx.fill();
      ctx.stroke();
    });
  }

  private drawRotationHandle(ctx: CanvasRenderingContext2D): void {
    const rh = this.getRotationHandlePos();
    const cx = this.rectX + this.rectW / 2;
    const cy = this.rectY + this.rectH / 2;
    const rad = (this.rectRotation * Math.PI) / 180;

    const topCX = cx + (0) * Math.cos(rad) - (-this.rectH / 2) * Math.sin(rad);
    const topCY = cy + (0) * Math.sin(rad) + (-this.rectH / 2) * Math.cos(rad);

    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(topCX, topCY);
    ctx.lineTo(rh.x, rh.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', rh.x, rh.y);
  }

  private drawInfo(ctx: CanvasRenderingContext2D): void {
    const padding = 8;
    const lineHeight = 16;
    const lines = [
      `X: ${((this.rectX / this.canvasWidth) * 100).toFixed(1)}%   Y: ${((this.rectY / this.canvasHeight) * 100).toFixed(1)}%`,
      `W: ${((this.rectW / this.canvasWidth) * 100).toFixed(1)}%   H: ${((this.rectH / this.canvasHeight) * 100).toFixed(1)}%`,
      `Rot: ${this.rectRotation.toFixed(1)}°`,
    ];

    const boxW = 200;
    const boxH = lines.length * lineHeight + padding * 2;
    const bx = this.canvasWidth - boxW - 10;
    const by = 10;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    this.roundedRect(ctx, bx, by, boxW, boxH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + padding, by + padding + i * lineHeight);
    });
  }

  private drawPlaceholder(): void {
    if (!this.ctx || !this.canvasRef) return;
    const ctx = this.ctx;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = 250;
    this.canvasHeight = 250;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, this.canvasWidth, 250);
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(10, 10, this.canvasWidth - 20, 230);
    ctx.setLineDash([]);

    ctx.fillStyle = '#adb5bd';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mockup template URL giriniz', this.canvasWidth / 2, 115);
    ctx.font = '12px system-ui';
    ctx.fillText('Görsel yüklendikten sonra editör aktif olacaktır', this.canvasWidth / 2, 140);
  }

  // ==================== HANDLE POSITIONS ====================

  private getHandlePositions(): { x: number; y: number; type: string }[] {
    const cx = this.rectX + this.rectW / 2;
    const cy = this.rectY + this.rectH / 2;
    const rad = (this.rectRotation * Math.PI) / 180;

    const corners = [
      { lx: this.rectX, ly: this.rectY, type: 'tl' },
      { lx: this.rectX + this.rectW, ly: this.rectY, type: 'tr' },
      { lx: this.rectX, ly: this.rectY + this.rectH, type: 'bl' },
      { lx: this.rectX + this.rectW, ly: this.rectY + this.rectH, type: 'br' },
      { lx: this.rectX + this.rectW / 2, ly: this.rectY, type: 't' },
      { lx: this.rectX + this.rectW / 2, ly: this.rectY + this.rectH, type: 'b' },
      { lx: this.rectX, ly: this.rectY + this.rectH / 2, type: 'l' },
      { lx: this.rectX + this.rectW, ly: this.rectY + this.rectH / 2, type: 'r' },
    ];

    return corners.map(c => ({
      x: cx + (c.lx - cx) * Math.cos(rad) - (c.ly - cy) * Math.sin(rad),
      y: cy + (c.lx - cx) * Math.sin(rad) + (c.ly - cy) * Math.cos(rad),
      type: c.type,
    }));
  }

  private getRotationHandlePos(): { x: number; y: number } {
    const cx = this.rectX + this.rectW / 2;
    const cy = this.rectY + this.rectH / 2;
    const rad = (this.rectRotation * Math.PI) / 180;
    const localY = -this.rectH / 2 - 30;
    return {
      x: cx + 0 * Math.cos(rad) - localY * Math.sin(rad),
      y: cy + 0 * Math.sin(rad) + localY * Math.cos(rad),
    };
  }

  // ==================== MOUSE EVENTS ====================

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.templateLoaded) return;

    const pos = this.getCanvasCoords(event);

    // Rotation handle
    const rotHandle = this.getRotationHandlePos();
    if (this.dist(pos.x, pos.y, rotHandle.x, rotHandle.y) < 15) {
      this.interacting = true;
      this.rotating = true;
      const cx = this.rectX + this.rectW / 2;
      const cy = this.rectY + this.rectH / 2;
      this.dragStartAngle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);
      this.dragStartRotation = this.rectRotation;
      return;
    }

    // Resize handles
    const handles = this.getHandlePositions();
    for (const h of handles) {
      if (this.dist(pos.x, pos.y, h.x, h.y) < 14) {
        this.interacting = true;
        this.resizing = true;
        this.resizeHandle = h.type;
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
        this.dragStartRectX = this.rectX;
        this.dragStartRectY = this.rectY;
        this.dragStartRectW = this.rectW;
        this.dragStartRectH = this.rectH;
        return;
      }
    }

    // Drag inside rect
    if (this.isInsideRect(pos.x, pos.y)) {
      this.interacting = true;
      this.dragging = true;
      this.dragStartX = pos.x;
      this.dragStartY = pos.y;
      this.dragStartRectX = this.rectX;
      this.dragStartRectY = this.rectY;
      this.cursorStyle = 'grabbing';
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.templateLoaded) return;
    const pos = this.getCanvasCoords(event);

    if (this.rotating) {
      event.preventDefault();
      const cx = this.rectX + this.rectW / 2;
      const cy = this.rectY + this.rectH / 2;
      const angle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);
      let newRotation = this.dragStartRotation + (angle - this.dragStartAngle);
      for (const snap of [0, 90, 180, 270, -90, -180, -270, 360]) {
        if (Math.abs(newRotation - snap) < 3) newRotation = snap;
      }
      this.rectRotation = newRotation;
      this.draw();
      return;
    }

    if (this.resizing) {
      event.preventDefault();
      this.applyResize(pos.x - this.dragStartX, pos.y - this.dragStartY);
      this.draw();
      return;
    }

    if (this.dragging) {
      event.preventDefault();
      const dx = pos.x - this.dragStartX;
      const dy = pos.y - this.dragStartY;
      this.rectX = Math.max(0, Math.min(this.canvasWidth - this.rectW, this.dragStartRectX + dx));
      this.rectY = Math.max(0, Math.min(this.canvasHeight - this.rectH, this.dragStartRectY + dy));
      this.draw();
      return;
    }

    // Cursor hints
    const rotHandle = this.getRotationHandlePos();
    if (this.dist(pos.x, pos.y, rotHandle.x, rotHandle.y) < 15) {
      this.cursorStyle = 'alias';
      return;
    }
    const handles = this.getHandlePositions();
    for (const h of handles) {
      if (this.dist(pos.x, pos.y, h.x, h.y) < 14) {
        this.cursorStyle = this.getResizeCursor(h.type);
        return;
      }
    }
    this.cursorStyle = this.isInsideRect(pos.x, pos.y) ? 'grab' : 'default';
  }

  onMouseUp(): void {
    if (this.interacting) {
      this.pixelsToConfig();
    }
    this.dragging = false;
    this.resizing = false;
    this.rotating = false;
    this.interacting = false;
    this.resizeHandle = '';
    this.cursorStyle = 'default';
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    if (this.interacting) {
      this.onMouseUp();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (this.interacting && this.canvasRef) {
      this.onMouseMove(event);
    }
  }

  // ==================== RESIZE ====================

  private applyResize(dx: number, dy: number): void {
    const min = 10;
    let x = this.dragStartRectX;
    let y = this.dragStartRectY;
    let w = this.dragStartRectW;
    let h = this.dragStartRectH;

    switch (this.resizeHandle) {
      case 'br': w = Math.max(min, w + dx); h = Math.max(min, h + dy); break;
      case 'bl': x += dx; w = Math.max(min, w - dx); h = Math.max(min, h + dy); break;
      case 'tr': y += dy; w = Math.max(min, w + dx); h = Math.max(min, h - dy); break;
      case 'tl': x += dx; y += dy; w = Math.max(min, w - dx); h = Math.max(min, h - dy); break;
      case 'r': w = Math.max(min, w + dx); break;
      case 'l': x += dx; w = Math.max(min, w - dx); break;
      case 'b': h = Math.max(min, h + dy); break;
      case 't': y += dy; h = Math.max(min, h - dy); break;
    }

    this.rectX = Math.max(0, x);
    this.rectY = Math.max(0, y);
    this.rectW = Math.min(w, this.canvasWidth - this.rectX);
    this.rectH = Math.min(h, this.canvasHeight - this.rectY);
  }

  // ==================== UTILITIES ====================

  private getCanvasCoords(event: MouseEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private isInsideRect(px: number, py: number): boolean {
    const cx = this.rectX + this.rectW / 2;
    const cy = this.rectY + this.rectH / 2;
    const rad = -(this.rectRotation * Math.PI) / 180;
    const localX = (px - cx) * Math.cos(rad) - (py - cy) * Math.sin(rad) + cx;
    const localY = (px - cx) * Math.sin(rad) + (py - cy) * Math.cos(rad) + cy;
    return localX >= this.rectX && localX <= this.rectX + this.rectW &&
           localY >= this.rectY && localY <= this.rectY + this.rectH;
  }

  private getResizeCursor(handle: string): string {
    const map: { [k: string]: string } = {
      tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize',
      t: 'ns-resize', b: 'ns-resize', l: 'ew-resize', r: 'ew-resize',
    };
    return map[handle] || 'default';
  }

  resetPosition(): void {
    this._config = { ...this._config, x: 12, y: 15, width: 76, height: 70, rotation: 0 };
    this.configToPixels();
    this.draw();
    this.configChange.emit({ ...this._config });
  }

  centerRect(): void {
    this.rectX = (this.canvasWidth - this.rectW) / 2;
    this.rectY = (this.canvasHeight - this.rectH) / 2;
    this.rectRotation = 0;
    this.draw();
    this.pixelsToConfig();
  }

  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
