/**
 * @type {null|YT}
 */
let YT = null

/**
 * @property {ShadowRoot} root
 * @property {?number} timer Timer permettant de suivre la progression de la lecture
 * @property {YT.Player} player
 */
export default class YoutubePlayer extends HTMLElement {
  static get observedAttributes () {
    return ['video']
  }

  constructor () {
    super()
    this.root = this.attachShadow({mode: 'open'})
    this.onYoutubePlayerStateChange = this.onYoutubePlayerStateChange.bind(this)
    this.onYoutubePlayerReady = this.onYoutubePlayerReady.bind(this)
    this.dispatchProgress = this.dispatchProgress.bind(this)
    this.root.innerHTML = `
      ${this.buildStyles()}
      <div><div class="player"></div></div>
    `
  }

  disconnectedCallback () {
    this.stopTimer()
    this.dispatchEvent(new YoutubePlayerChange(YoutubePlayerChange.STOP))
  }

  async attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'video' && newValue !== null) {
      await loadYoutubeApi()
      if (this.player) {
        this.player.cueVideoById(this.getAttribute('video'))
        this.player.playVideo()
        return
      }
      this.player = new YT.Player(this.root.querySelector('.player'), {
        videoId: this.getAttribute('video'),
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          loop: 0,
          controls: 1,
          showinfo: 0,
          rel: 0
        },
        events: {
          onStateChange: this.onYoutubePlayerStateChange,
          onReady: this.onYoutubePlayerReady,
        }
      })
    }
  }

  /**
   * @param {YT.OnStateChangeEvent} event
   */
  onYoutubePlayerStateChange (event) {
    if (event.data === YT.PlayerState.PLAYING) {
      this.startTimer()
      this.dispatchEvent(new YoutubePlayerChange(YoutubePlayerChange.PLAY))
    } else {
      this.stopTimer()
      this.dispatchEvent(new YoutubePlayerChange(YoutubePlayerChange.STOP))
    }
  }

  /**
   * @param {YT.PlayerEvent} event
   */
  onYoutubePlayerReady (event) {
    this.startTimer()
    this.dispatchEvent(new YoutubePlayerChange(YoutubePlayerChange.PLAY))
  }

  /**
   * Génère le style associé au player
   * @returns {string}
   */
  buildStyles () {
    return `<style>
      div {
        position: relative;
        padding-bottom: 56.25%;
      }
      iframe {
        position: absolute;
        top:0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
      }
    </style>`
  }

  stopTimer () {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  startTimer () {
    if (this.timer) {
      return null
    }
    this.dispatchProgress()
    this.timer = window.setInterval(this.dispatchProgress, 1000)
  }

  dispatchProgress () {
    const progress = Math.round(100 * this.player.getCurrentTime() / this.player.getDuration())
    this.dispatchEvent(new YoutubePlayerProgressEvent(progress))
  }

}

/**
 * Evènement représentant l'avancement de la lecture
 *
 * @property {number} progress % de progression en 0 et 100
 */
class YoutubePlayerProgressEvent extends Event {

  /**
   * @param {number} progress % de progression en 0 et 100
   */
  constructor (progress) {
    super('progress')
    this.progress = progress
  }

}

/**
 * Evènement représentant le changement d'état du lecteur (Play/Pause)
 *
 * @property {boolean} play
 */
class YoutubePlayerChange extends Event {
  constructor (state) {
    super('change');
    if (state === YoutubePlayerChange.PLAY) {
      this.play = true
    } else {
      this.play = false
    }
  }
}

YoutubePlayerChange.PLAY = 1
YoutubePlayerChange.STOP = 2

/**
 * Charge l'API Youtube Player
 * @returns {Promise<YT>}
 */
async function loadYoutubeApi () {
  return new Promise((resolve, reject) => {
    if (YT) {
      resolve(YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    global.onYouTubeIframeAPIReady = function () {
      YT = global.YT
      global.onYouTubeIframeAPIReady = undefined
      resolve(YT)
    }
  })
}
