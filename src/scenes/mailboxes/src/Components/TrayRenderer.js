const {nativeImage} = window.nativeRequire('electron').remote
const B64_SVG_PREFIX = 'data:image/svg+xml;base64,'
const MAIL_SVG = window.atob(require('shared/b64Assets').MAIL_SVG.replace(B64_SVG_PREFIX, ''))

class TrayRenderer {
  /* **************************************************************************/
  // Canvas Utils
  /* **************************************************************************/

  /**
  * Renders a rounded rectangle into the canvas
  * @param ctx: the context to draw into
  * @param x: top left x coordinate
  * @param y: top top left y coordinate
  * @param width: width of rect
  * @param height: height of rect
  * @param radius=5: corner radius
  * @param fill=false: fill the rect
  * @param stroke=true: stroke the rect
  */
  static roundRect (ctx, x, y, width, height, radius = 5, fill = false, stroke = true) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if (stroke) { ctx.stroke() }
    if (fill) { ctx.fill() }
  }

  /**
  * @param config: the config to merge into the default config
  * @return the config for rendering the tray icon
  */
  static defaultConfig (config) {
    if (config.__defaultMerged__) {
      return config
    } else {
      return Object.assign({
        pixelRatio: window.devicePixelRatio,
        unreadCount: 0,
        showUnreadCount: true,
        unreadColor: '#000000',
        readColor: '#C82018',
        unreadBackgroundColor: '#FFFFFF',
        readBackgroundColor: '#FFFFFF',
        readRadius: 5,
        unreadRadius: 5,
        size: 100,
        thick: process.platform === 'win32',
        __defaultMerged__: true
      }, config)
    }
  }

  /**
  * Renders the tray icon as a canvas
  * @param config: the config for rendering
  * @return promise with the canvas
  */
  static renderCanvas (config) {
    if (process.platform === 'darwin') {
      return this.renderCanvasDarwin(config)
    } else if (process.platform === 'win32') {
      return this.renderCanvasWin32(config)
    } else if (process.platform === 'linux') {
      return this.renderCanvasLinux(config)
    } else {
      return Promise.reject(new Error('Unknown Platform'))
    }
  }

  /**
   * Renders the tray icon as a canvas with darwin tweaks
   * @param config: the config for rendering
   * @return promise with the canvas
   */
  static renderCanvasDarwin (config) {
    return new Promise((resolve, reject) => {
      const SIZE = config.size * config.pixelRatio
      const PADDING = Math.floor(SIZE * 0.15)
      const REAL_CENTER = SIZE / 2
      const CENTER = Math.round(REAL_CENTER)
      const STROKE_WIDTH = Math.max(1, Math.round(SIZE * 0.05))
      const RADIUS = config.unreadCount ? config.unreadRadius : config.readRadius
      const BORDER_RADIUS = Math.round(SIZE * (RADIUS / 10))
      const SHOW_COUNT = config.showUnreadCount && config.unreadCount > 0
      const COLOR = config.unreadCount ? config.unreadColor : config.readColor
      const BACKGROUND_COLOR = config.unreadCount ? config.unreadBackgroundColor : config.readBackgroundColor

      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')

      // Trick to turn off AA
      if (config.pixelRatio % 2 !== 0) {
        ctx.translate(0.5, 0.5)
      }

      // Circle
      ctx.beginPath()
      ctx.fillStyle = BACKGROUND_COLOR
      ctx.strokeStyle = COLOR
      ctx.lineWidth = STROKE_WIDTH
      this.roundRect(ctx, PADDING, PADDING, SIZE - (2 * PADDING), SIZE - (2 * PADDING), BORDER_RADIUS, true, true)

      if (SHOW_COUNT) {
        ctx.fillStyle = COLOR
        ctx.textAlign = 'center'
        if (config.unreadCount > 0) {
          if (config.unreadCount > 99) { // 99+
            ctx.font = `${Math.round(SIZE * 0.8)}px Helvetica`
            ctx.fillText('●', CENTER, Math.round(CENTER + (SIZE * 0.22)))
          } else if (config.unreadCount < 10) { // 0 - 9
            ctx.font = `${Math.round(SIZE * 0.6)}px Helvetica`
            ctx.fillText(config.unreadCount, CENTER, Math.round(CENTER + (SIZE * 0.2)))
          } else { // 10 - 99
            ctx.font = `${Math.round(SIZE * 0.52)}px Helvetica`
            ctx.fillText(config.unreadCount, CENTER, Math.round(CENTER + (SIZE * 0.17)))
          }
        } else { // Unread activity
          ctx.font = `${Math.round(SIZE * 0.8)}px Helvetica`
          ctx.fillText('●', CENTER, Math.round(CENTER + (SIZE * 0.22)))
        }
        resolve(canvas)
      } else {
        const loader = new window.Image()
        const ICON_SIZE = SIZE * (config.thick ? 1.0 : 0.5)
        const ICON_POS = (SIZE - ICON_SIZE) / 2
        loader.onload = function () {
          ctx.drawImage(loader, ICON_POS, ICON_POS, ICON_SIZE, ICON_SIZE)
          resolve(canvas)
        }
        loader.src = B64_SVG_PREFIX + window.btoa(MAIL_SVG.replace('fill="#000000"', `fill="${COLOR}"`))
      }
    })
  }

  /**
   * Renders the tray icon as a canvas with win32 tweaks
   * @param config: the config for rendering
   * @return promise with the canvas
   */
  static renderCanvasWin32 (config) {
    return new Promise((resolve, reject) => {
      const SIZE = config.size * config.pixelRatio
      const REAL_CENTER = SIZE / 2
      const CENTER = Math.round(REAL_CENTER)
      const STROKE_WIDTH = Math.max(2, Math.round(SIZE * 0.15))
      const SHOW_COUNT = config.showUnreadCount && config.unreadCount
      const COLOR = config.unreadCount ? config.unreadColor : config.readColor
      const BACKGROUND_COLOR = config.unreadCount ? config.unreadBackgroundColor : config.readBackgroundColor

      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')

      // Circle
      ctx.beginPath()
      ctx.fillStyle = BACKGROUND_COLOR
      ctx.strokeStyle = COLOR
      ctx.lineWidth = STROKE_WIDTH
      this.roundRect(ctx, STROKE_WIDTH, STROKE_WIDTH, SIZE - (2 * STROKE_WIDTH), SIZE - (2 * STROKE_WIDTH), 0, true, true)

      if (SHOW_COUNT) {
        ctx.fillStyle = COLOR
        ctx.textAlign = 'center'
        if (config.unreadCount > 0) {
          if (config.unreadCount > 99) { // 99+
            ctx.font = `Bold ${Math.round(SIZE * 0.8)}px Helvetica`
            ctx.fillText('●', CENTER, Math.round(CENTER + (SIZE * 0.23)))
          } else if (config.unreadCount < 10) { // 0 - 9
            ctx.font = `Bold ${Math.round(SIZE * 0.7)}px Helvetica`
            ctx.fillText(config.unreadCount, CENTER, Math.round(CENTER + (SIZE * 0.25)))
          } else { // 10 - 99
            ctx.font = `Bold ${Math.round(SIZE * 0.55)}px Helvetica`
            ctx.fillText(config.unreadCount, CENTER, Math.round(CENTER + (SIZE * 0.17)))
          }
        } else { // Unread activity
          ctx.font = `Bold ${Math.round(SIZE * 0.8)}px Helvetica`
          ctx.fillText('●', CENTER, Math.round(CENTER + (SIZE * 0.23)))
        }
        resolve(canvas)
      } else {
        const loader = new window.Image()
        const ICON_SIZE = SIZE * (config.thick ? 1.0 : 0.5)
        const ICON_POS = (SIZE - ICON_SIZE) / 2
        loader.onload = function () {
          ctx.drawImage(loader, ICON_POS, ICON_POS, ICON_SIZE, ICON_SIZE)
          resolve(canvas)
        }
        loader.src = B64_SVG_PREFIX + window.btoa(MAIL_SVG.replace('fill="#000000"', `fill="${COLOR}"`))
      }
    })
  }

  /**
  * Renders the tray icon as a canvas
  * @param config: the config for rendering
  * @return promise with the canvas
  */
  static renderCanvasLinux (config) {
    return new Promise((resolve, reject) => {
      const SIZE = config.size * config.pixelRatio
      const PADDING = Math.floor(SIZE * 0.15)
      const REAL_CENTER = SIZE / 2
      const CENTER = Math.round(REAL_CENTER)
      const STROKE_WIDTH = Math.max(1, Math.round(SIZE * 0.05))
      const SHOW_COUNT = config.showUnreadCount && config.unreadCount > 0
      const RADIUS = config.unreadCount ? config.unreadRadius : config.readRadius
      const BORDER_RADIUS = Math.round(SIZE * (RADIUS / 10))
      const COLOR = config.unreadCount ? config.unreadColor : config.readColor
      const BACKGROUND_COLOR = config.unreadCount ? config.unreadBackgroundColor : config.readBackgroundColor

      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')

      // Trick to turn off AA
      if (config.pixelRatio % 2 !== 0) {
        ctx.translate(0.5, 0.5)
      }

      // Circle
      ctx.beginPath()
      ctx.fillStyle = BACKGROUND_COLOR
      ctx.strokeStyle = COLOR
      ctx.lineWidth = STROKE_WIDTH

      if (RADIUS === 5) {
        ctx.arc(CENTER, CENTER, (SIZE / 2) - PADDING, 0, 2 * Math.PI, false)
        ctx.fill()
        ctx.stroke()
      } else {
        this.roundRect(ctx, PADDING, PADDING, SIZE - (2 * PADDING), SIZE - (2 * PADDING), BORDER_RADIUS, true, true)
      }

      if (SHOW_COUNT) {
        ctx.fillStyle = COLOR
        ctx.textAlign = 'center'
        if (config.unreadCount > 0) {
          if (config.unreadCount > 99) { // 99+
            ctx.font = `${Math.round(SIZE * 0.8)}px Helvetica`
            ctx.fillText('●', CENTER, Math.round(CENTER + (SIZE * 0.21)))
          } else if (config.unreadCount < 10) { // 0-9
            ctx.font = `${Math.round(SIZE * 0.6)}px Helvetica`
            ctx.fillText(config.unreadCount, CENTER, Math.round(CENTER + (SIZE * 0.2)))
          } else { // 10 - 99
            ctx.font = `${Math.round(SIZE * 0.52)}px Helvetica`
            ctx.fillText(config.unreadCount, CENTER, Math.round(CENTER + (SIZE * 0.17)))
          }
        } else { // Unread activity
          ctx.font = `${Math.round(SIZE * 0.8)}px Helvetica`
          ctx.fillText('●', CENTER, Math.round(CENTER + (SIZE * 0.21)))
        }

        resolve(canvas)
      } else {
        const loader = new window.Image()
        const ICON_SIZE = SIZE * (config.thick ? 1.0 : 0.5)
        const ICON_POS = (SIZE - ICON_SIZE) / 2
        loader.onload = function () {
          ctx.drawImage(loader, ICON_POS, ICON_POS, ICON_SIZE, ICON_SIZE)
          resolve(canvas)
        }
        loader.src = B64_SVG_PREFIX + window.btoa(MAIL_SVG.replace('fill="#000000"', `fill="${COLOR}"`))
      }
    })
  }

  /**
  * Renders the tray icon as a data64 png image
  * @param config: the config for rendering
  * @return promise with the native image
  */
  static renderPNGDataImage (config) {
    config = TrayRenderer.defaultConfig(config)
    return Promise.resolve()
     .then(() => TrayRenderer.renderCanvas(config))
     .then((canvas) => Promise.resolve(canvas.toDataURL('image/png')))
  }

  /**
  * Renders the tray icon as a native image
  * @param config: the config for rendering
  * @return the native image
  */
  static renderNativeImage (config) {
    config = TrayRenderer.defaultConfig(config)
    return Promise.resolve()
      .then(() => TrayRenderer.renderCanvas(config))
      .then((canvas) => {
        const pngData = nativeImage.createFromDataURL(canvas.toDataURL('image/png')).toPng()
        return Promise.resolve(nativeImage.createFromBuffer(pngData, config.pixelRatio))
      })
  }
}

module.exports = TrayRenderer
